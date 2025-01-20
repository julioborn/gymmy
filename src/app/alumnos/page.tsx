'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import Modal from 'react-modal';
import AlumnoActions from '@/components/AlumnoActions';
import { Pagination } from '@mui/material';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';

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
    const { data: session } = useSession(); // Obtener la sesión
    const [alumnos, setAlumnos] = useState<any[]>([]);
    const [editandoAlumno, setEditandoAlumno] = useState<any | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEdad, setFiltroEdad] = useState('');
    const [filtroLetraApellido, setFiltroLetraApellido] = useState('');
    const [filtroPago, setFiltroPago] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [ordenDiasRestantes, setOrdenDiasRestantes] = useState('');
    const [tarifas, setTarifas] = useState<Tarifa[]>([]);
    const [recargo, setRecargo] = useState<number | null>(null);
    const router = useRouter();
    const [editandoTarifas, setEditandoTarifas] = useState(false);
    const [page, setPage] = useState(1); // Página actual
    const [itemsPerPage] = useState(4); // Cantidad de elementos por página

    const fetchAlumnos = async () => {
        setIsLoading(true); // Inicia la carga
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
        } finally {
            setIsLoading(false); // Finaliza la carga
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
            customClass: {
                confirmButton: 'bg-green-700 mr-2 hover:bg-green-800 text-white font-bold py-2 px-4 rounded',
                cancelButton: 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded',
            },
            buttonsStyling: false,
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
                customClass: {
                    confirmButton: 'bg-green-700 mr-2 hover:bg-green-800 text-white font-bold py-2 px-4 rounded',
                    cancelButton: 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded',
                },
                buttonsStyling: false
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

    // Paginación aplicada sobre los alumnos filtrados
    const paginatedAlumnos = alumnosFiltrados.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
    );

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

    // Cambiar la página al interactuar con el componente Pagination
    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
    };

    const handleGenerateExcel = () => {
        // Función para calcular la franja horaria
        const categorizarFranjaHoraria = (horario: string) => {
            const [hora] = horario.split(':').map(Number); // Obtener la hora como número
            if (hora >= 7 && hora < 12) return 'Mañana';
            if (hora >= 12 && hora < 16) return 'Siesta';
            if (hora >= 16 && hora < 24) return 'Tarde';
            return '-'; // En caso de horarios fuera de rango
        };

        // Función para calcular el horario más frecuente del mes actual
        const calcularHorarioMasFrecuenteDelMes = (asistencias: any[]) => {
            const mesActual = new Date().getMonth(); // Mes actual (0 = enero, 1 = febrero, ...)
            const añoActual = new Date().getFullYear(); // Año actual

            const horarios = asistencias
                .filter((asistencia: { fecha: string | number | Date; actividad: string }) => {
                    const fechaAsistencia = new Date(asistencia.fecha);
                    return (
                        asistencia.actividad === 'Musculación' &&
                        fechaAsistencia.getMonth() === mesActual &&
                        fechaAsistencia.getFullYear() === añoActual
                    );
                })
                .map((asistencia: { fecha: string | number | Date }) =>
                    new Date(asistencia.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                );

            if (horarios.length === 0) return '-'; // Si no hay asistencias, devolver '-'

            // Calcular frecuencia de cada horario
            const frecuencia = horarios.reduce((acc: { [x: string]: any }, horario: string | number) => {
                acc[horario] = (acc[horario] || 0) + 1;
                return acc;
            }, {});

            // Determinar el horario más frecuente
            const horarioMasFrecuente = Object.keys(frecuencia).reduce((a, b) => (frecuencia[a] > frecuencia[b] ? a : b));

            // Categorizar el horario más frecuente en una franja horaria
            return categorizarFranjaHoraria(horarioMasFrecuente);
        };

        // Formatear los datos para el archivo Excel
        const formattedData = alumnos.map((alumno) => {
            const pagoMesActual = alumno.pagos.find(
                (pago: { mes: string }) =>
                    pago.mes.toLowerCase() ===
                    new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase()
            );

            // Calcular el horario más frecuente del mes
            const horarioMasFrecuenteDelMes = calcularHorarioMasFrecuenteDelMes(alumno.asistencia || []);

            return {
                Apellido: alumno.apellido,
                Nombre: alumno.nombre,
                Pago: pagoMesActual ? `$${pagoMesActual.tarifa}` : 'No pagó',
                'Fecha de Pago': pagoMesActual
                    ? new Date(pagoMesActual.fechaPago).toLocaleDateString('es-ES')
                    : '-',
                Adeuda: pagoMesActual ? 'No' : 'Sí',
                'Días que asiste': alumno.diasEntrenaSemana || '-', // Mostrar los días que entrena por semana
                Horario: horarioMasFrecuenteDelMes, // Franja horaria más frecuente
                Mes: new Date().toLocaleString('es-ES', { month: 'long' }),
            };
        });

        // Crear el libro y la hoja de trabajo
        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance Mensual');

        // Generar el archivo Excel
        XLSX.writeFile(workbook, `Balance_Mensual_${new Date().toLocaleDateString('es-ES')}.xlsx`);
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
            <div className='flex justify-between'>
                <div className='flex'>
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

                {/* Botón para generar el balance */}
                {session?.user?.role === 'dueño' && (
                    <div className="mb-4 flex justify-end">
                        <button
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center"
                            onClick={handleGenerateExcel}
                        >
                            <span className="mr-2">Generar Balance</span>
                            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="20" height="20" viewBox="0 0 48 48">
                                <path fill="#169154" d="M29,6H15.744C14.781,6,14,6.781,14,7.744v7.259h15V6z"></path>
                                <path fill="#18482a" d="M14,33.054v7.202C14,41.219,14.781,42,15.743,42H29v-8.946H14z"></path>
                                <path fill="#0c8045" d="M14 15.003H29V24.005000000000003H14z"></path>
                                <path fill="#17472a" d="M14 24.005H29V33.055H14z"></path>
                                <g>
                                    <path fill="#29c27f" d="M42.256,6H29v9.003h15V7.744C44,6.781,43.219,6,42.256,6z"></path>
                                    <path fill="#27663f" d="M29,33.054V42h13.257C43.219,42,44,41.219,44,40.257v-7.202H29z"></path>
                                    <path fill="#19ac65" d="M29 15.003H44V24.005000000000003H29z"></path>
                                    <path fill="#129652" d="M29 24.005H44V33.055H29z"></path>
                                </g>
                                <path fill="#0c7238" d="M22.319,34H5.681C4.753,34,4,33.247,4,32.319V15.681C4,14.753,4.753,14,5.681,14h16.638 C23.247,14,24,14.753,24,15.681v16.638C24,33.247,23.247,34,22.319,34z"></path>
                                <path fill="#fff" d="M9.807 19L12.193 19 14.129 22.754 16.175 19 18.404 19 15.333 24 18.474 29 16.123 29 14.013 25.07 11.912 29 9.526 29 12.719 23.982z"></path>
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Tarjetas de alumnos */}
            {isLoading ? ( // Si los datos están cargando, muestra el Loader
                <Loader />
            ) : (
                <>
                    <Suspense fallback={<Loader />}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mt-4">
                            {paginatedAlumnos.map((alumno) => (
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
                    {/* Componente de paginación */}
                    <div className="flex justify-center mt-6">
                        <Pagination
                            count={Math.ceil(alumnos.length / itemsPerPage)} // Calcula el número total de páginas
                            page={page}
                            onChange={handlePageChange}
                            color="primary"
                        />
                    </div>
                </>
            )}

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
