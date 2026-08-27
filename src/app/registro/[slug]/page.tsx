'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface GymInfo { nombre: string; alias: string; logoUrl?: string | null; }
type Area = 'salud' | 'fitness' | 'rendimiento' | 'formacion';
type NivelExp = 'nunca' | 'alguna_vez' | 'hace_tiempo';

const AREAS: { value: Area; label: string; emoji: string; desc: string }[] = [
    { value: 'salud',       label: 'Mejorar mi salud',        emoji: '❤️', desc: 'Me quiero sentir mejor o estaba sedentario/a por falta de actividad física.' },
    { value: 'fitness',     label: 'Fitness / Estética',      emoji: '💪', desc: 'Quiero verme mejor y hacer un cambio físico.' },
    { value: 'rendimiento', label: 'Rendimiento deportivo',   emoji: '🏅', desc: 'Quiero mejorar en mi deporte o tengo un objetivo deportivo específico.' },
    { value: 'formacion',   label: 'Formación',               emoji: '🌱', desc: 'Nunca entrené, soy niño/a (desde los 10 años) o adolescente (13 a 17 años).' },
];

const NIVELES: { value: NivelExp; label: string; desc: string }[] = [
    { value: 'nunca',       label: 'Nunca entrenó',        desc: 'Es mi primera vez en un gimnasio.' },
    { value: 'alguna_vez',  label: 'Entrenó alguna vez',   desc: 'Tuve experiencia antes pero llevo tiempo sin entrenar.' },
    { value: 'hace_tiempo', label: 'Entrena hace tiempo',  desc: 'Tengo entrenamiento continuo y regular.' },
];

const DIAS = [2, 3, 4, 5];

const TOTAL_STEPS = 5;

