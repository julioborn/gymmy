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
    const [tarifas, setTarifas] = useState<Tarifa[]>([]);
    const [recargo, setRecargo] = useState<number | null>(null);
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

    const handleConfiguracionTarifas = async () => {
        if (tarifas.length === 0) {
            await Swal.fire('Error', 'No se encontraron cuotas. Por favor, recarga la página.', 'error');
            return;
        }

        const tarifaInputs = tarifas
            .map(
                (tarifa) => `
                        <div style="display: flex; justify-content: center; margin-top: 4px; font-size: 16px;">
                            <label for="tarifa-${tarifa.dias}" style="display: flex; justify-content: center; align-items: center; font-weight: bold; margin-top: 14px; ">
                                Días ${tarifa.dias}:
                            </label>
                            <div style="display: flex; align-items: center;">
                                <input type="number" id="tarifa-${tarifa.dias}" class="swal2-input" value="${tarifa.valor}" style="width: 100%;" />
                            </div>
                        </div>
                    `
            )
            .join('');

        const result = await Swal.fire({
            title: 'Configurar Cuotas',
            html: `<div>${tarifaInputs}</div>`,
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                const updatedTarifas = tarifas.map((tarifa) => {
                    const valor = (document.getElementById(`tarifa-${tarifa.dias}`) as HTMLInputElement).value;
                    return { ...tarifa, valor: Number(valor) };
                });
                return updatedTarifas;
            },
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
            customClass: {
                confirmButton: 'bg-green-700 mr-2 hover:bg-green-800 text-white font-bold py-2 px-4 rounded',
                cancelButton: 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded',
            },
            buttonsStyling: false,
        });

        const nuevasTarifas = result.value as Tarifa[] | undefined;
        if (nuevasTarifas) {
            try {
                const response = await fetch('/api/tarifas', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevasTarifas),
                });
                if (response.ok) {
                    Swal.fire('Tarifas actualizadas', '', 'success');
                    setTarifas(nuevasTarifas);
                } else {
                    Swal.fire('Error', 'No se pudieron actualizar las tarifas', 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Ocurrió un problema al actualizar las tarifas', 'error');
            }
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
        }, {} as Record<number, string>);

        const { value: diasMusculacion } = await Swal.fire({
            title: 'Selecciona los días de musculación por semana',
            input: 'select',
            inputOptions: opcionesTarifas,
            inputPlaceholder: 'Selecciona una opción',
            showCancelButton: true,
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
        });

        if (diasMusculacion) {
            const tarifaSeleccionada = tarifas.find(
                (tarifa) => tarifa.dias === Number(diasMusculacion)
            );

            if (!tarifaSeleccionada) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se encontró una tarifa para los días seleccionados.',
                });
                return;
            }

            const { value: metodoPago } = await Swal.fire({
                title: 'Selecciona el método de pago',
                input: 'radio',
                inputOptions: {
                    efectivo: 'Efectivo',
                    transferencia: 'Transferencia',
                },
                inputValidator: (value) => {
                    if (!value) {
                        return 'Debes seleccionar un método de pago';
                    }
                    return null; // Retorna null en lugar de undefined
                },
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });

            if (!metodoPago) return; // Cancelado

            const confirmacion = await Swal.fire({
                title: 'Confirmar cobro',
                html: `
                                    <p>Días de musculación: <strong>${diasMusculacion}</strong></p>
                                    <p>Método de pago: <strong>${metodoPago === 'efectivo' ? 'Efectivo' : 'Transferencia'}</strong></p>
                                    <p>Precio: $${tarifaSeleccionada.valor}</p>
                                    ${recargo
                        ? `<p>Recargo: $${recargo.toFixed(2)}</p>` // Mostrar el recargo si no es null
                        : ''
                    }
                                    <p>Total a pagar: <strong>$${(tarifaSeleccionada.valor + (recargo || 0)).toFixed(2)}</strong></p> <!-- Total -->
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
                    const mesActual = new Date()
                        .toLocaleString('es-ES', { month: 'long' })
                        .toLowerCase();
                    const nuevoPago = {
                        mes: mesActual,
                        fechaPago: new Date(),
                        diasMusculacion: Number(diasMusculacion),
                        tarifa: tarifaSeleccionada.valor,
                        metodoPago,
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

    useEffect(() => {
        fetchRecargo();
    }, []);

    const fetchRecargo = async () => {
        try {
            const response = await fetch('/api/recargo'); // Endpoint de recargo
            const data = await response.json();
            setRecargo(data.monto || 0); // Asigna el valor del recargo al estado
        } catch (error) {
            console.error('Error al obtener recargo:', error);
        }
    };


    const handleConfiguracionRecargos = async () => {
        if (recargo === null) {
            await Swal.fire('Error', 'No se encontró el valor del recargo. Por favor, recarga la página.', 'error');
            return;
        }

        const { value: nuevoMonto } = await Swal.fire({
            title: 'Configurar Recargo',
            input: 'number',
            inputLabel: 'Monto del recargo ($)',
            inputValue: recargo,
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value || Number(value) <= 0) {
                    return 'El monto debe ser un número mayor a 0';
                }
                return null;
            },
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
            customClass: {
                confirmButton: 'bg-green-700 mr-2 hover:bg-green-800 text-white font-bold py-2 px-4 rounded',
                cancelButton: 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded',
            },
            buttonsStyling: false,
        });

        if (nuevoMonto && Number(nuevoMonto) !== recargo) {
            try {
                const response = await fetch('/api/recargo', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ monto: Number(nuevoMonto) }),
                });

                if (response.ok) {
                    Swal.fire('Recargo actualizado', '', 'success');
                    setRecargo(Number(nuevoMonto)); // Actualiza el estado con el nuevo valor
                } else {
                    Swal.fire('Error', 'No se pudo actualizar el recargo', 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Ocurrió un problema al actualizar el recargo', 'error');
            }
        }
    };

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

            {/* Botones superiores */}
            <div className='flex justify-start'>
                {/* Botón de configuración de tarifas */}
                <div className="sm:block">
                    <button
                        className="flex mb-2 items-center border rounded p-2 bg-gray-700 hover:bg-gray-800"
                        onClick={handleConfiguracionTarifas}
                    >
                        <span className="text-white">Cuotas</span>
                    </button>
                </div>

                {/* Botón de configuración de recargos */}
                <div className="sm:block">
                    <button
                        className="flex mb-2 items-center border rounded p-2 bg-gray-700 hover:bg-gray-800"
                        onClick={handleConfiguracionRecargos}
                    >
                        <span className="text-white">Recargo</span>
                    </button>
                </div>
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
