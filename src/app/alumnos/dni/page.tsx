'use client'
import React, { useState } from 'react';
import Swal from 'sweetalert2';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import './keyboardStyles.css'; // Tu archivo CSS personalizado

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

            // Obtener la fecha de hoy sin la hora
            const hoy = new Date();
            const fechaHoy = hoy.toISOString().split('T')[0];

            // Verificar si ya se ha registrado esta actividad hoy
            const actividadHoy = alumno.asistencia.some((asistencia: any) =>
                asistencia.fecha.startsWith(fechaHoy) && asistencia.actividad === actividad && asistencia.presente
            );

            if (actividadHoy) {
                Swal.fire({
                    icon: 'info',
                    title: `Hola, ${alumno.nombre}...`,
                    text: `Ya tienes registrada la actividad "${actividad}" para el día de hoy. No es posible registrar esta actividad nuevamente.`,
                });
                setIsLoading(false);
                return;
            }

            // Registrar la asistencia para la actividad seleccionada
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
                throw new Error('Error al registrar asistencia');
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
        <div className="max-w-lg mx-auto bg-white p-6 sm:p-8 md:p-10 rounded shadow-md mt-8 relative">
            {/* Loader */}
            {isLoading && (
                <div className="absolute inset-0 bg-gray-700 bg-opacity-75 flex items-center justify-center z-10">
                    <div className="loader" />
                </div>
            )}

            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-6 text-center">Ingrese su Documento</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="border border-gray-300 p-2 w-full rounded size-max"
                    placeholder="Ingrese su DNI"
                    required
                    disabled={isLoading}
                />

                {/* Botones interactivos para seleccionar la actividad */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                        type="button"
                        onClick={() => setActividad('Musculación')}
                        className={`p-2 sm:p-4 text-sm h-16 sm:text-base rounded ${actividad === 'Musculación' ? 'bg-[#007bff96]' : 'bg-gray-200'}`}
                        disabled={isLoading}
                    >
                        Musculación
                    </button>
                    <button
                        type="button"
                        onClick={() => setActividad('Intermitente')}
                        className={`p-2 sm:p-4 text-sm h-16 sm:text-base rounded ${actividad === 'Intermitente' ? 'bg-[#ff851bb0]' : 'bg-gray-200'}`}
                        disabled={isLoading}
                    >
                        Intermitente
                    </button>
                </div>

                {/* Teclado numérico siempre visible */}
                <div className="mt-2 mb-4">
                    <Keyboard
                        onChange={handleKeyboardChange}
                        inputName="dni"
                        theme="hg-theme-default hg-layout-numeric my-custom-keyboard"
                        layout={{
                            default: [
                                '1 2 3',
                                '4 5 6',
                                '7 8 9',
                                ' 0 {bksp}',
                            ],
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
                        className="h-16 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 sm:px-6 sm:py-3 rounded"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Buscando...' : 'Registrar Presente'}
                    </button>
                </div>
            </form>

            {/* CSS para el loader */}
            <style jsx>{`
                .loader {
                    border: 8px solid #f3f3f3;
                    border-top: 8px solid #3498db;
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(360deg);
                    }
                }
            `}</style>
        </div>
    );
}
