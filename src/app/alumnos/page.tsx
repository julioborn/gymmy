'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import Modal from 'react-modal';
import AlumnoActions from '@/components/AlumnoActions';
import clsx from 'clsx';

// Lazy loading de componentes
const FiltrosAlumnos = React.lazy(() => import('@/components/FiltroAlumnos'));
const ModalEditAlumno = React.lazy(() => import('@/components/ModalEditAlumno'));
const ModalEditTarifas = React.lazy(() => import('@/components/ModalEditTarifas'));

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
    const [editandoTarifas, setEditandoTarifas] = useState(false);

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
        // Crear las opciones dinámicas basadas en las tarifas
        const opcionesTarifas = tarifas.reduce((options, tarifa) => {
            options[tarifa.dias] = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${tarifa.dias} día${tarifa.dias > 1 ? 's' : ''} por semana</span>
                    <strong>$${tarifa.valor}</strong>
                </div>`;
            return options;
        }, {} as Record<number, string>); // Inicializa el objeto como un Record de números a strings

        const { value: diasMusculacion } = await Swal.fire({
            title: 'Selecciona los días de musculación por semana',
            input: 'select',
            inputOptions: opcionesTarifas,
            inputPlaceholder: 'Selecciona una opción',
            showCancelButton: true,
            didOpen: () => {
                // Ajustar el estilo de las opciones después de que se renderice
                const select = Swal.getHtmlContainer()?.querySelector('select');
                if (select) {
                    select.style.textAlign = 'left'; // Opciones alineadas a la izquierda
                    select.style.width = '100%';    // Tamaño completo del select
                }
            },
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
            customClass: {
                confirmButton: 'bg-green-700 mr-2 hover:bg-green-800 text-white font-bold py-2 px-4 rounded',
                cancelButton: 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded',
                popup: 'custom-swal-popup',
            },
            buttonsStyling: false,
        });

        if (diasMusculacion) {
            const tarifaSeleccionada = tarifas.find((tarifa) => tarifa.dias === Number(diasMusculacion));

            if (!tarifaSeleccionada) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se encontró una tarifa para los días seleccionados.',
                });
                return;
            }

            const confirmacion = await Swal.fire({
                title: 'Confirmar cobro',
                html: `
                    <p>Días de musculación: <strong>${diasMusculacion}</strong></p>
                    <p>Precio: <strong>$${tarifaSeleccionada.valor}</strong></p>
                `,
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'Cobrar',
                cancelButtonText: 'Cancelar',
                customClass: {
                    confirmButton: 'bg-green-700 mr-2 hover:bg-green-800 text-white font-bold py-2 px-4 rounded',
                    cancelButton: 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded',
                    popup: 'custom-swal-popup',
                },
                buttonsStyling: false,
            });

            if (confirmacion.isConfirmed) {
                try {
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
        }
    };

    const guardarTarifas = async (nuevasTarifas: Tarifa[]) => {
        try {
            const response = await fetch('/api/tarifas', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevasTarifas),
            });

            if (!response.ok) throw new Error('Error al actualizar tarifas');

            Swal.fire('Tarifas actualizadas', '', 'success');
            setTarifas(nuevasTarifas); // Actualiza el estado de tarifas
            setEditandoTarifas(false); // Cierra el modal
        } catch (error) {
            Swal.fire('Error', 'No se pudieron actualizar las tarifas', 'error');
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
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
            customClass: {
                confirmButton: 'bg-green-700 mr-2 hover:bg-green-800 text-white font-bold py-2 px-4 rounded',
                cancelButton: 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded',
                popup: 'custom-swal-popup',
            },
            buttonsStyling: false,
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

    const Loader = () => (
        <div className="flex justify-center items-center h-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-700"></div>
        </div>
    );

    return (
        <div className="w-full max-w-full lg:max-w-6xl mx-auto bg-white p-4 lg:p-8 rounded shadow-md">
            <h1 className="text-xl lg:text-2xl font-semibold text-gray-800 mb-4 lg:mb-6">Lista de Alumnos</h1>

            {/* Filtros select */}
            <Suspense fallback={<Loader />}>
                <FiltrosAlumnos
                    busqueda={busqueda}
                    setBusqueda={setBusqueda}
                    filtroEdad={filtroEdad}
                    setFiltroEdad={setFiltroEdad}
                    filtroPago={filtroPago}
                    setFiltroPago={setFiltroPago}
                    ordenDiasRestantes={ordenDiasRestantes}
                    setOrdenDiasRestantes={setOrdenDiasRestantes}
                    edades={[...Array.from(new Set(alumnos.map((alumno) => alumno.edad)))].sort((a, b) => a - b)}
                    limpiarFiltros={() => {
                        setBusqueda('');
                        setFiltroEdad('');
                        setFiltroPago('');
                        setOrdenDiasRestantes('');
                    }}
                />
            </Suspense>

            {/* Tarifas */}
            <div className="flex justify-between items-center mb-10 mt-4">
                {/* Botón Configurar Tarifas */}
                <button
                    onClick={() => setEditandoTarifas(true)}
                    className={clsx(
                        'bg-gray-700 text-white px-4 py-2 text-sm rounded flex',
                        'hover:bg-gray-800'
                    )}
                >
                    <span className="text-white">Tarifas</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5 ml-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                </button>
            </div>

            {/* Tarjetas de alumnos */}
            <Suspense fallback={<Loader />}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mt-4">
                    {alumnosFiltrados.map((alumno) => (
                        <AlumnoActions
                            key={alumno._id}
                            alumno={alumno}
                            router={router}
                            onHistorial={(id) => router.push(`/alumnos/${id}/historial`)}
                            onEditar={(alumno) => setEditandoAlumno(alumno)}
                            onEliminar={(id) => eliminarAlumno(id)}
                            onIniciarPlan={(id) => iniciarPlan(id)}
                            onMarcarPago={(id) => marcarPagoMes(id)}
                        />
                    ))}
                </div>
            </Suspense>

            {/* Ventana modal para editar el alumno */}
            {editandoAlumno && (
                <Suspense fallback={<Loader />}>
                    <ModalEditAlumno
                        alumno={editandoAlumno}
                        onClose={() => setEditandoAlumno(null)}
                        onSave={guardarAlumno}
                    />
                </Suspense>
            )}

            {/* Ventana modal para editar las tarifas */}
            {editandoTarifas && (
                <Suspense fallback={<Loader />}>
                    <ModalEditTarifas
                        tarifas={tarifas}
                        onClose={() => setEditandoTarifas(false)}
                        onSave={guardarTarifas}
                    />
                </Suspense>
            )}

        </div>
    );
}
