'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface GymInfo { nombre: string; alias: string; logoUrl?: string | null; }
type Area = 'salud' | 'fitness' | 'rendimiento' | 'formacion';
type NivelExp = 'nunca' | 'alguna_vez' | 'hace_tiempo';

const AREAS: { value: Area; label: string; emoji: string; desc: string }[] = [
    { value: 'salud',       label: 'Salud',       emoji: '❤️', desc: 'Quiero mejorar mi salud general o tengo falta de actividad física.' },
    { value: 'fitness',     label: 'Fitness',     emoji: '💪', desc: 'Quiero verme mejor estéticamente y hacer un cambio físico.' },
    { value: 'rendimiento', label: 'Rendimiento',  emoji: '🏅', desc: 'Quiero mejorar en un deporte o tengo un objetivo deportivo específico.' },
    { value: 'formacion',   label: 'Formación',              emoji: '🌱', desc: 'Nunca entrené, soy niño/a (desde los 10 años) o adolescente (13 a 17 años).' },
];

const NIVELES: { value: NivelExp; label: string; desc: string }[] = [
    { value: 'nunca',       label: 'Nunca entrenó',       desc: 'Es mi primera vez en un gimnasio.' },
    { value: 'alguna_vez',  label: 'Entrenó alguna vez',  desc: 'Tuve experiencias anteriores, pero llevo tiempo sin entrenar.' },
    { value: 'hace_tiempo', label: 'Entrena hace tiempo', desc: 'Tengo entrenamiento continuo y regular.' },
];

const DIAS_MES = Array.from({ length: 31 }, (_, i) => i + 1);
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ANIOS = Array.from({ length: 96 }, (_, i) => 2016 - i); // 10 a 105 años

const DIAS_SEMANA = [2, 3, 4, 5];
const TOTAL_STEPS = 5;

function toTitleCase(str: string) {
    return str.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
}

