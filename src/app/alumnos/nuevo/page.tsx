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
    const [diasEntrenaSemana, setDiasEntrenaSemana] = useState<number | ''>(''); // Estado para días de entrenamiento

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Construir el objeto del alumno
        const nuevoAlumno: any = {
            nombre,
            apellido,
            fechaNacimiento: new Date(fechaNacimiento),
            dni,
            telefono,
            email,
        };

        // Agregar los días de entrenamiento si se proporcionan
        if (diasEntrenaSemana !== '') {
            nuevoAlumno.diasEntrenaSemana = Number(diasEntrenaSemana);
        }

        // Llama a la API para agregar el alumno
        await fetch('/api/alumnos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(nuevoAlumno),
        });

        // Mostrar la alerta de SweetAlert2
        Swal.fire({
            icon: 'success',
            title: 'Alumno registrado exitosamente',
            showConfirmButton: false,
            timer: 1500,
        });

        // Limpia el formulario después de registrar al alumno
        setNombre('');
        setApellido('');
        setFechaNacimiento('');
        setDni('');
        setTelefono('');
        setEmail('');
        setDiasEntrenaSemana('');
    };

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
                <div>
                    <label htmlFor="telefono" className="block text-gray-700 font-medium mb-2">
                        Teléfono <span className='text-red-600'>(opcional)</span>
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
                        Email <span className='text-red-600'>(opcional)</span>
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
                        Días por semana <span className='text-red-600'>(opcional)</span>
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
                <button type="submit" className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded">
                    Registrar Alumno
                </button>
            </form>
        </div>
    );
}
