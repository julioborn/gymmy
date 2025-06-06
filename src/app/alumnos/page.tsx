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
    const [filtroLetraApellido, setFiltroLetraApellido] = useState('');
    const [filtroPago, setFiltroPago] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [ordenDiasRestantes, setOrdenDiasRestantes] = useState('');
    const [tarifas, setTarifas] = useState<Tarifa[]>([]);
    const [recargo, setRecargo] = useState<number | null>(null);
    const router = useRouter();
    const [editandoTarifas, setEditandoTarifas] = useState(false);
    const [page, setPage] = useState(1); // Página actual
    const [itemsPerPage] = useState(10); // Cantidad de elementos por página
    const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<any | null>(null);
    const [filtroDiasEntrena, setFiltroDiasEntrena] = useState('');

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

            // ✔️ si data viene como { ok: true, tarifas: [...], recargo: 1000 }
            if (data.ok && Array.isArray(data.tarifas)) {
                setTarifas(data.tarifas);
                setRecargo(data.recargo || 0); // si usás recargo
            } else {
                console.error('Formato inesperado de tarifas:', data);
            }
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
        <div style="margin-top: 8px;">
            <input type="checkbox" id="swal-aplicar-recargo" ${new Date().getDate() > 10 ? 'checked' : ''}>
            <label for="swal-aplicar-recargo"> Aplicar recargo ($${recargo?.toFixed(2) || 0})</label>
        </div>
    `,
                preConfirm: () => {
                    const checkbox = document.getElementById('swal-aplicar-recargo') as HTMLInputElement;
                    return { aplicarRecargo: checkbox?.checked ?? false };
                },
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
                    const aplicarRecargo = confirmacion.value?.aplicarRecargo;
                    const mesActual = new Date()
                        .toLocaleString('es-ES', { month: 'long' })
                        .toLowerCase();

                    const montoRecargo = aplicarRecargo ? recargo || 0 : 0;
                    const total = tarifaSeleccionada.valor + montoRecargo;

                    const nuevoPago = {
                        mes: mesActual,
                        fechaPago: new Date(),
                        diasMusculacion: Number(diasMusculacion),
                        tarifa: tarifaSeleccionada.valor,
                        metodoPago,
                        recargo: montoRecargo,
                        totalPagado: total,
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
        const { value: formValues } = await Swal.fire({
            title: 'Iniciar plan de entrenamiento',
            html: `
            <input type="number" id="duracion" class="swal2-input" placeholder="Duración del plan">
            <input type="date" id="fecha" class="swal2-input" style="width: 100%; max-width: 265px;" value="${new Date().toISOString().split('T')[0]}">
        `,
            showCancelButton: true,
            focusConfirm: false,
            preConfirm: () => {
                const duracion = (document.getElementById('duracion') as HTMLInputElement).value;
                const fecha = (document.getElementById('fecha') as HTMLInputElement).value;

                if (!duracion || Number(duracion) <= 0) {
                    Swal.showValidationMessage('Debes ingresar una duración válida');
                }

                if (!fecha) {
                    Swal.showValidationMessage('Debes seleccionar una fecha de inicio');
                }

                return { duracion: Number(duracion), fechaInicio: fecha };
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

        if (formValues) {
            try {
                const response = await fetch(`/api/alumnos/${alumnoId}/plan`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fechaInicio: formValues.fechaInicio,
                        duracion: formValues.duracion,
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
            const coincideLetraApellido = filtroLetraApellido ? alumno.apellido.startsWith(filtroLetraApellido) : true;
            const coincideDiasEntrena = filtroDiasEntrena
                ? alumno.diasEntrenaSemana === parseInt(filtroDiasEntrena)
                : true;

            const coincidePago = filtroPago === '' // Filtrar por pago
                ? true
                : filtroPago === 'pagado'
                    ? verificarPagoMesActual(alumno.pagos)
                    : !verificarPagoMesActual(alumno.pagos);

            return coincideBusqueda && coincideLetraApellido && coincidePago && coincideDiasEntrena;

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

    const handleEditarAlumno = async (alumno: any) => {
        setAlumnoSeleccionado(null); // Cerrar el modal para evitar solapamientos

        const { value: formValues } = await Swal.fire({
            title: 'Editar alumno',
            html: `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: left;">

                    <input id="swal-nombre" class="swal2-input" placeholder="Nombre" value="${alumno.nombre || ''}">
                    <input id="swal-apellido" class="swal2-input" placeholder="Apellido" value="${alumno.apellido || ''}">

                    <input id="swal-dni" class="swal2-input" placeholder="DNI" value="${alumno.dni || ''}">
                    <input id="swal-telefono" class="swal2-input" placeholder="Teléfono" value="${alumno.telefono || ''}">

                    <input id="swal-email" class="swal2-input" placeholder="Email" value="${alumno.email || ''}">
                    <select id="swal-horario" class="swal2-input">
                        <option value="">Selecciona una franja</option>
                        <option value="mañana" ${alumno.horarioEntrenamiento === 'mañana' ? 'selected' : ''}>Mañana</option>
                        <option value="siesta" ${alumno.horarioEntrenamiento === 'siesta' ? 'selected' : ''}>Siesta</option>
                        <option value="tarde" ${alumno.horarioEntrenamiento === 'tarde' ? 'selected' : ''}>Tarde</option>
                    </select>

                    <input id="swal-hora-exacta" class="swal2-input" type="time" placeholder="Hora exacta" value="${alumno.horaExactaEntrenamiento || ''}">

                    <textarea id="swal-historial-deportivo" class="swal2-textarea" style="grid-column: span 2;" placeholder="Historial deportivo">${alumno.historialDeportivo || ''}</textarea>

                    <textarea id="swal-historial-vida" class="swal2-textarea" style="grid-column: span 2;" placeholder="Historial de vida">${alumno.historialDeVida || ''}</textarea>

                    <textarea id="swal-objetivos" class="swal2-textarea" style="grid-column: span 2;" placeholder="Objetivos">${alumno.objetivos || ''}</textarea>

                    <textarea id="swal-patologias" class="swal2-textarea" style="grid-column: span 2;" placeholder="Patologías">${alumno.patologias || ''}</textarea>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                return {
                    nombre: (document.getElementById('swal-nombre') as HTMLInputElement).value,
                    apellido: (document.getElementById('swal-apellido') as HTMLInputElement).value,
                    dni: (document.getElementById('swal-dni') as HTMLInputElement).value,
                    telefono: (document.getElementById('swal-telefono') as HTMLInputElement).value,
                    email: (document.getElementById('swal-email') as HTMLInputElement).value,
                    horarioEntrenamiento: (document.getElementById('swal-horario') as HTMLInputElement).value,
                    horaExactaEntrenamiento: (document.getElementById('swal-hora-exacta') as HTMLInputElement).value,
                    historialDeportivo: (document.getElementById('swal-historial-deportivo') as HTMLTextAreaElement).value,
                    historialDeVida: (document.getElementById('swal-historial-vida') as HTMLTextAreaElement).value,
                    objetivos: (document.getElementById('swal-objetivos') as HTMLTextAreaElement).value,
                    patologias: (document.getElementById('swal-patologias') as HTMLTextAreaElement).value,
                };
            },
            customClass: {
                popup: 'custom-swal-popup',
                confirmButton: 'bg-green-700 mr-2 hover:bg-green-800 text-white font-bold py-2 px-4 rounded',
                cancelButton: 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded',
            },
            buttonsStyling: false,
            width: '50rem',
        });

        if (formValues) {
            await guardarAlumno(alumno._id, { ...alumno, ...formValues });
        }
    };

    function capitalizar(texto: string) {
        return texto ? texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase() : '-';
    }

    return (
        <div className="w-full max-w-full lg:max-w-6xl mx-auto bg-white p-4 lg:p-8 rounded shadow-md">
            <h1 className="text-xl lg:text-2xl font-semibold text-gray-800 mb-4 lg:mb-6">Lista de Alumnos</h1>

            {/* Filtros select */}
            <Suspense fallback={<Loader />}>
                <FiltrosAlumnos
                    busqueda={busqueda}
                    setBusqueda={setBusqueda}
                    filtroPago={filtroPago}
                    setFiltroPago={setFiltroPago}
                    ordenDiasRestantes={ordenDiasRestantes}
                    setOrdenDiasRestantes={setOrdenDiasRestantes}
                    filtroDiasEntrena={filtroDiasEntrena}
                    setFiltroDiasEntrena={setFiltroDiasEntrena}
                    diasDisponibles={[...Array.from(new Set(alumnos.map((a) => a.diasEntrenaSemana)))].filter(Boolean).sort((a, b) => a - b)}
                    limpiarFiltros={() => {
                        setBusqueda('');
                        setFiltroPago('');
                        setOrdenDiasRestantes('');
                        setFiltroDiasEntrena('');
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
                            <span className="mr-2">Balance</span>
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
                    <div className="overflow-x-auto rounded shadow mt-4">
                        <table className="w-full text-sm text-left text-gray-700">
                            <thead className="text-xs text-gray-100 uppercase bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3">Apellido</th>
                                    <th className="px-4 py-3">Nombre</th>
                                    <th className="px-4 py-3">Edad</th>
                                    {/* <th className="px-4 py-3">DNI</th> */}
                                    <th className="px-4 py-3">Pago Mes</th>
                                    <th className="px-4 py-3">Días Restantes Plan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedAlumnos.map((alumno) => (
                                    <tr
                                        key={alumno._id}
                                        className="bg-white border-b hover:bg-gray-100 cursor-pointer"
                                        onClick={() => setAlumnoSeleccionado(alumno)}

                                    >
                                        <td className="px-4 py-3 font-bold">{alumno.apellido}</td>
                                        <td className="px-4 py-3 font-bold">{alumno.nombre}</td>
                                        <td className="px-4 py-3">{alumno.edad ?? '-'}</td>
                                        {/* <td className="px-4 py-3">{alumno.dni}</td> */}
                                        <td className="px-4 py-3">{verificarPagoMesActual(alumno.pagos) ?
                                            // <p className='text-green-700'>Si</p>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5 text-green-500">
                                                <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
                                            </svg>
                                            :
                                            // <p className='text-red-700'>No</p>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5 text-red-600">
                                                <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clip-rule="evenodd" />
                                            </svg>
                                        }</td>
                                        <td className="px-4 py-3">{alumno.diasRestantes ?? <p className='text-red-700'>Sin Plan</p>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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

            <Modal
                isOpen={!!alumnoSeleccionado}
                onRequestClose={() => setAlumnoSeleccionado(null)}
                contentLabel="Detalle del Alumno"
                className="relative w-full max-w-4xl mx-auto mt-20 p-8 outline-none"
                overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50"
            >
                {alumnoSeleccionado && (
                    <div className="relative max-w-2xl mx-auto bg-white shadow-xl rounded-xl p-6 border border-gray-200 outline-none focus:outline-none">
                        {/* Botón de cierre "X" */}
                        <button
                            onClick={() => setAlumnoSeleccionado(null)}
                            className="absolute top-2 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                            aria-label="Cerrar"
                        >
                            ×
                        </button>

                        {/* Nombre */}
                        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
                            {alumnoSeleccionado.nombre} {alumnoSeleccionado.apellido}
                        </h2>

                        {/* Detalles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-base text-gray-700 mb-6 leading-relaxed">
                            <p><strong>DNI:</strong> {alumnoSeleccionado.dni}</p>
                            <p><strong>Edad:</strong> {alumnoSeleccionado.edad ?? '-'}</p>
                            <p><strong>Teléfono:</strong> {alumnoSeleccionado.telefono || '-'}</p>
                            <p><strong>Email:</strong> {alumnoSeleccionado.email || '-'}</p>
                            <p><strong>Fecha de inicio:</strong> {alumnoSeleccionado.fechaInicio ? new Date(alumnoSeleccionado.fechaInicio).toLocaleDateString() : '-'}</p>
                            <p><strong>Franja horaria:</strong> {capitalizar(alumnoSeleccionado.horarioEntrenamiento)}</p>
                            <p><strong>Hora de inicio:</strong> {alumnoSeleccionado.horaExactaEntrenamiento || '-'}</p>
                            <p><strong>Historial deportivo:</strong> {alumnoSeleccionado.historialDeportivo || '-'}</p>
                            <p><strong>Historial de vida:</strong> {alumnoSeleccionado.historialDeVida || '-'}</p>
                            <p><strong>Objetivos:</strong> {alumnoSeleccionado.objetivos || '-'}</p>
                            <p><strong>Patologías:</strong> {alumnoSeleccionado.patologias || '-'}</p>
                        </div>

                        {/* Botones */}
                        <div className="flex flex-wrap justify-center gap-3">
                            <button onClick={() => router.push(`/alumnos/${alumnoSeleccionado._id}/historial`)} className="bg-gray-800 text-white px-4 py-2 font-semibold rounded-md hover:bg-gray-700 transition">
                                Historial
                            </button>
                            <button onClick={() => marcarPagoMes(alumnoSeleccionado._id)} className="bg-green-700 text-white px-4 py-2 font-semibold rounded-md hover:bg-green-600 transition">
                                {/* <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                    <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 0 0-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.202.592.037.051.08.102.128.152Z" />
                                    <path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-6a.75.75 0 0 1 .75.75v.316a3.78 3.78 0 0 1 1.653.713c.426.33.744.74.925 1.2a.75.75 0 0 1-1.395.55 1.35 1.35 0 0 0-.447-.563 2.187 2.187 0 0 0-.736-.363V9.3c.698.093 1.383.32 1.959.696.787.514 1.29 1.27 1.29 2.13 0 .86-.504 1.616-1.29 2.13-.576.377-1.261.603-1.96.696v.299a.75.75 0 1 1-1.5 0v-.3c-.697-.092-1.382-.318-1.958-.695-.482-.315-.857-.717-1.078-1.188a.75.75 0 1 1 1.359-.636c.08.173.245.376.54.569.313.205.706.353 1.138.432v-2.748a3.782 3.782 0 0 1-1.653-.713C6.9 9.433 6.5 8.681 6.5 7.875c0-.805.4-1.558 1.097-2.096a3.78 3.78 0 0 1 1.653-.713V4.75A.75.75 0 0 1 10 4Z" clip-rule="evenodd" />
                                </svg> */}
                                Marcar Pago
                            </button>
                            <button onClick={() => iniciarPlan(alumnoSeleccionado._id)} className="bg-orange-600 text-white px-4 py-2 font-semibold rounded-md hover:bg-orange-500 transition">
                                {/* <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                    <path fill-rule="evenodd" d="M13.887 3.182c.396.037.79.08 1.183.128C16.194 3.45 17 4.414 17 5.517V16.75A2.25 2.25 0 0 1 14.75 19h-9.5A2.25 2.25 0 0 1 3 16.75V5.517c0-1.103.806-2.068 1.93-2.207.393-.048.787-.09 1.183-.128A3.001 3.001 0 0 1 9 1h2c1.373 0 2.531.923 2.887 2.182ZM7.5 4A1.5 1.5 0 0 1 9 2.5h2A1.5 1.5 0 0 1 12.5 4v.5h-5V4Z" clip-rule="evenodd" />
                                </svg> */}
                                Iniciar Plan
                            </button>
                            <button
                                onClick={() => handleEditarAlumno(alumnoSeleccionado)}
                                className="bg-yellow-500 text-white px-4 py-2 rounded"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                </svg>
                            </button>
                            <button onClick={() => eliminarAlumno(alumnoSeleccionado._id)} className="bg-red-600 text-white px-4 py-2 rounded">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                    <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

        </div>
    );
}
