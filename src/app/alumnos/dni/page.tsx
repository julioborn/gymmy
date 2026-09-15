'use client';
import React, { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import './keyboardStyles.css';
import { addIngreso, getIngresosPendientes, deleteIngreso } from '@/utils/indexedDB';
import { signOut } from 'next-auth/react';

const swalDni = {
    customClass: {
        popup: 'swal-dni-alert',
        confirmButton: 'sg-btn sg-btn-confirm',
        cancelButton: 'sg-btn sg-btn-cancel',
    },
    buttonsStyling: false,
    backdrop: 'rgba(0,0,0,0.6)',
};

export default function RegistrarAsistenciaPorDNIPage() {
    const [dni, setDni] = useState('');
    const dniRef = useRef('');
    const [actividad, setActividad] = useState<string>('Musculación');
    const isLoadingRef = useRef(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [keyboard, setKeyboard] = useState<any>(null);
    const [acento, setAcento] = useState('#f97316');
    const [acento2, setAcento2] = useState('#22c55e');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [gymNombre, setGymNombre] = useState<string>('');
    const [actividadesDisponibles, setActividadesDisponibles] = useState<string[]>(['Musculación']);

    const formatDNIWithDots = (input: string): string => {
        const digits = input.replace(/\D/g, '').slice(0, 8);
        const len = digits.length;
        if (len <= 3) return digits;
        if (len === 4) return `${digits.slice(0,1)}.${digits.slice(1)}`;
        if (len === 5) return `${digits.slice(0,2)}.${digits.slice(2)}`;
        if (len === 6) return `${digits.slice(0,3)}.${digits.slice(3)}`;
        if (len === 7) return `${digits.slice(0,1)}.${digits.slice(1,4)}.${digits.slice(4)}`;
        return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5)}`;
    };

    const keyboardRef = useRef<any>(null);
    const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const logoTapCount = useRef(0);
    const logoTapReset = useRef<ReturnType<typeof setTimeout> | null>(null);
    const INACTIVITY_MS = 10000;

    const clearDNI = () => {
        dniRef.current = '';
        setDni('');
        if (keyboardRef.current) keyboardRef.current.setInput('');
    };

    const resetInactivityTimer = () => {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        inactivityTimer.current = setTimeout(clearDNI, INACTIVITY_MS);
    };

    const cancelInactivityTimer = () => {
        if (inactivityTimer.current) {
            clearTimeout(inactivityTimer.current);
            inactivityTimer.current = null;
        }
    };

    const playClick = () => {
        try { (navigator as any).vibrate?.(40); } catch {}
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new Ctx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1100, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + 0.045);
            gain.gain.setValueAtTime(0.14, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.05);
            osc.onended = () => ctx.close();
        } catch {}
    };

    const playSuccess = () => {
        try { (navigator as any).vibrate?.([30, 20, 50]); } catch {}
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new Ctx();
            // Dos tonos ascendentes: Do5 → Sol5
            const notes: [number, number, number][] = [[523, 0, 0.18], [784, 0.16, 0.28]];
            notes.forEach(([freq, delay, dur]) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
                gain.gain.setValueAtTime(0, ctx.currentTime + delay);
                gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + delay + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + dur + 0.05);
            });
            setTimeout(() => ctx.close(), 800);
        } catch {}
    };

    const playError = () => {
        try { (navigator as any).vibrate?.([60, 30, 60]); } catch {}
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new Ctx();
            // Dos tonos descendentes y más bajos
            const notes: [number, number, number][] = [[320, 0, 0.18], [200, 0.17, 0.22]];
            notes.forEach(([freq, delay, dur]) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
                gain.gain.setValueAtTime(0, ctx.currentTime + delay);
                gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + delay + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + dur + 0.05);
            });
            setTimeout(() => ctx.close(), 700);
        } catch {}
    };

    const handleKeyPress = (button: string) => {
        playClick();
        if (button === '{submit}') {
            cancelInactivityTimer();
            handleSubmit(new Event('submit') as unknown as React.FormEvent);
            return;
        }
        const digits = dniRef.current.replace(/\./g, '');
        let newDigits = digits;
        if (button === '{bksp}') {
            newDigits = digits.slice(0, -1);
        } else if (/^\d$/.test(button) && digits.length < 8) {
            newDigits = digits + button;
        } else {
            return;
        }
        const formatted = formatDNIWithDots(newDigits);
        dniRef.current = formatted;
        setDni(formatted);
        if (keyboardRef.current) keyboardRef.current.setInput(newDigits);
        if (newDigits.length > 0) resetInactivityTimer();
        else cancelInactivityTimer();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoadingRef.current) return;
        const cleanDNI = dniRef.current.replace(/\./g, '');
        if (cleanDNI.length < 7 || cleanDNI.length > 8) {
            Swal.fire({ ...swalDni, icon: 'error', title: 'DNI inválido', text: 'El DNI debe tener 7 u 8 dígitos.' });
            return;
        }
        isLoadingRef.current = true;
        setIsLoading(true);
        const fecha = new Date().toISOString();
        try {
            const response = await fetch(`/api/alumnos?dni=${cleanDNI}`);
            if (!response.ok) throw new Error('red');
            const alumno = await response.json();
            if (!alumno) throw new Error('no_encontrado');
            const ingreso = { dni: cleanDNI, actividad, fecha, presente: true, nombre: alumno.nombre };
            const asistenciaResponse = await fetch(`/api/asistencias/${alumno._id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ingreso),
            });
            if (!asistenciaResponse.ok) throw new Error(await asistenciaResponse.text());

            // Detectar si tiene la cuota del mes pagada
            const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
            const mesActual = meses[new Date().getMonth()];
            const cuotaPaga = alumno.pagos?.some((p: any) => p.mes?.toLowerCase() === mesActual) ?? false;
            const successColor = cuotaPaga ? '#22c55e' : '#ef4444';
            const cuotaLabel = cuotaPaga
                ? `<span style="color:#16a34a;font-size:0.75rem;font-weight:600;letter-spacing:0.04em;">✓ Cuota al día</span>`
                : `<span style="color:#dc2626;font-size:0.75rem;font-weight:600;letter-spacing:0.04em;">✗ Cuota pendiente</span>`;

            playSuccess();
            Swal.fire({
                customClass: { popup: 'swal-dni-success' },
                buttonsStyling: false,
                title: `¡Hola, ${alumno.nombre}!`,
                html: `
                    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <circle cx="24" cy="24" r="23" stroke="${successColor}" stroke-width="2" stroke-opacity="0.4"/>
                            <path d="M14 24.5L21 31.5L34 17" stroke="${successColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span style="display:inline-flex;align-items:center;padding:6px 20px;background:${successColor}22;color:${successColor};border-radius:999px;font-weight:700;font-size:0.9rem;border:1.5px solid ${successColor}44;letter-spacing:0.01em">${actividad}</span>
                        <span style="color:rgba(0,0,0,0.35);font-size:0.8rem;letter-spacing:0.05em;text-transform:uppercase">Asistencia registrada</span>
                        ${cuotaLabel}
                    </div>
                `,
                showConfirmButton: false,
                timer: 4000,
                timerProgressBar: true,
                backdrop: cuotaPaga ? 'rgba(0,80,0,0.45)' : 'rgba(80,0,0,0.45)',
            });
            clearDNI();
            cancelInactivityTimer();
        } catch (error: any) {
            playError();
            if (error.message === 'no_encontrado') {
                Swal.fire({ ...swalDni, icon: 'warning', title: 'No encontrado', text: 'No hay ningún alumno registrado con ese DNI.' });
            } else if (error.message.includes('Asistencia ya registrada')) {
                Swal.fire({ ...swalDni, icon: 'info', title: 'Ya registrada', text: `Ya se registró asistencia para ${actividad} hoy.` });
            } else {
                await addIngreso({ dni: cleanDNI, actividad, fecha });
                Swal.fire({ ...swalDni, icon: 'info', title: 'Sin conexión', text: `La asistencia para "${actividad}" se registrará al reconectarse.` });
            }
            clearDNI();
            cancelInactivityTimer();
        } finally {
            isLoadingRef.current = false;
            setIsLoading(false);
        }
    };

    const syncIngresosPendientes = async () => {
        setIsSyncing(true);
        const pendientes = await getIngresosPendientes();
        for (const ingreso of pendientes) {
            try {
                const r = await fetch(`/api/alumnos?dni=${ingreso.dni}`);
                if (!r.ok) continue;
                const alumno = await r.json();
                const res = await fetch(`/api/asistencias/${alumno._id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ingreso),
                });
                if (res.ok || res.status === 400) await deleteIngreso(ingreso.id);
            } catch { /* silenced */ }
        }
        setIsSyncing(false);
    };

    useEffect(() => {
        syncIngresosPendientes();
        window.addEventListener('online', syncIngresosPendientes);
        fetch('/api/gimnasio/tema')
            .then(r => r.json())
            .then(d => {
                if (d.temaAcento) setAcento(d.temaAcento);
                if (d.temaAcento2) setAcento2(d.temaAcento2);
                if (d.logoUrl) setLogoUrl(d.logoUrl);
                if (d.nombre) setGymNombre(d.nombre);
                if (d.actividadesRecepcion?.length) {
                    setActividadesDisponibles(d.actividadesRecepcion);
                    setActividad(d.actividadesRecepcion[0]);
                }
            })
            .catch(() => {});

        // Screen Wake Lock — mantiene la pantalla encendida
        let wakeLock: any = null;
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await (navigator as any).wakeLock.request('screen');
                }
            } catch {}
        };
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') requestWakeLock();
        };
        requestWakeLock();
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.removeEventListener('online', syncIngresosPendientes);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            wakeLock?.release().catch(() => {});
            cancelInactivityTimer();
            if (logoTapReset.current) clearTimeout(logoTapReset.current);
        };
    }, []);

    const handleLogoTap = async () => {
        if (logoTapReset.current) clearTimeout(logoTapReset.current);
        logoTapCount.current += 1;

        if (logoTapCount.current >= 5) {
            logoTapCount.current = 0;
            const result = await Swal.fire({
                ...swalDni,
                title: 'Salir de recepción',
                input: 'password',
                inputLabel: 'Contraseña',
                inputPlaceholder: 'Ingresá tu contraseña',
                showCancelButton: true,
                confirmButtonText: 'Salir',
                cancelButtonText: 'Cancelar',
            });
            if (result.isConfirmed && result.value) {
                const res = await fetch('/api/auth/verify-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: result.value }),
                });
                const data = await res.json();
                if (data.ok) {
                    signOut({ callbackUrl: '/login' });
                } else {
                    Swal.fire({ ...swalDni, icon: 'error', title: 'Contraseña incorrecta' });
                }
            }
        } else {
            logoTapReset.current = setTimeout(() => { logoTapCount.current = 0; }, 2000);
        }
    };


    const ACTIVIDAD_COLOR: Record<string, string> = {
        'Musculación': acento2,
        'Intermitente': acento,
        'Otro': '#94a3b8',
    };

    return (
        <div
            className="fixed inset-0 flex flex-col overflow-hidden"
            style={{
                background: '#111',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
        >
            {/* Spinner de carga */}
            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)' }}>
                    <div className="w-14 h-14 rounded-full border-4 border-white/10 animate-spin" style={{ borderTopColor: acento }} />
                </div>
            )}

            <div className="flex flex-col w-full mx-auto px-3 sm:px-5 pt-8 sm:pt-10 gap-2" style={{ height: '100%' }}>

                {/* Logo del gimnasio — mantener presionado 2s para salir */}
                <div
                    className="flex items-center justify-center flex-none"
                    style={{
                        height: 130,
                        WebkitTouchCallout: 'none' as any,
                        userSelect: 'none',
                        WebkitUserSelect: 'none' as any,
                    }}
                    onClick={handleLogoTap}
                    onContextMenu={e => e.preventDefault()}
                >
                    {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoUrl}
                            alt={gymNombre || 'Gimnasio'}
                            draggable={false}
                            style={{
                                maxHeight: 130,
                                maxWidth: '88%',
                                objectFit: 'contain',
                                WebkitTouchCallout: 'none' as any,
                                pointerEvents: 'none',
                            }}
                        />
                    ) : (
                        <span className="text-white font-bold text-3xl tracking-tight">{gymNombre}</span>
                    )}
                </div>

                {/* Display DNI — pantalla digital */}
                <div
                    className="rounded-2xl flex-none relative overflow-hidden flex items-center justify-center"
                    style={{
                        height: 68,
                        background: '#ffffff',
                        border: '1.5px solid rgba(0,0,0,0.10)',
                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)',
                    }}
                >
                    <span className="absolute top-1.5 left-3" style={{
                        fontSize: 9, color: 'rgba(0,0,0,0.25)', fontFamily: 'monospace',
                        fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                    }}>DNI</span>
                    {dni ? (
                        <span style={{
                            fontSize: 34,
                            fontFamily: "var(--font-geist-mono), 'Roboto Mono', monospace",
                            fontWeight: 700,
                            letterSpacing: '0.18em',
                            color: '#111111',
                        }}>
                            {dni}
                        </span>
                    ) : (
                        <span style={{
                            fontSize: 34,
                            fontFamily: "var(--font-geist-mono), 'Roboto Mono', monospace",
                            fontWeight: 600,
                            letterSpacing: '0.18em',
                            color: 'rgba(0,0,0,0.10)',
                        }}>
                            _ _ _ _ _ _ _ _
                        </span>
                    )}
                </div>

                {/* Actividad — solo se muestra si hay más de una opción */}
                {actividadesDisponibles.length > 1 && (
                    <div className={`grid gap-2 flex-none`} style={{ gridTemplateColumns: `repeat(${actividadesDisponibles.length}, 1fr)` }}>
                        {actividadesDisponibles.map((label) => {
                            const color = ACTIVIDAD_COLOR[label] || '#94a3b8';
                            const isActive = actividad === label;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => { playClick(); setActividad(label); }}
                                    disabled={isLoading}
                                    className="h-14 rounded-xl text-base font-bold transition-all active:scale-95"
                                    style={isActive
                                        ? { background: color, color: '#fff', boxShadow: `0 4px 14px ${color}55` }
                                        : { background: '#ffffff', color: '#111111' }
                                    }
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Teclado — ocupa el espacio restante hasta el fondo */}
                <div
                    className="rounded-2xl overflow-hidden"
                    style={{
                        flex: '1 1 0',
                        minHeight: 0,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        ['--acento' as string]: acento,
                        ['--acento2' as string]: acento2,
                    }}
                >
                    <Keyboard
                        keyboardRef={(r) => { keyboardRef.current = r; setKeyboard(r); }}
                        onKeyPress={handleKeyPress}
                        inputName="dni"
                        theme="hg-theme-default hg-layout-numeric my-custom-keyboard"
                        layout={{ default: ['1 2 3', '4 5 6', '7 8 9', '{bksp} 0 {submit}'] }}
                        display={{ '{bksp}': '⌫', '{submit}': isLoading ? '...' : 'Registrar' }}
                        physicalKeyboardHighlight={false}
                        preventMouseDownDefault={true}
                    />
                </div>

                {/* Sync indicator */}
                {isSyncing && (
                    <p className="flex-none text-center text-white/20 text-[10px] font-medium pb-2">Sincronizando ingresos pendientes...</p>
                )}
            </div>
        </div>
    );
}
