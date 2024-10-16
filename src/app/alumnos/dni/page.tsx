'use client';
import React, { useState } from 'react';
import Swal from 'sweetalert2';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';

export default function RegistrarAsistenciaPorDNIPage() {
    const [dni, setDni] = useState('');
    const [actividad, setActividad] = useState('Musculación'); // Valor predeterminado
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Buscar al alumno por DNI
            const response = await fetch(`/api/alumnos?dni=${dni}`);
            if (!response.ok) {
                throw new Error('Error al buscar alumno');
            }

            const alumno = await response.json();

            if (!alumno) {
                Swal.fire({
                    icon: 'error',
                    title: 'Alumno no encontrado',
                    text: 'No se encontró un alumno con el DNI proporcionado.',
                });
                setIsLoading(false);
                return;
            }

            // Registrar la asistencia
            const fecha = new Date();  // Generar la fecha y hora actual
            const presente = true;  // El alumno está presente

            const asistenciaResponse = await fetch(`/api/asistencias/${alumno._id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fecha, presente, actividad }),  // Enviar la fecha, actividad y el estado de asistencia
            });

            if (!asistenciaResponse.ok) {
                if (asistenciaResponse.status === 400) {
                    Swal.fire({
                        icon: 'info',
                        title: `Hola, ${alumno.nombre}...`,
                        text: 'Ya tienes registrada la asistencia para esta actividad del día de hoy.',
                    });
                } else {
                    throw new Error('Error al registrar asistencia');
                }
                setIsLoading(false);
                return;
            }

            // Mostrar alerta de éxito
            Swal.fire({
                icon: 'success',
                title: `¡Hola ${alumno.nombre}!`,
                text: `Tu asistencia del día de hoy para la actividad "${actividad}" ha sido registrada.`,
                showConfirmButton: false,
                timer: 4000,
            });

        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error al registrar asistencia',
                text: 'Hubo un problema al registrar la asistencia.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyboardChange = (input: string) => {
        setDni(input); // Actualiza el estado del DNI con el valor del teclado virtual
    };

    return (
        <div className="max-w-md mx-auto bg-white p-8 rounded shadow-md">
            <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Ingrese su Documento</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="border border-gray-300 p-2 w-full"
                    required
                />

                {/* Botones interactivos para seleccionar la actividad */}
                <div className="flex justify-between mb-4">
                    <button
                        type="button"
                        onClick={() => setActividad('Musculación')}
                        className={`p-4 w-full mx-1 rounded ${actividad === 'Musculación' ? 'bg-[#007bff96]' : 'bg-gray-200'}`}
                    >
                        Musculación
                    </button>
                    <button
                        type="button"
                        onClick={() => setActividad('Intermitente')}
                        className={`p-4 w-full mx-1 rounded ${actividad === 'Intermitente' ? 'bg-[#ff851bb0]' : 'bg-gray-200'}`}
                    >
                        Intermitente
                    </button>
                    <button
                        type="button"
                        onClick={() => setActividad('Otro')}
                        className={`p-4 w-full mx-1 rounded ${actividad === 'Otro' ? 'bg-[#f1c40f]' : 'bg-gray-200'}`}
                    >
                        Otro
                    </button>
                </div>

                {/* Teclado numérico siempre visible */}
                <div className="mt-2 mb-4">
                    <Keyboard
                        onChange={handleKeyboardChange}
                        inputName="dni"
                        theme="hg-theme-default hg-layout-numeric"
                        layout={{
                            default: [
                                '1 2 3',
                                '4 5 6',
                                '7 8 9',
                                ' 0 {bksp}',
                            ]
                        }}
                        display={{
                            '{bksp}': '⌫', // Mostrar el botón de borrar
                        }}
                    />
                </div>

                {/* Botón centrado */}
                <div className="flex justify-center">
                    <button
                        type="submit"
                        className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Buscando...' : 'Registrar Presente'}
                    </button>
                </div>
            </form>
        </div>
    );
}
