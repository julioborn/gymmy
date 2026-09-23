'use client';
import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { swalNotify } from '@/utils/swalConfig';

type Area = 'salud' | 'fitness' | 'rendimiento' | 'formacion' | 'fuerza' | 'masa_muscular' | 'composicion' | 'retomar';
type NivelExp = 'nunca' | 'alguna_vez' | 'hace_tiempo';

const AREAS: { value: Area; label: string; emoji: string; desc: string }[] = [
    { value: 'fuerza',        label: 'Fuerza y condición',     emoji: '💪', desc: 'Quiere sentirse más fuerte y mejorar su capacidad física general.' },
    { value: 'masa_muscular', label: 'Masa muscular',           emoji: '🏋️', desc: 'Quiere aumentar masa muscular y desarrollar zonas específicas.' },
    { value: 'salud',         label: 'Salud y calidad de vida', emoji: '❤️', desc: 'Quiere mantenerse activo y generar un hábito saludable.' },
    { value: 'composicion',   label: 'Composición corporal',    emoji: '⚖️', desc: 'Quiere reducir grasa y mejorar su composición física.' },
    { value: 'rendimiento',   label: 'Rendimiento deportivo',   emoji: '🏅', desc: 'Practica un deporte y quiere mejorar su rendimiento.' },
    { value: 'formacion',     label: 'Formación (10-17 años)',  emoji: '🌱', desc: 'Entre 10 y 17 años, entrenamiento adaptado a su etapa de desarrollo.' },
    { value: 'retomar',       label: 'Retomar actividad',       emoji: '🔄', desc: 'Quiere volver a entrenar después de un período de inactividad.' },
];

const NIVELES: { value: NivelExp; label: string; desc: string }[] = [
    { value: 'nunca',       label: 'Nunca entrenó',       desc: 'Es su primera vez en un gimnasio.' },
    { value: 'alguna_vez',  label: 'Entrenó alguna vez',  desc: 'Tuvo experiencias anteriores, lleva tiempo sin entrenar.' },
    { value: 'hace_tiempo', label: 'Entrena hace tiempo', desc: 'Tiene entrenamiento continuo y regular.' },
];

const DIAS_SEMANA = [2, 3, 4, 5];

const DIAS_MES = Array.from({ length: 31 }, (_, i) => i + 1);
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ANIOS = Array.from({ length: 96 }, (_, i) => 2016 - i);

function toTitleCase(str: string) {
    return str.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
}

