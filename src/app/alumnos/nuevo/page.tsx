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

    const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 placeholder:text-slate-400";
    const labelCls = "block text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1";

    return (
        <div className="max-w-lg mx-auto">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-t-2xl px-6 py-5">
                <h1 className="text-xl font-bold text-white">Registrar Alumno</h1>
            </div>

            <div className="bg-white rounded-b-2xl shadow-xl p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Campos requeridos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Nombre</label>
                            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} required />
                        </div>
                        <div>
                            <label className={labelCls}>Apellido</label>
                            <input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} className={inputCls} required />
                        </div>
                        <div>
                            <label className={labelCls}>DNI</label>
                            <input type="text" value={dni} onChange={(e) => setDni(e.target.value)} className={inputCls} required />
                        </div>
                        <div>
                            <label className={labelCls}>Fecha de nacimiento</label>
                            <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} className={inputCls} required />
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Opcionales</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Teléfono</label>
                                <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Email</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Días por semana</label>
                                <input type="number" min="1" max="7" value={diasEntrenaSemana} onChange={(e) => setDiasEntrenaSemana(e.target.value ? Number(e.target.value) : '')} className={inputCls} />
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
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Historial deportivo</label>
                                <textarea value={historialDeportivo} onChange={(e) => setHistorialDeportivo(e.target.value)} className={`${inputCls} resize-none`} rows={2} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Historial de vida</label>
                                <textarea value={historialDeVida} onChange={(e) => setHistorialDeVida(e.target.value)} className={`${inputCls} resize-none`} rows={2} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Objetivos</label>
                                <textarea value={objetivos} onChange={(e) => setObjetivos(e.target.value)} className={`${inputCls} resize-none`} rows={2} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Patologías</label>
                                <textarea value={patologias} onChange={(e) => setPatologias(e.target.value)} className={`${inputCls} resize-none`} rows={2} />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-md mt-2">
                        Registrar Alumno
                    </button>
                </form>
            </div>
        </div>
    );
}
