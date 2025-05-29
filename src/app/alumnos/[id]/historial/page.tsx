'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Swal from 'sweetalert2';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';
// import {
//     Chart as ChartJS,
//     ArcElement,
//     Tooltip,
//     Legend,
//     CategoryScale,
//     LinearScale,
//     PointElement,
//     LineElement,
//     BarElement,
// } from 'chart.js';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Loader giratorio
const Loader = () => (
    <div className="flex justify-center items-center h-16">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-700"></div>
    </div>
);

const FullCalendar = dynamic(() => import('@fullcalendar/react'), {
    ssr: false, // Esto asegura que el componente no se cargue en el servidor.
    loading: () => <Loader />, // Mensaje de carga mientras el componente se carga dinámicamente.
});

// ChartJS.register(
//     ArcElement,
//     Tooltip,
//     Legend,
//     CategoryScale,
//     LinearScale,
//     PointElement,
//     LineElement,
//     BarElement
// );

type Asistencia = {
    _id: string;
    fecha: string;
    presente: boolean;
    actividad: string;
};

type Pago = {
    _id: string;
    mes: string;
    fechaPago: string;
    tarifa: number;  // Añadimos la propiedad tarifa
};

type PlanEntrenamiento = {
    fechaInicio: string;
    duracion: number;
    diasRestantes: number;
    terminado: boolean;
};

type Alumno = {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    asistencia: Asistencia[];
    pagos: Pago[];
    planEntrenamiento: PlanEntrenamiento;
};

type Tarifa = {
    dias: number;
    valor: number;
};

// Función para ajustar las fechas a la zona horaria local
const convertirAFechaLocal = (fecha: string) => {
    const fechaUtc = new Date(fecha);
    const fechaLocal = new Date(fechaUtc.getTime() + fechaUtc.getTimezoneOffset() * 60000);
    return fechaLocal.toISOString().split('T')[0]; // Retorna la fecha en formato YYYY-MM-DD
};

// Función para obtener el color del texto del semáforo
function obtenerColorSemaforo(diasRestantes: number | null): string {
    if (diasRestantes === null) return ''; // Si no hay plan o no se ha iniciado
    if (diasRestantes > 10) return 'text-green-500';  // Verde
    if (diasRestantes > 5) return 'text-yellow-500';  // Amarillo
    return 'text-red-500';                            // Rojo
}

