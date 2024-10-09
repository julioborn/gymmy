'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import Modal from 'react-modal';

// Configura react-modal para el body
Modal.setAppElement('body');

// Función para calcular la edad a partir de la fecha de nacimiento
function calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return edad;
}

export default function ListaAlumnosPage() {
    const [alumnos, setAlumnos] = useState<any[]>([]);
    const [editandoAlumno, setEditandoAlumno] = useState<any | null>(null); // Alumno que se está editando
    const router = useRouter(); // Inicializamos el router

    useEffect(() => {
        async function fetchAlumnos() {
            try {
                const response = await fetch('/api/alumnos');

                if (!response.ok) {
                    throw new Error('Error en la solicitud');
                }

                const data = await response.json();
                const alumnosConEdad = data.map((alumno: any) => ({
                    ...alumno,
                    edad: calcularEdad(alumno.fechaNacimiento),
                }));

                setAlumnos(alumnosConEdad);
            } catch (error) {
                console.error('Error al obtener alumnos:', error);
            }
        }

        fetchAlumnos();
    }, []);

    // Función para manejar el guardado de un alumno editado
    const guardarAlumno = async (id: string, alumnoActualizado: any) => {
        try {
            const response = await fetch(`/api/alumnos`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, ...alumnoActualizado }), // Enviamos el ID
            });

            if (!response.ok) {
                throw new Error('Error al actualizar alumno');
            }

            // Actualiza la lista de alumnos
            const data = await response.json();
            setAlumnos((prevAlumnos) =>
                prevAlumnos.map((alumno) =>
                    alumno._id === id ? { ...alumno, ...data } : alumno
                )
            );
            setEditandoAlumno(null); // Salimos del modo edición

            // Alerta de éxito con SweetAlert
            Swal.fire({
                icon: 'success',
                title: 'Alumno actualizado correctamente',
                showConfirmButton: false,
                timer: 1500,
            });

        } catch (error) {
            console.error('Error al guardar el alumno:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error al actualizar el alumno',
                text: 'Hubo un problema al guardar los cambios.',
            });
        }
    };

    // Función para manejar la eliminación de un alumno con doble confirmación
    const eliminarAlumno = async (id: string) => {
        const result = await Swal.fire({
            title: '¿Estás seguro de eliminar el alumno?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`/api/alumnos`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ id }), // Enviamos el ID
                });

                if (!response.ok) {
                    throw new Error('Error al eliminar alumno');
                }

                // Filtra el alumno eliminado del estado
                const alumnoEliminado = await response.json();
                setAlumnos((prevAlumnos) => prevAlumnos.filter((alumno) => alumno._id !== alumnoEliminado._id));

                // Alerta de éxito con SweetAlert
                Swal.fire({
                    icon: 'success',
                    title: 'Alumno eliminado correctamente',
                    showConfirmButton: false,
                    timer: 1500,
                });

            } catch (error) {
                console.error('Error al eliminar alumno:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error al eliminar el alumno',
                    text: 'Hubo un problema al intentar eliminar el alumno.',
                });
            }
        }
    };

    return (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded shadow-md">
            <h1 className="text-2xl font-semibold text-gray-800 mb-6">Lista de Alumnos</h1>
            <table className="table-auto w-full text-left">
                <thead>
                    <tr>
                        <th className="px-4 py-2">Nombre</th>
                        <th className="px-4 py-2">Edad</th>
                        <th className="px-4 py-2">DNI</th>
                        <th className="px-4 py-2">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {alumnos.map((alumno) => (
                        <tr key={alumno._id} className="border-t">
                            <td className="px-4 py-2">{alumno.nombre} {alumno.apellido}</td>
                            <td className="px-4 py-2">{alumno.edad}</td>
                            <td className="px-4 py-2">{alumno.dni}</td>
                            <td className="px-4 py-2 flex space-x-2">
                                <button
                                    onClick={() => router.push(`/alumnos/${alumno._id}/historial`)}
                                    className="bg-gray-700 text-white p-2 rounded text-sm"
                                >
                                    Historial
                                </button>
                                <button
                                    onClick={() => setEditandoAlumno(alumno)}
                                    className="bg-yellow-500 text-white p-2 rounded text-sm"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => eliminarAlumno(alumno._id)}
                                    className="bg-red-500 text-white p-2 rounded text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 25 25" stroke-width="1.5" stroke="currentColor" className="size-5">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Ventana modal para editar el alumno */}
            {editandoAlumno && (
                <Modal
                    isOpen={Boolean(editandoAlumno)}
                    onRequestClose={() => setEditandoAlumno(null)}
                    className="bg-white p-8 rounded shadow-md max-w-lg mx-auto"
                    overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
                >
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Editar Alumno</h2>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        guardarAlumno(editandoAlumno._id, editandoAlumno);
                    }}>
                        <div className="mb-4">
                            <label className="block text-gray-700">Nombre</label>
                            <input
                                type="text"
                                value={editandoAlumno.nombre}
                                onChange={(e) =>
                                    setEditandoAlumno((prev: any) => ({ ...prev, nombre: e.target.value }))
                                }
                                className="border border-gray-300 p-2 w-full"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700">Apellido</label>
                            <input
                                type="text"
                                value={editandoAlumno.apellido}
                                onChange={(e) =>
                                    setEditandoAlumno((prev: any) => ({ ...prev, apellido: e.target.value }))
                                }
                                className="border border-gray-300 p-2 w-full"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700">DNI</label>
                            <input
                                type="text"
                                value={editandoAlumno.dni}
                                onChange={(e) =>
                                    setEditandoAlumno((prev: any) => ({ ...prev, dni: e.target.value }))
                                }
                                className="border border-gray-300 p-2 w-full"
                                required
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={() => setEditandoAlumno(null)}
                                className="bg-red-500 text-white px-4 py-2 rounded"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-green-600 text-white px-4 py-2 rounded"
                            >
                                Guardar
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
