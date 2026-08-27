'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface GymInfo {
    nombre: string;
    alias: string;
}

type Area = 'salud' | 'fitness' | 'rendimiento' | 'formacion';

const AREAS: { value: Area; label: string; emoji: string; desc: string }[] = [
    {
        value: 'salud',
        label: 'Mejorar mi salud',
        emoji: '❤️',
        desc: 'Me quiero sentir mejor o estaba sedentario/a por falta de actividad física.',
    },
    {
        value: 'fitness',
        label: 'Fitness / Estética',
        emoji: '💪',
        desc: 'Quiero verme mejor y hacer un cambio físico.',
    },
    {
        value: 'rendimiento',
        label: 'Rendimiento deportivo',
        emoji: '🏅',
        desc: 'Quiero mejorar en mi deporte o tengo un objetivo deportivo específico.',
    },
    {
        value: 'formacion',
        label: 'Formación',
        emoji: '🌱',
        desc: 'Nunca entrené, soy niño/a (desde los 10 años) o adolescente (13 a 17 años).',
    },
];

export default function RegistroPage() {
    const { alias } = useParams<{ alias: string }>();

    const [gym, setGym] = useState<GymInfo | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [step, setStep] = useState(1);
    const TOTAL_STEPS = 4; // se irá completando con los pasos siguientes

    const [form, setForm] = useState({
        area: '' as Area | '',
        nombre: '',
        apellido: '',
        dni: '',
        fechaNacimiento: '',
        telefono: '',
        email: '',
        password: '',
        horarioEntrenamiento: '',
        horaExactaEntrenamiento: '',
        historialDeportivo: '',
        patologias: '',
        objetivos: '',
    });

    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/registro/${alias}`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(setGym)
            .catch(() => setNotFound(true));
    }, [alias]);

    const isSporttime = gym?.nombre?.toLowerCase().includes('sport');
    const accent = isSporttime ? '#f4a347' : '#10b981';
    const accentClass = isSporttime ? 'bg-[#f4a347]' : 'bg-emerald-500';
    const accentBorder = isSporttime ? 'border-[#f4a347]' : 'border-emerald-500';
    const accentText = isSporttime ? 'text-[#f4a347]' : 'text-emerald-600';

    function setField(field: string, value: string) {
        setForm(prev => ({ ...prev, [field]: value }));
        setError('');
    }

    function nextStep() {
        // validaciones por paso
        if (step === 1 && !form.area) {
            setError('Por favor seleccioná tu objetivo.');
            return;
        }
        setError('');
        setStep(s => s + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function prevStep() {
        setError('');
        setStep(s => s - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.nombre || !form.apellido || !form.dni || !form.fechaNacimiento || !form.email || !form.password) {
            setError('Por favor completá los campos obligatorios.');
            return;
        }
        if (form.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch(`/api/registro/${alias}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Error al registrarse. Intentá de nuevo.');
                return;
            }
            setSuccess(true);
        } catch {
            setError('Error de conexión. Intentá de nuevo.');
        } finally {
            setSubmitting(false);
        }
    }

    // ── Estados de carga / no encontrado ──────────────────────────────────

    if (notFound) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <p className="text-slate-500 text-lg">Gimnasio no encontrado.</p>
            </div>
        );
    }

    if (!gym) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-10 h-10 border-t-2 border-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-10 max-w-sm w-full text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Registro exitoso!</h2>
                    <p className="text-slate-500 text-base leading-relaxed">
                        Tu cuenta fue creada en <span className="font-semibold text-slate-700">{gym.nombre}</span>.
                        Ya podés iniciar sesión en la app.
                    </p>
                </div>
            </div>
        );
    }

    const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-colors";
    const labelClass = "block text-base font-bold text-slate-700 mb-2";
    const optionalClass = "ml-2 text-sm font-normal text-slate-400";

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-lg mx-auto px-4 pt-10 pb-16">

                {/* Logo + título */}
                <div className="text-center mb-8">
                    {isSporttime && (
                        <div className="flex justify-center mb-5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/sporttime2.jpg"
                                alt="Sporttime"
                                style={{ width: 160, height: 'auto', borderRadius: 16, objectFit: 'contain' }}
                            />
                        </div>
                    )}
                    <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                        Registrate en{' '}
                        <span style={{ color: accent }}>{gym.nombre}</span>
                    </h1>
                </div>

                {/* Barra de progreso */}
                <div className="flex items-center gap-2 mb-8">
                    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                        <div
                            key={i}
                            className="h-1.5 flex-1 rounded-full transition-all duration-300"
                            style={{ background: i < step ? accent : '#e2e8f0' }}
                        />
                    ))}
                </div>

                {/* ── PASO 1: Objetivo / Área ── */}
                {step === 1 && (
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Paso 1 de {TOTAL_STEPS}</p>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">¿Cuál es tu objetivo?</h2>
                        <p className="text-slate-500 text-base mb-6">Elegí la opción que mejor te describe.</p>

                        <div className="space-y-3">
                            {AREAS.map(a => {
                                const selected = form.area === a.value;
                                return (
                                    <button
                                        key={a.value}
                                        type="button"
                                        onClick={() => { setField('area', a.value); setError(''); }}
                                        className={`w-full text-left rounded-2xl border-2 px-5 py-4 transition-all active:scale-[0.98] ${
                                            selected
                                                ? `${accentBorder} bg-white shadow-md`
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl mt-0.5 leading-none">{a.emoji}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className={`font-bold text-base ${selected ? accentText : 'text-slate-800'}`}>
                                                    {a.label}
                                                </p>
                                                <p className="text-slate-500 text-sm mt-0.5 leading-snug">{a.desc}</p>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                                                selected ? `${accentBorder}` : 'border-slate-300'
                                            }`}>
                                                {selected && (
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: accent }} />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {error && (
                            <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-700 text-base font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={nextStep}
                            className={`mt-6 w-full py-5 rounded-2xl text-lg font-bold text-white transition-all ${accentClass}`}
                        >
                            Siguiente →
                        </button>
                    </div>
                )}

                {/* ── PASOS 2, 3, 4: se completarán con los detalles del usuario ── */}
                {step === 2 && (
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Paso 2 de {TOTAL_STEPS}</p>
                        {/* TODO: completar con paso 2 */}
                        <button type="button" onClick={prevStep} className="text-slate-500 text-sm mb-4">← Volver</button>
                        <button type="button" onClick={nextStep} className={`w-full py-5 rounded-2xl text-lg font-bold text-white ${accentClass}`}>Siguiente →</button>
                    </div>
                )}

                {step === 3 && (
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Paso 3 de {TOTAL_STEPS}</p>
                        {/* TODO: completar con paso 3 */}
                        <button type="button" onClick={prevStep} className="text-slate-500 text-sm mb-4">← Volver</button>
                        <button type="button" onClick={nextStep} className={`w-full py-5 rounded-2xl text-lg font-bold text-white ${accentClass}`}>Siguiente →</button>
                    </div>
                )}

                {/* ── PASO 4 (último): datos de cuenta + submit ── */}
                {step === 4 && (
                    <form onSubmit={handleSubmit} noValidate>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Paso 4 de {TOTAL_STEPS}</p>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Tus datos</h2>
                        <p className="text-slate-500 text-base mb-6">Completá tu información personal.</p>

                        <div className="space-y-5">

                            <div>
                                <label className={labelClass}>Nombre</label>
                                <input type="text" autoComplete="given-name" value={form.nombre}
                                    onChange={e => setField('nombre', e.target.value)} className={inputClass} />
                            </div>

                            <div>
                                <label className={labelClass}>Apellido</label>
                                <input type="text" autoComplete="family-name" value={form.apellido}
                                    onChange={e => setField('apellido', e.target.value)} className={inputClass} />
                            </div>

                            <div>
                                <label className={labelClass}>DNI</label>
                                <input type="text" inputMode="numeric" autoComplete="off" value={form.dni}
                                    onChange={e => setField('dni', e.target.value.replace(/\D/g, ''))} className={inputClass} />
                            </div>

                            <div>
                                <label className={labelClass}>Fecha de nacimiento</label>
                                <input type="date" value={form.fechaNacimiento}
                                    onChange={e => setField('fechaNacimiento', e.target.value)} className={inputClass} />
                            </div>

                            <div>
                                <label className={labelClass}>Teléfono <span className={optionalClass}>opcional</span></label>
                                <input type="tel" inputMode="tel" autoComplete="tel" value={form.telefono}
                                    onChange={e => setField('telefono', e.target.value)} className={inputClass} />
                            </div>

                            <div>
                                <label className={labelClass}>Email</label>
                                <input type="email" inputMode="email" autoComplete="email" value={form.email}
                                    onChange={e => setField('email', e.target.value)} className={inputClass} />
                            </div>

                            <div>
                                <label className={labelClass}>Contraseña</label>
                                <input type="password" autoComplete="new-password" value={form.password}
                                    onChange={e => setField('password', e.target.value)} className={inputClass} />
                                <p className="text-slate-400 text-sm mt-1.5 pl-1">Mínimo 6 caracteres.</p>
                            </div>

                            <div>
                                <label className={labelClass}>Horario de entrenamiento <span className={optionalClass}>opcional</span></label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['mañana', 'siesta', 'tarde'] as const).map(h => (
                                        <button key={h} type="button"
                                            onClick={() => setField('horarioEntrenamiento', form.horarioEntrenamiento === h ? '' : h)}
                                            className={`py-4 rounded-2xl text-base font-semibold border-2 transition-all capitalize ${
                                                form.horarioEntrenamiento === h
                                                    ? `${accentClass} ${accentBorder} text-white`
                                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                            }`}
                                        >{h}</button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Hora exacta <span className={optionalClass}>opcional</span></label>
                                <input type="time" value={form.horaExactaEntrenamiento}
                                    onChange={e => setField('horaExactaEntrenamiento', e.target.value)} className={inputClass} />
                            </div>

                            <div>
                                <label className={labelClass}>Historial deportivo <span className={optionalClass}>opcional</span></label>
                                <textarea rows={3} value={form.historialDeportivo}
                                    onChange={e => setField('historialDeportivo', e.target.value)}
                                    className={inputClass + ' resize-none'} />
                            </div>

                            <div>
                                <label className={labelClass}>Patologías / lesiones <span className={optionalClass}>opcional</span></label>
                                <textarea rows={3} value={form.patologias}
                                    onChange={e => setField('patologias', e.target.value)}
                                    className={inputClass + ' resize-none'} />
                            </div>

                            <div>
                                <label className={labelClass}>Objetivos <span className={optionalClass}>opcional</span></label>
                                <textarea rows={3} value={form.objetivos}
                                    onChange={e => setField('objetivos', e.target.value)}
                                    className={inputClass + ' resize-none'} />
                            </div>

                        </div>

                        {error && (
                            <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-700 text-base font-medium">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={prevStep}
                                className="py-5 px-6 rounded-2xl text-base font-bold text-slate-600 bg-slate-100 active:bg-slate-200 transition-all">
                                ←
                            </button>
                            <button type="submit" disabled={submitting}
                                className={`flex-1 py-5 rounded-2xl text-lg font-bold text-white transition-all disabled:opacity-60 ${accentClass}`}>
                                {submitting ? 'Registrando...' : 'Crear mi cuenta'}
                            </button>
                        </div>
                    </form>
                )}

            </div>
        </div>
    );
}
