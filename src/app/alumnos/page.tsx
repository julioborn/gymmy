'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import Modal from 'react-modal';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

// Configura react-modal para el body
Modal.setAppElement('body');

type Tarifa = {
    dias: number;
    valor: number;
};

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

// Función para calcular los días restantes del plan de entrenamiento
function calcularDiasRestantes(plan: any, asistencias: any[]): number | null {
    if (!plan || !plan.fechaInicio || !plan.duracion) return null;

    const fechaInicio = new Date(plan.fechaInicio);
    const duracion = plan.duracion;

    const asistenciasMusculacion = asistencias.filter(
        (asistencia) => asistencia.actividad === 'Musculación' && asistencia.presente &&
            new Date(asistencia.fecha) >= fechaInicio
    ).length;

    const diasRestantes = duracion - asistenciasMusculacion;
    return diasRestantes > 0 ? diasRestantes : 0;
}

// Función para verificar si el alumno pagó el mes actual
function verificarPagoMesActual(pagos: any[]): boolean {
    const mesActual = new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase();
    return pagos.some(pago => pago.mes.toLowerCase() === mesActual);
}

// Función para determinar el color según los días restantes (semáforo)
function obtenerColorSemaforo(diasRestantes: number | null): string {
    if (diasRestantes === null) return ''; // Si no hay plan o no se ha iniciado
    if (diasRestantes > 10) return 'text-green-500';  // Verde
    if (diasRestantes > 5) return 'text-yellow-500';  // Amarillo
    return 'text-red-500';                           // Rojo
}

