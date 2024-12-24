'use client';
import React, { useState } from 'react';
import Swal from 'sweetalert2';  // Importar SweetAlert2

export default function NuevoAlumnoPage() {
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [fechaNacimiento, setFechaNacimiento] = useState(''); // Cambiado de edad a fechaNacimiento
    const [dni, setDni] = useState('');
    const [telefono, setTelefono] = useState('');
    const [email, setEmail] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Llama a la API para agregar el alumno
        await fetch('/api/alumnos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nombre, apellido, fechaNacimiento: new Date(fechaNacimiento), dni, telefono, email }),
        });
        // Mostrar la alerta de SweetAlert2
        Swal.fire({
            icon: 'success',
            title: 'Alumno registrado exitosamente',
            showConfirmButton: false,
            timer: 1500
        });
        // Limpia el formulario después de registrar al alumno
        setNombre('');
        setApellido('');
        setFechaNacimiento('');
        setDni('');
        setTelefono('');
        setEmail('');
    };

    return (
        <div className="max-w-md mx-auto bg-white p-8 rounded shadow-md">
            <h1 className="text-2xl font-semibold text-gray-800 mb-6">Registrar Alumno</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    placeholder="Nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="border border-gray-300 p-2 w-full"
                    required
                />
                <input
                    type="text"
                    placeholder="Apellido"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    className="border border-gray-300 p-2 w-full"
                    required
                />
                <input
                    type="text"
                    placeholder="Teléfono"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="border border-gray-300 p-2 w-full"
                    required
                />
                <input
                    type="text"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border border-gray-300 p-2 w-full"
                    required
                />
                <input
                    type="text"
                    placeholder="DNI"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="border border-gray-300 p-2 w-full"
                    required
                />
                <input
                    type="date" // Cambiado a un input de tipo fecha
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="border border-gray-300 p-2 w-full"
                    required
                />
                <button type="submit" className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded">
                    Registrar Alumno
                </button>
            </form>
        </div>
    );
}
