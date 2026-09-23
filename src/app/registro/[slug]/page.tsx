'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface GymInfo { nombre: string; alias: string; logoUrl?: string | null; }
type Area = 'salud' | 'fitness' | 'rendimiento' | 'formacion' | 'fuerza' | 'masa_muscular' | 'composicion' | 'retomar';
type NivelExp = 'nunca' | 'alguna_vez' | 'hace_tiempo';

const AREAS: { value: Area; label: string; emoji: string; desc: string }[] = [
    { value: 'fuerza',        label: 'Fuerza y condición',     emoji: '💪', desc: 'Quiero sentirme más fuerte, ágil y mejorar mi capacidad física general.' },
    { value: 'masa_muscular', label: 'Masa muscular',           emoji: '🏋️', desc: 'Quiero aumentar mi masa muscular y desarrollar determinadas zonas de mi cuerpo.' },
    { value: 'salud',         label: 'Salud y calidad de vida', emoji: '❤️', desc: 'Quiero sentirme mejor, mantenerme activo y generar un hábito de entrenamiento saludable.' },
    { value: 'composicion',   label: 'Composición corporal',    emoji: '⚖️', desc: 'Quiero reducir grasa corporal y generar un cambio en mi composición física.' },
    { value: 'rendimiento',   label: 'Rendimiento deportivo',   emoji: '🏅', desc: 'Practico un deporte y quiero mejorar mi rendimiento o prepararme para un objetivo específico.' },
    { value: 'formacion',     label: 'Formación (10-17 años)',  emoji: '🌱', desc: 'Tengo entre 10 y 17 años y quiero comenzar un proceso de entrenamiento adaptado a mi etapa de desarrollo.' },
    { value: 'retomar',       label: 'Retomar actividad',       emoji: '🔄', desc: 'Quiero retomar la actividad física después de un período de inactividad.' },
];

const NIVELES: { value: NivelExp; label: string; desc: string }[] = [
    { value: 'nunca',       label: 'Nunca entrenó',       desc: 'Es mi primera vez en un gimnasio.' },
    { value: 'alguna_vez',  label: 'Entrenó alguna vez',  desc: 'Tuve experiencias anteriores, pero llevo tiempo sin entrenar.' },
    { value: 'hace_tiempo', label: 'Entrena hace tiempo', desc: 'Tengo entrenamiento continuo y regular.' },
];

const DIAS_MES = Array.from({ length: 31 }, (_, i) => i + 1);
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: ANIO_ACTUAL - 1921 + 1 }, (_, i) => ANIO_ACTUAL - i);

const DIAS_SEMANA = [1, 2, 3, 4, 5];
const TOTAL_STEPS = 4;

const HORARIOS: { value: string; label: string; rango: string }[] = [
    { value: 'mañana',      label: 'Mañana',      rango: '6 a 12hs' },
    { value: 'siesta',      label: 'Siesta',       rango: '12 a 15hs' },
    { value: 'tarde',       label: 'Tarde',        rango: '15 a 18hs' },
    { value: 'tarde-noche', label: 'Tarde-Noche',  rango: '18 a 21hs' },
];

function toTitleCase(str: string) {
    return str.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
}

