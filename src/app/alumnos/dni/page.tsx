'use client';
import React, { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { swalNotify, swalDanger } from '@/utils/swalConfig';
import { signOut } from 'next-auth/react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import './keyboardStyles.css';
import { addIngreso, getIngresosPendientes, deleteIngreso } from '@/utils/indexedDB';

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

    const handleKeyPress = (button: string) => {
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
        // Reiniciar timer de inactividad solo si hay dígitos
        if (newDigits.length > 0) resetInactivityTimer();
        else cancelInactivityTimer();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoadingRef.current) return;
        const cleanDNI = dniRef.current.replace(/\./g, '');
        if (cleanDNI.length < 7 || cleanDNI.length > 8) {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'DNI inválido', text: 'El DNI debe tener 7 u 8 dígitos.' });
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
            const actividadColor = actividad === 'Musculación' ? acento2 : acento;
            Swal.fire({
                customClass: { popup: 'swal-dni-success' },
                buttonsStyling: false,
                title: `¡Hola, ${alumno.nombre}!`,
                html: `
                    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <circle cx="24" cy="24" r="23" stroke="${actividadColor}" stroke-width="2" stroke-opacity="0.4"/>
                            <path d="M14 24.5L21 31.5L34 17" stroke="${actividadColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span style="display:inline-flex;align-items:center;padding:6px 20px;background:${actividadColor}22;color:${actividadColor};border-radius:999px;font-weight:700;font-size:0.9rem;border:1.5px solid ${actividadColor}44;letter-spacing:0.01em">${actividad}</span>
                        <span style="color:rgba(0,0,0,0.35);font-size:0.8rem;letter-spacing:0.05em;text-transform:uppercase">Asistencia registrada</span>
                    </div>
                `,
                showConfirmButton: false,
                timer: 4000,
                timerProgressBar: true,
                backdrop: 'rgba(0,0,0,0.55)',
            });
            clearDNI();
            cancelInactivityTimer();
        } catch (error: any) {
            if (error.message === 'no_encontrado') {
                Swal.fire({ ...swalNotify, icon: 'warning', title: 'No encontrado', text: 'No hay ningún alumno registrado con ese DNI.' });
            } else if (error.message.includes('Asistencia ya registrada')) {
                Swal.fire({ ...swalNotify, icon: 'info', title: 'Ya registrada', text: `Ya se registró asistencia para ${actividad} hoy.` });
            } else {
                await addIngreso({ dni: cleanDNI, actividad, fecha });
                Swal.fire({ ...swalNotify, icon: 'info', title: 'Sin conexión', text: `La asistencia para "${actividad}" se registrará al reconectarse.` });
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
            })
            .catch(() => {});
        return () => {
            window.removeEventListener('online', syncIngresosPendientes);
            cancelInactivityTimer();
        };
    }, []);

    const ACTIVIDADES = [
        { label: 'Musculación', color: acento2 },
        { label: 'Intermitente', color: acento },
    ] as const;

    return (
        <div
            className="fixed inset-0 flex flex-col overflow-hidden"
            style={{
                background: '#111',
                touchAction: 'none',
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
        >
            {/* Spinner de carga */}
            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)' }}>
                    <div className="w-14 h-14 rounded-full border-4 border-white/10 animate-spin" style={{ borderTopColor: acento }} />
                </div>
            )}

            {/* Botón cerrar sesión — esquina superior izquierda, casi invisible */}
            <button
                onClick={async () => {
                    const first = await Swal.fire({ ...swalDanger, title: 'Cerrar sesión', text: '¿Querés salir?', icon: 'question', showCancelButton: true, confirmButtonText: 'Salir', cancelButtonText: 'Cancelar' });
                    if (!first.isConfirmed) return;
                    const second = await Swal.fire({ ...swalDanger, title: '¿Seguro?', text: 'Se cerrará la sesión en este dispositivo.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, cerrar', cancelButtonText: 'Cancelar' });
                    if (second.isConfirmed) signOut();
                }}
                className="absolute z-10 top-3 left-3 w-9 h-9 flex items-center justify-center rounded-xl opacity-20 hover:opacity-40 active:opacity-60 transition-opacity"
                style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
                aria-label="Cerrar sesión"
            >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                </svg>
            </button>

            <div className="flex flex-col w-full mx-auto px-3 sm:px-5 pt-8 sm:pt-10 gap-2" style={{ height: '100%' }}>

                {/* Logo del gimnasio */}
                <div className="flex items-center justify-center flex-none" style={{ height: 90 }}>
                    {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoUrl}
                            alt={gymNombre || 'Gimnasio'}
                            style={{ maxHeight: 90, maxWidth: '72%', objectFit: 'contain' }}
                        />
                    ) : (
                        <span className="text-white font-bold text-2xl tracking-tight">{gymNombre}</span>
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
                    {/* Label */}
                    <span className="absolute top-1.5 left-3" style={{
                        fontSize: 9, color: 'rgba(0,0,0,0.25)', fontFamily: 'monospace',
                        fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                    }}>DNI</span>
                    {/* Número */}
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

                {/* Actividad */}
                <div className="grid grid-cols-2 gap-2 flex-none">
                    {ACTIVIDADES.map(({ label, color }) => {
                        const isActive = actividad === label;
                        return (
                            <button
                                key={label}
                                type="button"
                                onClick={() => setActividad(label)}
                                disabled={isLoading}
                                className="h-14 rounded-xl text-base font-bold transition-all active:scale-95"
                                style={isActive
                                    ? { background: color, color: '#fff', boxShadow: `0 4px 14px ${color}55` }
                                    : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }
                                }
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

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
                        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
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