export default function NuevoAlumnoPage() {
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [dni, setDni] = useState('');
    const [diaNac, setDiaNac] = useState('');
    const [mesNac, setMesNac] = useState('');
    const [anioNac, setAnioNac] = useState('');
    const [telefono, setTelefono] = useState('');
    const [email, setEmail] = useState('');
    const [horario, setHorario] = useState('');
    const [area, setArea] = useState<Area | ''>('');
    const [tieneCondicion, setTieneCondicion] = useState<'si' | 'no' | ''>('');
    const [condicionDetalle, setCondicionDetalle] = useState('');
    const [nivel, setNivel] = useState<NivelExp | ''>('');
    const [diasSemana, setDiasSemana] = useState(0);
    const [fechaInicio, setFechaInicio] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim() || !apellido.trim() || !dni.trim()) {
            Swal.fire({ ...swalNotify, icon: 'warning', title: 'Completá nombre, apellido y DNI' });
            return;
        }
        if (!diaNac || !mesNac || !anioNac) {
            Swal.fire({ ...swalNotify, icon: 'warning', title: 'Completá la fecha de nacimiento' });
            return;
        }

        setSaving(true);
        const mes = String(MESES.indexOf(mesNac) + 1).padStart(2, '0');
        const dia = diaNac.padStart(2, '0');
        const fechaNacimiento = `${anioNac}-${mes}-${dia}`;

        const areaFinal: Area = tieneCondicion === 'si' ? 'salud' : (area as Area);

        const payload: Record<string, unknown> = {
            nombre: toTitleCase(nombre.trim()),
            apellido: toTitleCase(apellido.trim()),
            dni: dni.trim(),
            fechaNacimiento,
        };
        if (telefono.trim())   payload.telefono = telefono.trim();
        if (email.trim())      payload.email = email.trim();
        if (horario)           payload.horarioEntrenamiento = horario;
        if (areaFinal)         payload.area = areaFinal;
        if (nivel)             payload.nivelExperiencia = nivel;
        if (diasSemana)        payload.diasEntrenaSemana = diasSemana;
        if (fechaInicio)       payload.fechaInicio = new Date(fechaInicio);
        if (tieneCondicion === 'si' && condicionDetalle.trim())
                               payload.patologias = condicionDetalle.trim();

        const res = await fetch('/api/alumnos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        setSaving(false);
        if (res.ok) {
            Swal.fire({ ...swalNotify, icon: 'success', title: 'Alumno registrado', showConfirmButton: false, timer: 1500 });
            setNombre(''); setApellido(''); setDni('');
            setDiaNac(''); setMesNac(''); setAnioNac('');
            setTelefono(''); setEmail(''); setHorario('');
            setArea(''); setTieneCondicion(''); setCondicionDetalle('');
            setNivel(''); setDiasSemana(0); setFechaInicio('');
        } else {
            const data = await res.json().catch(() => ({}));
            Swal.fire({ ...swalNotify, icon: 'error', title: data.error || 'Error al registrar' });
        }
    };

    const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-slate-400 transition";
    const labelCls = "block text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1";
    const selectCls = `${inputCls} appearance-none`;

    const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
        <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</p>
            {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto pt-4 pb-12 px-4 space-y-4">

            <div className="bg-[#111] rounded-3xl px-6 pt-6 pb-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white leading-tight">Registrar Alumno</h1>
                    <p className="text-slate-400 text-xs mt-0.5">Completá los datos del nuevo miembro</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Datos básicos */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <SectionHeader title="Datos básicos" />
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Nombre</label>
                                <input type="text" value={nombre}
                                    onChange={e => setNombre(e.target.value)}
                                    onBlur={e => setNombre(toTitleCase(e.target.value))}
                                    className={inputCls} placeholder="Juan" required />
                            </div>
                            <div>
                                <label className={labelCls}>Apellido</label>
                                <input type="text" value={apellido}
                                    onChange={e => setApellido(e.target.value)}
                                    onBlur={e => setApellido(toTitleCase(e.target.value))}
                                    className={inputCls} placeholder="Pérez" required />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className={labelCls}>DNI</label>
                                <input type="text" inputMode="numeric" value={dni}
                                    onChange={e => setDni(e.target.value.replace(/\D/g, ''))}
                                    className={inputCls} placeholder="12345678" required />
                            </div>
                            <div className="col-span-2 md:col-span-3">
                                <label className={labelCls}>Fecha de nacimiento</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <select value={diaNac} onChange={e => setDiaNac(e.target.value)} className={selectCls}>
                                        <option value="">Día</option>
                                        {DIAS_MES.map(d => <option key={d} value={String(d)}>{d}</option>)}
                                    </select>
                                    <select value={mesNac} onChange={e => setMesNac(e.target.value)} className={selectCls}>
                                        <option value="">Mes</option>
                                        {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <select value={anioNac} onChange={e => setAnioNac(e.target.value)} className={selectCls}>
                                        <option value="">Año</option>
                                        {ANIOS.map(a => <option key={a} value={String(a)}>{a}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Teléfono</label>
                                <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} className={inputCls} placeholder="351 000 0000" />
                            </div>
                            <div>
                                <label className={labelCls}>Email</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="juan@mail.com" />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Horario de entrenamiento</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['mañana', 'siesta', 'tarde'] as const).map(h => (
                                    <button key={h} type="button"
                                        onClick={() => setHorario(horario === h ? '' : h)}
                                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all capitalize ${horario === h ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                        {h}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Objetivo */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <SectionHeader title="Objetivo" subtitle="¿Cuál es la motivación del alumno?" />
                    <div className="p-5 space-y-2.5">
                        {AREAS.map(a => {
                            const sel = area === a.value;
                            return (
                                <button key={a.value} type="button" onClick={() => setArea(sel ? '' : a.value)}
                                    className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${sel ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl leading-none">{a.emoji}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className={`font-bold text-sm ${sel ? 'text-emerald-700' : 'text-slate-800'}`}>{a.label}</p>
                                            <p className="text-slate-500 text-xs mt-0.5 leading-snug">{a.desc}</p>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${sel ? 'border-emerald-500' : 'border-slate-300'}`}>
                                            {sel && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Condición física */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <SectionHeader title="Condición física" subtitle="¿Tiene alguna lesión, dolor o condición a tener en cuenta?" />
                    <div className="p-5 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            {(['no', 'si'] as const).map(op => {
                                const sel = tieneCondicion === op;
                                return (
                                    <button key={op} type="button"
                                        onClick={() => { setTieneCondicion(sel ? '' : op); if (op === 'no') setCondicionDetalle(''); }}
                                        className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${sel ? (op === 'no' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-amber-500 border-amber-500 text-white') : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                        {op === 'no' ? 'No' : 'Sí'}
                                    </button>
                                );
                            })}
                        </div>
                        {tieneCondicion === 'si' && (
                            <div>
                                <label className={labelCls}>Describir la condición</label>
                                <textarea rows={3} value={condicionDetalle}
                                    onChange={e => setCondicionDetalle(e.target.value)}
                                    className={`${inputCls} resize-none`}
                                    placeholder="Lesión, dolor o condición de salud..." />
                            </div>
                        )}
                    </div>
                </div>

                {/* Nivel de experiencia */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <SectionHeader title="Nivel de experiencia" />
                    <div className="p-5 space-y-2.5">
                        {NIVELES.map(n => {
                            const sel = nivel === n.value;
                            return (
                                <button key={n.value} type="button" onClick={() => setNivel(sel ? '' : n.value)}
                                    className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${sel ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className={`font-bold text-sm ${sel ? 'text-emerald-700' : 'text-slate-800'}`}>{n.label}</p>
                                            <p className="text-slate-500 text-xs mt-0.5">{n.desc}</p>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${sel ? 'border-emerald-500' : 'border-slate-300'}`}>
                                            {sel && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Días y fecha de inicio */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <SectionHeader title="Entrenamiento" subtitle="Opcional" />
                    <div className="p-5 space-y-4">
                        <div>
                            <label className={labelCls}>Días por semana</label>
                            <div className="grid grid-cols-4 gap-2">
                                {DIAS_SEMANA.map(d => (
                                    <button key={d} type="button" onClick={() => setDiasSemana(diasSemana === d ? 0 : d)}
                                        className={`py-3 rounded-xl border-2 text-base font-bold transition-all ${diasSemana === d ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Fecha de inicio</label>
                            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className={inputCls} />
                        </div>
                    </div>
                </div>

                <button type="submit" disabled={saving}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-semibold rounded-2xl transition shadow-sm">
                    {saving ? 'Registrando...' : 'Registrar Alumno'}
                </button>

            </form>
        </div>
    );
}