export default function RegistroPage() {
    const { slug } = useParams<{ slug: string }>();
    const [gym, setGym] = useState<GymInfo | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [step, setStep] = useState(1);

    const [form, setForm] = useState({
        nombre: '', apellido: '', dni: '',
        diaNac: '', mesNac: '', anioNac: '',
        telefono: '',
        horarioEntrenamiento: '',
        areaElegida: '' as Area | '',
        tieneCondicion: '' as 'si' | 'no' | '',
        condicionDetalle: '',
        nivelExperiencia: '' as NivelExp | '',
        diasEntrenaSemana: 0,
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
    const orange = isSporttime ? '#f4a347' : '#10b981';
    const green  = isSporttime ? '#16a34a' : '#059669';

    function setField<K extends keyof typeof form>(field: K, value: typeof form[K]) {
        setForm(prev => ({ ...prev, [field]: value }));
        setError('');
    }

    function nextStep() {
        if (step === 1) {
            if (!form.nombre.trim())   { setError('Ingresá tu nombre.');            return; }
            if (!form.apellido.trim()) { setError('Ingresá tu apellido.');          return; }
            if (!form.dni.trim())      { setError('Ingresá tu DNI.');               return; }
            if (!form.diaNac || !form.mesNac || !form.anioNac) {
                setError('Ingresá tu fecha de nacimiento completa.'); return;
            }
            if (!form.telefono.trim()) { setError('Ingresá tu teléfono.');          return; }
        }
        if (step === 2 && !form.areaElegida)      { setError('Por favor seleccioná tu objetivo.'); return; }
        if (step === 3 && !form.tieneCondicion)   { setError('Por favor respondé la pregunta.');   return; }
        if (step === 4 && !form.nivelExperiencia) { setError('Por favor seleccioná tu nivel.');    return; }
        setError('');
        setStep(s => s + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function prevStep() {
        setError('');
        setStep(s => s - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const areaFinal: Area = form.tieneCondicion === 'si' ? 'salud' : (form.areaElegida as Area);

    async function handleSubmit() {
        if (!form.diasEntrenaSemana) { setError('Por favor seleccioná los días.'); return; }
        setSubmitting(true);
        setError('');
        const mes = String(MESES.indexOf(form.mesNac) + 1).padStart(2, '0');
        const dia = form.diaNac.padStart(2, '0');
        const fechaNacimiento = `${form.anioNac}-${mes}-${dia}`;
        try {
            const res = await fetch(`/api/registro/${slug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: form.nombre,
                    apellido: form.apellido,
                    dni: form.dni,
                    fechaNacimiento,
                    telefono: form.telefono,
                    area: areaFinal,
                    nivelExperiencia: form.nivelExperiencia,
                    diasEntrenaSemana: form.diasEntrenaSemana,
                    horarioEntrenamiento: form.horarioEntrenamiento,
                    patologias: form.tieneCondicion === 'si' ? form.condicionDetalle : '',
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

    if (notFound) return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
            <p className="text-slate-400 text-lg">Gimnasio no encontrado.</p>
        </div>
    );
    if (!gym) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-t-2 animate-spin" style={{ borderColor: orange }} />
        </div>
    );
    if (success) return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-10 max-w-sm w-full text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: `${green}22` }}>
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke={green}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Registro exitoso!</h2>
                <p className="text-slate-500 text-base leading-relaxed">
                    Tu cuenta fue creada en <span className="font-semibold text-slate-700">{gym.nombre}</span>. Ya podés iniciar sesión en la app.
                </p>
            </div>
        </div>
    );

    const inputStyle = (val: string): React.CSSProperties => ({
        width: '100%', boxSizing: 'border-box',
        background: 'white', border: `1.5px solid ${val ? orange : '#e2e8f0'}`,
        borderRadius: 16, padding: '14px 18px',
        fontSize: 16, color: '#0f172a',
        outline: 'none', display: 'block',
        WebkitAppearance: 'none',
    });
    const selectStyle = (val: string): React.CSSProperties => ({
        ...inputStyle(val),
        appearance: 'none' as const,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
        paddingRight: 36,
        color: val ? '#0f172a' : '#94a3b8',
    });

    const labelClass = "block text-base font-semibold text-slate-700 mb-1.5";

    const errBox = error ? (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-3 text-red-600 text-base font-medium">{error}</div>
    ) : null;

    const BtnBack = () => (
        <button type="button" onClick={prevStep}
            className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-500 bg-slate-100 active:bg-slate-200 transition-all flex-shrink-0 text-lg font-bold">
            ←
        </button>
    );
    const BtnNext = ({ label = 'Siguiente →', onClick }: { label?: string; onClick?: () => void }) => (
        <button type="button" onClick={onClick ?? nextStep} disabled={submitting}
            className="w-full py-5 rounded-2xl text-lg font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ background: green }}>
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="px-6 pt-10 pb-6" style={{ background: '#000' }}>
                {gym.logoUrl && (
                    <div className="flex justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={gym.logoUrl} alt={gym.nombre}
                            style={{ maxWidth: 260, maxHeight: 130, objectFit: 'contain' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                )}
            </div>

            <div className="max-w-lg mx-auto px-4 pt-6 pb-16">
                {/* Progreso */}
                <div className="flex items-center gap-1.5 mb-7">
                    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                        <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
                            style={{ background: i < step ? orange : '#e2e8f0' }} />
                    ))}
                </div>

                {/* ── PASO 1: Datos personales ── */}
                {step === 1 && (
                    <div>
                        <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: orange }}>Paso 1 de {TOTAL_STEPS}</p>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Tus datos</h2>
                        <p className="text-slate-600 text-base mb-6">Completá tu información para crear la cuenta.</p>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Nombre</label>
                                    <input type="text" autoComplete="given-name" value={form.nombre}
                                        onChange={e => setField('nombre', e.target.value)}
                                        onBlur={e => setField('nombre', toTitleCase(e.target.value))}
                                        style={inputStyle(form.nombre)} />
                                </div>
                                <div>
                                    <label className={labelClass}>Apellido</label>
                                    <input type="text" autoComplete="family-name" value={form.apellido}
                                        onChange={e => setField('apellido', e.target.value)}
                                        onBlur={e => setField('apellido', toTitleCase(e.target.value))}
                                        style={inputStyle(form.apellido)} />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>DNI</label>
                                <input type="text" inputMode="numeric" autoComplete="off" value={form.dni}
                                    onChange={e => setField('dni', e.target.value.replace(/\D/g, ''))}
                                    style={inputStyle(form.dni)} />
                            </div>

                            <div>
                                <label className={labelClass}>Fecha de nacimiento</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <select value={form.diaNac}
                                        onChange={e => setField('diaNac', e.target.value)}
                                        style={selectStyle(form.diaNac)}>
                                        <option value="">Día</option>
                                        {DIAS_MES.map(d => (
                                            <option key={d} value={String(d)}>{d}</option>
                                        ))}
                                    </select>
                                    <select value={form.mesNac}
                                        onChange={e => setField('mesNac', e.target.value)}
                                        style={selectStyle(form.mesNac)}>
                                        <option value="">Mes</option>
                                        {MESES.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <select value={form.anioNac}
                                        onChange={e => setField('anioNac', e.target.value)}
                                        style={selectStyle(form.anioNac)}>
                                        <option value="">Año</option>
                                        {ANIOS.map(a => (
                                            <option key={a} value={String(a)}>{a}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Teléfono</label>
                                <input type="tel" inputMode="tel" autoComplete="tel" value={form.telefono}
                                    onChange={e => setField('telefono', e.target.value)}
                                    style={inputStyle(form.telefono)} />
                            </div>

                            <div>
                                <label className={labelClass}>Horario <span className="ml-2 text-sm font-normal text-slate-400">opcional</span></label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['mañana', 'siesta', 'tarde'] as const).map(h => {
                                        const sel = form.horarioEntrenamiento === h;
                                        return (
                                            <button key={h} type="button"
                                                onClick={() => setField('horarioEntrenamiento', sel ? '' : h)}
                                                className="py-3 rounded-xl text-base font-semibold border-2 transition-all capitalize"
                                                style={{
                                                    borderColor: sel ? orange : '#e2e8f0',
                                                    background: sel ? `${orange}18` : 'white',
                                                    color: sel ? orange : '#64748b',
                                                }}>
                                                {h}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {errBox}
                        <div className="mt-6"><BtnNext /></div>
                    </div>
                )}

                {/* ── PASO 2: Objetivo ── */}
                {step === 2 && (
                    <div>
                        <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: orange }}>Paso 2 de {TOTAL_STEPS}</p>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">¿Cuál es tu objetivo?</h2>
                        <p className="text-slate-600 text-base mb-6">Elegí la opción que mejor te describe.</p>
                        <div className="space-y-3">
                            {AREAS.map(a => {
                                const sel = form.areaElegida === a.value;
                                return (
                                    <button key={a.value} type="button" onClick={() => setField('areaElegida', a.value)}
                                        className="w-full text-left rounded-2xl border-2 px-5 py-4 bg-white transition-all active:scale-[0.98]"
                                        style={{ borderColor: sel ? orange : '#e2e8f0', boxShadow: sel ? `0 0 0 1px ${orange}44` : undefined }}>
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl mt-0.5 leading-none">{a.emoji}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-base" style={{ color: sel ? orange : '#1e293b' }}>{a.label}</p>
                                                <p className="text-slate-600 text-[15px] mt-0.5 leading-snug">{a.desc}</p>
                                            </div>
                                            <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
                                                style={{ borderColor: sel ? orange : '#cbd5e1' }}>
                                                {sel && <div className="w-2.5 h-2.5 rounded-full" style={{ background: orange }} />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {errBox}
                        <div className="flex items-center gap-3 mt-6"><BtnBack /><div className="flex-1"><BtnNext /></div></div>
                    </div>
                )}

                {/* ── PASO 3: Condición ── */}
                {step === 3 && (
                    <div>
                        <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: orange }}>Paso 3 de {TOTAL_STEPS}</p>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Condición física</h2>
                        <p className="text-slate-600 text-base mb-6">¿Tenés alguna lesión, dolor o condición que debamos tener en cuenta?</p>
                        <div className="flex gap-3 mb-5">
                            {(['no', 'si'] as const).map(op => {
                                const sel = form.tieneCondicion === op;
                                return (
                                    <button key={op} type="button"
                                        onClick={() => { setField('tieneCondicion', op); if (op === 'no') setField('condicionDetalle', ''); }}
                                        className="flex-1 py-5 rounded-2xl border-2 text-lg font-bold transition-all active:scale-[0.97]"
                                        style={{
                                            borderColor: sel ? (op === 'no' ? green : orange) : '#e2e8f0',
                                            background: sel ? (op === 'no' ? green : orange) : 'white',
                                            color: sel ? 'white' : '#475569',
                                        }}>
                                        {op === 'no' ? 'No' : 'Sí'}
                                    </button>
                                );
                            })}
                        </div>
                        {form.tieneCondicion === 'si' && (
                            <div>
                                <label className={labelClass}>Contanos qué tenés</label>
                                <textarea rows={4} placeholder="Describí tu lesión, dolor o condición..."
                                    value={form.condicionDetalle}
                                    onChange={e => setField('condicionDetalle', e.target.value)}
                                    style={{ ...inputStyle(form.condicionDetalle), resize: 'none' as const }} />
                                <p className="text-slate-500 text-sm mt-2 pl-1">Serás asignado al área <strong>Salud</strong> para un seguimiento adecuado.</p>
                            </div>
                        )}
                        {errBox}
                        <div className="flex items-center gap-3 mt-6"><BtnBack /><div className="flex-1"><BtnNext /></div></div>
                    </div>
                )}

                {/* ── PASO 4: Nivel ── */}
                {step === 4 && (
                    <div>
                        <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: orange }}>Paso 4 de {TOTAL_STEPS}</p>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Nivel de experiencia</h2>
                        <p className="text-slate-600 text-base mb-6">¿Cuánta experiencia tenés entrenando?</p>
                        <div className="space-y-3">
                            {NIVELES.map(n => {
                                const sel = form.nivelExperiencia === n.value;
                                return (
                                    <button key={n.value} type="button" onClick={() => setField('nivelExperiencia', n.value)}
                                        className="w-full text-left rounded-2xl border-2 px-5 py-4 bg-white transition-all active:scale-[0.98]"
                                        style={{ borderColor: sel ? orange : '#e2e8f0', boxShadow: sel ? `0 0 0 1px ${orange}44` : undefined }}>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-bold text-base" style={{ color: sel ? orange : '#1e293b' }}>{n.label}</p>
                                                <p className="text-slate-600 text-[15px] mt-0.5">{n.desc}</p>
                                            </div>
                                            <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                                                style={{ borderColor: sel ? orange : '#cbd5e1' }}>
                                                {sel && <div className="w-2.5 h-2.5 rounded-full" style={{ background: orange }} />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {errBox}
                        <div className="flex items-center gap-3 mt-6"><BtnBack /><div className="flex-1"><BtnNext /></div></div>
                    </div>
                )}

                {/* ── PASO 5: Días + submit ── */}
                {step === 5 && (
                    <div>
                        <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: orange }}>Paso 5 de {TOTAL_STEPS}</p>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Días de entrenamiento</h2>
                        <p className="text-slate-600 text-base mb-6">¿Cuántos días por semana vas a entrenar?</p>
                        <div className="grid grid-cols-4 gap-3">
                            {DIAS_SEMANA.map(d => {
                                const sel = form.diasEntrenaSemana === d;
                                return (
                                    <button key={d} type="button" onClick={() => setField('diasEntrenaSemana', d)}
                                        className="py-6 rounded-2xl border-2 text-2xl font-bold transition-all active:scale-[0.95]"
                                        style={{
                                            borderColor: sel ? orange : '#e2e8f0',
                                            background: sel ? orange : 'white',
                                            color: sel ? 'white' : '#334155',
                                        }}>
                                        {d}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-slate-500 text-base text-center mt-3">días por semana</p>
                        {errBox}
                        <div className="flex items-center gap-3 mt-6">
                            <BtnBack />
                            <div className="flex-1">
                                <BtnNext label={submitting ? 'Registrando...' : 'Crear mi cuenta ✓'} onClick={handleSubmit} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
