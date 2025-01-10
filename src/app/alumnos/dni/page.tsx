'use client';
import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import './keyboardStyles.css';
import { addIngreso, getIngresosPendientes, deleteIngreso } from '@/utils/indexedDB';

export default function RegistrarAsistenciaPorDNIPage() {
    const [dni, setDni] = useState('');
    const [actividad, setActividad] = useState('Musculación'); // Valor predeterminado
    const [isLoading, setIsLoading] = useState(false);
    const [keyboard, setKeyboard] = useState<any>(null); // Referencia al teclado virtual

    const formatDNIWithDots = (input: string): string => {
        const cleanInput = input.replace(/\./g, ''); // Eliminar puntos existentes
        if (cleanInput.length <= 2) return cleanInput; // Sin puntos si es menor o igual a 2 caracteres
        if (cleanInput.length <= 5) return `${cleanInput.slice(0, 2)}.${cleanInput.slice(2)}`; // Un punto después de los primeros 2 caracteres
        return `${cleanInput.slice(0, 2)}.${cleanInput.slice(2, 5)}.${cleanInput.slice(5)}`; // Dos puntos
    };

    const handleKeyboardChange = (input: string) => {
        const formattedInput = formatDNIWithDots(input); // Formatear el input con puntos
        setDni(formattedInput); // Actualizar el estado con el DNI formateado
        if (keyboard) keyboard.setInput(formattedInput); // Actualizar el valor en el teclado virtual
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const cleanDNI = dni.replace(/\./g, ''); // Eliminar puntos antes de enviar

        if (!/^\d+$/.test(cleanDNI)) {
            Swal.fire({
                icon: 'error',
                title: 'DNI inválido',
                text: 'El DNI debe contener solo números.',
            });
            return;
        }

        setIsLoading(true);
        const fecha = new Date().toISOString(); // Fecha y hora actual

        try {
            const response = await fetch(`/api/alumnos?dni=${cleanDNI}`);
            if (!response.ok) throw new Error('Error al buscar alumno');

            const alumno = await response.json();

            const ingreso = {
                dni: cleanDNI,
                actividad,
                fecha,
                presente: true,
                nombre: alumno.nombre,
            };

            const asistenciaResponse = await fetch(`/api/asistencias/${alumno._id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(ingreso),
            });

            if (!asistenciaResponse.ok) throw new Error('Error al registrar asistencia');

            Swal.fire({
                icon: 'success',
                title: `¡Hola ${alumno.nombre}!`,
                text: `Tu asistencia para "${actividad}" ha sido registrada.`,
                showConfirmButton: false,
                timer: 4000,
            });

            setDni(''); // Limpiar el campo DNI
            if (keyboard) keyboard.setInput(''); // Limpia el teclado virtual
        } catch (error) {
            console.error('Error de conexión. Guardando localmente:', error);

            const ingreso = {
                dni: cleanDNI,
                actividad,
                fecha,
                presente: true,
                nombre: 'Alumno',
            };

            await addIngreso(ingreso);

            Swal.fire({
                icon: 'info',
                title: `¡Hola!`,
                text: `Tu asistencia para "${actividad}" será registrada al reconectarse.`,
            });

            setDni(''); // Limpiar el campo DNI
            if (keyboard) keyboard.setInput(''); // Limpia el teclado virtual
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-lg mx-auto bg-white p-6 sm:p-8 md:p-10 rounded shadow-md mt-8 relative">
            {isLoading && (
                <div className="absolute inset-0 bg-gray-700 bg-opacity-75 flex items-center justify-center z-10">
                    <div className="loader" />
                </div>
            )}

            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-6 text-center">Ingrese su Documento</h1>

            <div className="mb-6 text-center">
                <div
                    className="border border-gray-400 bg-gray-100 rounded-md py-4 px-6 text-3xl font-bold text-gray-800 tracking-widest shadow-md"
                    style={{ fontFamily: "'Courier New', monospace" }}
                >
                    {dni || '‎'}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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

                <div className="mt-2 mb-4">
                    <Keyboard
                        keyboardRef={(r) => setKeyboard(r)} // Referencia al teclado virtual
                        onChange={handleKeyboardChange}
                        onKeyPress={(button) => {
                            if (button === "{submit}") {
                                handleSubmit(new Event("submit") as unknown as React.FormEvent);
                            }
                        }}
                        inputName="dni"
                        theme="hg-theme-default hg-layout-numeric my-custom-keyboard"
                        layout={{
                            default: [
                                "1 2 3",
                                "4 5 6",
                                "7 8 9",
                                "{bksp} 0 {submit}",
                            ],
                        }}
                        display={{
                            "{bksp}": "⌫",
                            "{submit}": "Registrar",
                        }}
                    />
                </div>

                {/* <div className="flex justify-center">
                    <button
                        type="submit"
                        className="h-16 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 sm:px-6 sm:py-3 rounded"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Buscando...' : 'Registrar Presente'}
                    </button>
                </div> */}
            </form>
        </div>
    );
}
