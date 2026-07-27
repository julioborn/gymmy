'use client';
import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { swalNotify } from '@/utils/swalConfig';

export default function NuevoAlumnoPage() {
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [fechaNacimiento, setFechaNacimiento] = useState('');
    const [dni, setDni] = useState('');
    const [telefono, setTelefono] = useState('');
    const [email, setEmail] = useState('');
    const [diasEntrenaSemana, setDiasEntrenaSemana] = useState<number | ''>('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [horarioEntrenamiento, setHorarioEntrenamiento] = useState('');
    const [horaExactaEntrenamiento, setHoraExactaEntrenamiento] = useState('');
    const [historialDeportivo, setHistorialDeportivo] = useState('');
    const [historialDeVida, setHistorialDeVida] = useState('');
    const [objetivos, setObjetivos] = useState('');
    const [patologias, setPatologias] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const nuevoAlumno: any = {
            nombre: capitalizar(nombre.trim()),
            apellido: capitalizar(apellido.trim()),
            fechaNacimiento: new Date(fechaNacimiento),
            dni,
            telefono,
            email,
        };

        if (diasEntrenaSemana !== '') nuevoAlumno.diasEntrenaSemana = diasEntrenaSemana;
        if (fechaInicio) nuevoAlumno.fechaInicio = new Date(fechaInicio);
        if (horarioEntrenamiento) nuevoAlumno.horarioEntrenamiento = horarioEntrenamiento;
        if (horaExactaEntrenamiento) nuevoAlumno.horaExactaEntrenamiento = horaExactaEntrenamiento;
        if (historialDeportivo) nuevoAlumno.historialDeportivo = historialDeportivo;
        if (historialDeVida) nuevoAlumno.historialDeVida = historialDeVida;
        if (objetivos) nuevoAlumno.objetivos = objetivos;
        if (patologias) nuevoAlumno.patologias = patologias;

        await fetch('/api/alumnos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoAlumno),
        });

        Swal.fire({ ...swalNotify, icon: 'success', title: 'Alumno registrado exitosamente', showConfirmButton: false, timer: 1500 });

        setNombre(''); setApellido(''); setFechaNacimiento(''); setDni('');
        setTelefono(''); setEmail(''); setDiasEntrenaSemana(''); setFechaInicio('');
        setHorarioEntrenamiento(''); setHoraExactaEntrenamiento('');
        setHistorialDeportivo(''); setHistorialDeVida(''); setObjetivos(''); setPatologias('');
    };

    function capitalizar(texto: string) {
        return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
    }

    const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-slate-400 transition";
    const labelCls = "block text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1";

    return (
        <div className="max-w-4xl mx-auto pt-4 pb-12 px-4 space-y-4">

            {/* Banner */}
            <div className="bg-slate-900 rounded-3xl px-6 pt-6 pb-5 flex items-center gap-4">
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
                    <div className="px-5 py-3 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Datos básicos</p>
                    </div>
                    <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className={labelCls}>Nombre</label>
                            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} placeholder="Juan" required />
                        </div>
                        <div>
                            <label className={labelCls}>Apellido</label>
                            <input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} className={inputCls} placeholder="Pérez" required />
                        </div>
                        <div>
                            <label className={labelCls}>DNI</label>
                            <input type="text" value={dni} onChange={(e) => setDni(e.target.value)} className={inputCls} placeholder="12345678" required />
                        </div>
                        <div>
                            <label className={labelCls}>Fecha de nacimiento</label>
                            <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} className={inputCls} required />
                        </div>
                    </div>
                </div>

                {/* Información adicional */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Información adicional</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Todos estos campos son opcionales</p>
                    </div>
                    <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className={labelCls}>Teléfono</label>
                            <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputCls} placeholder="351 000 0000" />
                        </div>
                        <div>
                            <label className={labelCls}>Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="juan@mail.com" />
                        </div>
                        <div>
                            <label className={labelCls}>Días por semana</label>
                            <input type="number" min="1" max="7" value={diasEntrenaSemana} onChange={(e) => setDiasEntrenaSemana(e.target.value ? Number(e.target.value) : '')} className={inputCls} placeholder="3" />
                        </div>
                        <div>
                            <label className={labelCls}>Fecha de inicio</label>
                            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Franja horaria</label>
                            <select value={horarioEntrenamiento} onChange={(e) => setHorarioEntrenamiento(e.target.value)} className={inputCls}>
                                <option value="">Seleccionar</option>
                                <option value="mañana">Mañana</option>
                                <option value="siesta">Siesta</option>
                                <option value="tarde">Tarde</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Hora de inicio</label>
                            <input type="time" value={horaExactaEntrenamiento} onChange={(e) => setHoraExactaEntrenamiento(e.target.value)} className={inputCls} />
                        </div>
                        <div className="col-span-2 md:col-span-3">
                            <label className={labelCls}>Historial deportivo</label>
                            <textarea value={historialDeportivo} onChange={(e) => setHistorialDeportivo(e.target.value)} className={`${inputCls} resize-none`} rows={2} placeholder="Deportes practicados, experiencia previa..." />
                        </div>
                        <div className="col-span-2 md:col-span-3">
                            <label className={labelCls}>Historial de vida</label>
                            <textarea value={historialDeVida} onChange={(e) => setHistorialDeVida(e.target.value)} className={`${inputCls} resize-none`} rows={2} placeholder="Contexto de salud general, hábitos..." />
                        </div>
                        <div className="col-span-2 md:col-span-3">
                            <label className={labelCls}>Objetivos</label>
                            <textarea value={objetivos} onChange={(e) => setObjetivos(e.target.value)} className={`${inputCls} resize-none`} rows={2} placeholder="Perder peso, ganar masa muscular..." />
                        </div>
                        <div className="col-span-2 md:col-span-3">
                            <label className={labelCls}>Patologías</label>
                            <textarea value={patologias} onChange={(e) => setPatologias(e.target.value)} className={`${inputCls} resize-none`} rows={2} placeholder="Lesiones, enfermedades crónicas..." />
                        </div>
                    </div>
                </div>

                <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl transition shadow-sm">
                    Registrar Alumno
                </button>

            </form>
        </div>
    );
}