export default function HistorialAlumnoPage() {
    const [alumno, setAlumno] = useState<Alumno | null>(null);
    const [diasRestantes, setDiasRestantes] = useState<number | null>(null);
    const params = useParams();
    const { id } = params;
    const [calendarView, setCalendarView] = useState<string>('dayGridMonth');
    const [headerToolbar, setHeaderToolbar] = useState({
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek,dayGridDay', // Vista completa en pantallas grandes
    });
    const [buttonText, setButtonText] = useState({
        today: 'Hoy',
        month: 'Mes',
        week: 'Semana',
        day: 'Día',
        list: 'Lista',
    });
    const [tarifas, setTarifas] = useState<Tarifa[]>([]);
    const [recargo, setRecargo] = useState<number | null>(null);
    const [expandedYearsActividades, setExpandedYearsActividades] = useState<Record<string, boolean>>({});
    const [expandedMonthsActividades, setExpandedMonthsActividades] = useState<Record<string, Record<string, boolean>>>({});
    const [expandedYearsPagos, setExpandedYearsPagos] = useState<Record<string, boolean>>({});
    const [expandedMonthsPagos, setExpandedMonthsPagos] = useState<Record<string, Record<string, boolean>>>({});
    const toggleYearActividades = (year: string) => {
        setExpandedYearsActividades((prev) => ({ ...prev, [year]: !prev[year] }));
    };
    const toggleMonthActividades = (year: string, month: string) => {
        setExpandedMonthsActividades((prev) => ({
            ...prev,
            [year]: {
                ...prev[year],
                [month]: !prev[year]?.[month],
            },
        }));
    };
    const toggleYearPagos = (year: string) => {
        setExpandedYearsPagos((prev) => ({ ...prev, [year]: !prev[year] }));
    };
    const toggleMonthPagos = (year: string, month: string) => {
        setExpandedMonthsPagos((prev) => ({
            ...prev,
            [year]: {
                ...prev[year],
                [month]: !prev[year]?.[month],
            },
        }));
    };
    const [year, setYear] = useState(new Date().getFullYear()); // Año actual por defecto
    const [yearPagos, setYearPagos] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchTarifas();
    }, []);

    const fetchTarifas = async () => {
        try {
            const response = await fetch('/api/tarifas'); // Asegura que este sea el endpoint correcto
            const data = await response.json();
            console.log("Tarifas obtenidas:", data); // Verifica los datos obtenidos
            setTarifas(data);
        } catch (error) {
            console.error("Error al obtener tarifas:", error);
        }
    };

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

    useEffect(() => {
        // Detectar tamaño de la pantalla al cargar
        const updateCalendarView = () => {
            if (window.innerWidth <= 768) {
                setCalendarView('listWeek'); // Vista de lista para móviles
                setHeaderToolbar({
                    left: 'prev,next',
                    center: '',
                    right: 'today',
                });
                setButtonText({
                    today: 'Hoy',
                    month: '', // No mostrar botones innecesarios
                    week: '',
                    day: '',
                    list: 'Lista',
                });
            } else {
                setCalendarView('dayGridMonth'); // Vista completa para pantallas grandes
                setHeaderToolbar({
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,dayGridWeek,dayGridDay',
                });
                setButtonText({
                    today: 'Hoy',
                    month: 'Mes',
                    week: 'Semana',
                    day: 'Día',
                    list: 'Lista',
                });
            }
        };

        updateCalendarView(); // Ajusta la vista al montar

        // Escuchar cambios de tamaño de la pantalla
        window.addEventListener('resize', updateCalendarView);

        // Limpia el evento al desmontar
        return () => window.removeEventListener('resize', updateCalendarView);
    }, [])

    // Función para obtener los datos del alumno
    const fetchAlumno = async () => {
        const response = await fetch(`/api/alumnos/${id}`);
        if (response.ok) {
            const data = await response.json();
            setAlumno(data);

            // Calcular los días restantes del plan de entrenamiento
            if (
                data.planEntrenamiento &&
                data.planEntrenamiento.fechaInicio &&
                !isNaN(new Date(data.planEntrenamiento.fechaInicio).getTime())
            ) {
                const fechaInicio = new Date(data.planEntrenamiento.fechaInicio);
                const duracion = data.planEntrenamiento.duracion;

                const asistenciasMusculacion = data.asistencia.filter(
                    (asistencia: Asistencia) =>
                        asistencia.actividad === 'Musculación' &&
                        asistencia.presente &&
                        new Date(asistencia.fecha) >= fechaInicio
                ).length;

                const diasRestantes = duracion - asistenciasMusculacion;

                if (diasRestantes <= 0) {
                    // Eliminar el inicio del plan automáticamente
                    await fetch(`/api/alumnos/${id}/plan`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    setDiasRestantes(null); // Sin plan
                } else {
                    setDiasRestantes(diasRestantes);
                }
            } else {
                setDiasRestantes(null); // Sin plan o con fecha inválida
            }

        } else {
            console.error('Error fetching alumno');
        }
    };

    useEffect(() => {
        if (id) {
            fetchAlumno();
        }
    }, [id]);

    if (!alumno) {
        return <Loader />;
    }

    // Ajustamos la creación de eventos para que incluya la tarifa en el título
    const events: EventInput[] = [
        ...alumno.asistencia.map((asistencia) => {
            let color = '';
            switch (asistencia.actividad) {
                case 'Musculación':
                    color = '#007bff'; // Azul
                    break;
                case 'Intermitente':
                    color = '#ff851b'; // Naranja
                    break;
                case 'Otro':
                    color = '#f1c40f'; // Amarillo
                    break;
                default:
                    color = '#28a745'; // Verde por defecto
            }
            return asistencia.presente ? {
                title: asistencia.actividad,
                start: asistencia.fecha,
                display: 'list-item',
                color,
                extendedProps: { _id: asistencia._id, tipo: 'actividad' },
            } : null;
        }).filter(event => event !== null), // Filtrar valores nulos o inválidos

        alumno.planEntrenamiento.fechaInicio && {
            title: `Inicio del plan (${alumno.planEntrenamiento.duracion})`,
            start: convertirAFechaLocal(alumno.planEntrenamiento.fechaInicio),
            display: 'block',
            color: '#ff0000', // Rojo para el inicio del plan
            extendedProps: { tipo: 'plan' },
        },

        ...alumno.pagos.map((pago) => ({
            title: `Pago ${pago.mes}`,   // Este es el título que se mostrará en la primera línea
            start: convertirAFechaLocal(pago.fechaPago),
            display: 'block',
            color: '#28a745', // Verde para los pagos
            extendedProps: {
                _id: pago._id,
                tipo: 'pago',
                tarifa: pago.tarifa,  // Pasamos la tarifa en extendedProps
            },
        })),
    ].filter(event => event) as EventInput[]; // Asegurarte de que solo queden eventos válidos

    // Seleccionar fecha para agregar o editar una actividad, plan o pago
    const handleDateSelect = async (selectInfo: DateSelectArg) => {
        const fechaSeleccionada = selectInfo.startStr;

        const { value: action } = await Swal.fire({
            title: 'Seleccionar acción',
            input: 'select',
            inputOptions: {
                plan: 'Ingresar duración del plan',
                actividad: 'Ingresar actividad',
                pago: 'Registrar pago',
            },
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

        if (action === 'plan') {
            const { value: duracion } = await Swal.fire({
                title: 'Definir duración del plan de entrenamiento',
                input: 'number',
                inputLabel: 'Cantidad de días de entrenamiento',
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
                },
                buttonsStyling: false,
            });

            if (duracion) {
                try {
                    const response = await fetch(`/api/alumnos/${id}/plan`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            fechaInicio: fechaSeleccionada,
                            duracion: Number(duracion),
                            terminado: false
                        }),
                    });

                    if (response.ok) {
                        Swal.fire('Plan de entrenamiento actualizado', '', 'success');
                        fetchAlumno();
                    } else {
                        Swal.fire('Error', 'No se pudo actualizar el plan de entrenamiento', 'error');
                    }
                } catch (error) {
                    Swal.fire('Error', 'Ocurrió un problema al actualizar el plan', 'error');
                }
            }
        } else if (action === 'actividad') {
            const { value: actividad } = await Swal.fire({
                title: 'Ingresar Actividad',
                input: 'select',
                inputOptions: {
                    Musculación: 'Musculación',
                    Intermitente: 'Intermitente',
                    Otro: 'Otro',
                },
                inputPlaceholder: 'Selecciona una actividad',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
                customClass: {
                    confirmButton: 'bg-green-700 mr-2 hover:bg-green-800 text-white font-bold py-2 px-4 rounded',
                    cancelButton: 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded',
                },
                buttonsStyling: false,
            });

            if (actividad) {
                // Verificar si ya existe esta actividad para la fecha seleccionada
                const actividadDuplicada = alumno?.asistencia.some(
                    (asistencia: Asistencia) =>
                        asistencia.fecha.startsWith(fechaSeleccionada) && asistencia.actividad === actividad && asistencia.presente
                );

                if (actividadDuplicada) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Actividad duplicada',
                        text: `Ya tienes registrada la actividad "${actividad}" para esta fecha. No es posible registrarla nuevamente.`,
                    });
                    return;
                }

                const { value: fechaHora } = await Swal.fire({
                    title: 'Ingresar Hora',
                    html: `
                    <input type="time" id="hora-actividad" value="12:00" class="swal2-input">
                `,
                    focusConfirm: false,
                    preConfirm: () => {
                        const hora = (document.getElementById('hora-actividad') as HTMLInputElement).value;
                        if (!hora) {
                            Swal.showValidationMessage('La hora no puede estar vacía');
                        }
                        const [year, month, day] = fechaSeleccionada.split('-');
                        const [hh, mm] = hora.split(':');
                        const fechaLocal = new Date(Number(year), Number(month) - 1, Number(day), Number(hh), Number(mm));
                        return fechaLocal.toISOString(); // ya ajustado a horario local
                    },
                    showCancelButton: true,
                    confirmButtonText: 'Aceptar',
                    cancelButtonText: 'Cancelar',
                    customClass: {
                        confirmButton: 'bg-green-700 mr-2 hover:bg-green-800 text-white font-bold py-2 px-4 rounded',
                        cancelButton: 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded',
                    },
                    buttonsStyling: false,
                });

                if (fechaHora) {
                    try {
                        const response = await fetch(`/api/asistencias/${id}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                fecha: fechaHora,
                                actividad,
                                presente: true,
                            }),
                        });

                        if (response.ok) {
                            Swal.fire('Actividad registrada', '', 'success');
                            fetchAlumno();
                        } else {
                            Swal.fire('Error', 'No se pudo registrar la actividad', 'error');
                        }
                    } catch (error) {
                        Swal.fire('Error', 'Ocurrió un problema al registrar la actividad', 'error');
                    }
                }
            }
        } else if (action === 'pago') {
            if (!tarifas.length) {
                Swal.fire('Error', 'No se encontraron tarifas disponibles.', 'error');
                return;
            }

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
                didOpen: () => {
                    const select = Swal.getHtmlContainer()?.querySelector('select');
                    if (select) {
                        select.style.textAlign = 'left';
                        select.style.width = '100%';
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
                    Swal.fire('Error', 'No se encontró la tarifa para los días seleccionados.', 'error');
                    return;
                }

                const { value: metodoPago } = await Swal.fire({
                    title: 'Selecciona el método de pago',
                    input: 'select',
                    inputOptions: {
                        efectivo: 'Efectivo',
                        transferencia: 'Transferencia',
                    },
                    inputPlaceholder: 'Selecciona un método',
                    showCancelButton: true,
                    confirmButtonText: 'Aceptar',
                    cancelButtonText: 'Cancelar',
                    customClass: {
                        confirmButton: 'bg-green-700 mr-2 hover:bg-green-800 text-white font-bold py-2 px-4 rounded',
                        cancelButton: 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded',
                    },
                    buttonsStyling: false,
                });

                if (!metodoPago) {
                    Swal.fire('Error', 'Debes seleccionar un método de pago.', 'error');
                    return;
                }

                const confirmacion = await Swal.fire({
                    title: 'Confirmar cobro',
                    html: `
        <p>Días de musculación: <strong>${diasMusculacion}</strong></p>
        <p>Método de pago: <strong>${metodoPago === 'efectivo' ? 'Efectivo' : 'Transferencia'}</strong></p>
        <p>Precio base: $${tarifaSeleccionada.valor}</p>
        ${recargo !== null
                            ? `
            <div style="margin-top: 8px;">
                <input type="checkbox" id="incluir-recargo" checked />
                <label for="incluir-recargo">Aplicar recargo de $${recargo.toFixed(2)}</label>
            </div>
            `
                            : ''
                        }
    `,
                    preConfirm: () => {
                        const incluirRecargo = (document.getElementById('incluir-recargo') as HTMLInputElement)?.checked;
                        return { incluirRecargo };
                    },
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
                        const incluirRecargo = document.getElementById('incluir-recargo') instanceof HTMLInputElement
                            ? (document.getElementById('incluir-recargo') as HTMLInputElement).checked
                            : false;
                        const totalAPagar = tarifaSeleccionada.valor + (incluirRecargo ? (recargo || 0) : 0);

                        const [year, month, day] = selectInfo.startStr.split('-'); // Fecha seleccionada
                        const fechaPago = new Date(Number(year), Number(month) - 1, Number(day));
                        const mesActual = fechaPago.toLocaleDateString('es-ES', { month: 'long' }).toLowerCase();

                        const nuevoPago = {
                            mes: mesActual,
                            fechaPago,
                            diasMusculacion: Number(diasMusculacion),
                            tarifa: tarifaSeleccionada.valor,
                            metodoPago,
                            recargo: incluirRecargo ? recargo || 0 : 0,
                        };

                        const response = await fetch(`/api/alumnos/pagos`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ alumnoId: id, nuevoPago }),
                        });

                        if (!response.ok) {
                            throw new Error('Error al registrar el pago');
                        }

                        Swal.fire('Pago registrado correctamente', '', 'success');
                        fetchAlumno(); // Refrescar el historial de pagos
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
        }
    }

    // Editar o eliminar una actividad o un pago existente
    const handleEventClick = async (clickInfo: EventClickArg) => {
        const eventoId = clickInfo.event.extendedProps._id;
        const tipoEvento = clickInfo.event.extendedProps.tipo;

        if (tipoEvento === 'actividad') {
            const { value: action } = await Swal.fire({
                title: 'Actividad',
                input: 'select',
                inputOptions: {
                    editar: 'Editar Actividad',
                    eliminar: 'Eliminar Actividad',
                },
                inputPlaceholder: 'Selecciona una acción',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
                customClass: {
                    confirmButton: 'bg-green-700 mr-2 hover:bg-green-800 text-white font-bold py-2 px-4 rounded',
                    cancelButton: 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded',
                    popup: 'custom-swal-popup',
                },
                buttonsStyling: false,
            });

            if (action === 'editar') {
                const fechaActual = clickInfo.event.start ? new Date(clickInfo.event.start) : null;
                const horaActual = fechaActual
                    ? fechaActual.toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit' })
                    : '12:00';

                // Nuevo modal para editar actividad, fecha y hora
                const { value: formData } = await Swal.fire({
                    title: 'Editar Actividad',
                    html: `
                        <div style="
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            gap: 1rem; 
                            text-align: left; 
                            width: 100%; 
                            max-width: 100%; 
                            padding: 1rem; 
                            box-sizing: border-box; 
                            overflow-x: hidden;
                        ">
                            <div style="width: 100%; max-width: 300px;">
                                <label for="nueva-actividad" style="display: block; margin-bottom: 0.5rem;">Actividad:</label>
                                <select id="nueva-actividad" class="swal2-input" style="width: 100%;">
                                    <option value="Musculación" ${clickInfo.event.title === 'Musculación' ? 'selected' : ''}>Musculación</option>
                                    <option value="Intermitente" ${clickInfo.event.title === 'Intermitente' ? 'selected' : ''}>Intermitente</option>
                                    <option value="Otro" ${clickInfo.event.title === 'Otro' ? 'selected' : ''}>Otro</option>
                                </select>
                            </div>
                            <div style="width: 100%; max-width: 300px;">
                                <label for="nueva-fecha-actividad" style="display: block; margin-bottom: 0.5rem;">Fecha:</label>
                                <input type="date" id="nueva-fecha-actividad" class="swal2-input" value="${fechaActual?.toISOString().split('T')[0]}" style="width: 100%;">
                            </div>
                            <div style="width: 100%; max-width: 300px;">
                                <label for="nueva-hora-actividad" style="display: block; margin-bottom: 0.5rem;">Hora:</label>
                                <input type="time" id="nueva-hora-actividad" class="swal2-input" value="${horaActual}" style="width: 100%;">
                            </div>
                        </div>
                    `,
                    preConfirm: () => {
                        const nuevaActividad = (document.getElementById('nueva-actividad') as HTMLSelectElement).value;
                        const nuevaFecha = (document.getElementById('nueva-fecha-actividad') as HTMLInputElement).value;
                        const nuevaHora = (document.getElementById('nueva-hora-actividad') as HTMLInputElement).value;

                        const actividadDuplicada = alumno?.asistencia.some(
                            (asistencia: Asistencia) =>
                                asistencia.fecha.startsWith(nuevaFecha) &&
                                asistencia.actividad === nuevaActividad &&
                                asistencia._id !== clickInfo.event.extendedProps._id
                        );

                        if (actividadDuplicada) {
                            Swal.showValidationMessage(`Ya existe una actividad "${nuevaActividad}" registrada para esa fecha.`);
                        }
                        return { nuevaActividad, nuevaFechaHora: `${nuevaFecha}T${nuevaHora}` };
                    },
                    showCancelButton: true,
                    confirmButtonText: 'Aceptar',
                    cancelButtonText: 'Cancelar',
                    customClass: {
                        confirmButton: 'bg-green-700 mr-2 hover:bg-green-800 text-white font-bold py-2 px-4 rounded',
                        cancelButton: 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded',
                        popup: 'custom-swal-popup',
                    },
                    buttonsStyling: false,
                });

                if (formData) {
                    try {
                        const response = await fetch(`/api/asistencias/${eventoId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                fecha: formData.nuevaFechaHora,
                                actividad: formData.nuevaActividad,
                            }),
                        });

                        if (response.ok) {
                            Swal.fire('Actividad actualizada', '', 'success');
                            fetchAlumno(); // Refrescar la lista de actividades
                        } else {
                            Swal.fire('Error', 'No se pudo actualizar la actividad', 'error');
                        }
                    } catch (error) {
                        Swal.fire('Error', 'Ocurrió un problema al actualizar la actividad', 'error');
                    }
                }
            }
            else if (action === 'eliminar') {
                try {
                    const response = await fetch(`/api/asistencias/${eventoId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    if (response.ok) {
                        Swal.fire('Actividad eliminada', '', 'success');
                        fetchAlumno();
                    } else {
                        const errorData = await response.json().catch(() => null);
                        console.error("Error eliminando la actividad:", errorData || "Respuesta vacía");
                        Swal.fire('Error', 'No se pudo eliminar la actividad', 'error');
                    }
                } catch (error) {
                    console.error("Error al intentar eliminar la actividad:", error);
                    Swal.fire('Error', 'Hubo un problema al eliminar la actividad', 'error');
                }
            }
        } else if (tipoEvento === 'pago') {
            const { value: action } = await Swal.fire({
                title: 'Pago',
                input: 'select',
                inputOptions: {
                    editar: 'Editar Pago',
                    eliminar: 'Eliminar Pago',
                },
                inputPlaceholder: 'Selecciona una acción',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
                customClass: {
                    confirmButton: 'bg-green-700 mr-2 hover:bg-green-800 text-white font-bold py-2 px-4 rounded',
                    cancelButton: 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded',
                    popup: 'custom-swal-popup',
                },
                buttonsStyling: false,
            });

            if (action === 'eliminar') {
                try {
                    const response = await fetch(`/api/alumnos/${id}/pagos/${eventoId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    if (response.ok) {
                        Swal.fire('Pago eliminado', '', 'success');
                        fetchAlumno();
                    } else {
                        Swal.fire('Error', 'No se pudo eliminar el pago', 'error');
                    }
                } catch (error) {
                    Swal.fire('Error', 'Hubo un problema al eliminar el pago', 'error');
                }
            } else if (action === 'editar') {
                const { value: diasMusculacion } = await Swal.fire({
                    title: 'Editar días de musculación por semana',
                    input: 'select',
                    inputOptions: {
                        1: '1 día por semana',
                        2: '2 días por semana',
                        3: '3 días por semana',
                        4: '4 días por semana',
                        5: '5 días por semana',
                    },
                    inputPlaceholder: 'Selecciona una opción',
                    showCancelButton: true,
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
                    // Pedir la nueva fecha de pago
                    const { value: nuevaFechaPago } = await Swal.fire({
                        title: 'Editar Fecha de Pago',
                        html: `<input type="date" id="nueva-fecha-pago" class="swal2-input" value="${clickInfo.event.startStr.split('T')[0]}">`,
                        focusConfirm: false,
                        preConfirm: () => {
                            const nuevaFecha = (document.getElementById('nueva-fecha-pago') as HTMLInputElement).value;
                            if (!nuevaFecha) {
                                Swal.showValidationMessage('La fecha no puede estar vacía');
                            }
                            return nuevaFecha;
                        },
                        showCancelButton: true,
                        confirmButtonText: 'Aceptar',
                        cancelButtonText: 'Cancelar',
                        customClass: {
                            confirmButton: 'bg-green-700 mr-2 hover:bg-green-800 text-white font-bold py-2 px-4 rounded',
                            cancelButton: 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded',
                            popup: 'custom-swal-popup',
                        },
                        buttonsStyling: false,
                    });

                    if (nuevaFechaPago) {
                        try {
                            // Obtener la tarifa predeterminada basada en los días de musculación
                            const responseTarifa = await fetch(`/api/alumnos/${id}/tarifas?dias=${diasMusculacion}`);
                            const { tarifa } = await responseTarifa.json();

                            // Actualizar el pago con los días de musculación y la nueva tarifa y fecha
                            const response = await fetch(`/api/alumnos/${id}/pagos/${eventoId}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    nuevaFechaPago,
                                    diasMusculacion: Number(diasMusculacion),
                                    tarifa: tarifa,
                                }),
                            });

                            if (response.ok) {
                                Swal.fire('Pago actualizado correctamente', '', 'success');
                                fetchAlumno(); // Refrescar los datos del alumno
                            } else {
                                Swal.fire('Error', 'No se pudo actualizar el pago', 'error');
                            }
                        } catch (error) {
                            Swal.fire('Error', 'Ocurrió un problema al actualizar el pago', 'error');
                        }
                    }
                }
            }
        } else if (tipoEvento === 'plan') {
            const { value: action } = await Swal.fire({
                title: 'Inicio del plan',
                input: 'select',
                inputOptions: {
                    eliminar: 'Eliminar Inicio del Plan',
                },
                inputPlaceholder: 'Selecciona una acción',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
                customClass: {
                    confirmButton: 'bg-green-700 mr-2 hover:bg-green-800 text-white font-bold py-2 px-4 rounded',
                    cancelButton: 'bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded',
                    popup: 'custom-swal-popup',
                },
                buttonsStyling: false,
            });

            if (action === 'eliminar') {
                try {
                    const response = await fetch(`/api/alumnos/${id}/plan`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    if (response.ok) {
                        Swal.fire('Inicio del plan eliminado', '', 'success');
                        fetchAlumno(); // Refresca los datos del alumno
                    } else {
                        Swal.fire('Error', 'No se pudo eliminar el inicio del plan', 'error');
                    }
                } catch (error) {
                    Swal.fire('Error', 'Ocurrió un problema al eliminar el inicio del plan', 'error');
                }
            }
        }
    };

    // Obtener los años disponibles en los datos
    const availableYears = Array.from(
        new Set(alumno.pagos.map((pago) => new Date(pago.fechaPago).getFullYear()))
    ).sort(); // Asegurar que estén en orden ascendente

    // Filtrar y procesar los datos según el año seleccionado
    const pagosPorMes = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ].map((mes) => {
        const pagoMes = alumno.pagos.find(
            (pago) =>
                pago.mes === mes &&
                new Date(pago.fechaPago).getFullYear() === yearPagos
        );
        return pagoMes ? pagoMes.tarifa : 0;
    });

    return (
        <div className="max-w-6xl mx-auto bg-gray-50 p-8 rounded shadow-md">

            {/* Nombre alumno */}
            <div className="flex justify-center">
                <h1 className="text-4xl font-light text-gray-800 p-1 pl-1.5 pr-1.5">
                    {alumno.nombre} {alumno.apellido}
                </h1>
            </div>

            {/* Menú historial */}
            <div className="flex flex-col mb-4 gap-4">

                {/* Historial */}
                <div className="flex-1 bg-gray-50 p-4 overflow-auto max-h-screen">
                    {/* <h3 className="text-xl font-semibold text-gray-700 mb-2 flex justify-center">Historial del Alumno</h3> */}

                    {/* Finalización del plan */}
                    {alumno.planEntrenamiento && alumno.planEntrenamiento.fechaInicio && diasRestantes !== null ? (
                        diasRestantes > 0 ? (
                            <p className="text-lg font-medium mb-4 text-gray-700 flex justify-center flex-col md:flex-row items-center text-center md:text-left">
                                Finaliza el plan en
                                <span className={`mx-1 pr-1 pl-1 ${obtenerColorSemaforo(diasRestantes)}`}>
                                    {diasRestantes}
                                </span>
                                entrenamientos.
                            </p>
                        ) : (
                            <p className="text-lg font-medium mb-4 text-red-700 flex justify-center text-center">
                                Sin plan
                            </p>
                        )
                    ) : (
                        <p className="text-lg font-medium mb-4 text-red-700 flex justify-center text-center">
                            Sin plan
                        </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 justify-center mb-4 items-center">
                        <Link href={`/alumnos/${id}/asistencias`} className="w-full sm:w-auto">
                            <button className="w-full sm:w-auto bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800">Asistencias</button>
                        </Link>
                        <Link href={`/alumnos/${id}/planes`} className="w-full sm:w-auto">
                            <button className="w-full sm:w-auto bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800">Planes</button>
                        </Link>
                        <Link href={`/alumnos/${id}/pagos`} className="w-full sm:w-auto">
                            <button className="w-full sm:w-auto bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800">Pagos</button>
                        </Link>
                    </div>

                </div>

            </div>

            {/* Botones cuotas / recargo */}
            <div className='flex justify-center sm:justify-start'>
                {/* Botón de configuración de tarifas */}
                <div className="sm:block sm:pl-4 pl-0">
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

            {/* Calendario */}
            <div className="sm:block bg-gray-50 p-4 rounded shadow border">
                <Suspense fallback={<p>Cargando calendario...</p>}>
                    <FullCalendar
                        firstDay={1}
                        plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
                        timeZone='local'
                        initialView={calendarView}
                        events={events}
                        locale="es"
                        headerToolbar={headerToolbar}
                        buttonText={buttonText}
                        height="auto"
                        selectable={true}
                        select={handleDateSelect}
                        aspectRatio={1.5} // Controla la proporción ancho/alto
                        eventClick={handleEventClick}
                        noEventsText="No hay actividades" // Traducción al español
                        eventContent={(arg) => {
                            const tipo = arg.event.extendedProps.tipo; // Obtener el tipo de evento
                            if (tipo === 'plan') {
                                return (
                                    <div
                                        className="flex items-center justify-center w-full h-full text-xs md:text-sm text-center break-words cursor-pointer"
                                        style={{ whiteSpace: 'normal' }}
                                    >
                                        <strong>{arg.event.title}</strong>
                                    </div>
                                );
                            }
                            if (tipo === 'pago') {
                                const pagoMes = arg.event.title;
                                const tarifa = arg.event.extendedProps.tarifa;
                                return (
                                    <div className="flex flex-col justify-between items-center w-full h-full text-xs md:text-sm cursor-pointer">
                                        <div className="flex items-center break-words" style={{ whiteSpace: 'normal' }}>
                                            <strong>{pagoMes}</strong>
                                        </div>
                                        <div>
                                            <strong className="text-white mr-1">${tarifa}</strong>
                                        </div>
                                    </div>
                                );
                            } else if (tipo === 'actividad') {
                                const hora = arg.event.start
                                    ? new Date(arg.event.start).toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })
                                    : '';
                                return (
                                    <div
                                        className="flex justify-between items-center w-full h-full text-xs md:text-sm cursor-pointer overflow-hidden"
                                        style={{
                                            whiteSpace: 'nowrap',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        <div className="flex items-center">
                                            <span
                                                style={{
                                                    backgroundColor: arg.event.backgroundColor,
                                                    width: '8px',
                                                    height: '8px',
                                                    display: 'inline-block',
                                                    borderRadius: '50%',
                                                    marginRight: '8px',
                                                }}
                                            ></span>
                                            <strong className="truncate">{arg.event.title}</strong>
                                        </div>
                                        <div>
                                            {hora && <strong className="text-red-600 mr-1">{hora}</strong>}
                                        </div>
                                    </div>
                                );
                            } else {
                                return (
                                    <div className="flex items-center justify-center w-full h-full text-xs md:text-sm text-center">
                                        {arg.event.title}
                                    </div>
                                );
                            }
                        }}
                    />
                </Suspense>
            </div>

        </div>
    );

}
