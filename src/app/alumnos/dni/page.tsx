'use client';
import React, { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { swalNotify } from '@/utils/swalConfig';
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

    const handleKeyPress = (button: string) => {
        if (button === '{submit}') {
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
        // Sync internal keyboard state with raw digits (no dots)
        if (keyboardRef.current) keyboardRef.current.setInput(newDigits);
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
            if (!response.ok) throw new Error('Error al buscar alumno');
            const alumno = await response.json();
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
                        <span style="color:rgba(255,255,255,0.3);font-size:0.8rem;letter-spacing:0.05em;text-transform:uppercase">Asistencia registrada</span>
                    </div>
                `,
                showConfirmButton: false,
                timer: 4000,
                timerProgressBar: true,
                backdrop: 'rgba(0,0,0,0.85)',
            });
            dniRef.current = '';
            setDni('');
            if (keyboard) keyboard.setInput('');
        } catch (error: any) {
            if (error.message.includes('Asistencia ya registrada')) {
                Swal.fire({ ...swalNotify, icon: 'info', title: 'Ya registrada', text: `Ya se registró asistencia para ${actividad} hoy.` });
            } else {
                await addIngreso({ dni: cleanDNI, actividad, fecha });
                Swal.fire({ ...swalNotify, icon: 'info', title: '¡Hola!', text: `Tu asistencia para "${actividad}" se registrará al reconectarse.` });
            }
            dniRef.current = '';
            setDni('');
            if (keyboard) keyboard.setInput('');
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
            })
            .catch(() => {});
        return () => window.removeEventListener('online', syncIngresosPendientes);
    }, []);

    const ACTIVIDADES = [
        { label: 'Musculación', color: acento2 },
        { label: 'Intermitente', color: acento },
    ] as const;

    return (
        /* Ocupa todo el espacio bajo el header, sin scroll, fondo negro */
        <div
            className="fixed left-0 right-0 bottom-0 flex flex-col overflow-hidden"
            style={{
                top: 'calc(88px + env(safe-area-inset-top, 0px))',
                background: '#111',
                touchAction: 'none',
            }}
        >
            {/* Spinner de carga */}
            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)' }}>
                    <div className="w-14 h-14 rounded-full border-4 border-white/10 animate-spin" style={{ borderTopColor: acento }} />
                </div>
            )}

            <div className="flex flex-col w-full mx-auto px-3 sm:px-5 pt-4 sm:pt-3 gap-2 sm:gap-2" style={{ height: '100%' }}>

                {/* Display DNI — pantalla digital */}
                <div
                    className="rounded-2xl flex-none relative overflow-hidden flex items-center justify-center"
                    style={{
                        height: 96,
                        background: '#080808',
                        border: '1.5px solid rgba(255,255,255,0.06)',
                        boxShadow: 'inset 0 3px 16px rgba(0,0,0,0.95), inset 0 -1px 4px rgba(255,255,255,0.03)',
                    }}
                >
                    {/* Scanlines */}
                    <div className="absolute inset-0 pointer-events-none" style={{
                        backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.014) 0px, rgba(255,255,255,0.014) 1px, transparent 1px, transparent 5px)',
                    }} />
                    {/* Label */}
                    <span className="absolute top-2 left-3.5" style={{
                        fontSize: 9, color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace',
                        fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                    }}>DNI</span>
                    {/* Número */}
                    {dni ? (
                        <span style={{
                            fontSize: 46,
                            fontFamily: "var(--font-geist-mono), 'Roboto Mono', monospace",
                            fontWeight: 600,
                            letterSpacing: '0.18em',
                            color: '#f1f5f9',
                            textShadow: '0 0 18px rgba(255,255,255,0.35), 0 0 6px rgba(255,255,255,0.15)',
                        }}>
                            {dni}
                        </span>
                    ) : (
                        <span style={{
                            fontSize: 46,
                            fontFamily: "var(--font-geist-mono), 'Roboto Mono', monospace",
                            fontWeight: 600,
                            letterSpacing: '0.18em',
                            color: 'rgba(255,255,255,0.07)',
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
                                className="h-12 rounded-xl text-sm font-bold transition-all active:scale-95"
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
