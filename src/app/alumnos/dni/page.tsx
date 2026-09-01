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
    const [actividad, setActividad] = useState('Musculación');
    const isLoadingRef = useRef(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [keyboard, setKeyboard] = useState<any>(null);
    const [acento, setAcento] = useState('#f97316');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

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

    const handleKeyboardChange = (input: string) => {
        const formattedInput = formatDNIWithDots(input);
        dniRef.current = formattedInput;
        setDni(formattedInput);
        if (keyboard) keyboard.setInput(formattedInput);
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
            if (!asistenciaResponse.ok) {
                const errorText = await asistenciaResponse.text();
                throw new Error(errorText);
            }
            Swal.fire({
                ...swalNotify,
                icon: 'success',
                title: `¡Hola ${alumno.nombre}!`,
                text: `Asistencia de ${actividad} registrada.`,
                showConfirmButton: false,
                timer: 4000,
            });
            dniRef.current = '';
            setDni('');
            if (keyboard) keyboard.setInput('');
        } catch (error: any) {
            if (error.message.includes('Asistencia ya registrada')) {
                Swal.fire({ ...swalNotify, icon: 'info', title: 'Ya registrada', text: `Ya se registró una asistencia para ${actividad} hoy.` });
            } else {
                const ingreso = { dni: cleanDNI, actividad, fecha, presente: true, nombre: 'Alumno' };
                await addIngreso(ingreso);
                Swal.fire({ ...swalNotify, icon: 'info', title: '¡Hola!', text: `Tu asistencia para "${actividad}" será registrada al reconectarse.` });
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
        const ingresosPendientes = await getIngresosPendientes();
        for (const ingreso of ingresosPendientes) {
            try {
                const responseAlumno = await fetch(`/api/alumnos?dni=${ingreso.dni}`);
                if (!responseAlumno.ok) continue;
                const alumno = await responseAlumno.json();
                const response = await fetch(`/api/asistencias/${alumno._id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ingreso),
                });
                if (response.ok || response.status === 400) await deleteIngreso(ingreso.id);
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
                if (d.logoUrl) setLogoUrl(d.logoUrl);
            })
            .catch(() => {});
        return () => window.removeEventListener('online', syncIngresosPendientes);
    }, []);

    const ACTIVIDADES = ['Musculación', 'Intermitente', 'Otro'] as const;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ background: '#111' }}>

            {/* Spinner de carga global */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                    <div className="w-14 h-14 rounded-full border-4 border-white/10 animate-spin" style={{ borderTopColor: acento }} />
                </div>
            )}

            {/* Logo o título */}
            <div className="mb-6 flex flex-col items-center gap-3">
                {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Gimnasio" style={{ maxHeight: 72, maxWidth: 220, objectFit: 'contain' }} />
                ) : (
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: acento }}>
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                    </div>
                )}
                <p className="text-white/40 text-xs font-semibold uppercase tracking-widest">Registro de asistencia</p>
            </div>

            {/* Card principal */}
            <div className="w-full max-w-sm">

                {/* Display DNI */}
                <div
                    className="rounded-2xl mb-4 flex items-center justify-center min-h-[72px] px-6"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.10)' }}
                >
                    {dni ? (
                        <span className="text-white font-bold tracking-[0.2em]" style={{ fontSize: 36, fontFamily: "'Courier New', monospace" }}>
                            {dni}
                        </span>
                    ) : (
                        <span className="text-white/20 font-bold tracking-[0.2em]" style={{ fontSize: 36, fontFamily: "'Courier New', monospace" }}>
                            — — — — — —
                        </span>
                    )}
                </div>

                {/* Selector de actividad */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {ACTIVIDADES.map(act => {
                        const isActive = actividad === act;
                        return (
                            <button
                                key={act}
                                type="button"
                                onClick={() => setActividad(act)}
                                disabled={isLoading}
                                className="h-14 rounded-xl text-sm font-bold transition-all active:scale-95"
                                style={isActive
                                    ? { background: acento, color: '#fff', boxShadow: `0 4px 16px ${acento}55` }
                                    : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }
                                }
                            >
                                {act}
                            </button>
                        );
                    })}
                </div>

                {/* Teclado */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Keyboard
                        keyboardRef={(r) => setKeyboard(r)}
                        onChange={handleKeyboardChange}
                        onKeyPress={(button) => {
                            if (button === '{submit}') {
                                handleSubmit(new Event('submit') as unknown as React.FormEvent);
                            }
                        }}
                        inputName="dni"
                        theme="hg-theme-default hg-layout-numeric my-custom-keyboard"
                        layout={{
                            default: ['1 2 3', '4 5 6', '7 8 9', '{bksp} 0 {submit}'],
                        }}
                        display={{
                            '{bksp}': '⌫',
                            '{submit}': isLoading ? '...' : 'Registrar',
                        }}
                    />
                </div>

                {/* Indicador sync */}
                {isSyncing && (
                    <p className="text-center text-white/30 text-xs mt-3 font-medium">Sincronizando ingresos pendientes...</p>
                )}
            </div>
        </div>
    );
}
