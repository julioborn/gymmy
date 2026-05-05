'use client';
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Swal from 'sweetalert2';
import { swalBase, swalDanger, swalNotify } from '@/utils/swalConfig';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const Loader = () => (
    <div className="flex justify-center items-center h-16">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-700"></div>
    </div>
);

const FullCalendar = dynamic(() => import('@fullcalendar/react'), {
    ssr: false,
    loading: () => <Loader />,
});

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
    tarifa: number;
    diasMusculacion?: number;
    metodoPago?: string;
    recargo?: number;
    totalPagado?: number;
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
    planEntrenamientoHistorial: any[];
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
    const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 640;
    const [calendarView, setCalendarView] = useState<string>('dayGridMonth');
    const [headerToolbar, setHeaderToolbar] = useState({
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek,dayGridDay',
    });
    const [buttonText] = useState({
        today: 'Hoy',
        month: 'Mes',
        week: 'Sem',
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
    const [year, setYear] = useState(new Date().getFullYear());
    const [yearPagos, setYearPagos] = useState(new Date().getFullYear());

    // Tabs
    const [activeTab, setActiveTab] = useState<'asistencias' | 'planes' | 'pagos'>('asistencias');
    const [filtrosAbiertos, setFiltrosAbiertos] = useState<Record<string, boolean>>({});
    const toggleFiltros = (tab: string) => setFiltrosAbiertos(prev => ({ ...prev, [tab]: !prev[tab] }));
    const sectionRef = useRef<HTMLDivElement>(null);
    const planDeletedRef = useRef(false);
    const skipAutoDeleteRef = useRef(false);
    // Filtros asistencias
    const [filtroActividad, setFiltroActividad] = useState('Todas');
    const [fechaDesdeAsist, setFechaDesdeAsist] = useState('');
    const [fechaHastaAsist, setFechaHastaAsist] = useState('');
    const [ordenAsist, setOrdenAsist] = useState<'recientes' | 'antiguos'>('recientes');
    // Filtros planes
    const [fechaDesdePlanes, setFechaDesdePlanes] = useState('');
    const [fechaHastaPlanes, setFechaHastaPlanes] = useState('');
    const [ordenPlanes, setOrdenPlanes] = useState<'recientes' | 'antiguos'>('recientes');
    // Filtros pagos
    const [fechaDesdePagos, setFechaDesdePagos] = useState('');
    const [fechaHastaPagos, setFechaHastaPagos] = useState('');
    const [filtroAnio, setFiltroAnio] = useState('Todos');
    const [filtroMetodo, setFiltroMetodo] = useState('Todos');
    const [ordenPagos, setOrdenPagos] = useState<'recientes' | 'antiguos'>('recientes');

    const handleTabClick = (tab: 'asistencias' | 'planes' | 'pagos') => {
        setActiveTab(tab);
    };

    const handleEliminarAsistencia = async (asistenciaId: string) => {
        const { isConfirmed } = await Swal.fire({
            ...swalDanger,
            title: '¿Eliminar asistencia?',
            text: 'Esta acción no se puede deshacer.',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!isConfirmed) return;
        try {
            const res = await fetch(`/api/asistencias/${asistenciaId}`, { method: 'DELETE' });
            if (res.ok) { Swal.fire({ ...swalNotify, icon: 'success', title: 'Asistencia eliminada' }); fetchAlumno(); }
            else Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo eliminar' });
        } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al eliminar' }); }
    };

    const handleEliminarPlanHistorial = async (planId: string) => {
        const { isConfirmed } = await Swal.fire({
            ...swalDanger,
            title: '¿Eliminar plan del historial?',
            text: 'Esta acción no se puede deshacer.',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!isConfirmed) return;
        try {
            const res = await fetch(`/api/alumnos/${id}/plan/${planId}`, { method: 'DELETE' });
            if (res.ok) { Swal.fire({ ...swalNotify, icon: 'success', title: 'Plan eliminado' }); fetchAlumno(); }
            else Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo eliminar' });
        } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al eliminar' }); }
    };

    const handleEliminarPago = async (pagoId: string) => {
        const { isConfirmed } = await Swal.fire({
            ...swalDanger,
            title: '¿Eliminar pago?',
            text: 'Esta acción no se puede deshacer.',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!isConfirmed) return;
        try {
            const res = await fetch(`/api/alumnos/${id}/pagos/${pagoId}`, { method: 'DELETE' });
            if (res.ok) { Swal.fire({ ...swalNotify, icon: 'success', title: 'Pago eliminado' }); fetchAlumno(); }
            else Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo eliminar' });
        } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al eliminar' }); }
    };

    useEffect(() => {
        const applyResponsive = () => {
            if (isMobile()) {
                setCalendarView('listMonth');
                setHeaderToolbar({ left: 'prev,next', center: 'title', right: 'listMonth,dayGridMonth' });
            } else {
                setCalendarView('dayGridMonth');
                setHeaderToolbar({ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek,dayGridDay' });
            }
        };

        applyResponsive();
        window.addEventListener('resize', applyResponsive);
        return () => window.removeEventListener('resize', applyResponsive);
    }, []);

    useEffect(() => {
        fetchTarifas();
    }, []);

    const fetchTarifas = async () => {
        try {
            const response = await fetch('/api/tarifas');
            const data = await response.json();
            setTarifas(data.tarifas || []);
            if (data.recargo != null) setRecargo(data.recargo);
        } catch {
            // silently ignore, tarifas will be empty
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
        } catch {
            // silently ignore
        }
    };

    const handleConfiguracionTarifas = async () => {
        if (tarifas.length === 0) {
            await Swal.fire({ ...swalNotify, icon: 'error', title: 'No se encontraron cuotas. Por favor, recarga la página.' });
            return;
        }

        const tarifaInputs = tarifas
            .map(tarifa => `
                <div>
                    <label class="swal-form-label">Días ${tarifa.dias} por semana</label>
                    <input type="number" id="tarifa-${tarifa.dias}" class="swal2-input" value="${tarifa.valor}">
                </div>
            `).join('');

        const result = await Swal.fire({
            ...swalBase,
            title: 'Configurar Cuotas',
            html: `<div class="swal-form-body">${tarifaInputs}</div>`,
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
                    Swal.fire({ ...swalNotify, icon: 'success', title: 'Tarifas actualizadas' });
                    setTarifas(nuevasTarifas);
                } else {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudieron actualizar las tarifas' });
                }
            } catch {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar las tarifas' });
            }
        }
    };

    const handleConfiguracionRecargos = async () => {
        if (recargo === null) {
            await Swal.fire({ ...swalNotify, icon: 'error', title: 'No se encontró el valor del recargo. Por favor, recarga la página.' });
            return;
        }

        const { value: nuevoMonto } = await Swal.fire({
            ...swalBase,
            title: 'Configurar Recargo',
            input: 'number',
            inputLabel: 'Monto del recargo ($)',
            inputValue: recargo,
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value || Number(value) <= 0) return 'El monto debe ser un número mayor a 0';
                return null;
            },
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
        });

        if (nuevoMonto && Number(nuevoMonto) !== recargo) {
            try {
                const response = await fetch('/api/recargo', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ monto: Number(nuevoMonto) }),
                });
                if (response.ok) {
                    Swal.fire({ ...swalNotify, icon: 'success', title: 'Recargo actualizado' });
                    setRecargo(Number(nuevoMonto));
                } else {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo actualizar el recargo' });
                }
            } catch {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar el recargo' });
            }
        }
    };


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
                data.planEntrenamiento.duracion != null &&
                !data.planEntrenamiento.terminado &&
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
                    if (!planDeletedRef.current && !skipAutoDeleteRef.current) {
                        planDeletedRef.current = true;
                        await fetch(`/api/alumnos/${id}/plan`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                        });
                    }
                    skipAutoDeleteRef.current = false;
                    setDiasRestantes(null);
                } else {
                    skipAutoDeleteRef.current = false;
                    setDiasRestantes(diasRestantes);
                }
            } else {
                setDiasRestantes(null); // Sin plan o con fecha inválida
            }

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

    // Helper: add one day using local-time constructor to avoid UTC timezone shift
    const addOneDay = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const next = new Date(y, m - 1, d + 1);
        return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    };

    const localToday = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    const asistenciasPlan = (() => {
        if (!alumno.planEntrenamiento?.fechaInicio || alumno.planEntrenamiento?.terminado) return 0;
        const fi = new Date(alumno.planEntrenamiento.fechaInicio);
        return alumno.asistencia.filter((a: Asistencia) =>
            a.actividad === 'Musculación' && a.presente && new Date(a.fecha) >= fi
        ).length;
    })();

    const events: EventInput[] = [
        // Asistencias
        ...alumno.asistencia.map((asistencia) => {
            let color = '';
            switch (asistencia.actividad) {
                case 'Musculación': color = '#007bff'; break;
                case 'Intermitente': color = '#ff851b'; break;
                case 'Otro': color = '#f1c40f'; break;
                default: color = '#28a745';
            }
            return asistencia.presente ? {
                title: asistencia.actividad,
                start: asistencia.fecha,
                display: 'list-item',
                color,
                extendedProps: { _id: asistencia._id, tipo: 'actividad' },
            } : null;
        }).filter(Boolean),

        // Plan activo: rango desde inicio hasta hoy (verde = en progreso)
        alumno.planEntrenamiento?.fechaInicio && !alumno.planEntrenamiento?.terminado && {
            title: `Plan iniciado (${asistenciasPlan}/${alumno.planEntrenamiento.duracion})`,
            start: convertirAFechaLocal(alumno.planEntrenamiento.fechaInicio),
            end: addOneDay(localToday),
            display: 'block',
            backgroundColor: '#bbf7d0',
            borderColor: '#4ade80',
            textColor: '#15803d',
            extendedProps: { tipo: 'plan' },
        },

        // Planes históricos: rango completo de inicio a fin (rojo = finalizado)
        ...alumno.planEntrenamientoHistorial.map((plan: any) => {
            const inicioStr = convertirAFechaLocal(plan.fechaInicio);
            const finStr = convertirAFechaLocal(plan.fechaFin);
            return {
                title: `Plan completado`,
                start: inicioStr,
                end: addOneDay(finStr),
                display: 'block',
                backgroundColor: '#fecaca',
                borderColor: '#f87171',
                textColor: '#b91c1c',
                extendedProps: { tipo: 'planHistorial', planId: plan._id, plan },
            };
        }),

        // Pagos — use local date+time so list view shows actual registration time
        ...alumno.pagos.map((pago) => {
            const pf = new Date(pago.fechaPago);
            const pStart = `${pf.getFullYear()}-${String(pf.getMonth() + 1).padStart(2, '0')}-${String(pf.getDate()).padStart(2, '0')}T${String(pf.getHours()).padStart(2, '0')}:${String(pf.getMinutes()).padStart(2, '0')}:00`;
            return {
                title: `Pago ${pago.mes}`,
                start: pStart,
                allDay: false,
                display: 'block',
                color: '#28a745',
                extendedProps: { _id: pago._id, tipo: 'pago', tarifa: pago.tarifa },
            };
        }),
    ].filter(Boolean) as EventInput[];

    const getTodayStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Seleccionar fecha para agregar o editar una actividad, plan o pago
    const handleDateSelect = async (selectInfo: DateSelectArg, forceAction?: 'plan' | 'actividad' | 'pago') => {
        const fechaSeleccionada = selectInfo.startStr;

        let action: string | undefined = forceAction;
        if (!action) {
            const result = await Swal.fire({
                ...swalBase,
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
            });
            action = result.value;
        }

        if (action === 'plan') {
            const { value: duracion } = await Swal.fire({
                ...swalBase,
                title: 'Duración del plan de entrenamiento',
                input: 'number',
                inputLabel: 'Cantidad de días de entrenamiento',
                inputPlaceholder: 'Ej: 20',
                showCancelButton: true,
                inputValidator: (value) => {
                    if (!value || Number(value) <= 0) return 'Debes ingresar una duración válida';
                    return null;
                },
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });

            if (duracion) {
                try {
                    const response = await fetch(`/api/alumnos/${id}/plan`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fechaInicio: fechaSeleccionada, duracion: Number(duracion), terminado: false }),
                    });
                    if (response.ok) {
                        skipAutoDeleteRef.current = true;
                        Swal.fire({ ...swalNotify, icon: 'success', title: 'Plan de entrenamiento actualizado' });
                        fetchAlumno();
                    } else {
                        Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo actualizar el plan de entrenamiento' });
                    }
                } catch {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar el plan' });
                }
            }
        } else if (action === 'actividad') {
            const { value: actividad } = await Swal.fire({
                ...swalBase,
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
            });

            if (actividad) {
                // Verificar si ya existe esta actividad para la fecha seleccionada
                const actividadDuplicada = alumno?.asistencia.some(
                    (asistencia: Asistencia) =>
                        asistencia.fecha.startsWith(fechaSeleccionada) && asistencia.actividad === actividad && asistencia.presente
                );

                if (actividadDuplicada) {
                    Swal.fire({ ...swalNotify, icon: 'info', title: 'Actividad duplicada', text: `Ya tienes registrada la actividad "${actividad}" para esta fecha.` });
                    return;
                }

                const { value: fechaHora } = await Swal.fire({
                    ...swalBase,
                    title: 'Hora de la actividad',
                    html: `
                        <div class="swal-form-body">
                            <label class="swal-form-label">Hora</label>
                            <input type="time" id="hora-actividad" value="12:00" class="swal2-input">
                        </div>
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
                        return fechaLocal.toISOString();
                    },
                    showCancelButton: true,
                    confirmButtonText: 'Aceptar',
                    cancelButtonText: 'Cancelar',
                });

                if (fechaHora) {
                    try {
                        const response = await fetch(`/api/asistencias/${id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ fecha: fechaHora, actividad, presente: true }),
                        });
                        if (response.ok) {
                            Swal.fire({ ...swalNotify, icon: 'success', title: 'Actividad registrada' });
                            fetchAlumno();
                        } else {
                            Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo registrar la actividad' });
                        }
                    } catch {
                        Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al registrar la actividad' });
                    }
                }
            }
        } else if (action === 'pago') {
            if (!tarifas.length) {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'No se encontraron tarifas disponibles.' });
                return;
            }

            const opcionesTarifas = tarifas.reduce((options, tarifa) => {
                options[tarifa.dias] = `${tarifa.dias} día${tarifa.dias > 1 ? 's' : ''} por semana — $${tarifa.valor}`;
                return options;
            }, {} as Record<number, string>);

            const { value: diasMusculacion } = await Swal.fire({
                ...swalBase,
                title: 'Días de musculación por semana',
                input: 'select',
                inputOptions: opcionesTarifas,
                inputPlaceholder: 'Selecciona una opción',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });

            if (diasMusculacion) {
                const tarifaSeleccionada = tarifas.find((tarifa) => tarifa.dias === Number(diasMusculacion));

                if (!tarifaSeleccionada) {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'No se encontró la tarifa para los días seleccionados.' });
                    return;
                }

                const { value: metodoPago } = await Swal.fire({
                    ...swalBase,
                    title: 'Método de pago',
                    input: 'select',
                    inputOptions: { efectivo: 'Efectivo', transferencia: 'Transferencia' },
                    inputPlaceholder: 'Selecciona un método',
                    showCancelButton: true,
                    confirmButtonText: 'Aceptar',
                    cancelButtonText: 'Cancelar',
                });

                if (!metodoPago) return;

                const confirmacion = await Swal.fire({
                    ...swalBase,
                    title: 'Confirmar cobro',
                    html: `
                        <div class="swal-form-body">
                            <p style="text-align:center;color:#475569;font-size:0.875rem;margin:0 0 0.75rem;">
                                Días de musculación: <strong>${diasMusculacion}</strong><br>
                                Método: <strong>${metodoPago === 'efectivo' ? 'Efectivo' : 'Transferencia'}</strong><br>
                                Precio: <strong>$${tarifaSeleccionada.valor}</strong>
                            </p>
                            ${recargo !== null ? `
                            <label class="swal-form-label" style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;text-transform:none;font-size:0.85rem;color:#334155;">
                                <input type="checkbox" id="incluir-recargo" checked style="width:16px;height:16px;accent-color:#059669;">
                                Aplicar recargo ($${recargo.toFixed(2)})
                            </label>` : ''}
                        </div>
                    `,
                    preConfirm: () => {
                        const incluirRecargo = (document.getElementById('incluir-recargo') as HTMLInputElement)?.checked;
                        return { incluirRecargo };
                    },
                    showCancelButton: true,
                    confirmButtonText: 'Cobrar',
                    cancelButtonText: 'Cancelar',
                });

                if (confirmacion.isConfirmed) {
                    try {
                        const incluirRecargo = document.getElementById('incluir-recargo') instanceof HTMLInputElement
                            ? (document.getElementById('incluir-recargo') as HTMLInputElement).checked
                            : false;

                        const [year, month, day] = selectInfo.startStr.split('-');
                        const _now = new Date();
                        const fechaPago = new Date(Number(year), Number(month) - 1, Number(day), _now.getHours(), _now.getMinutes(), _now.getSeconds());
                        const mesActual = fechaPago.toLocaleDateString('es-ES', { month: 'long' }).toLowerCase();

                        const nuevoPago = {
                            mes: mesActual,
                            fechaPago,
                            diasMusculacion: Number(diasMusculacion),
                            tarifa: tarifaSeleccionada.valor,
                            metodoPago,
                            recargo: incluirRecargo ? recargo || 0 : 0,
                        };

                        const response = await fetch('/api/alumnos/pagos', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ alumnoId: id, nuevoPago }),
                        });

                        if (!response.ok) throw new Error('Error al registrar el pago');

                        Swal.fire({ ...swalNotify, icon: 'success', title: 'Pago registrado correctamente' });
                        fetchAlumno();
                    } catch {
                        Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al registrar el pago', text: 'Hubo un problema al registrar el pago.' });
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
                ...swalBase,
                title: 'Actividad',
                input: 'select',
                inputOptions: { editar: 'Editar Actividad', eliminar: 'Eliminar Actividad' },
                inputPlaceholder: 'Selecciona una acción',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });

            if (action === 'editar') {
                const fechaActual = clickInfo.event.start ? new Date(clickInfo.event.start) : null;
                const horaActual = fechaActual
                    ? fechaActual.toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit' })
                    : '12:00';

                // Nuevo modal para editar actividad, fecha y hora
                const { value: formData } = await Swal.fire({
                    ...swalBase,
                    title: 'Editar Actividad',
                    html: `
                        <div class="swal-form-body">
                            <label class="swal-form-label">Actividad</label>
                            <select id="nueva-actividad" class="swal2-select">
                                <option value="Musculación" ${clickInfo.event.title === 'Musculación' ? 'selected' : ''}>Musculación</option>
                                <option value="Intermitente" ${clickInfo.event.title === 'Intermitente' ? 'selected' : ''}>Intermitente</option>
                                <option value="Otro" ${clickInfo.event.title === 'Otro' ? 'selected' : ''}>Otro</option>
                            </select>
                            <label class="swal-form-label">Fecha</label>
                            <input type="date" id="nueva-fecha-actividad" class="swal2-input" value="${fechaActual?.toISOString().split('T')[0]}">
                            <label class="swal-form-label">Hora</label>
                            <input type="time" id="nueva-hora-actividad" class="swal2-input" value="${horaActual}">
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
                    confirmButtonText: 'Guardar',
                    cancelButtonText: 'Cancelar',
                });

                if (formData) {
                    try {
                        const response = await fetch(`/api/asistencias/${eventoId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ fecha: formData.nuevaFechaHora, actividad: formData.nuevaActividad }),
                        });
                        if (response.ok) {
                            Swal.fire({ ...swalNotify, icon: 'success', title: 'Actividad actualizada' });
                            fetchAlumno();
                        } else {
                            Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo actualizar la actividad' });
                        }
                    } catch {
                        Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar la actividad' });
                    }
                }
            }
            else if (action === 'eliminar') {
                try {
                    const response = await fetch(`/api/asistencias/${eventoId}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                    });
                    if (response.ok) {
                        Swal.fire({ ...swalNotify, icon: 'success', title: 'Actividad eliminada' });
                        fetchAlumno();
                    } else {
                        Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo eliminar la actividad' });
                    }
                } catch {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'Hubo un problema al eliminar la actividad' });
                }
            }
        } else if (tipoEvento === 'pago') {
            const { value: action } = await Swal.fire({
                ...swalBase,
                title: 'Pago',
                input: 'select',
                inputOptions: { editar: 'Editar Pago', eliminar: 'Eliminar Pago' },
                inputPlaceholder: 'Selecciona una acción',
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
            });

            if (action === 'eliminar') {
                try {
                    const response = await fetch(`/api/alumnos/${id}/pagos/${eventoId}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                    });
                    if (response.ok) {
                        Swal.fire({ ...swalNotify, icon: 'success', title: 'Pago eliminado' });
                        fetchAlumno();
                    } else {
                        Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo eliminar el pago' });
                    }
                } catch {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'Hubo un problema al eliminar el pago' });
                }
            } else if (action === 'editar') {
                const { value: formPago } = await Swal.fire({
                    ...swalBase,
                    title: 'Editar Pago',
                    html: `
                        <div class="swal-form-body">
                            <label class="swal-form-label">Días de musculación</label>
                            <select id="edit-dias" class="swal2-select">
                                ${[1,2,3,4,5].map(d => `<option value="${d}">${d} día${d > 1 ? 's' : ''} por semana</option>`).join('')}
                            </select>
                            <label class="swal-form-label">Fecha de pago</label>
                            <input type="date" id="nueva-fecha-pago" class="swal2-input" value="${clickInfo.event.startStr.split('T')[0]}">
                        </div>
                    `,
                    focusConfirm: false,
                    preConfirm: () => {
                        const dias = (document.getElementById('edit-dias') as HTMLSelectElement).value;
                        const nuevaFecha = (document.getElementById('nueva-fecha-pago') as HTMLInputElement).value;
                        if (!nuevaFecha) Swal.showValidationMessage('La fecha no puede estar vacía');
                        return { dias, nuevaFecha };
                    },
                    showCancelButton: true,
                    confirmButtonText: 'Guardar',
                    cancelButtonText: 'Cancelar',
                });

                if (formPago) {
                    try {
                        const responseTarifa = await fetch(`/api/alumnos/${id}/tarifas?dias=${formPago.dias}`);
                        const { tarifa } = await responseTarifa.json();
                        const response = await fetch(`/api/alumnos/${id}/pagos/${eventoId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ nuevaFechaPago: formPago.nuevaFecha, diasMusculacion: Number(formPago.dias), tarifa }),
                        });
                        if (response.ok) {
                            Swal.fire({ ...swalNotify, icon: 'success', title: 'Pago actualizado correctamente' });
                            fetchAlumno();
                        } else {
                            Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo actualizar el pago' });
                        }
                    } catch {
                        Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar el pago' });
                    }
                }
            }
        } else if (tipoEvento === 'plan') {
            const confirmPlan = await Swal.fire({
                ...swalDanger,
                title: '¿Eliminar plan activo?',
                text: 'Esta acción no se puede deshacer.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Eliminar',
                cancelButtonText: 'Cancelar',
            });

            if (confirmPlan.isConfirmed) {
                const savedScroll = window.scrollY;
                try {
                    const response = await fetch(`/api/alumnos/${id}/plan`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                    });
                    if (response.ok) {
                        void Swal.fire({ ...swalNotify, icon: 'success', title: 'Plan activo eliminado' });
                        await fetchAlumno();
                        requestAnimationFrame(() => window.scrollTo(0, savedScroll));
                    } else {
                        Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo eliminar el plan' });
                    }
                } catch {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al eliminar el plan' });
                }
            }
        } else if (tipoEvento === 'planHistorial') {
            const plan = clickInfo.event.extendedProps.plan;
            const planId = clickInfo.event.extendedProps.planId;
            const pct = plan.duracion > 0 ? Math.round((plan.asistenciasContadas / plan.duracion) * 100) : 0;
            const { isConfirmed } = await Swal.fire({
                ...swalDanger,
                title: 'Plan completado',
                html: `
                    <div class="swal-form-body" style="text-align:left">
                        <p style="margin:0 0 0.5rem;color:#475569;font-size:0.85rem;">
                            <strong>Inicio:</strong> ${new Date(plan.fechaInicio).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}<br>
                            <strong>Fin:</strong> ${new Date(plan.fechaFin).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}<br>
                            <strong>Días planificados:</strong> ${plan.duracion}<br>
                            <strong>Asistencias:</strong> ${plan.asistenciasContadas} (${pct}%)<br>
                            ${plan.horarioMasFrecuente ? `<strong>Horario frecuente:</strong> ${plan.horarioMasFrecuente}` : ''}
                        </p>
                        <p style="color:#ef4444;font-size:0.8rem;margin-top:0.5rem;">¿Eliminar este plan del historial?</p>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Eliminar',
                cancelButtonText: 'Cerrar',
            });
            if (!isConfirmed) return;
            const savedScroll = window.scrollY;
            try {
                const res = await fetch(`/api/alumnos/${id}/plan/${planId}`, { method: 'DELETE' });
                if (res.ok) {
                    void Swal.fire({ ...swalNotify, icon: 'success', title: 'Plan eliminado del historial' });
                    await fetchAlumno();
                    requestAnimationFrame(() => window.scrollTo(0, savedScroll));
                } else {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo eliminar' });
                }
            } catch {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al eliminar' });
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

    // Datos filtrados para los panels
    const asistenciasFiltradas = (alumno.asistencia || [])
        .filter((a: Asistencia) => {
            const fecha = new Date(a.fecha);
            const dentroRango = (!fechaDesdeAsist || fecha >= new Date(fechaDesdeAsist)) && (!fechaHastaAsist || fecha <= new Date(fechaHastaAsist));
            return dentroRango && (filtroActividad === 'Todas' || a.actividad === filtroActividad) && a.presente;
        })
        .sort((a: Asistencia, b: Asistencia) =>
            ordenAsist === 'recientes'
                ? new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
                : new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );

    const historialPlanesFiltrado = (alumno.planEntrenamientoHistorial || [])
        .filter((plan: any) => {
            const fi = new Date(plan.fechaInicio);
            return (!fechaDesdePlanes || fi >= new Date(fechaDesdePlanes)) && (!fechaHastaPlanes || fi <= new Date(fechaHastaPlanes));
        })
        .sort((a: any, b: any) =>
            ordenPlanes === 'recientes'
                ? new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
                : new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
        );

    const aniosDisponibles = Array.from(new Set((alumno.pagos || []).map((p: Pago) => new Date(p.fechaPago).getFullYear()))).sort((a, b) => (b as number) - (a as number));
    const pagosPanelFiltrados = (alumno.pagos || [])
        .filter((p: Pago) => {
            const fecha = new Date(p.fechaPago);
            return (!fechaDesdePagos || fecha >= new Date(fechaDesdePagos))
                && (!fechaHastaPagos || fecha <= new Date(fechaHastaPagos))
                && (filtroAnio === 'Todos' || fecha.getFullYear() === Number(filtroAnio))
                && (filtroMetodo === 'Todos' || p.metodoPago?.toLowerCase() === filtroMetodo.toLowerCase());
        })
        .sort((a: Pago, b: Pago) =>
            ordenPagos === 'recientes'
                ? new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime()
                : new Date(a.fechaPago).getTime() - new Date(b.fechaPago).getTime()
        );

    const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300";

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-t-2xl px-6 py-5">
                <h1 className="text-2xl font-bold text-white">{alumno.nombre} {alumno.apellido}</h1>
                <div className="mt-1.5">
                    {diasRestantes != null && diasRestantes > 0 ? (
                        <span className={`text-sm font-semibold ${obtenerColorSemaforo(diasRestantes)}`}>
                            Finaliza el plan en {diasRestantes} entrenamientos
                        </span>
                    ) : (
                        <span className="text-sm text-red-400 font-medium">Sin plan activo</span>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-b-2xl shadow-xl overflow-hidden">
                {/* Toolbar */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-end">
                    <select
                        className="border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
                        value=""
                        onChange={(e) => {
                            if (e.target.value === 'cuotas') handleConfiguracionTarifas();
                            if (e.target.value === 'recargo') handleConfiguracionRecargos();
                            e.target.value = '';
                        }}
                    >
                        <option value="" disabled>Ajustes</option>
                        <option value="cuotas">Cuotas</option>
                        <option value="recargo">Recargo</option>
                    </select>
                </div>

                {/* Calendario */}
                <div className="p-3 sm:p-6 bg-slate-50 border-b border-slate-100 overflow-x-hidden">
                    <Suspense fallback={<Loader />}>
                        <FullCalendar
                            key={calendarView}
                            firstDay={1}
                            plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
                            timeZone="local"
                            initialView={calendarView}
                            events={events}
                            locales={[esLocale]}
                            locale="es"
                            headerToolbar={headerToolbar}
                            buttonText={buttonText}
                            titleFormat={isMobile() ? { month: 'short', year: 'numeric' } : { month: 'long', year: 'numeric' }}
                            height="auto"
                            selectable={true}
                            select={handleDateSelect}
                            aspectRatio={isMobile() ? 1.0 : 1.5}
                            eventClick={handleEventClick}
                            noEventsText="No hay actividades"
                            eventContent={(arg) => {
                                const tipo = arg.event.extendedProps.tipo;
                                const isListView = calendarView === 'listMonth';
                                if (tipo === 'plan') {
                                    const dotColor = '#15803d';
                                    const dot = <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0, display: 'inline-block' }} />;
                                    const arrow = <span style={{ fontSize: '1rem', fontWeight: 700, color: dotColor, flexShrink: 0, lineHeight: 1 }}>→</span>;
                                    if (arg.isStart && arg.isEnd) {
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', padding: '0 4px', overflow: 'hidden', gap: 4, cursor: 'pointer' }}>
                                                {dot}
                                                <strong style={{ fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{arg.event.title}</strong>
                                                {arrow}
                                            </div>
                                        );
                                    }
                                    if (arg.isStart) {
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', padding: '0 4px', overflow: 'hidden', gap: 4, cursor: 'pointer' }}>
                                                {dot}
                                                <strong style={{ fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{arg.event.title}</strong>
                                            </div>
                                        );
                                    }
                                    if (arg.isEnd) {
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', height: '100%', padding: '0 4px', overflow: 'hidden', gap: 4, cursor: 'pointer' }}>
                                                {arrow}
                                            </div>
                                        );
                                    }
                                    return <div style={{ width: '100%', height: '100%', cursor: 'pointer' }} />;
                                }
                                if (tipo === 'planHistorial') {
                                    const dotColor = '#b91c1c';
                                    const dot = <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0, display: 'inline-block' }} />;
                                    const planData = arg.event.extendedProps.plan;
                                    const countStr = planData ? `(${planData.asistenciasContadas}/${planData.duracion})` : '';
                                    if (arg.isStart && arg.isEnd) {
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', padding: '0 4px', overflow: 'hidden', gap: 4, cursor: 'pointer' }}>
                                                {dot}
                                                <strong style={{ fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>Inicio plan</strong>
                                                <strong style={{ fontSize: '0.68rem', whiteSpace: 'nowrap', flexShrink: 0 }}>Plan finalizado {countStr}</strong>
                                                {dot}
                                            </div>
                                        );
                                    }
                                    if (arg.isStart) {
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', padding: '0 4px', overflow: 'hidden', gap: 4, cursor: 'pointer' }}>
                                                {dot}
                                                <strong style={{ fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>Inicio plan</strong>
                                            </div>
                                        );
                                    }
                                    if (arg.isEnd) {
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', height: '100%', padding: '0 4px', overflow: 'hidden', gap: 4, cursor: 'pointer' }}>
                                                <strong style={{ fontSize: '0.68rem', whiteSpace: 'nowrap', flexShrink: 0 }}>Plan finalizado {countStr}</strong>
                                                {dot}
                                            </div>
                                        );
                                    }
                                    return (
                                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', padding: '0 4px', overflow: 'hidden', gap: 4, cursor: 'pointer' }}>
                                            <strong style={{ fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                {planData?.duracion ? `${planData.duracion} días` : '—'}
                                            </strong>
                                        </div>
                                    );
                                }
                                if (tipo === 'pago') {
                                    return (
                                        <div className="flex items-center justify-between w-full h-full text-xs cursor-pointer px-1 gap-1" style={{ whiteSpace: 'normal' }}>
                                            <div className="flex items-center gap-1 min-w-0">
                                                <span style={{ backgroundColor: '#28a745', width: 7, height: 7, flexShrink: 0, display: 'inline-block', borderRadius: '50%' }} />
                                                <strong className="truncate">{arg.event.title}</strong>
                                            </div>
                                            <strong className="text-white shrink-0">${arg.event.extendedProps.tarifa}</strong>
                                        </div>
                                    );
                                }
                                if (tipo === 'actividad') {
                                    const hora = arg.event.start ? new Date(arg.event.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
                                    return (
                                        <div className="flex items-center justify-between w-full h-full text-xs cursor-pointer px-1 gap-1 overflow-hidden">
                                            <div className="flex items-center gap-1 min-w-0">
                                                <span style={{ backgroundColor: arg.event.backgroundColor, width: 7, height: 7, flexShrink: 0, display: 'inline-block', borderRadius: '50%' }} />
                                                <strong className="truncate">{arg.event.title}</strong>
                                            </div>
                                            {hora && !isListView && <strong className="text-red-600 shrink-0">{hora}</strong>}
                                            {hora && isListView && <span className="text-slate-500 shrink-0">{hora}</span>}
                                        </div>
                                    );
                                }
                                return <div className="flex items-center w-full h-full text-xs px-1">{arg.event.title}</div>;
                            }}
                        />
                    </Suspense>
                </div>

                {/* Tab buttons */}
                <div className="px-3 pt-4 pb-1 flex gap-1.5 sm:gap-2 border-b border-slate-100">
                    {([
                        { key: 'asistencias', label: 'Asistencias' },
                        { key: 'planes',      label: 'Planes' },
                        { key: 'pagos',       label: 'Pagos' },
                    ] as const).map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => handleTabClick(key)}
                            className={`flex-1 py-2 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all truncate ${
                                activeTab === key
                                    ? 'bg-slate-800 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Panels */}
                <div ref={sectionRef} className="px-3 sm:px-6 py-5">

                        {/* ── ASISTENCIAS ── */}
                        {/* ── ASISTENCIAS ── */}
                        {activeTab === 'asistencias' && (
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <h3 className="text-base font-bold text-slate-800 shrink-0">Asistencias</h3>
                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{asistenciasFiltradas.length} registro{asistenciasFiltradas.length !== 1 ? 's' : ''}</span>
                                        <button
                                            onClick={() => handleDateSelect({ startStr: getTodayStr(), allDay: true } as DateSelectArg, 'actividad')}
                                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition whitespace-nowrap"
                                        >
                                            + Registrar
                                        </button>
                                        <button onClick={() => toggleFiltros('asistencias')} className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
                                            {filtrosAbiertos['asistencias'] ? '▲' : '▼'}
                                        </button>
                                    </div>
                                </div>
                                {filtrosAbiertos['asistencias'] && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div>
                                        <label className="block text-xs text-slate-500 font-semibold mb-1">Desde</label>
                                        <input type="date" className={inputCls} value={fechaDesdeAsist} onChange={(e) => setFechaDesdeAsist(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 font-semibold mb-1">Hasta</label>
                                        <input type="date" className={inputCls} value={fechaHastaAsist} onChange={(e) => setFechaHastaAsist(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 font-semibold mb-1">Actividad</label>
                                        <select className={inputCls} value={filtroActividad} onChange={(e) => setFiltroActividad(e.target.value)}>
                                            <option value="Todas">Todas</option>
                                            <option value="Musculación">Musculación</option>
                                            <option value="Intermitente">Intermitente</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 font-semibold mb-1">Orden</label>
                                        <select className={inputCls} value={ordenAsist} onChange={(e) => setOrdenAsist(e.target.value as any)}>
                                            <option value="recientes">Más recientes</option>
                                            <option value="antiguos">Más antiguas</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 sm:col-span-4 flex justify-end">
                                        <button onClick={() => { setFechaDesdeAsist(''); setFechaHastaAsist(''); setFiltroActividad('Todas'); setOrdenAsist('recientes'); }} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 transition">
                                            Limpiar filtros
                                        </button>
                                    </div>
                                </div>
                                )}
                                {asistenciasFiltradas.length > 0 ? (
                                    <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
                                        {asistenciasFiltradas.map((a: Asistencia) => {
                                            const f = new Date(a.fecha);
                                            const colorMap: Record<string, string> = { Musculación: 'bg-blue-100 text-blue-700', Intermitente: 'bg-orange-100 text-orange-700', Otro: 'bg-yellow-100 text-yellow-700' };
                                            const badgeCls = colorMap[a.actividad] || 'bg-slate-100 text-slate-700';
                                            const diaSemana = f.toLocaleDateString('es-AR', { weekday: 'short' });
                                            return (
                                                <div key={a._id} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition group">
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
                                                        <span className={`self-start shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeCls}`}>{a.actividad}</span>
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="text-sm font-medium text-slate-700 capitalize">{diaSemana} {f.toLocaleDateString('es-AR')}</span>
                                                            <span className="text-xs text-slate-400 shrink-0">{f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} hs</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleEliminarAsistencia(a._id)}
                                                        className="shrink-0 ml-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition sm:opacity-0 sm:group-hover:opacity-100"
                                                        title="Eliminar asistencia"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-sm text-center py-8">No hay asistencias para los filtros aplicados.</p>
                                )}
                            </div>
                        )}

                        {/* ── PLANES ── */}
                        {activeTab === 'planes' && (
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <h3 className="text-base font-bold text-slate-800 shrink-0">Planes</h3>
                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{historialPlanesFiltrado.length} plan{historialPlanesFiltrado.length !== 1 ? 'es' : ''}</span>
                                        <button
                                            onClick={() => handleDateSelect({ startStr: getTodayStr(), allDay: true } as DateSelectArg, 'plan')}
                                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition whitespace-nowrap"
                                        >
                                            + Registrar
                                        </button>
                                        <button onClick={() => toggleFiltros('planes')} className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
                                            {filtrosAbiertos['planes'] ? '▲' : '▼'}
                                        </button>
                                    </div>
                                </div>
                                {filtrosAbiertos['planes'] && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div>
                                        <label className="block text-xs text-slate-500 font-semibold mb-1">Desde</label>
                                        <input type="date" className={inputCls} value={fechaDesdePlanes} onChange={(e) => setFechaDesdePlanes(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 font-semibold mb-1">Hasta</label>
                                        <input type="date" className={inputCls} value={fechaHastaPlanes} onChange={(e) => setFechaHastaPlanes(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 font-semibold mb-1">Orden</label>
                                        <select className={inputCls} value={ordenPlanes} onChange={(e) => setOrdenPlanes(e.target.value as any)}>
                                            <option value="recientes">Más recientes</option>
                                            <option value="antiguos">Más antiguos</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 sm:col-span-3 flex justify-end">
                                        <button onClick={() => { setFechaDesdePlanes(''); setFechaHastaPlanes(''); setOrdenPlanes('recientes'); }} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 transition">
                                            Limpiar filtros
                                        </button>
                                    </div>
                                </div>
                                )}
                                {historialPlanesFiltrado.length > 0 ? (
                                    <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
                                        {historialPlanesFiltrado.map((plan: any, idx: number) => {
                                            const pct = plan.duracion > 0 ? Math.min(100, Math.round((plan.asistenciasContadas / plan.duracion) * 100)) : 0;
                                            return (
                                                <div key={plan._id || idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition group">
                                                    <div className="flex items-start justify-between gap-2 mb-3">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-semibold text-slate-800">
                                                                {new Date(plan.fechaInicio).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </span>
                                                            <span className="text-slate-400 text-xs">→</span>
                                                            <span className="text-sm font-semibold text-slate-800">
                                                                {new Date(plan.fechaFin).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleEliminarPlanHistorial(plan._id)}
                                                            className="shrink-0 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition sm:opacity-0 sm:group-hover:opacity-100"
                                                            title="Eliminar plan"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                                                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                                                        <div className="text-center bg-white rounded-lg p-2 border border-slate-100">
                                                            <p className="text-xs text-slate-400 font-semibold uppercase mb-0.5">Días</p>
                                                            <p className="font-bold text-slate-800">{plan.duracion}</p>
                                                        </div>
                                                        <div className="text-center bg-white rounded-lg p-2 border border-slate-100">
                                                            <p className="text-xs text-slate-400 font-semibold uppercase mb-0.5">Asistencias</p>
                                                            <p className="font-bold text-slate-800">{plan.asistenciasContadas}</p>
                                                        </div>
                                                        <div className="text-center bg-white rounded-lg p-2 border border-slate-100">
                                                            <p className="text-xs text-slate-400 font-semibold uppercase mb-0.5">Horario</p>
                                                            <p className="font-bold text-slate-800">{plan.horarioMasFrecuente || '—'}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                            <span>Completado</span>
                                                            <span>{pct}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-sm text-center py-8">No hay planes finalizados para los filtros aplicados.</p>
                                )}
                            </div>
                        )}

                        {/* ── PAGOS ── */}
                        {activeTab === 'pagos' && (
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <h3 className="text-base font-bold text-slate-800 shrink-0">Pagos</h3>
                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                        <span className="text-sm font-semibold text-emerald-600 whitespace-nowrap">
                                            ${pagosPanelFiltrados.reduce((s: number, p: Pago) => s + (p.totalPagado ?? p.tarifa ?? 0), 0).toLocaleString('es-AR')}
                                        </span>
                                        <button
                                            onClick={() => handleDateSelect({ startStr: getTodayStr(), allDay: true } as DateSelectArg, 'pago')}
                                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition whitespace-nowrap"
                                        >
                                            + Registrar
                                        </button>
                                        <button onClick={() => toggleFiltros('pagos')} className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
                                            {filtrosAbiertos['pagos'] ? '▲' : '▼'}
                                        </button>
                                    </div>
                                </div>
                                {filtrosAbiertos['pagos'] && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div>
                                        <label className="block text-xs text-slate-500 font-semibold mb-1">Desde</label>
                                        <input type="date" className={inputCls} value={fechaDesdePagos} onChange={(e) => setFechaDesdePagos(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 font-semibold mb-1">Hasta</label>
                                        <input type="date" className={inputCls} value={fechaHastaPagos} onChange={(e) => setFechaHastaPagos(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 font-semibold mb-1">Año</label>
                                        <select className={inputCls} value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)}>
                                            <option value="Todos">Todos</option>
                                            {aniosDisponibles.map((a) => <option key={a as number} value={a as number}>{a as number}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 font-semibold mb-1">Método</label>
                                        <select className={inputCls} value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)}>
                                            <option value="Todos">Todos</option>
                                            <option value="efectivo">Efectivo</option>
                                            <option value="transferencia">Transferencia</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 font-semibold mb-1">Orden</label>
                                        <select className={inputCls} value={ordenPagos} onChange={(e) => setOrdenPagos(e.target.value as any)}>
                                            <option value="recientes">Más recientes</option>
                                            <option value="antiguos">Más antiguos</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 sm:col-span-3 flex justify-end">
                                        <button onClick={() => { setFechaDesdePagos(''); setFechaHastaPagos(''); setFiltroAnio('Todos'); setFiltroMetodo('Todos'); setOrdenPagos('recientes'); }} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 transition">
                                            Limpiar filtros
                                        </button>
                                    </div>
                                </div>
                                )}
                                {pagosPanelFiltrados.length > 0 ? (
                                    <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
                                        {pagosPanelFiltrados.map((p: Pago, idx: number) => {
                                            const metodoCls = p.metodoPago === 'efectivo' ? 'bg-emerald-100 text-emerald-700' : p.metodoPago === 'transferencia' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500';
                                            return (
                                                <div key={p._id || idx} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition group">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-semibold text-slate-800 capitalize">{p.mes}</span>
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${metodoCls} capitalize`}>{p.metodoPago || '—'}</span>
                                                            </div>
                                                            <span className="text-xs text-slate-400 mt-0.5">{new Date(p.fechaPago).toLocaleDateString('es-AR')}{p.diasMusculacion ? ` · ${p.diasMusculacion}d/sem` : ''}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-right">
                                                            <p className="font-bold text-emerald-600">${(p.totalPagado ?? p.tarifa ?? 0).toLocaleString('es-AR')}</p>
                                                            {p.recargo ? <p className="text-xs text-slate-400">incl. ${p.recargo} recargo</p> : null}
                                                        </div>
                                                        <button
                                                            onClick={() => handleEliminarPago(p._id)}
                                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition sm:opacity-0 sm:group-hover:opacity-100"
                                                            title="Eliminar pago"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                                                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-sm text-center py-8">No hay pagos para los filtros aplicados.</p>
                                )}
                            </div>
                        )}
                    </div>
            </div>
        </div>
    );
}