export default function ListaAlumnosPage() {
    const [alumnos, setAlumnos] = useState<any[]>([]);
    const [editandoAlumno, setEditandoAlumno] = useState<any | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEdad, setFiltroEdad] = useState('');
    const [filtroLetraApellido, setFiltroLetraApellido] = useState('');
    const [filtroPago, setFiltroPago] = useState('');
    const [ordenDiasRestantes, setOrdenDiasRestantes] = useState('');
    const [tarifas, setTarifas] = useState<Tarifa[]>([]); // Tarifa[] para el tipo correcto
    const router = useRouter();

    const fetchAlumnos = async () => {
        try {
            const response = await fetch('/api/alumnos');
            if (!response.ok) throw new Error('Error en la solicitud');

            const data = await response.json();
            const alumnosConDatos = data.map((alumno: any) => {
                const diasRestantes = calcularDiasRestantes(alumno.planEntrenamiento, alumno.asistencia);
                const edad = alumno.fechaNacimiento ? calcularEdad(alumno.fechaNacimiento) : null; // Calcula la edad si la fecha de nacimiento está disponible
                return { ...alumno, diasRestantes, edad };
            });

            setAlumnos(alumnosConDatos); // No necesitas await aquí, el cálculo es síncrono
        } catch (error) {
            console.error('Error al obtener alumnos:', error);
        }
    };

    useEffect(() => {
        fetchAlumnos();
    }, []);

    const fetchTarifas = async () => {
        try {
            const response = await fetch('/api/tarifas');
            const data = await response.json();
            setTarifas(data); // Actualiza el estado con los datos de tarifas
        } catch (error) {
            console.error("Error al obtener tarifas:", error);
        }
    };

    useEffect(() => {
        fetchTarifas(); // Llama a fetchTarifas una vez al montar el componente
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
        const { value: diasMusculacion } = await Swal.fire({
            title: 'Selecciona los días de musculación por semana',
            input: 'select',
            inputOptions: {
                1: '1 día por semana',
                2: '2 días por semana',
                3: '3 días por semana',
                4: '4 días por semana',
                5: '5 días por semana'
            },
            inputPlaceholder: 'Selecciona una opción',
            showCancelButton: true,
        });

        if (diasMusculacion) {
            try {
                const tarifaSeleccionada = tarifas.find((tarifa) => tarifa.dias === Number(diasMusculacion));
                if (!tarifaSeleccionada) {
                    throw new Error('No se pudo encontrar una tarifa para los días seleccionados.');
                }

                const mesActual = new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase();
                const nuevoPago = {
                    mes: mesActual,
                    fechaPago: new Date(),
                    diasMusculacion: Number(diasMusculacion),
                    tarifa: tarifaSeleccionada.valor,
                };

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

                Swal.fire('Pago registrado correctamente', '', 'success');
                fetchAlumnos(); // Refrescar la lista de alumnos
            } catch (error) {
                console.error('Error al registrar el pago:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error al registrar el pago',
                    text: 'Hubo un problema al registrar el pago.',
                });
            }
        }
    };

    const iniciarPlan = async (alumnoId: string) => {
        // Obtén la fecha actual en formato ISO (YYYY-MM-DD)
        const fechaInicio = new Date().toISOString().split('T')[0];

        const { value: duracion } = await Swal.fire({
            title: 'Definir duración del plan de entrenamiento',
            input: 'number',
            inputLabel: 'Cantidad de entrenamientos',
            inputPlaceholder: 'Ingresar la cantidad',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value || Number(value) <= 0) {
                    return 'Debes ingresar una duración válida';
                }
                return null;
            },
        });

        if (duracion) {
            try {
                const response = await fetch(`/api/alumnos/${alumnoId}/plan`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fechaInicio,
                        duracion: Number(duracion),
                        terminado: false,
                    }),
                });

                if (response.ok) {
                    Swal.fire('Plan de entrenamiento iniciado', '', 'success');
                    fetchAlumnos(); // Refrescar la lista de alumnos
                } else {
                    Swal.fire('Error', 'No se pudo iniciar el plan de entrenamiento', 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Ocurrió un problema al iniciar el plan', 'error');
            }
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

            const coincidePago = filtroPago === '' // Filtrar por pago
                ? true
                : filtroPago === 'pagado'
                    ? verificarPagoMesActual(alumno.pagos)
                    : !verificarPagoMesActual(alumno.pagos);

            return coincideBusqueda && coincideEdad && coincideLetraApellido && coincidePago;
        })
        .sort((a, b) => {
            if (ordenDiasRestantes === 'asc') {
                return (a.diasRestantes ?? Infinity) - (b.diasRestantes ?? Infinity);
            } else if (ordenDiasRestantes === 'desc') {
                return (b.diasRestantes ?? Infinity) - (a.diasRestantes ?? Infinity);
            } else {
                // Orden alfabético por defecto si no se selecciona asc/desc
                return a.apellido.localeCompare(b.apellido);
            }
        });

    //const letrasAlfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    return (
        <div className="w-full max-w-full lg:max-w-6xl mx-auto bg-white p-4 lg:p-8 rounded shadow-md">
            <h1 className="text-xl lg:text-2xl font-semibold text-gray-800 mb-4 lg:mb-6">Lista de Alumnos</h1>

            {/* Buscador */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Buscar por nombre o documento"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="border border-gray-300 p-2 w-full mb-2 rounded"
                />
            </div>

            {/* Filtros select */}
            <div className="space-y-2 lg:space-x-2 lg:space-y-0 flex flex-col lg:flex-row">
                <select
                    value={filtroEdad}
                    onChange={(e) => setFiltroEdad(e.target.value)}
                    className="border border-gray-300 p-2 rounded bg-gray-200 w-full cursor-pointer"
                >
                    <option value="">Edad</option>
                    {[...Array.from(new Set(alumnos.map((alumno) => alumno.edad)))].sort((a, b) => a - b).map((edad) => (
                        <option key={edad} value={edad}>{edad}</option>
                    ))}
                </select>

                <select
                    value={filtroPago}
                    onChange={(e) => setFiltroPago(e.target.value)}
                    className="border border-gray-300 p-2 rounded bg-gray-200 w-full cursor-pointer"
                >
                    <option value="">Pago</option>
                    <option value="pagado">Pagaron</option>
                    <option value="no-pagado">No pagaron</option>
                </select>

                <select
                    value={ordenDiasRestantes}
                    onChange={(e) => setOrdenDiasRestantes(e.target.value)}
                    className="border border-gray-300 p-2 rounded bg-gray-200 w-full cursor-pointer"
                >
                    <option value="">Días Restantes Plan</option>
                    <option value="asc">Días Restantes (Ascendente)</option>
                    <option value="desc">Días Restantes (Descendente)</option>
                </select>
            </div>

            {/* Botón para limpiar filtros */}
            <div className="mt-4 flex justify-end">
                <button
                    onClick={() => {
                        setBusqueda('');
                        setFiltroEdad('');
                        setFiltroLetraApellido('');
                        setFiltroPago('');
                        setOrdenDiasRestantes('');
                    }}
                    className="bg-gray-700 text-white px-2 py-2 text-sm rounded hover:bg-gray-800"
                >
                    Limpiar Filtros
                </button>
            </div>

            {/* Tarjetas de alumnos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mt-4">
                {alumnosFiltrados.map((alumno) => (
                    <div
                        key={alumno._id}
                        className="bg-gray-200 border border-gray-400 rounded-lg p-4 shadow-md"
                    >
                        <h2 className="text-lg font-semibold text-gray-800">{alumno.nombre} {alumno.apellido}</h2>
                        <p className="text-gray-600 text-md">Edad: {alumno.edad}</p>
                        <p className="text-gray-600 text-md">DNI: {alumno.dni}</p>
                        <p className="text-gray-600 text-md">Teléfono: {alumno.telefono}</p>
                        <p className="text-gray-600 text-md">Email: {alumno.email}</p>

                        <div className="mt-4 flex justify-between items-center">
                            <div>
                                {verificarPagoMesActual(alumno.pagos) ? (
                                    <div className='flex items-center space-x-1'>
                                        <p>Pagó</p>
                                        <FaCheckCircle className="text-green-500 flex " title="Pagado" />
                                    </div>
                                ) : (
                                    <div className='flex items-center space-x-1'>
                                        <p>No Pagó</p>
                                        <FaTimesCircle className="text-red-500" title="No Pagado" />
                                    </div>
                                )}
                            </div>

                            <div className={`font-bold ${obtenerColorSemaforo(alumno.diasRestantes)}`}>
                                {alumno.diasRestantes === 0 ? (
                                    <span className="text-red-500">Plan Terminado</span>
                                ) : alumno.diasRestantes !== null ? (
                                    `${alumno.diasRestantes} días restantes de plan`
                                ) : (
                                    'Sin plan'
                                )}
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-1 justify-center">
                            <button
                                onClick={() => router.push(`/alumnos/${alumno._id}/historial`)}
                                className="bg-gray-700 text-white px-2 py-2 text-sm rounded"
                            >
                                Historial
                            </button>
                            <button
                                onClick={() => iniciarPlan(alumno._id)}
                                className={`text-white text-sm px-4 py-2 rounded ${alumno.planEntrenamiento &&
                                    alumno.planEntrenamiento.fechaInicio &&
                                    alumno.planEntrenamiento.duracion &&
                                    !alumno.planEntrenamiento.terminado
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-orange-500 hover:bg-orange-600'
                                    }`}
                                disabled={
                                    alumno.planEntrenamiento &&
                                    alumno.planEntrenamiento.fechaInicio &&
                                    alumno.planEntrenamiento.duracion &&
                                    !alumno.planEntrenamiento.terminado
                                }
                            >
                                {alumno.planEntrenamiento &&
                                    alumno.planEntrenamiento.fechaInicio &&
                                    alumno.planEntrenamiento.duracion &&
                                    !alumno.planEntrenamiento.terminado
                                    ? 'Plan en curso'
                                    : 'Iniciar Plan'}
                            </button>
                            <button
                                onClick={() => marcarPagoMes(alumno._id)}
                                className={`text-white text-sm px-4 py-2 rounded ${verificarPagoMesActual(alumno.pagos) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
                                    }`}
                                disabled={verificarPagoMesActual(alumno.pagos)}
                            >
                                {verificarPagoMesActual(alumno.pagos) ? 'Mes Cobrado' : 'Cobrar Mes'}
                            </button>
                            <button
                                onClick={() => setEditandoAlumno(alumno)}
                                className="bg-yellow-500 text-white px-4 py-2 text-sm rounded"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 26 26" stroke-width="1.5" stroke="currentColor" className="size-5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                </svg>
                            </button>
                            <button
                                onClick={() => eliminarAlumno(alumno._id)}
                                className="bg-red-500 text-white px-4 py-2 text-sm rounded"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 26 26" stroke-width="1.5" stroke="currentColor" className="size-5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                            </button>
                        </div>


                    </div>
                ))}
            </div>

            {/* Ventana modal para editar el alumno */}
            {editandoAlumno && (
                <Modal
                    isOpen={Boolean(editandoAlumno)}
                    onRequestClose={() => setEditandoAlumno(null)}
                    className="bg-white p-8 rounded shadow-md max-w-lg mx-auto w-[800px]"
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
                        <div className="mb-4">
                            <label className="block text-gray-700">Teléfono</label>
                            <input
                                type="text"
                                value={editandoAlumno.telefono}
                                onChange={(e) =>
                                    setEditandoAlumno((prev: any) => ({ ...prev, telefono: e.target.value }))
                                }
                                className="border border-gray-300 p-2 w-full"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700">Email</label>
                            <input
                                type="text"
                                value={editandoAlumno.email}
                                onChange={(e) =>
                                    setEditandoAlumno((prev: any) => ({ ...prev, email: e.target.value }))
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
