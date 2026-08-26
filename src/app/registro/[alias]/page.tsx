'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

interface GymInfo {
    nombre: string;
    alias: string;
}

export default function RegistroPage() {
    const { alias } = useParams<{ alias: string }>();

    const [gym, setGym] = useState<GymInfo | null>(null);
    const [notFound, setNotFound] = useState(false);

    const [form, setForm] = useState({
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

    function set(field: string, value: string) {
        setForm(prev => ({ ...prev, [field]: value }));
        setError('');
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

    if (notFound) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <div className="text-center">
                    <p className="text-slate-500 text-lg">Gimnasio no encontrado.</p>
                </div>
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

                {/* Header */}
                <div className="text-center mb-10">
                    {isSporttime && (
                        <div className="flex justify-center mb-6">
                            <Image
                                src="/sporttime2.jpg"
                                alt="Sporttime"
                                width={160}
                                height={80}
                                className="object-contain rounded-2xl"
                                priority
                            />
                        </div>
                    )}
                    <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                        Registrate en<br />
                        <span className={isSporttime ? 'text-[#f4a347]' : 'text-emerald-600'}>{gym.nombre}</span>
                    </h1>
                    <p className="text-slate-500 mt-3 text-base">
                        Completá el formulario para crear tu cuenta.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                    {/* Nombre */}
                    <div>
                        <label className={labelClass}>Nombre</label>
                        <input
                            type="text"
                            autoComplete="given-name"
                            value={form.nombre}
                            onChange={e => set('nombre', e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    {/* Apellido */}
                    <div>
                        <label className={labelClass}>Apellido</label>
                        <input
                            type="text"
                            autoComplete="family-name"
                            value={form.apellido}
                            onChange={e => set('apellido', e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    {/* DNI */}
                    <div>
                        <label className={labelClass}>DNI</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={form.dni}
                            onChange={e => set('dni', e.target.value.replace(/\D/g, ''))}
                            className={inputClass}
                        />
                    </div>

                    {/* Fecha de nacimiento */}
                    <div>
                        <label className={labelClass}>Fecha de nacimiento</label>
                        <input
                            type="date"
                            value={form.fechaNacimiento}
                            onChange={e => set('fechaNacimiento', e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    {/* Teléfono */}
                    <div>
                        <label className={labelClass}>Teléfono <span className={optionalClass}>opcional</span></label>
                        <input
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={form.telefono}
                            onChange={e => set('telefono', e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className={labelClass}>Email</label>
                        <input
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            value={form.email}
                            onChange={e => set('email', e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    {/* Contraseña */}
                    <div>
                        <label className={labelClass}>Contraseña</label>
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={form.password}
                            onChange={e => set('password', e.target.value)}
                            className={inputClass}
                        />
                        <p className="text-slate-400 text-sm mt-1.5 pl-1">Mínimo 6 caracteres.</p>
                    </div>

                    {/* Horario */}
                    <div>
                        <label className={labelClass}>Horario de entrenamiento <span className={optionalClass}>opcional</span></label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['mañana', 'siesta', 'tarde'] as const).map(h => (
                                <button
                                    key={h}
                                    type="button"
                                    onClick={() => set('horarioEntrenamiento', form.horarioEntrenamiento === h ? '' : h)}
                                    className={`py-4 rounded-2xl text-base font-semibold border-2 transition-all capitalize ${
                                        form.horarioEntrenamiento === h
                                            ? isSporttime
                                                ? 'bg-[#f4a347] border-[#f4a347] text-white'
                                                : 'bg-emerald-500 border-emerald-500 text-white'
                                            : 'bg-slate-50 border-slate-200 text-slate-600'
                                    }`}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Hora exacta */}
                    <div>
                        <label className={labelClass}>Hora de entrenamiento <span className={optionalClass}>opcional</span></label>
                        <input
                            type="time"
                            value={form.horaExactaEntrenamiento}
                            onChange={e => set('horaExactaEntrenamiento', e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    {/* Historial deportivo */}
                    <div>
                        <label className={labelClass}>Historial deportivo <span className={optionalClass}>opcional</span></label>
                        <textarea
                            rows={3}
                            value={form.historialDeportivo}
                            onChange={e => set('historialDeportivo', e.target.value)}
                            className={inputClass + ' resize-none'}
                        />
                    </div>

                    {/* Patologías */}
                    <div>
                        <label className={labelClass}>Patologías / lesiones <span className={optionalClass}>opcional</span></label>
                        <textarea
                            rows={3}
                            value={form.patologias}
                            onChange={e => set('patologias', e.target.value)}
                            className={inputClass + ' resize-none'}
                        />
                    </div>

                    {/* Objetivos */}
                    <div>
                        <label className={labelClass}>Objetivos <span className={optionalClass}>opcional</span></label>
                        <textarea
                            rows={3}
                            value={form.objetivos}
                            onChange={e => set('objetivos', e.target.value)}
                            className={inputClass + ' resize-none'}
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-700 text-base font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className={`w-full py-5 rounded-2xl text-lg font-bold text-white transition-all disabled:opacity-60 ${
                            isSporttime
                                ? 'bg-[#f4a347] hover:bg-[#e8943a] active:bg-[#d4832a]'
                                : 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600'
                        }`}
                    >
                        {submitting ? 'Registrando...' : 'Crear mi cuenta'}
                    </button>

                </form>
            </div>
        </div>
    );
}