export default function RegistroPage() {
    const { slug } = useParams<{ slug: string }>();
    const [gym, setGym] = useState<GymInfo | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [step, setStep] = useState(1);

    const [form, setForm] = useState({
        // paso 1
        areaElegida: '' as Area | '',
        // paso 2
        tieneCondicion: '' as 'si' | 'no' | '',
        condicionDetalle: '',
        // paso 3
        nivelExperiencia: '' as NivelExp | '',
        // paso 4
        diasEntrenaSemana: 0,
        // paso 5 - datos personales
        nombre: '', apellido: '', dni: '', fechaNacimiento: '',
        telefono: '', email: '', password: '',
        horarioEntrenamiento: '', horaExactaEntrenamiento: '',
        historialDeportivo: '', patologias: '', objetivos: '',
    });

    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/registro/${slug}`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(setGym)
            .catch(() => setNotFound(true));
    }, [slug]);

    const isSporttime = gym?.nombre?.toLowerCase().includes('sport');
    const accent = isSporttime ? '#f4a347' : '#10b981';
    const accentClass = isSporttime ? 'bg-[#f4a347]' : 'bg-emerald-500';
    const accentBorder = isSporttime ? 'border-[#f4a347]' : 'border-emerald-500';
    const accentText = isSporttime ? 'text-[#f4a347]' : 'text-emerald-600';

    function setField<K extends keyof typeof form>(field: K, value: typeof form[K]) {
        setForm(prev => ({ ...prev, [field]: value }));
        setError('');
    }

    function nextStep() {
        if (step === 1 && !form.areaElegida) { setError('Por favor seleccioná tu objetivo.'); return; }
        if (step === 2 && !form.tieneCondicion) { setError('Por favor respondé la pregunta.'); return; }
        if (step === 3 && !form.nivelExperiencia) { setError('Por favor seleccioná tu nivel.'); return; }
        if (step === 4 && !form.diasEntrenaSemana) { setError('Por favor seleccioná los días.'); return; }
        setError('');
        setStep(s => s + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function prevStep() {
        setError('');
        setStep(s => s - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // El área final: si tiene condición → salud, sino lo del paso 1
    const areaFinal: Area = form.tieneCondicion === 'si' ? 'salud' : (form.areaElegida as Area);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.nombre || !form.apellido || !form.dni || !form.fechaNacimiento || !form.email || !form.password) {
            setError('Por favor completá los campos obligatorios.');
            return;
        }
        if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch(`/api/registro/${slug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: form.nombre,
                    apellido: form.apellido,
                    dni: form.dni,
                    fechaNacimiento: form.fechaNacimiento,
                    telefono: form.telefono,
                    email: form.email,
                    password: form.password,
                    area: areaFinal,
                    nivelExperiencia: form.nivelExperiencia,
                    diasEntrenaSemana: form.diasEntrenaSemana,
                    horarioEntrenamiento: form.horarioEntrenamiento,
                    horaExactaEntrenamiento: form.horaExactaEntrenamiento,
                    historialDeportivo: form.historialDeportivo,
                    patologias: form.tieneCondicion === 'si' ? form.condicionDetalle : form.patologias,
                    objetivos: form.objetivos,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Error al registrarse. Intentá de nuevo.'); return; }
            setSuccess(true);
        } catch {
            setError('Error de conexión. Intentá de nuevo.');
        } finally {
            setSubmitting(false);
        }
    }

    // ── Estados base ──────────────────────────────────────────────────────

    if (notFound) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <p className="text-slate-500 text-lg">Gimnasio no encontrado.</p>
        </div>
    );

    if (!gym) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-10 h-10 border-t-2 border-emerald-500 rounded-full animate-spin" />
        </div>
    );

    if (success) return (
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

    const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-colors";
    const labelClass = "block text-base font-bold text-slate-700 mb-2";
    const optionalClass = "ml-2 text-sm font-normal text-slate-400";

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-lg mx-auto px-4 pt-10 pb-16">

                {/* Logos */}
                <div className="flex items-center justify-center gap-4 mb-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/icons/gymmy-android.png"
                        alt="Gymmy"
                        style={{ height: 36, width: 36, objectFit: 'contain', borderRadius: 8 }}
                    />
                    {gym.logoUrl && (
                        <>
                            <div style={{ width: 1, height: 36, background: '#e2e8f0' }} />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={gym.logoUrl}
                                alt={gym.nombre}
                                style={{ height: 40, maxWidth: 120, objectFit: 'contain' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        </>
                    )}
                </div>

                {/* Título */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                        Registrate en <span style={{ color: accent }}>{gym.nombre}</span>
                    </h1>
                </div>

                {/* Barra de progreso */}
                <div className="flex items-center gap-2 mb-8">
                    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                        <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
                            style={{ background: i < step ? accent : '#e2e8f0' }} />
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
                                const sel = form.areaElegida === a.value;
                                return (
                                    <button key={a.value} type="button"
                                        onClick={() => setField('areaElegida', a.value)}
                                        className={`w-full text-left rounded-2xl border-2 px-5 py-4 transition-all active:scale-[0.98] ${sel ? `${accentBorder} bg-white shadow-md` : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl mt-0.5 leading-none">{a.emoji}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className={`font-bold text-base ${sel ? accentText : 'text-slate-800'}`}>{a.label}</p>
                                                <p className="text-slate-500 text-sm mt-0.5 leading-snug">{a.desc}</p>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${sel ? accentBorder : 'border-slate-300'}`}>
                                                {sel && <div className="w-2.5 h-2.5 rounded-full" style={{ background: accent }} />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {error && <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-700 text-base font-medium">{error}</div>}
                        <button type="button" onClick={nextStep} className={`mt-6 w-full py-5 rounded-2xl text-lg font-bold text-white transition-all ${accentClass}`}>
                            Siguiente →
                        </button>
                    </div>
                )}

                {/* ── PASO 2: Condición física ── */}
                {step === 2 && (
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Paso 2 de {TOTAL_STEPS}</p>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Condición física</h2>
                        <p className="text-slate-500 text-base mb-6">¿Tenés alguna lesión, dolor o condición que debamos tener en cuenta?</p>

                        <div className="flex gap-3 mb-5">
                            {(['no', 'si'] as const).map(op => {
                                const sel = form.tieneCondicion === op;
                                return (
                                    <button key={op} type="button"
                                        onClick={() => { setField('tieneCondicion', op); if (op === 'no') setField('condicionDetalle', ''); }}
                                        className={`flex-1 py-5 rounded-2xl border-2 text-lg font-bold transition-all active:scale-[0.97] ${sel ? `${accentBorder} ${accentClass} text-white` : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                                        {op === 'no' ? 'No' : 'Sí'}
                                    </button>
                                );
                            })}
                        </div>

                        {form.tieneCondicion === 'si' && (
                            <div>
                                <label className={labelClass}>Contanos qué tenés</label>
                                <textarea rows={4}
                                    placeholder="Describí tu lesión, dolor o condición..."
                                    value={form.condicionDetalle}
                                    onChange={e => setField('condicionDetalle', e.target.value)}
                                    className={inputClass + ' resize-none'}
                                />
                                <p className="text-slate-400 text-sm mt-2 pl-1">
                                    Serás asignado al área <strong>Salud</strong> para un seguimiento adecuado.
                                </p>
                            </div>
                        )}

                        {error && <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-700 text-base font-medium">{error}</div>}

                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={prevStep}
                                className="py-5 px-6 rounded-2xl text-base font-bold text-slate-600 bg-slate-100 active:bg-slate-200 transition-all">←</button>
                            <button type="button" onClick={nextStep}
                                className={`flex-1 py-5 rounded-2xl text-lg font-bold text-white transition-all ${accentClass}`}>
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PASO 3: Nivel de experiencia ── */}
                {step === 3 && (
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Paso 3 de {TOTAL_STEPS}</p>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Nivel de experiencia</h2>
                        <p className="text-slate-500 text-base mb-6">¿Cuánta experiencia tenés entrenando?</p>

                        <div className="space-y-3">
                            {NIVELES.map(n => {
                                const sel = form.nivelExperiencia === n.value;
                                return (
                                    <button key={n.value} type="button"
                                        onClick={() => setField('nivelExperiencia', n.value)}
                                        className={`w-full text-left rounded-2xl border-2 px-5 py-4 transition-all active:scale-[0.98] ${sel ? `${accentBorder} bg-white shadow-md` : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className={`font-bold text-base ${sel ? accentText : 'text-slate-800'}`}>{n.label}</p>
                                                <p className="text-slate-500 text-sm mt-0.5">{n.desc}</p>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${sel ? accentBorder : 'border-slate-300'}`}>
                                                {sel && <div className="w-2.5 h-2.5 rounded-full" style={{ background: accent }} />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {error && <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-700 text-base font-medium">{error}</div>}

                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={prevStep}
                                className="py-5 px-6 rounded-2xl text-base font-bold text-slate-600 bg-slate-100 active:bg-slate-200 transition-all">←</button>
                            <button type="button" onClick={nextStep}
                                className={`flex-1 py-5 rounded-2xl text-lg font-bold text-white transition-all ${accentClass}`}>
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PASO 4: Días de entrenamiento ── */}
                {step === 4 && (
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Paso 4 de {TOTAL_STEPS}</p>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Días de entrenamiento</h2>
                        <p className="text-slate-500 text-base mb-6">¿Cuántos días por semana vas a entrenar musculación?</p>

                        <div className="grid grid-cols-4 gap-3">
                            {DIAS.map(d => {
                                const sel = form.diasEntrenaSemana === d;
                                return (
                                    <button key={d} type="button"
                                        onClick={() => setField('diasEntrenaSemana', d)}
                                        className={`py-6 rounded-2xl border-2 text-2xl font-bold transition-all active:scale-[0.95] ${sel ? `${accentBorder} text-white ${accentClass} shadow-md` : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                                        {d}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-slate-400 text-sm text-center mt-3">días por semana</p>

                        {error && <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-700 text-base font-medium">{error}</div>}

                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={prevStep}
                                className="py-5 px-6 rounded-2xl text-base font-bold text-slate-600 bg-slate-100 active:bg-slate-200 transition-all">←</button>
                            <button type="button" onClick={nextStep}
                                className={`flex-1 py-5 rounded-2xl text-lg font-bold text-white transition-all ${accentClass}`}>
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PASO 5: Datos personales + submit ── */}
                {step === 5 && (
                    <form onSubmit={handleSubmit} noValidate>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Paso 5 de {TOTAL_STEPS}</p>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Tus datos</h2>
                        <p className="text-slate-500 text-base mb-6">Completá tu información personal para crear la cuenta.</p>

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
                                <label className={labelClass}>Horario <span className={optionalClass}>opcional</span></label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['mañana', 'siesta', 'tarde'] as const).map(h => (
                                        <button key={h} type="button"
                                            onClick={() => setField('horarioEntrenamiento', form.horarioEntrenamiento === h ? '' : h)}
                                            className={`py-4 rounded-2xl text-base font-semibold border-2 transition-all capitalize ${form.horarioEntrenamiento === h ? `${accentClass} ${accentBorder} text-white` : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                            {h}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {error && <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-700 text-base font-medium">{error}</div>}

                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={prevStep}
                                className="py-5 px-6 rounded-2xl text-base font-bold text-slate-600 bg-slate-100 active:bg-slate-200 transition-all">←</button>
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
