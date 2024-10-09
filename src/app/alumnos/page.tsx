'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import Modal from 'react-modal';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

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

// Función para verificar si el alumno pagó el mes actual
function verificarPagoMesActual(pagos: any[]): boolean {
    const mesActual = new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase();
    return pagos.some(pago => pago.mes.toLowerCase() === mesActual);
}

export default function ListaAlumnosPage() {
    const [alumnos, setAlumnos] = useState<any[]>([]);
    const [editandoAlumno, setEditandoAlumno] = useState<any | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEdad, setFiltroEdad] = useState('');
    const [filtroLetraApellido, setFiltroLetraApellido] = useState('');
    const router = useRouter();

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

    const guardarAlumno = async (id: string, alumnoActualizado: any) => {
        try {
            const response = await fetch(`/api/alumnos`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, ...alumnoActualizado }),
            });

            if (!response.ok) {
                throw new Error('Error al actualizar alumno');
            }

            const data = await response.json();
            setAlumnos((prevAlumnos) =>
                prevAlumnos.map((alumno) =>
                    alumno._id === id ? { ...alumno, ...data } : alumno
                )
            );
            setEditandoAlumno(null);

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
                    body: JSON.stringify({ id }),
                });

                if (!response.ok) {
                    throw new Error('Error al eliminar alumno');
                }

                const alumnoEliminado = await response.json();
                setAlumnos((prevAlumnos) => prevAlumnos.filter((alumno) => alumno._id !== alumnoEliminado._id));

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

    const marcarPagoMes = async (alumnoId: string) => {
        const mesActual = new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase();
        const nuevoPago = { mes: mesActual, fechaPago: new Date() }; // Registrar el mes y la fecha del pago

        try {
            const response = await fetch(`/api/alumnos/pagos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ alumnoId, nuevoPago }),
            });

            if (!response.ok) {
                throw new Error('Error al registrar el pago');
            }

            const alumnoActualizado = await response.json();
            setAlumnos((prevAlumnos) =>
                prevAlumnos.map((alumno) =>
                    alumno._id === alumnoId ? { ...alumno, pagos: alumnoActualizado.pagos } : alumno
                )
            );

            Swal.fire({
                icon: 'success',
                title: 'Pago registrado correctamente',
                showConfirmButton: false,
                timer: 1500,
            });
        } catch (error) {
            console.error('Error al registrar el pago:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error al registrar el pago',
                text: 'Hubo un problema al registrar el pago.',
            });
        }
    };

    const handleLetraClick = (letra: string) => {
        setFiltroLetraApellido(letra);
    };

    const alumnosFiltrados = alumnos
        .filter((alumno) => {
            const coincideBusqueda = alumno.nombre.toLowerCase().includes(busqueda.toLowerCase()) || alumno.dni.includes(busqueda);
            const coincideEdad = filtroEdad ? alumno.edad === parseInt(filtroEdad) : true;
            const coincideLetraApellido = filtroLetraApellido ? alumno.apellido.startsWith(filtroLetraApellido) : true;
            return coincideBusqueda && coincideEdad && coincideLetraApellido;
        })
        .sort((a, b) => a.apellido.localeCompare(b.apellido));

    const letrasAlfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    return (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded shadow-md">

            <h1 className="text-2xl font-semibold text-gray-800 mb-6">Lista de Alumnos</h1>

            {/* Buscador */}
            <div className="mb-2">
                <input
                    type="text"
                    placeholder="Buscar por nombre o documento"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="border border-gray-300 p-2 w-full mb-2 rounded"
                />
            </div>

            {/* Edades */}
            <select
                value={filtroEdad}
                onChange={(e) => setFiltroEdad(e.target.value)}
                className="border border-gray-300 p-2 w-full mb-2 rounded bg-gray-100"
            >
                <option value="">Edad</option>
                {[...Array.from(new Set(alumnos.map(alumno => alumno.edad)))].sort((a, b) => a - b).map((edad) => (
                    <option key={edad} value={edad}>{edad}</option>
                ))}
            </select>

            {/* Filtro por letra del apellido */}
            <div className="flex flex-wrap bg-gray-100 p-3 rounded border border-gray-300 mb-6">
                <h2 className='mb-2'>Apellido</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                    {letrasAlfabeto.map((letra) => (
                        <button
                            key={letra}
                            onClick={() => handleLetraClick(letra)}
                            className={`p-2 w-10 border border-gray-300 rounded ${filtroLetraApellido === letra ? 'bg-gray-700 text-white' : 'bg-white'}`}
                        >
                            {letra}
                        </button>
                    ))}
                    <button
                        onClick={() => setFiltroLetraApellido('')}
                        className="p-2 border rounded bg-gray-700 hover:bg-gray-600 text-white"
                    >
                        Limpiar
                    </button>
                </div>
            </div>

            {/* Tabla de alumnos */}
            <table className="table-auto w-full text-left">
                <thead>
                    <tr>
                        <th className="px-4 py-2">Nombre</th>
                        <th className="px-4 py-2">Edad</th>
                        <th className="px-4 py-2">DNI</th>
                        <th className="px-4 py-2">Acciones</th>
                        <th className="px-4 py-2">Pago</th>
                    </tr>
                </thead>
                <tbody>
                    {alumnosFiltrados.map((alumno) => (
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
                                    Eliminar
                                </button>
                            </td>
                            {/* Estado del pago */}
                            <td className="text-center align-middle">
                                {verificarPagoMesActual(alumno.pagos) ? (
                                    <FaCheckCircle className="text-green-500 mx-auto" />
                                ) : (
                                    <>
                                        <div className="flex justify-center items-center gap-2">
                                            <FaTimesCircle className="text-red-500 mx-auto" />
                                            <button
                                                onClick={() => marcarPagoMes(alumno._id)}
                                                className="bg-green-500 hover:bg-green-600 text-white text-sm p-2 rounded mt-2"
                                            >
                                                Marcar Pago
                                            </button>
                                        </div>
                                    </>
                                )}
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
                        guardarAlumno(editandoAlumno._id, editandoAlumno); // Actualizar alumno
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