function formatDNI(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    const len = digits.length;
    if (len <= 3) return digits;
    if (len <= 6) return digits.slice(0, len - 3) + '.' + digits.slice(len - 3);
    return digits.slice(0, len - 6) + '.' + digits.slice(len - 6, len - 3) + '.' + digits.slice(len - 3);
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
        diaDePaso: false,
    });

    const [archivos, setArchivos] = useState<File[]>([]);
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
            const dniDigits = form.dni.replace(/\./g, '');
            if (!dniDigits)            { setError('Ingresá tu DNI.');               return; }
            if (dniDigits.length < 7 || dniDigits.length > 8) {
                setError('El DNI debe tener 7 u 8 dígitos.'); return;
            }
            if (!form.diaNac || !form.mesNac || !form.anioNac) {
                setError('Ingresá tu fecha de nacimiento completa.'); return;
            }
            if (!form.telefono.trim()) { setError('Ingresá tu teléfono.');          return; }
            if (!form.horarioEntrenamiento) { setError('Seleccioná tu horario de entrenamiento.'); return; }
            if (!form.diasEntrenaSemana && !form.diaDePaso) { setError('Seleccioná los días por semana.'); return; }
            setError('');
            if (form.diaDePaso) { handleSubmit(); return; }
            setStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (step === 2 && !form.areaElegida)      { setError('Por favor seleccioná tu objetivo.'); return; }
        if (step === 3 && !form.tieneCondicion)   { setError('Por favor respondé la pregunta.');   return; }
        if (step === 4) {
            if (!form.nivelExperiencia) { setError('Por favor seleccioná tu nivel.'); return; }
            setError('');
            handleSubmit();
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

    const areaFinal: Area = form.tieneCondicion === 'si' ? 'salud' : (form.areaElegida as Area);

    async function handleSubmit() {
        if (!form.diasEntrenaSemana && !form.diaDePaso) { setError('Por favor seleccioná los días.'); return; }
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
                    dni: form.dni.replace(/\./g, ''),
                    fechaNacimiento,
                    telefono: form.telefono,
                    area: areaFinal,
                    nivelExperiencia: form.nivelExperiencia,
                    diasEntrenaSemana: form.diaDePaso ? 1 : form.diasEntrenaSemana,
                    horarioEntrenamiento: form.horarioEntrenamiento,
                    patologias: form.tieneCondicion === 'si' ? form.condicionDetalle : '',
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Error al registrarse. Intentá de nuevo.'); return; }

            // Subir archivos médicos si los hay
            if (archivos.length && data.alumnoId) {
                const fd = new FormData();
                fd.append('alumnoId', data.alumnoId);
                archivos.forEach(f => fd.append('archivos', f));
                await fetch(`/api/registro/${slug}/archivos`, { method: 'POST', body: fd }).catch(() => {});
            }

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
        <div className="min-h-screen bg-white flex items-start justify-center px-4 pt-16">
            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-10 max-w-sm w-full text-center">
                {gym?.logoUrl
                    ? <img src={gym.logoUrl} alt={gym.nombre} className="w-32 h-32 object-contain mx-auto mb-5" />
                    : (
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: `${green}22` }}>
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke={green}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                        </div>
                    )
                }
                <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Ya estás registrado!</h2>
                <p className="text-slate-500 text-base leading-relaxed mb-6">
                    Tu cuenta fue creada en <span className="font-semibold text-slate-700">{gym.nombre}</span>. Ya podés iniciar sesión en la app.
                </p>
                <a
                    href="https://chat.whatsapp.com/Id1Su5ZhoOA9Qp6ZSPXTdk?s=sw&p=i&mlu=4"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl font-semibold text-white text-base transition-opacity hover:opacity-90"
                    style={{ background: '#25D366' }}
                >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white shrink-0">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                    </svg>
                    Unirme al grupo de WhatsApp
                </a>
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
    const stepIsValid = (() => {
        if (step === 1) {
            const dniDigits = form.dni.replace(/\./g, '');
            return !!(form.nombre.trim() && form.apellido.trim() &&
                (dniDigits.length === 7 || dniDigits.length === 8) &&
                form.diaNac && form.mesNac && form.anioNac && form.telefono.trim() &&
                form.horarioEntrenamiento && (form.diasEntrenaSemana > 0 || form.diaDePaso));
        }
        if (step === 2) return !!form.areaElegida;
        if (step === 3) return !!form.tieneCondicion;
        if (step === 4) return !!form.nivelExperiencia;
        return false;
    })();

    const BtnNext = ({ label = 'Siguiente →', onClick }: { label?: string; onClick?: () => void }) => (
        <button type="button" onClick={onClick ?? nextStep} disabled={submitting || !stepIsValid}
            className="w-full py-5 rounded-2xl text-lg font-bold text-white transition-all active:scale-[0.98]"
            style={{ background: stepIsValid && !submitting ? green : '#cbd5e1' }}>
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="px-4 pt-5 pb-4" style={{ background: '#000' }}>
                {gym.logoUrl && (
                    <div className="flex justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={gym.logoUrl} alt={gym.nombre}
                            style={{ maxWidth: 160, maxHeight: 72, objectFit: 'contain' }}
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
                        <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: orange }}>
                            Paso 1 de {form.diaDePaso ? '1' : TOTAL_STEPS}
                        </p>
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
                                    onChange={e => setField('dni', formatDNI(e.target.value))}
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
                                <label className={labelClass}>Horario de entrenamiento</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {HORARIOS.map(h => {
                                        const sel = form.horarioEntrenamiento === h.value;
                                        return (
                                            <button key={h.value} type="button"
                                                onClick={() => setField('horarioEntrenamiento', sel ? '' : h.value)}
                                                className="py-3 px-2 rounded-xl border-2 transition-all text-center"
                                                style={{
                                                    borderColor: sel ? orange : '#e2e8f0',
                                                    background: sel ? `${orange}18` : 'white',
                                                }}>
                                                <p className="text-base font-semibold" style={{ color: sel ? orange : '#334155' }}>{h.label}</p>
                                                <p className="text-sm mt-0.5" style={{ color: sel ? orange : '#94a3b8' }}>{h.rango}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Días por semana</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {DIAS_SEMANA.map(d => {
                                        const sel = form.diasEntrenaSemana === d && !form.diaDePaso;
                                        return (
                                            <button key={d} type="button"
                                                onClick={() => { setField('diasEntrenaSemana', d); setField('diaDePaso', false); }}
                                                className="py-4 rounded-2xl border-2 text-xl font-bold transition-all active:scale-[0.95]"
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
                                <button type="button"
                                    onClick={() => { setField('diaDePaso', !form.diaDePaso); if (!form.diaDePaso) setField('diasEntrenaSemana', 0); }}
                                    className="mt-2 w-full py-3.5 px-4 rounded-2xl border-2 text-left transition-all"
                                    style={{
                                        borderColor: form.diaDePaso ? orange : '#e2e8f0',
                                        background: form.diaDePaso ? `${orange}18` : 'white',
                                    }}>
                                    <p className="text-base font-semibold" style={{ color: form.diaDePaso ? orange : '#334155' }}>Un día de paso</p>
                                    <p className="text-sm mt-0.5" style={{ color: form.diaDePaso ? orange : '#94a3b8' }}>Venís solo por hoy, sin inscripción regular.</p>
                                </button>
                            </div>
                        </div>

                        {errBox}
                        <div className="mt-6">
                            <BtnNext
                                label={form.diaDePaso
                                    ? (submitting ? 'Registrando...' : 'Crear mi cuenta ✓')
                                    : 'Siguiente →'}
                            />
                        </div>
                    </div>
                )}

                {/* ── PASO 2: Objetivo ── */}
                {step === 2 && (
                    <div>
                        <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: orange }}>Paso 2 de {TOTAL_STEPS}</p>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">¿Cuál es tu objetivo principal?</h2>
                        <p className="text-slate-600 text-base mb-6">Seleccioná la opción que mejor represente lo que querés lograr.</p>
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
                                                <p className="text-slate-600 text-base mt-0.5 leading-snug">{a.desc}</p>
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
                            <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-sm text-blue-700 leading-snug">
                                    Esta información nos ayuda a adaptar tu entrenamiento. Si tenés algún estudio médico, indicaciones o información relevante, podés comentárselo al profesor o adjuntarlo acá.
                                </div>
                                <div>
                                    <label className={labelClass}>Comentario (opcional)</label>
                                    <textarea rows={3} placeholder="Describí tu lesión, dolor o condición..."
                                        value={form.condicionDetalle}
                                        onChange={e => setField('condicionDetalle', e.target.value)}
                                        style={{ ...inputStyle(form.condicionDetalle), resize: 'none' as const }} />
                                </div>
                                <div>
                                    <label className={labelClass}>Adjuntar archivos (opcional)</label>
                                    <label
                                        className="flex flex-col items-center justify-center gap-2 w-full rounded-2xl border-2 border-dashed py-5 cursor-pointer transition-all"
                                        style={{ borderColor: archivos.length ? orange : '#e2e8f0', background: archivos.length ? `${orange}08` : 'white' }}>
                                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={archivos.length ? orange : '#94a3b8'}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                        </svg>
                                        <span className="text-sm font-semibold" style={{ color: archivos.length ? orange : '#64748b' }}>
                                            {archivos.length ? `${archivos.length} archivo${archivos.length > 1 ? 's' : ''} seleccionado${archivos.length > 1 ? 's' : ''}` : 'Tocá para seleccionar'}
                                        </span>
                                        <span className="text-xs text-slate-400">PDF, JPG, PNG · hasta 10 MB por archivo</span>
                                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" multiple className="hidden"
                                            onChange={e => setArchivos(Array.from(e.target.files ?? []))} />
                                    </label>
                                    {archivos.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                            {archivos.map((f, i) => (
                                                <li key={i} className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-1.5">
                                                    <span className="truncate flex-1">{f.name}</span>
                                                    <button type="button" onClick={() => setArchivos(prev => prev.filter((_, j) => j !== i))}
                                                        className="text-slate-300 hover:text-red-400 shrink-0 font-bold">✕</button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
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
                        <div className="flex items-center gap-3 mt-6">
                            <BtnBack />
                            <div className="flex-1">
                                <BtnNext label={submitting ? 'Registrando...' : 'Crear mi cuenta ✓'} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
