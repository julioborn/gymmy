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
    const [feedback, setFeedback] = useState<{ type: 'paid' | 'debt' | 'not_found' | 'already'; nombre?: string; actividad: string } | null>(null);
    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        try { (navigator as any).vibrate?.([30, 20, 60]); } catch {}
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new Ctx();
            const notes: [number, number, number][] = [[523, 0, 0.2], [659, 0.19, 0.2], [784, 0.38, 0.38]];
            notes.forEach(([freq, delay, dur]) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
                gain.gain.setValueAtTime(0, ctx.currentTime + delay);
                gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + dur + 0.05);
            });
            setTimeout(() => ctx.close(), 1200);
        } catch {}
    };

    const playDebt = () => {
        try { (navigator as any).vibrate?.([200, 100, 200, 100, 200]); } catch {}
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new Ctx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            const now = ctx.currentTime;
            const step = 0.35; // duración de cada subida/bajada
            // 3 ciclos completos: bajo → alto → bajo → alto → bajo → alto → bajo
            osc.frequency.setValueAtTime(330, now);
            osc.frequency.linearRampToValueAtTime(880, now + step);
            osc.frequency.linearRampToValueAtTime(330, now + step * 2);
            osc.frequency.linearRampToValueAtTime(880, now + step * 3);
            osc.frequency.linearRampToValueAtTime(330, now + step * 4);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
            gain.gain.setValueAtTime(0.18, now + step * 4 - 0.08);
            gain.gain.linearRampToValueAtTime(0, now + step * 4);
            osc.start(now);
            osc.stop(now + step * 4 + 0.05);
            osc.onended = () => ctx.close();
        } catch {}
    };

    const playError = () => {
        try { (navigator as any).vibrate?.([60, 30, 60]); } catch {}
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new Ctx();
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

    const showFeedback = (type: 'paid' | 'debt' | 'not_found' | 'already', act: string, nombre?: string) => {
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        setFeedback({ type, nombre, actividad: act });
        feedbackTimer.current = setTimeout(() => setFeedback(null), 4000);
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
        if (cleanDNI.length < 7 || cleanDNI.length > 8) return;
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

            if (cuotaPaga) playSuccess(); else playDebt();
            showFeedback(cuotaPaga ? 'paid' : 'debt', actividad, alumno.nombre);
            clearDNI();
            cancelInactivityTimer();
        } catch (error: any) {
            playError();
            if (error.message === 'no_encontrado') {
                showFeedback('not_found', actividad);
            } else if (error.message.includes('Asistencia ya registrada')) {
                showFeedback('already', actividad);
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

            {/* Feedback pantalla completa */}
            {feedback && (
                <div
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-8 px-8"
                    style={{ background: feedback.type === 'paid' ? '#15803d' : feedback.type === 'debt' ? '#b91c1c' : feedback.type === 'already' ? '#b45309' : '#1d4ed8' }}
                    onClick={() => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); setFeedback(null); }}
                >
                    {/* Ícono */}
                    <div className="flex items-center justify-center rounded-full bg-white/20" style={{ width: 120, height: 120 }}>
                        {feedback.type === 'paid' ? (
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                <path d="M12 33L27 48L52 20" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        ) : feedback.type === 'debt' ? (
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                <path d="M16 16L48 48M48 16L16 48" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                            </svg>
                        ) : feedback.type === 'already' ? (
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                <circle cx="32" cy="20" r="5" fill="white"/>
                                <rect x="28" y="30" width="8" height="22" rx="4" fill="white"/>
                            </svg>
                        ) : (
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                <circle cx="32" cy="20" r="5" fill="white"/>
                                <rect x="28" y="30" width="8" height="22" rx="4" fill="white"/>
                            </svg>
                        )}
                    </div>

                    {/* Nombre o mensaje */}
                    <div className="text-center">
                        {feedback.type === 'not_found' ? (
                            <>
                                <h1 className="text-white font-black leading-none" style={{ fontSize: 'clamp(44px, 9vw, 80px)' }}>
                                    No registrado
                                </h1>
                                <p className="text-white/60 font-semibold mt-3" style={{ fontSize: 22 }}>
                                    No hay ningún alumno con ese DNI
                                </p>
                            </>
                        ) : feedback.type === 'already' ? (
                            <>
                                <h1 className="text-white font-black leading-none" style={{ fontSize: 'clamp(44px, 9vw, 80px)' }}>
                                    Ya registrado
                                </h1>
                                <p className="text-white/60 font-semibold mt-3" style={{ fontSize: 22 }}>
                                    Ya se registró asistencia hoy
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-white/70 font-semibold tracking-widest uppercase" style={{ fontSize: 22 }}>¡Hola!</p>
                                <h1 className="text-white font-black leading-none mt-1" style={{ fontSize: 'clamp(52px, 10vw, 96px)' }}>
                                    {feedback.nombre}
                                </h1>
                            </>
                        )}
                    </div>

                    {/* Actividad */}
                    {feedback.type !== 'not_found' && feedback.type !== 'already' && (
                        <span className="px-6 py-2 rounded-full bg-white/20 text-white font-bold" style={{ fontSize: 24 }}>
                            {feedback.actividad}
                        </span>
                    )}

                    {/* Estado */}
                    <div className="flex flex-col items-center gap-2">
                        {feedback.type === 'not_found' ? (
                            <span className="text-white/50 uppercase tracking-widest" style={{ fontSize: 14 }}>
                                Revisá el DNI ingresado
                            </span>
                        ) : feedback.type === 'already' ? (
                            <span className="text-white/50 uppercase tracking-widest" style={{ fontSize: 14 }}>
                                {feedback.actividad}
                            </span>
                        ) : (
                            <>
                                <span className="text-white font-black" style={{ fontSize: 32 }}>
                                    {feedback.type === 'paid' ? '✓ Cuota al día' : '✗ Cuota pendiente'}
                                </span>
                                <span className="text-white/50 uppercase tracking-widest" style={{ fontSize: 14 }}>
                                    Asistencia registrada
                                </span>
                            </>
                        )}
                    </div>
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
