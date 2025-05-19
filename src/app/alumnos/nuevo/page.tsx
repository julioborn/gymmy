'use client';
import React, { useState } from 'react';
import Swal from 'sweetalert2';

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

        Swal.fire({
            icon: 'success',
            title: 'Alumno registrado exitosamente',
            showConfirmButton: false,
            timer: 1500,
        });

        // Limpiar todos los campos
        setNombre('');
        setApellido('');
        setFechaNacimiento('');
        setDni('');
        setTelefono('');
        setEmail('');
        setDiasEntrenaSemana('');
        setFechaInicio('');
        setHorarioEntrenamiento('');
        setHoraExactaEntrenamiento('');
        setHistorialDeportivo('');
        setHistorialDeVida('');
        setObjetivos('');
        setPatologias('');
    };

    function capitalizar(texto: string) {
        return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
    }

    return (
        <div className="max-w-md mx-auto bg-white p-8 rounded shadow-md">
            <h1 className="text-2xl font-semibold text-gray-800 mb-6">Registrar Alumno</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="nombre" className="block text-gray-700 font-medium mb-2">
                        Nombre
                    </label>
                    <input
                        id="nombre"
                        type="text"
                        placeholder=""
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="border border-gray-300 p-2 w-full"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="apellido" className="block text-gray-700 font-medium mb-2">
                        Apellido
                    </label>
                    <input
                        id="apellido"
                        type="text"
                        placeholder=""
                        value={apellido}
                        onChange={(e) => setApellido(e.target.value)}
                        className="border border-gray-300 p-2 w-full"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="dni" className="block text-gray-700 font-medium mb-2">
                        DNI
                    </label>
                    <input
                        id="dni"
                        type="text"
                        placeholder=""
                        value={dni}
                        onChange={(e) => setDni(e.target.value)}
                        className="border border-gray-300 p-2 w-full"
                        required
                    />
                </div>
                <div className='border-b border-gray-400 pb-5'>
                    <label htmlFor="fechaNacimiento" className="block text-gray-700 font-medium mb-2">
                        Fecha de nacimiento
                    </label>
                    <input
                        id="fechaNacimiento"
                        type="date"
                        value={fechaNacimiento}
                        onChange={(e) => setFechaNacimiento(e.target.value)}
                        className="border border-gray-300 p-2 w-full"
                        required
                    />
                </div>
                <p className='text-red-600'>OPCIONALES</p>
                <div>
                    <label htmlFor="telefono" className="block text-gray-700 font-medium mb-2">
                        Teléfono
                    </label>
                    <input
                        id="telefono"
                        type="text"
                        placeholder=""
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="border border-gray-300 p-2 w-full"
                    />
                </div>
                <div>
                    <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        placeholder=""
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border border-gray-300 p-2 w-full"
                    />
                </div>
                <div>
                    <label htmlFor="diasEntrenaSemana" className="block text-gray-700 font-medium mb-2">
                        Días por semana
                    </label>
                    <input
                        id="diasEntrenaSemana"
                        type="number"
                        placeholder=""
                        min="1"
                        max="7"
                        value={diasEntrenaSemana}
                        onChange={(e) => setDiasEntrenaSemana(e.target.value ? Number(e.target.value) : '')}
                        className="border border-gray-300 p-2 w-full"
                    />
                </div>
                <div>
                    <label className="block text-gray-700 font-medium mb-2">Fecha de inicio</label>
                    <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="border border-gray-300 p-2 w-full" />
                </div>

                <div>
                    <label className="block text-gray-700 font-medium mb-2">Franja horaria</label>
                    <select
                        value={horarioEntrenamiento}
                        onChange={(e) => setHorarioEntrenamiento(e.target.value)}
                        className="border border-gray-300 p-2 w-full"
                    >
                        <option value="">Seleccionar</option>
                        <option value="mañana">Mañana</option>
                        <option value="siesta">Siesta</option>
                        <option value="tarde">Tarde</option>
                    </select>
                </div>

                <div className="mt-2">
                    <label className="block text-gray-700 font-medium mb-2">Hora de inicio</label>
                    <input
                        type="time"
                        value={horaExactaEntrenamiento || ''}
                        onChange={(e) => setHoraExactaEntrenamiento(e.target.value)}
                        className="border border-gray-300 p-2 w-full"
                    />
                </div>

                <div>
                    <label className="block text-gray-700 font-medium mb-2">Historial deportivo</label>
                    <textarea value={historialDeportivo} onChange={(e) => setHistorialDeportivo(e.target.value)} className="border border-gray-300 p-2 w-full" />
                </div>

                <div>
                    <label className="block text-gray-700 font-medium mb-2">Historial de vida</label>
                    <textarea value={historialDeVida} onChange={(e) => setHistorialDeVida(e.target.value)} className="border border-gray-300 p-2 w-full" />
                </div>

                <div>
                    <label className="block text-gray-700 font-medium mb-2">Objetivos</label>
                    <textarea value={objetivos} onChange={(e) => setObjetivos(e.target.value)} className="border border-gray-300 p-2 w-full" />
                </div>

                <div>
                    <label className="block text-gray-700 font-medium mb-2">Patologías</label>
                    <textarea value={patologias} onChange={(e) => setPatologias(e.target.value)} className="border border-gray-300 p-2 w-full" />
                </div>

                <button type="submit" className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded">
                    Registrar Alumno
                </button>
            </form>
        </div>
    );
}
