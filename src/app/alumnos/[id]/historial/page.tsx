'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
    telefono?: string;
    email?: string;
    horarioEntrenamiento?: string;
    horaExactaEntrenamiento?: string;
    diasEntrenaSemana?: number;
    area?: string;
    nivelExperiencia?: string;
    patologias?: string;
    historialDeportivo?: string;
    historialDeVida?: string;
    objetivos?: string;
    fechaNacimiento?: string;
};

function verificarPagoMesActual(pagos: Pago[]): boolean {
    const mesActual = new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase();
    return pagos.some(p => p.mes?.toLowerCase() === mesActual);
}

function capitalizar(texto: string) {
    return texto ? texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase() : '-';
}

const AREA_LABEL: Record<string, string> = { salud: '❤️ Salud', fitness: '💪 Fitness', rendimiento: '🏅 Rendimiento', formacion: '🌱 Formación' };

type Tarifa = {
    dias: number;
    valor: number;
};

const DIAS_CAL = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const ACTIVIDAD_DOT: Record<string, string> = { 'Musculación': 'bg-blue-600', 'Intermitente': 'bg-orange-500', 'Otro': 'bg-yellow-400' };

function toLocalKey(fechaStr: string): string {
    const d = new Date(fechaStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

type CalDay = { day: number; year: number; month: number; isCurrentMonth: boolean };

function calDaysGrid(year: number, month: number): CalDay[] {
    const firstDay = new Date(year, month, 1).getDay();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const offset = (firstDay + 6) % 7;
    const grid: CalDay[] = [];
    if (offset > 0) {
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const prevDays = new Date(prevYear, prevMonth + 1, 0).getDate();
        for (let i = offset - 1; i >= 0; i--) {
            grid.push({ day: prevDays - i, year: prevYear, month: prevMonth, isCurrentMonth: false });
        }
    }
    for (let d = 1; d <= daysCount; d++) {
        grid.push({ day: d, year, month, isCurrentMonth: true });
    }
    return grid;
}

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
    const { data: session } = useSession();
    const router = useRouter();
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
    const [recargoDiez, setRecargoDiez] = useState<number>(0);
    const [recargoMes, setRecargoMes] = useState<number>(0);
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
    const [mobCalYear, setMobCalYear] = useState(() => new Date().getFullYear());
    const [mobCalMonth, setMobCalMonth] = useState(() => new Date().getMonth());
    const [mobSelectedDay, setMobSelectedDay] = useState<string | null>(null);
    const [dayModal, setDayModal] = useState<string | null>(null);
    const [dayModalStep, setDayModalStep] = useState<'menu' | 'actividad' | 'plan' | 'pago'>('menu');
    const [dayModalActTipo, setDayModalActTipo] = useState('');
    const [dayModalActHora, setDayModalActHora] = useState(() => {
        const n = new Date();
        const m = Math.round(n.getMinutes() / 5) * 5;
        return `${String(m >= 60 ? (n.getHours() + 1) % 24 : n.getHours()).padStart(2,'0')}:${String(m >= 60 ? 0 : m).padStart(2,'0')}`;
    });
    const [dayModalPlanDur, setDayModalPlanDur] = useState('');
    const [dayModalPagoDias, setDayModalPagoDias] = useState<number | null>(null);
    const [dayModalPagoMetodo, setDayModalPagoMetodo] = useState('');
    const [dayModalPagoRecargo, setDayModalPagoRecargo] = useState(true);
    const [dayModalSaving, setDayModalSaving] = useState(false);

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
    const [acento, setAcento] = useState('#111111');

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

    const handleEditPagoMob = async (pago: Pago) => {
        const fechaActual = pago.fechaPago ? pago.fechaPago.split('T')[0] : '';
        const diasActual = pago.diasMusculacion ?? 3;
        const { value: formPago } = await Swal.fire({
            ...swalBase,
            title: 'Editar Pago',
            html: `
                <div class="swal-form-body">
                    <label class="swal-form-label">Días de musculación</label>
                    <select id="mob-edit-dias" class="swal2-select">
                        ${[1,2,3,4,5].map(d => `<option value="${d}" ${d === diasActual ? 'selected' : ''}>${d} día${d > 1 ? 's' : ''} por semana</option>`).join('')}
                    </select>
                    <label class="swal-form-label">Fecha de pago</label>
                    <input type="date" id="mob-edit-fecha-pago" class="swal2-input" value="${fechaActual}">
                </div>
            `,
            focusConfirm: false,
            preConfirm: () => {
                const dias = (document.getElementById('mob-edit-dias') as HTMLSelectElement).value;
                const nuevaFecha = (document.getElementById('mob-edit-fecha-pago') as HTMLInputElement).value;
                if (!nuevaFecha) { Swal.showValidationMessage('La fecha no puede estar vacía'); return; }
                return { dias, nuevaFecha };
            },
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
        });
        if (!formPago) return;
        try {
            const responseTarifa = await fetch(`/api/alumnos/${id}/tarifas?dias=${formPago.dias}`);
            const { tarifa } = await responseTarifa.json();
            const res = await fetch(`/api/alumnos/${id}/pagos/${pago._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nuevaFechaPago: formPago.nuevaFecha, diasMusculacion: Number(formPago.dias), tarifa }),
            });
            if (res.ok) { Swal.fire({ ...swalNotify, icon: 'success', title: 'Pago actualizado' }); fetchAlumno(); }
            else Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo actualizar el pago' });
        } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al actualizar el pago' }); }
    };

    const handleEditAsistenciaMob = async (asistencia: Asistencia) => {
        const fechaActual = new Date(asistencia.fecha);
        const horaActual = fechaActual.toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const { value: formData } = await Swal.fire({
            ...swalBase,
            title: 'Editar Actividad',
            html: `
                <div class="swal-form-body">
                    <label class="swal-form-label">Actividad</label>
                    <select id="mob-actividad" class="swal2-select">
                        <option value="Musculación" ${asistencia.actividad === 'Musculación' ? 'selected' : ''}>Musculación</option>
                        <option value="Intermitente" ${asistencia.actividad === 'Intermitente' ? 'selected' : ''}>Intermitente</option>
                        <option value="Otro" ${asistencia.actividad === 'Otro' ? 'selected' : ''}>Otro</option>
                    </select>
                    <label class="swal-form-label">Fecha</label>
                    <input type="date" id="mob-fecha" class="swal2-input" value="${fechaActual.toISOString().split('T')[0]}">
                    <label class="swal-form-label">Hora</label>
                    <input type="time" id="mob-hora" class="swal2-input" value="${horaActual}">
                </div>
            `,
            preConfirm: () => {
                const nuevaActividad = (document.getElementById('mob-actividad') as HTMLSelectElement).value;
                const nuevaFecha = (document.getElementById('mob-fecha') as HTMLInputElement).value;
                const nuevaHora = (document.getElementById('mob-hora') as HTMLInputElement).value;
                const dup = alumno?.asistencia.some(
                    (a: Asistencia) => a.fecha.startsWith(nuevaFecha) && a.actividad === nuevaActividad && a._id !== asistencia._id
                );
                if (dup) { Swal.showValidationMessage(`Ya existe "${nuevaActividad}" para esa fecha.`); return; }
                return { nuevaActividad, nuevaFechaHora: `${nuevaFecha}T${nuevaHora}` };
            },
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
        });
        if (formData) {
            try {
                const res = await fetch(`/api/asistencias/${asistencia._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fecha: formData.nuevaFechaHora, actividad: formData.nuevaActividad }),
                });
                if (res.ok) { Swal.fire({ ...swalNotify, icon: 'success', title: 'Actividad actualizada' }); fetchAlumno(); }
                else Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo actualizar la actividad' });
            } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar la actividad' }); }
        }
    };

    const handlePlanBadgeClick = async (key: string, planInfo: { type: 'active'; plan: any } | { type: 'historial'; plan: any; planId: string }) => {
        if (planInfo.type === 'active') {
            const plan = planInfo.plan;
            const startLabel = new Date(plan.fechaInicio + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
            const { value: action } = await Swal.fire({
                ...swalBase,
                title: 'Plan activo',
                html: `<div class="swal-form-body" style="text-align:left"><p style="margin:0;color:#475569;font-size:0.85rem;"><strong>Inicio:</strong> ${startLabel}<br><strong>Días planificados:</strong> ${plan.duracion}<br><strong>Días restantes:</strong> ${plan.diasRestantes}</p></div>`,
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: 'Editar días',
                denyButtonText: 'Eliminar plan',
                cancelButtonText: 'Cerrar',
            });
            if (action === true) {
                const { value: nuevaDuracion } = await Swal.fire({
                    ...swalBase,
                    title: 'Editar días del plan',
                    html: `<div class="swal-form-body"><label class="swal-form-label">Total de días</label><input type="number" id="edit-plan-dur" class="swal2-input" value="${plan.duracion}" min="1" max="365"></div>`,
                    focusConfirm: false,
                    preConfirm: () => {
                        const val = parseInt((document.getElementById('edit-plan-dur') as HTMLInputElement).value);
                        if (!val || val < 1) { Swal.showValidationMessage('Ingresá un número válido'); return; }
                        return val;
                    },
                    showCancelButton: true,
                    confirmButtonText: 'Guardar',
                    cancelButtonText: 'Cancelar',
                });
                if (!nuevaDuracion) return;
                const savedScroll = window.scrollY;
                try {
                    const res = await fetch(`/api/alumnos/${id}/plan`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fechaInicio: plan.fechaInicio, duracion: nuevaDuracion }),
                    });
                    if (res.ok) { void Swal.fire({ ...swalNotify, icon: 'success', title: 'Plan actualizado' }); await fetchAlumno(); requestAnimationFrame(() => window.scrollTo(0, savedScroll)); }
                    else Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo actualizar el plan' });
                } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al actualizar el plan' }); }
            } else if (action === false) {
                const { isConfirmed } = await Swal.fire({ ...swalDanger, title: '¿Eliminar plan activo?', text: 'Esta acción no se puede deshacer.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar' });
                if (!isConfirmed) return;
                const savedScroll = window.scrollY;
                try {
                    const res = await fetch(`/api/alumnos/${id}/plan`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
                    if (res.ok) { void Swal.fire({ ...swalNotify, icon: 'success', title: 'Plan activo eliminado' }); await fetchAlumno(); requestAnimationFrame(() => window.scrollTo(0, savedScroll)); }
                    else Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo eliminar el plan' });
                } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al eliminar el plan' }); }
            }
        } else {
            const { plan, planId } = planInfo;
            const pct = plan.duracion > 0 ? Math.round((plan.asistenciasContadas / plan.duracion) * 100) : 0;
            const { isConfirmed } = await Swal.fire({
                ...swalDanger,
                title: 'Plan completado',
                html: `<div class="swal-form-body" style="text-align:left"><p style="margin:0 0 0.5rem;color:#475569;font-size:0.85rem;"><strong>Inicio:</strong> ${new Date(plan.fechaInicio).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}<br><strong>Fin:</strong> ${new Date(plan.fechaFin).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}<br><strong>Días planificados:</strong> ${plan.duracion}<br><strong>Asistencias:</strong> ${plan.asistenciasContadas} (${pct}%)${plan.horarioMasFrecuente ? `<br><strong>Horario frecuente:</strong> ${plan.horarioMasFrecuente}` : ''}</p><p style="color:#ef4444;font-size:0.8rem;margin-top:0.5rem;">¿Eliminar este plan del historial?</p></div>`,
                showCancelButton: true,
                confirmButtonText: 'Eliminar',
                cancelButtonText: 'Cerrar',
            });
            if (!isConfirmed) return;
            const savedScroll = window.scrollY;
            try {
                const res = await fetch(`/api/alumnos/${id}/plan/${planId}`, { method: 'DELETE' });
                if (res.ok) { void Swal.fire({ ...swalNotify, icon: 'success', title: 'Plan eliminado del historial' }); await fetchAlumno(); requestAnimationFrame(() => window.scrollTo(0, savedScroll)); }
                else Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo eliminar el plan' });
            } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al eliminar el plan' }); }
        }
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
        fetch('/api/gimnasio/tema').then(r => r.json()).then(d => {
            if (d.temaAcento) setAcento(d.temaAcento);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        fetchTarifas();
    }, []);

    const fetchTarifas = async () => {
        try {
            const response = await fetch('/api/tarifas');
            const data = await response.json();
            setTarifas(data.tarifas || []);
        } catch {
            // silently ignore, tarifas will be empty
        }
    };

    useEffect(() => {
        fetchRecargo();
    }, []);

    const fetchRecargo = async () => {
        try {
            const response = await fetch('/api/recargo');
            const data = await response.json();
            setRecargoDiez(data.montoDiez ?? 0);
            setRecargoMes(data.montoMes ?? 0);
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
                    <input type="text" inputmode="numeric" id="tarifa-${tarifa.dias}" class="swal2-input" value="${tarifa.valor}">
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
                    const raw = (document.getElementById(`tarifa-${tarifa.dias}`) as HTMLInputElement).value;
                    const valor = parseInt(raw.replace(/\D/g, ''), 10);
                    if (isNaN(valor) || valor <= 0) {
                        Swal.showValidationMessage(`El valor para ${tarifa.dias} día(s) debe ser un número mayor a 0`);
                        return null;
                    }
                    return { ...tarifa, valor };
                });
                if (updatedTarifas.some(t => t === null)) return false;
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
        const { value: result } = await Swal.fire({
            ...swalBase,
            title: 'Configurar Recargos',
            html: `
                <div class="swal-form-body">
                    <div style="margin-bottom:1rem;">
                        <label class="swal-form-label">Recargo pasando el día 10 del mes ($)</label>
                        <input type="text" inputmode="numeric" id="recargo-diez" class="swal2-input" value="${recargoDiez}" placeholder="0">
                    </div>
                    <div>
                        <label class="swal-form-label">Recargo pasando el mes completo ($)</label>
                        <input type="text" inputmode="numeric" id="recargo-mes" class="swal2-input" value="${recargoMes}" placeholder="0">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const rawD = (document.getElementById('recargo-diez') as HTMLInputElement)?.value ?? '';
                const rawM = (document.getElementById('recargo-mes') as HTMLInputElement)?.value ?? '';
                const d = parseInt(rawD.replace(/\D/g, ''), 10) || 0;
                const m = parseInt(rawM.replace(/\D/g, ''), 10) || 0;
                if (d < 0 || m < 0) {
                    Swal.showValidationMessage('Los montos deben ser números mayores o iguales a 0');
                    return false;
                }
                return { montoDiez: d, montoMes: m };
            },
        });

        if (result) {
            try {
                const response = await fetch('/api/recargo', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(result),
                });
                if (response.ok) {
                    setRecargoDiez(result.montoDiez);
                    setRecargoMes(result.montoMes);
                    Swal.fire({ ...swalNotify, icon: 'success', title: 'Recargos actualizados' });
                } else {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudieron actualizar los recargos' });
                }
            } catch {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar los recargos' });
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

    // ── Action handlers ─────────────────────────────────────────────────────

    const marcarPagoMes = async () => {
        const opcionesTarifas = tarifas.reduce((options, tarifa) => {
            options[tarifa.dias] = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${tarifa.dias} día${tarifa.dias > 1 ? 's' : ''} por semana</span>
                    <strong>$${tarifa.valor}</strong>
                </div>`;
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

        if (!diasMusculacion) return;

        const tarifaSeleccionada = tarifas.find(t => t.dias === Number(diasMusculacion));
        if (!tarifaSeleccionada) {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'No se encontró una tarifa para los días seleccionados.' });
            return;
        }

        const { value: metodoPago } = await Swal.fire({
            ...swalBase,
            title: 'Método de pago',
            input: 'radio',
            inputOptions: { efectivo: 'Efectivo', transferencia: 'Transferencia' },
            inputValidator: (value) => { if (!value) return 'Debes seleccionar un método de pago'; return null; },
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
        });
        if (!metodoPago) return;

        const hoy = new Date();
        const esDespuesDel10 = hoy.getDate() > 10;
        const montoRecargoDisponible = esDespuesDel10 ? recargoDiez : 0;
        const labelRecargo = `Recargo por día 10 ($${recargoDiez.toFixed(2)})`;

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
                    ${montoRecargoDisponible > 0 ? `
                    <label class="swal-form-label" style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;text-transform:none;font-size:0.85rem;color:#334155;">
                        <input type="checkbox" id="swal-aplicar-recargo" checked style="width:16px;height:16px;accent-color:#059669;">
                        ${labelRecargo}
                    </label>` : ''}
                </div>
            `,
            preConfirm: () => {
                const checkbox = document.getElementById('swal-aplicar-recargo') as HTMLInputElement;
                return { aplicarRecargo: checkbox?.checked ?? false };
            },
            showCancelButton: true,
            confirmButtonText: 'Cobrar',
            cancelButtonText: 'Cancelar',
        });

        if (!confirmacion.isConfirmed) return;

        try {
            const aplicarRecargo = confirmacion.value?.aplicarRecargo;
            const mesActual = new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase();
            const montoRecargo = aplicarRecargo ? montoRecargoDisponible : 0;
            const total = tarifaSeleccionada.valor + montoRecargo;

            const res = await fetch('/api/alumnos/pagos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alumnoId: id,
                    nuevoPago: {
                        mes: mesActual,
                        fechaPago: new Date(),
                        diasMusculacion: Number(diasMusculacion),
                        tarifa: tarifaSeleccionada.valor,
                        metodoPago,
                        recargo: montoRecargo,
                        totalPagado: total,
                    },
                }),
            });
            if (res.ok) {
                Swal.fire({ ...swalNotify, icon: 'success', title: 'Pago registrado correctamente' });
                fetchAlumno();
            } else {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al registrar el pago' });
            }
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al registrar el pago' });
        }
    };

    const iniciarPlan = async () => {
        const { value: formValues } = await Swal.fire({
            ...swalBase,
            title: 'Iniciar plan de entrenamiento',
            html: `
                <div class="swal-form-body">
                    <label class="swal-form-label">Duración (clases)</label>
                    <input type="number" id="duracion" class="swal2-input" placeholder="Ej: 20">
                    <label class="swal-form-label">Fecha de inicio</label>
                    <input type="date" id="fecha" class="swal2-input" value="${new Date().toISOString().split('T')[0]}">
                </div>
            `,
            showCancelButton: true,
            focusConfirm: false,
            preConfirm: () => {
                const duracion = (document.getElementById('duracion') as HTMLInputElement).value;
                const fecha = (document.getElementById('fecha') as HTMLInputElement).value;
                if (!duracion || Number(duracion) <= 0) { Swal.showValidationMessage('Debes ingresar una duración válida'); return; }
                if (!fecha) { Swal.showValidationMessage('Debes seleccionar una fecha de inicio'); return; }
                return { duracion: Number(duracion), fechaInicio: fecha };
            },
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
        });

        if (!formValues) return;
        try {
            const res = await fetch(`/api/alumnos/${id}/plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fechaInicio: formValues.fechaInicio, duracion: formValues.duracion, terminado: false }),
            });
            if (res.ok) { Swal.fire({ ...swalNotify, icon: 'success', title: 'Plan de entrenamiento iniciado' }); fetchAlumno(); }
            else Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo iniciar el plan de entrenamiento' });
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al iniciar el plan' });
        }
    };

    const guardarAlumno = async (alumnoActualizado: any) => {
        try {
            const res = await fetch('/api/alumnos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...alumnoActualizado }),
            });
            if (!res.ok) throw new Error();
            Swal.fire({ ...swalNotify, icon: 'success', title: 'Alumno actualizado correctamente', showConfirmButton: false, timer: 1500 });
            fetchAlumno();
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al actualizar el alumno' });
        }
    };

    const handleEditarAlumno = async () => {
        if (!alumno) return;
        const { value: formValues } = await Swal.fire({
            ...swalBase,
            title: 'Editar alumno',
            html: `
                <div class="swal-form-body swal-form-grid">
                    <div>
                        <label class="swal-form-label">Nombre</label>
                        <input id="swal-nombre" class="swal2-input" value="${alumno.nombre || ''}">
                    </div>
                    <div>
                        <label class="swal-form-label">Apellido</label>
                        <input id="swal-apellido" class="swal2-input" value="${alumno.apellido || ''}">
                    </div>
                    <div>
                        <label class="swal-form-label">DNI</label>
                        <input id="swal-dni" class="swal2-input" value="${alumno.dni || ''}">
                    </div>
                    <div>
                        <label class="swal-form-label">Teléfono</label>
                        <input id="swal-telefono" class="swal2-input" value="${alumno.telefono || ''}">
                    </div>
                    <div>
                        <label class="swal-form-label">Email</label>
                        <input id="swal-email" class="swal2-input" value="${alumno.email || ''}">
                    </div>
                    <div>
                        <label class="swal-form-label">Franja horaria</label>
                        <select id="swal-horario" class="swal2-select">
                            <option value="">Selecciona una franja</option>
                            <option value="mañana" ${alumno.horarioEntrenamiento === 'mañana' ? 'selected' : ''}>Mañana</option>
                            <option value="siesta" ${alumno.horarioEntrenamiento === 'siesta' ? 'selected' : ''}>Siesta</option>
                            <option value="tarde" ${alumno.horarioEntrenamiento === 'tarde' ? 'selected' : ''}>Tarde</option>
                        </select>
                    </div>
                    <div>
                        <label class="swal-form-label">Hora exacta</label>
                        <input id="swal-hora-exacta" class="swal2-input" type="time" value="${alumno.horaExactaEntrenamiento || ''}">
                    </div>
                    <div class="swal-full-row">
                        <label class="swal-form-label">Historial deportivo</label>
                        <textarea id="swal-historial-deportivo" class="swal2-textarea">${alumno.historialDeportivo || ''}</textarea>
                    </div>
                    <div class="swal-full-row">
                        <label class="swal-form-label">Historial de vida</label>
                        <textarea id="swal-historial-vida" class="swal2-textarea">${alumno.historialDeVida || ''}</textarea>
                    </div>
                    <div class="swal-full-row">
                        <label class="swal-form-label">Objetivos</label>
                        <textarea id="swal-objetivos" class="swal2-textarea">${alumno.objetivos || ''}</textarea>
                    </div>
                    <div class="swal-full-row">
                        <label class="swal-form-label">Patologías</label>
                        <textarea id="swal-patologias" class="swal2-textarea">${alumno.patologias || ''}</textarea>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            width: '50rem',
            preConfirm: () => ({
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
            }),
        });
        if (formValues) await guardarAlumno({ ...alumno, ...formValues });
    };

    const handleResetPassword = async () => {
        if (!alumno) return;
        const { value: newPassword } = await Swal.fire({
            ...swalBase,
            title: 'Nueva contraseña',
            html: `
                <div class="swal-form-body">
                    <p style="color:#475569;font-size:0.875rem;margin:0 0 1rem;">
                        Establecé una nueva contraseña para <strong>${alumno.nombre} ${alumno.apellido}</strong>.
                    </p>
                    <label class="swal-form-label">Contraseña</label>
                    <input type="password" id="swal-new-pwd" class="swal2-input" placeholder="Mínimo 6 caracteres">
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const val = (document.getElementById('swal-new-pwd') as HTMLInputElement).value;
                if (!val || val.length < 6) { Swal.showValidationMessage('Mínimo 6 caracteres'); return false; }
                return val;
            },
        });
        if (!newPassword) return;
        try {
            const res = await fetch(`/api/alumnos/${id}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword }),
            });
            if (res.ok) Swal.fire({ ...swalNotify, icon: 'success', title: 'Contraseña actualizada' });
            else { const d = await res.json(); Swal.fire({ ...swalNotify, icon: 'error', title: d.error || 'Error al actualizar la contraseña' }); }
        } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Error de conexión' }); }
    };

    const eliminarAlumno = async () => {
        const result = await Swal.fire({
            ...swalDanger,
            title: '¿Eliminar alumno?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        try {
            const res = await fetch('/api/alumnos', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (res.ok) {
                Swal.fire({ ...swalNotify, icon: 'success', title: 'Alumno eliminado correctamente', showConfirmButton: false, timer: 1500 });
                router.push('/alumnos');
            } else {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al eliminar el alumno' });
            }
        } catch { Swal.fire({ ...swalNotify, icon: 'error', title: 'Hubo un problema al eliminar el alumno' }); }
    };

    // ── End action handlers ─────────────────────────────────────────────────

    if (!alumno) {
        return <Loader />;
    }

    // Mobile calendar data
    const nowCalendar = new Date();
    const asistenciasMapMob: Record<string, Asistencia[]> = {};
    (alumno.asistencia || []).filter((a: Asistencia) => a.presente).forEach((a: Asistencia) => {
        const key = toLocalKey(a.fecha);
        if (!asistenciasMapMob[key]) asistenciasMapMob[key] = [];
        asistenciasMapMob[key].push(a);
    });
    const pagosMapMob: Record<string, Pago[]> = {};
    (alumno.pagos || []).forEach((p: Pago) => {
        const key = toLocalKey(p.fechaPago);
        if (!pagosMapMob[key]) pagosMapMob[key] = [];
        pagosMapMob[key].push(p);
    });
    const mobTodayKey = `${nowCalendar.getFullYear()}-${String(nowCalendar.getMonth()+1).padStart(2,'0')}-${String(nowCalendar.getDate()).padStart(2,'0')}`;

    // Parsea "YYYY-MM-DD" como medianoche LOCAL (evita desfase UTC)
    const parseLocalDate = (dateStr: string): Date => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };
    const todayLocal = new Date(nowCalendar.getFullYear(), nowCalendar.getMonth(), nowCalendar.getDate());

    // Plan range map: active (green) and completed (red)
    const planDaysMap: Record<string, 'active' | 'completed'> = {};
    // Plan boundary map: days that mark start/end of a plan
    const planBoundaryMap: Record<string, 'start' | 'end'> = {};

    const planByDateMap: Record<string, { type: 'active'; plan: any } | { type: 'historial'; plan: any; planId: string }> = {};

    if (alumno.planEntrenamiento?.fechaInicio && !alumno.planEntrenamiento?.terminado) {
        const startStr = convertirAFechaLocal(alumno.planEntrenamiento.fechaInicio);
        const cur = parseLocalDate(startStr);
        planBoundaryMap[startStr] = 'start';
        planByDateMap[startStr] = { type: 'active', plan: alumno.planEntrenamiento };
        while (cur <= todayLocal) {
            const k = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
            planDaysMap[k] = 'active';
            cur.setDate(cur.getDate() + 1);
        }
    }
    for (const plan of alumno.planEntrenamientoHistorial || []) {
        if (!plan.fechaInicio || !plan.fechaFin) continue;
        const startStr = convertirAFechaLocal(plan.fechaInicio);
        const endStr = convertirAFechaLocal(plan.fechaFin);
        planBoundaryMap[startStr] = 'start';
        planBoundaryMap[endStr] = 'end';
        planByDateMap[startStr] = { type: 'historial', plan, planId: plan._id };
        planByDateMap[endStr] = { type: 'historial', plan, planId: plan._id };
        const cur = parseLocalDate(startStr);
        const pe = parseLocalDate(endStr);
        while (cur <= pe) {
            const k = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
            if (!planDaysMap[k]) planDaysMap[k] = 'completed';
            cur.setDate(cur.getDate() + 1);
        }
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

    const openDayModal = (dateKey: string) => {
        setDayModal(dateKey);
        setDayModalStep('menu');
        setDayModalActTipo('');
        const n = new Date();
        const m = Math.round(n.getMinutes() / 5) * 5;
        setDayModalActHora(`${String(m >= 60 ? (n.getHours() + 1) % 24 : n.getHours()).padStart(2,'0')}:${String(m >= 60 ? 0 : m).padStart(2,'0')}`);
        setDayModalPlanDur('');
        setDayModalPagoDias(null);
        setDayModalPagoMetodo('');
        setDayModalPagoRecargo(true);
    };

    const closeDayModal = () => {
        setDayModal(null);
        setDayModalStep('menu');
    };

    const submitDayModalActividad = async () => {
        if (!dayModalActTipo || !dayModal || dayModalSaving) return;
        setDayModalSaving(true);
        try {
            const [year, month, day] = dayModal.split('-').map(Number);
            const [hh, mm] = dayModalActHora.split(':').map(Number);
            const fechaLocal = new Date(year, month - 1, day, hh, mm);
            const res = await fetch(`/api/asistencias/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fecha: fechaLocal.toISOString(), actividad: dayModalActTipo, presente: true }),
            });
            if (res.ok) { closeDayModal(); await fetchAlumno(); }
            else Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al registrar asistencia' });
        } finally {
            setDayModalSaving(false);
        }
    };

    const submitDayModalPlan = async () => {
        if (!dayModalPlanDur || !dayModal || dayModalSaving) return;
        setDayModalSaving(true);
        try {
            const res = await fetch(`/api/alumnos/${id}/plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fechaInicio: dayModal, duracion: Number(dayModalPlanDur), terminado: false }),
            });
            if (res.ok) { skipAutoDeleteRef.current = true; closeDayModal(); await fetchAlumno(); }
            else Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al iniciar plan' });
        } finally {
            setDayModalSaving(false);
        }
    };

    const submitDayModalPago = async () => {
        if (!dayModalPagoDias || !dayModalPagoMetodo || !dayModal || dayModalSaving) return;
        setDayModalSaving(true);
        try {
            const tarifaSel = tarifas.find(t => t.dias === dayModalPagoDias);
            if (!tarifaSel) return;
            const selDate = new Date(dayModal + 'T12:00:00');
            const esMesPasado = selDate < new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const recargoAplicable = esMesPasado ? recargoMes : (selDate.getDate() > 10 ? recargoDiez : 0);
            const montoRecargo = dayModalPagoRecargo ? recargoAplicable : 0;
            const mesNombre = selDate.toLocaleString('es-ES', { month: 'long' }).toLowerCase();
            const res = await fetch('/api/alumnos/pagos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alumnoId: id,
                    nuevoPago: {
                        mes: mesNombre,
                        fechaPago: selDate.toISOString(),
                        diasMusculacion: dayModalPagoDias,
                        tarifa: tarifaSel.valor,
                        metodoPago: dayModalPagoMetodo,
                        recargo: montoRecargo,
                        totalPagado: tarifaSel.valor + montoRecargo,
                    },
                }),
            });
            if (res.ok) { closeDayModal(); await fetchAlumno(); }
            else Swal.fire({ ...swalNotify, icon: 'error', title: 'Error al registrar pago' });
        } finally {
            setDayModalSaving(false);
        }
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

                // Determinar qué recargo aplica según la fecha seleccionada
                const [_yr, _mo, _dy] = selectInfo.startStr.split('-');
                const fechaSel = new Date(Number(_yr), Number(_mo) - 1, Number(_dy));
                const hoy = new Date();
                const esMesPasado = fechaSel.getFullYear() < hoy.getFullYear() || (fechaSel.getFullYear() === hoy.getFullYear() && fechaSel.getMonth() < hoy.getMonth());
                const esDespuesDel10 = !esMesPasado && hoy.getDate() > 10;
                const recargoAplicable = esMesPasado ? recargoMes : esDespuesDel10 ? recargoDiez : 0;
                const labelRecargo = esMesPasado ? `Recargo mes vencido ($${recargoMes.toFixed(2)})` : `Recargo por día 10 ($${recargoDiez.toFixed(2)})`;

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
                            ${recargoAplicable > 0 ? `
                            <label class="swal-form-label" style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;text-transform:none;font-size:0.85rem;color:#334155;">
                                <input type="checkbox" id="incluir-recargo" checked style="width:16px;height:16px;accent-color:#059669;">
                                ${labelRecargo}
                            </label>` : ''}
                        </div>
                    `,
                    preConfirm: () => {
                        const incluirRecargo = (document.getElementById('incluir-recargo') as HTMLInputElement)?.checked ?? false;
                        return { incluirRecargo };
                    },
                    showCancelButton: true,
                    confirmButtonText: 'Cobrar',
                    cancelButtonText: 'Cancelar',
                });

                if (confirmacion.isConfirmed) {
                    try {
                        const incluirRecargo = confirmacion.value?.incluirRecargo ?? false;

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
                            recargo: incluirRecargo ? recargoAplicable : 0,
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
        <>
        <div className="max-w-5xl mx-auto space-y-4">
            {/* Header */}
            <div className="bg-[#111] rounded-2xl px-4 py-4 sm:px-5 flex items-center gap-3">
                <Link href="/alumnos" className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                </Link>
                <h1 className="flex-1 min-w-0 text-lg font-bold text-white truncate">{alumno.nombre} {alumno.apellido}</h1>
                {diasRestantes != null && diasRestantes > 0 ? (
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${diasRestantes > 10 ? 'bg-white/10 text-white/70' : diasRestantes > 5 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
                        {diasRestantes} entrenos
                    </span>
                ) : (
                    <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-white/40">Sin plan</span>
                )}
                <Link
                    href={`/alumnos/${alumno._id}/plan`}
                    style={{ backgroundColor: acento }}
                    className="shrink-0 px-2.5 py-1.5 text-white text-xs font-semibold rounded-xl hover:opacity-80 transition-opacity shadow-sm"
                >
                    Plan
                </Link>
                <select
                    className="shrink-0 border border-white/10 rounded-xl px-2.5 py-1.5 bg-white/10 text-white text-sm font-semibold focus:outline-none cursor-pointer"
                    value=""
                    onChange={(e) => {
                        if (e.target.value === 'cuotas') handleConfiguracionTarifas();
                        if (e.target.value === 'recargo') handleConfiguracionRecargos();
                        e.target.value = '';
                    }}
                >
                    <option value="" disabled className="text-slate-800">Ajustes</option>
                    <option value="cuotas" className="text-slate-800">Cuotas</option>
                    <option value="recargo" className="text-slate-800">Recargo</option>
                </select>
            </div>

            {/* Info + Acciones */}
            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">

                {/* Top: datos | estado */}
                <div className="flex flex-col sm:flex-row sm:divide-x divide-slate-100">

                    {/* Datos del alumno */}
                    <div className="flex-1 px-5 py-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl px-3.5 py-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">DNI</p>
                            <p className="text-base font-bold text-slate-800 tabular-nums">{alumno.dni}</p>
                        </div>
                        {alumno.area && (
                            <div className="bg-slate-50 rounded-xl px-3.5 py-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Área</p>
                                <p className="text-base font-bold text-slate-800">{AREA_LABEL[alumno.area] ?? alumno.area}</p>
                            </div>
                        )}
                        {alumno.telefono && (
                            <div className="bg-slate-50 rounded-xl px-3.5 py-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Teléfono</p>
                                <p className="text-base font-bold text-slate-800 tabular-nums">{alumno.telefono}</p>
                            </div>
                        )}
                        {alumno.horarioEntrenamiento && (
                            <div className="bg-slate-50 rounded-xl px-3.5 py-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Horario</p>
                                <p className="text-base font-bold text-slate-800">{capitalizar(alumno.horarioEntrenamiento)}</p>
                            </div>
                        )}
                        {alumno.diasEntrenaSemana && (
                            <div className="bg-slate-50 rounded-xl px-3.5 py-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Días/sem</p>
                                <p className="text-base font-bold text-slate-800">{alumno.diasEntrenaSemana} días</p>
                            </div>
                        )}
                    </div>

                    {/* Estado: pago + plan */}
                    <div className="sm:w-52 flex sm:flex-col gap-3 px-5 sm:px-4 pb-5 pt-0 sm:pt-5 sm:justify-center">
                        {/* Pago */}
                        <div className={`flex-1 sm:flex-none rounded-xl px-4 py-3.5 ${verificarPagoMesActual(alumno.pagos) ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">Cuota</p>
                            <p className={`text-lg font-black ${verificarPagoMesActual(alumno.pagos) ? 'text-emerald-600' : 'text-red-500'}`}>
                                {verificarPagoMesActual(alumno.pagos) ? '✓ Al día' : '✗ Debe'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium capitalize">
                                {new Date().toLocaleDateString('es-AR', { month: 'long' })}
                            </p>
                        </div>
                        {/* Plan */}
                        <div className={`flex-1 sm:flex-none rounded-xl px-4 py-3.5 ${diasRestantes == null ? 'bg-slate-50 border border-slate-100' : diasRestantes > 10 ? 'bg-slate-50 border border-slate-100' : diasRestantes > 5 ? 'bg-amber-50 border border-amber-100' : 'bg-red-50 border border-red-100'}`}>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">Plan</p>
                            {diasRestantes != null && diasRestantes > 0 ? (
                                <>
                                    <p className={`text-lg font-black ${diasRestantes > 10 ? 'text-slate-700' : diasRestantes > 5 ? 'text-amber-600' : 'text-red-500'}`}>
                                        {diasRestantes}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium">entrenos restantes</p>
                                </>
                            ) : (
                                <p className="text-sm font-semibold text-slate-400">Sin plan activo</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 mx-5" />

                {/* Acciones */}
                <div className="px-5 py-4 flex flex-wrap items-center gap-2">
                    <button onClick={marcarPagoMes} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 shadow-sm">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75" /></svg>
                        Marcar Pago
                    </button>
                    <button onClick={iniciarPlan} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 shadow-sm">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" /></svg>
                        Iniciar Plan
                    </button>
                    <button onClick={handleEditarAlumno} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 shadow-sm">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                        Editar
                    </button>
                    {['dueño', 'admin'].includes(session?.user?.role ?? '') && (
                        <button onClick={handleResetPassword} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl transition-all active:scale-95">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" /></svg>
                            Resetear contraseña
                        </button>
                    )}
                    <button onClick={eliminarAlumno} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-all active:scale-95 ml-auto">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                        Eliminar alumno
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Calendario */}
                <div className="p-3 sm:p-6 bg-slate-50 border-b border-slate-100 overflow-x-hidden">

                    {/* ── Calendario ────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">

                        <div className="order-2 bg-white rounded-xl border border-slate-200 p-3 sm:pt-5 sm:px-0 sm:pb-5">
                                {/* Nav */}
                                <div className="flex items-center justify-between mb-3 sm:mb-4 sm:px-5">
                                    <button
                                        onClick={() => { if (mobCalMonth === 0) { setMobCalMonth(11); setMobCalYear(y => y - 1); } else setMobCalMonth(m => m - 1); }}
                                        className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition text-xl"
                                    >‹</button>
                                    <span className="text-slate-700 font-semibold sm:text-lg capitalize">{new Date(mobCalYear, mobCalMonth, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</span>
                                    <button
                                        onClick={() => { if (mobCalMonth === 11) { setMobCalMonth(0); setMobCalYear(y => y + 1); } else setMobCalMonth(m => m + 1); }}
                                        disabled={mobCalYear >= nowCalendar.getFullYear() && mobCalMonth >= nowCalendar.getMonth()}
                                        className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition disabled:opacity-30 text-xl"
                                    >›</button>
                                </div>
                                {/* Day headers */}
                                <div className="grid grid-cols-7 sm:border-t sm:border-l sm:border-slate-200">
                                    {DIAS_CAL.map(d => (
                                        <div key={d} className="text-center text-slate-500 text-xs font-semibold py-1.5 sm:py-2 sm:border-r sm:border-b sm:border-slate-200">{d.toLowerCase()}</div>
                                    ))}
                                </div>
                                {/* Grid */}
                                <div className="grid grid-cols-7 gap-y-0.5 sm:gap-0 sm:border-l sm:border-slate-200">
                                    {calDaysGrid(mobCalYear, mobCalMonth).map((calDay, i) => {
                                        const key = `${calDay.year}-${String(calDay.month + 1).padStart(2, '0')}-${String(calDay.day).padStart(2, '0')}`;
                                        const asists = asistenciasMapMob[key] || [];
                                        const pags = pagosMapMob[key] || [];
                                        const isToday = key === mobTodayKey;
                                        const isSelected = key === dayModal;
                                        const hasData = asists.length > 0 || pags.length > 0;
                                        const isOverflow = !calDay.isCurrentMonth;
                                        const dotColors: Record<string, string> = { Musculación: 'bg-blue-600', Intermitente: 'bg-orange-500', Otro: 'bg-yellow-400' };
                                        return (
                                            <button
                                                key={`${key}-${i}`}
                                                onClick={() => openDayModal(key)}
                                                className={`relative flex flex-col items-center py-1 sm:py-0 sm:items-start sm:min-h-[90px] rounded-lg sm:rounded-none sm:border-r sm:border-b sm:border-slate-200 transition-colors overflow-hidden ${
                                                    isSelected
                                                        ? 'bg-slate-100'
                                                        : planDaysMap[key] === 'active'
                                                        ? 'bg-emerald-50 hover:bg-emerald-100'
                                                        : planDaysMap[key] === 'completed'
                                                        ? 'bg-red-50 hover:bg-red-100'
                                                        : isOverflow
                                                        ? 'bg-slate-50/70 hover:bg-slate-100'
                                                        : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                {/* Franja de plan (escritorio) */}
                                                {planDaysMap[key] && (
                                                    <span className={`hidden sm:block absolute top-0 left-0 right-0 h-[3px] ${planDaysMap[key] === 'active' ? 'bg-emerald-400' : 'bg-red-300'}`} />
                                                )}
                                                {/* Número del día */}
                                                <div className="sm:w-full sm:flex sm:justify-end sm:pt-2 sm:pr-2">
                                                    <span className={`text-xs sm:text-[13px] leading-none mb-1 sm:mb-0 ${
                                                        isToday
                                                            ? 'bg-slate-700 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center font-bold'
                                                            : isOverflow
                                                            ? 'text-slate-300'
                                                            : (hasData || planDaysMap[key])
                                                            ? 'text-slate-700 font-medium'
                                                            : 'text-slate-400'
                                                    }`}>{calDay.day}</span>
                                                </div>
                                                {/* Mobile: dots */}
                                                <div className="sm:hidden flex gap-0.5 flex-wrap justify-center max-w-[28px]">
                                                    {asists.map((a, idx) => (
                                                        <span key={idx} className={`w-1.5 h-1.5 rounded-full ${ACTIVIDAD_DOT[a.actividad] || 'bg-slate-400'}`} />
                                                    ))}
                                                    {pags.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                                </div>
                                                {/* Desktop: filas estilo FullCalendar */}
                                                <div className="hidden sm:flex flex-col gap-px w-full px-0.5 pb-1 mt-0.5">
                                                    {planBoundaryMap[key] === 'start' && planByDateMap[key] && (
                                                        <div
                                                            onClick={(e) => { e.stopPropagation(); handlePlanBadgeClick(key, planByDateMap[key]); }}
                                                            className="flex items-center gap-1 px-1 py-0.5 bg-emerald-500 hover:bg-emerald-600 rounded-[3px] mx-0.5 cursor-pointer"
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                                                            <span className="text-white text-[10px] font-semibold truncate">Plan iniciado</span>
                                                        </div>
                                                    )}
                                                    {planBoundaryMap[key] === 'end' && planByDateMap[key] && (
                                                        <div
                                                            onClick={(e) => { e.stopPropagation(); handlePlanBadgeClick(key, planByDateMap[key]); }}
                                                            className="flex items-center gap-1 px-1 py-0.5 bg-red-400 hover:bg-red-500 rounded-[3px] mx-0.5 cursor-pointer"
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                                                            <span className="text-white text-[10px] font-semibold truncate">Fin de plan</span>
                                                        </div>
                                                    )}
                                                    {asists.map((a, idx) => {
                                                        const time = new Date(a.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
                                                        return (
                                                            <div
                                                                key={idx}
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    const { value: action } = await Swal.fire({ ...swalBase, title: a.actividad, input: 'select', inputOptions: { editar: 'Editar actividad', eliminar: 'Eliminar actividad' }, inputPlaceholder: 'Seleccioná una acción', showCancelButton: true, confirmButtonText: 'Aceptar', cancelButtonText: 'Cancelar' });
                                                                    if (action === 'editar') handleEditAsistenciaMob(a);
                                                                    else if (action === 'eliminar') handleEliminarAsistencia(a._id);
                                                                }}
                                                                className="flex items-center gap-1 px-1.5 py-0.5 bg-white hover:bg-slate-50 rounded-[3px] mx-0.5 shadow-sm cursor-pointer"
                                                            >
                                                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[a.actividad] || 'bg-slate-400'}`} />
                                                                <span className="text-slate-700 text-[10px] truncate flex-1 text-left">{a.actividad}</span>
                                                                <span className="text-red-500 text-[10px] flex-shrink-0 font-medium">{time}</span>
                                                            </div>
                                                        );
                                                    })}
                                                    {pags.map((p, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const { value: action } = await Swal.fire({ ...swalBase, title: `Pago ${p.mes}`, input: 'select', inputOptions: { editar: 'Editar pago', eliminar: 'Eliminar pago' }, inputPlaceholder: 'Seleccioná una acción', showCancelButton: true, confirmButtonText: 'Aceptar', cancelButtonText: 'Cancelar' });
                                                                if (action === 'editar') handleEditPagoMob(p);
                                                                else if (action === 'eliminar') handleEliminarPago(p._id);
                                                            }}
                                                            className="flex items-center justify-between px-1.5 py-0.5 bg-emerald-700 hover:bg-emerald-800 rounded-[3px] mx-0.5 cursor-pointer"
                                                        >
                                                            <span className="text-white text-[10px] font-semibold truncate">Pago {p.mes}</span>
                                                            <span className="text-white text-[10px] font-bold ml-1 flex-shrink-0">${(p.totalPagado ?? p.tarifa ?? 0).toLocaleString('es-AR')}</span>
                                                        </div>
                                                    ))}
                                                    {/* Flecha de continuidad: último día del plan activo */}
                                                    {planDaysMap[key] === 'active' && key === mobTodayKey && (
                                                        <div className="flex justify-end pr-1 pt-0.5">
                                                            <span className="text-emerald-500 font-black text-xl leading-none">→</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {/* Legend */}
                                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 flex-wrap sm:px-5">
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" /><span className="text-slate-500 text-xs">Musculación</span></div>
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-slate-500 text-xs">Intermitente</span></div>
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400" /><span className="text-slate-500 text-xs">Otro</span></div>
                                    <div className="flex items-center gap-1.5"><span className="inline-flex items-center px-1.5 py-px bg-emerald-700 rounded-[3px] text-white text-[10px] font-semibold">Pago</span></div>
                                    <div className="flex items-center gap-1.5"><span className="inline-flex items-center px-1.5 py-px bg-emerald-500 rounded-[3px] text-white text-[10px] font-semibold">●</span><span className="text-slate-500 text-xs">Plan activo</span></div>
                                    <div className="flex items-center gap-1.5"><span className="inline-flex items-center px-1.5 py-px bg-red-400 rounded-[3px] text-white text-[10px] font-semibold">●</span><span className="text-slate-500 text-xs">Plan completado</span></div>
                                </div>
                            </div>


                    </div>

                    {/* Resumen del mes — tarjeta separada */}
                    <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 capitalize">
                            Resumen — {new Date(mobCalYear, mobCalMonth, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                                <div className="text-2xl font-bold text-slate-800">
                                    {Object.entries(asistenciasMapMob)
                                        .filter(([k]) => k.startsWith(`${mobCalYear}-${String(mobCalMonth+1).padStart(2,'0')}`))
                                        .reduce((sum, [, a]) => sum + a.length, 0)}
                                </div>
                                <div className="text-slate-400 text-xs mt-0.5">asistencias</div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                                <div className="text-2xl font-bold text-emerald-600">
                                    ${Object.entries(pagosMapMob)
                                        .filter(([k]) => k.startsWith(`${mobCalYear}-${String(mobCalMonth+1).padStart(2,'0')}`))
                                        .reduce((sum, [, ps]) => sum + ps.reduce((s, p) => s + (p.totalPagado ?? p.tarifa ?? 0), 0), 0)
                                        .toLocaleString('es-AR')}
                                </div>
                                <div className="text-slate-400 text-xs mt-0.5">pagado</div>
                            </div>
                        </div>
                    </div>

                    {/* FullCalendar oculto (mantenido para compatibilidad de eventos) */}
                    <div className="hidden">
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
                                    const hora = arg.event.start ? new Date(arg.event.start).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
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
                </div>

                {/* Tab nav */}
                <div className="px-4 sm:px-6 flex border-b border-slate-100">
                    {([
                        { key: 'asistencias', label: 'Asistencias' },
                        { key: 'planes',      label: 'Planes' },
                        { key: 'pagos',       label: 'Pagos' },
                    ] as const).map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => handleTabClick(key)}
                            style={activeTab === key ? { borderBottomColor: acento, color: acento } : {}}
                            className={`py-3.5 px-4 text-sm font-semibold border-b-2 transition-all -mb-px whitespace-nowrap ${
                                activeTab === key
                                    ? 'border-current'
                                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Panels */}
                <div ref={sectionRef} className="px-4 sm:px-6 py-5">

                        {/* ── ASISTENCIAS ── */}
                        {activeTab === 'asistencias' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-700">Asistencias</h3>
                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">{asistenciasFiltradas.length}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleDateSelect({ startStr: getTodayStr(), allDay: true } as DateSelectArg, 'actividad')}
                                            style={{ color: acento }}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 transition"
                                        >+ Registrar</button>
                                        <button
                                            onClick={() => toggleFiltros('asistencias')}
                                            className={`p-1.5 rounded-lg transition ${filtrosAbiertos['asistencias'] ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                            title="Filtros"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
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
                                    <div className="rounded-xl border border-slate-100 overflow-hidden max-h-[32rem] overflow-y-auto">
                                        {asistenciasFiltradas.map((a: Asistencia) => {
                                            const f = new Date(a.fecha);
                                            const colorMap: Record<string, string> = { Musculación: 'bg-blue-50 text-blue-700', Intermitente: 'bg-orange-100 text-orange-700', Otro: 'bg-yellow-100 text-yellow-700' };
                                            const badgeCls = colorMap[a.actividad] || 'bg-slate-100 text-slate-700';
                                            return (
                                                <div key={a._id} className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50 transition group">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeCls}`}>{a.actividad}</span>
                                                        <span className="text-sm text-slate-700 capitalize">{f.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                                                        <span className="text-xs text-slate-400 shrink-0">{f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} hs</span>
                                                    </div>
                                                    <button onClick={() => handleEliminarAsistencia(a._id)} className="shrink-0 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition sm:opacity-0 sm:group-hover:opacity-100" title="Eliminar">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-slate-400 text-sm text-center py-10">No hay asistencias para los filtros aplicados.</p>
                                )}
                            </div>
                        )}

                        {/* ── PLANES ── */}
                        {activeTab === 'planes' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-700">Planes</h3>
                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">{historialPlanesFiltrado.length}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleDateSelect({ startStr: getTodayStr(), allDay: true } as DateSelectArg, 'plan')}
                                            style={{ color: acento }}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 transition"
                                        >+ Registrar</button>
                                        <button
                                            onClick={() => toggleFiltros('planes')}
                                            className={`p-1.5 rounded-lg transition ${filtrosAbiertos['planes'] ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                            title="Filtros"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
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
                                                            <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: acento }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-slate-400 text-sm text-center py-10">No hay planes finalizados para los filtros aplicados.</p>
                                )}
                            </div>
                        )}

                        {/* ── PAGOS ── */}
                        {activeTab === 'pagos' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-700">Pagos</h3>
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                                            ${pagosPanelFiltrados.reduce((s: number, p: Pago) => s + (p.totalPagado ?? p.tarifa ?? 0), 0).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleDateSelect({ startStr: getTodayStr(), allDay: true } as DateSelectArg, 'pago')}
                                            style={{ color: acento }}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 transition"
                                        >+ Registrar</button>
                                        <button
                                            onClick={() => toggleFiltros('pagos')}
                                            className={`p-1.5 rounded-lg transition ${filtrosAbiertos['pagos'] ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                            title="Filtros"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
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
                                    <div className="rounded-xl border border-slate-100 overflow-hidden max-h-[32rem] overflow-y-auto">
                                        {pagosPanelFiltrados.map((p: Pago, idx: number) => {
                                            const metodoCls = p.metodoPago === 'efectivo' ? 'bg-emerald-100 text-emerald-700' : p.metodoPago === 'transferencia' ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-500';
                                            return (
                                                <div key={p._id || idx} className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50 transition group">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-semibold text-slate-800 capitalize">{p.mes}</span>
                                                                {p.metodoPago && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${metodoCls} capitalize`}>{p.metodoPago}</span>}
                                                            </div>
                                                            <span className="text-xs text-slate-400 mt-0.5">{new Date(p.fechaPago).toLocaleDateString('es-AR')}{p.diasMusculacion ? ` · ${p.diasMusculacion}d/sem` : ''}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-right">
                                                            <p className="font-bold text-emerald-600">${(p.totalPagado ?? p.tarifa ?? 0).toLocaleString('es-AR')}</p>
                                                            {p.recargo ? <p className="text-xs text-slate-400">incl. ${p.recargo} recargo</p> : null}
                                                        </div>
                                                        <button onClick={() => handleEliminarPago(p._id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition sm:opacity-0 sm:group-hover:opacity-100" title="Eliminar">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-slate-400 text-sm text-center py-10">No hay pagos para los filtros aplicados.</p>
                                )}
                            </div>
                        )}
                    </div>
            </div>
        </div>

        {/* Day action bottom sheet */}
        {dayModal && (
            <div className="fixed inset-0 z-[100] flex items-end">
                <div className="absolute inset-0 bg-black/40" onClick={closeDayModal} />
                <div className="relative w-full bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
                    {/* Grip handle */}
                    <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                        <div className="w-10 h-1 rounded-full bg-slate-300" />
                    </div>

                    {/* ── MENU ── */}
                    {dayModalStep === 'menu' && (
                        <>
                            <div className="px-5 pt-2 pb-3 flex items-center justify-between flex-shrink-0">
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide capitalize">
                                        {new Date(dayModal + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long' })}
                                    </p>
                                    <h3 className="text-lg font-bold text-slate-800 capitalize">
                                        {new Date(dayModal + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
                                    </h3>
                                </div>
                                <button onClick={closeDayModal} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 text-xl font-medium">×</button>
                            </div>
                            <div className="overflow-y-auto flex-1 px-5 pb-8">
                                {/* Existing records */}
                                {(asistenciasMapMob[dayModal] || []).length > 0 || (pagosMapMob[dayModal] || []).length > 0 ? (
                                    <div className="mb-4 space-y-2">
                                        {(asistenciasMapMob[dayModal] || []).map((a: Asistencia) => {
                                            const badgeMap: Record<string, string> = { Musculación: 'bg-blue-50 text-blue-700', Intermitente: 'bg-orange-100 text-orange-700', Otro: 'bg-yellow-100 text-yellow-700' };
                                            return (
                                                <div key={a._id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeMap[a.actividad] || 'bg-slate-100 text-slate-700'}`}>{a.actividad}</span>
                                                        <span className="text-slate-400 text-xs">{new Date(a.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} hs</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => { closeDayModal(); handleEditAsistenciaMob(a); }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>
                                                        </button>
                                                        <button onClick={() => { closeDayModal(); handleEliminarAsistencia(a._id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(pagosMapMob[dayModal] || []).map((p: Pago) => (
                                            <div key={p._id} className="flex items-center justify-between bg-emerald-50 rounded-xl px-3 py-2.5 border border-emerald-100">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                                    <span className="text-emerald-700 text-sm font-medium capitalize">Pago — {p.mes}</span>
                                                    <span className="text-emerald-600 font-bold text-sm">${(p.totalPagado ?? p.tarifa ?? 0).toLocaleString('es-AR')}</span>
                                                </div>
                                                <button onClick={() => { closeDayModal(); handleEliminarPago(p._id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-400 text-sm text-center py-2 mb-4">Sin registros para este día.</p>
                                )}
                                {/* Action buttons */}
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Agregar</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setDayModalStep('actividad')}
                                        className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-blue-600 active:bg-blue-700 transition shadow-sm">
                                        <svg width="26" height="26" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="1" y="7" width="3" height="10" rx="1.5"/>
                                            <rect x="4" y="9" width="2.5" height="6" rx="1"/>
                                            <rect x="6.5" y="11" width="11" height="2" rx="1"/>
                                            <rect x="17.5" y="9" width="2.5" height="6" rx="1"/>
                                            <rect x="20" y="7" width="3" height="10" rx="1.5"/>
                                        </svg>
                                        <span className="text-white font-semibold text-xs text-center leading-tight">Actividad</span>
                                    </button>
                                    <button
                                        onClick={() => setDayModalStep('plan')}
                                        className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-violet-600 active:bg-violet-700 transition shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="white" viewBox="0 0 16 16"><path d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/><path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3z"/></svg>
                                        <span className="text-white font-semibold text-xs text-center leading-tight">Plan</span>
                                    </button>
                                    <button
                                        onClick={() => setDayModalStep('pago')}
                                        className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-emerald-600 active:bg-emerald-700 transition shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="white" viewBox="0 0 16 16"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2.5 1a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-2zm0 3a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1zm3 0a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1zm3 0a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1zm3 0a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1z"/></svg>
                                        <span className="text-white font-semibold text-xs text-center leading-tight">Pago</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── ACTIVIDAD ── */}
                    {dayModalStep === 'actividad' && (
                        <>
                            <div className="px-5 pt-2 pb-3 flex items-center gap-3 flex-shrink-0 border-b border-slate-100">
                                <button onClick={() => setDayModalStep('menu')} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 text-xl">‹</button>
                                <div>
                                    <p className="text-xs text-slate-400 capitalize">
                                        {new Date(dayModal + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </p>
                                    <h3 className="font-bold text-slate-800">Ingresar actividad</h3>
                                </div>
                            </div>
                            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Tipo de actividad</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'Musculación', active: 'bg-blue-600 text-white', idle: 'bg-blue-50 text-blue-700 border border-blue-100' },
                                            { label: 'Intermitente', active: 'bg-orange-500 text-white', idle: 'bg-orange-50 text-orange-700 border border-orange-100' },
                                            { label: 'Otro', active: 'bg-yellow-400 text-slate-800', idle: 'bg-yellow-50 text-yellow-700 border border-yellow-100' },
                                        ].map(({ label, active, idle }) => (
                                            <button key={label} onClick={() => setDayModalActTipo(label)}
                                                className={`py-3.5 rounded-xl font-semibold text-sm transition ${dayModalActTipo === label ? active : idle}`}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Horario</p>
                                        <span className="text-sm font-bold text-blue-600 tabular-nums">{dayModalActHora} hs</span>
                                    </div>
                                    {/* Hours grid */}
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5">Hora</p>
                                    <div className="grid grid-cols-6 gap-1.5 mb-3">
                                        {Array.from({ length: 24 }, (_, i) => i).map(h => {
                                            const hStr = String(h).padStart(2,'0');
                                            const selected = dayModalActHora.split(':')[0] === hStr;
                                            return (
                                                <button key={h} onClick={() => setDayModalActHora(`${hStr}:${dayModalActHora.split(':')[1]}`)}
                                                    className={`py-2 rounded-lg text-sm font-semibold transition ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 active:bg-slate-200'}`}>
                                                    {hStr}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {/* Minutes grid */}
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5">Minutos</p>
                                    <div className="grid grid-cols-6 gap-1.5">
                                        {[0,5,10,15,20,25,30,35,40,45,50,55].map(m => {
                                            const mStr = String(m).padStart(2,'0');
                                            const selected = dayModalActHora.split(':')[1] === mStr;
                                            return (
                                                <button key={m} onClick={() => setDayModalActHora(`${dayModalActHora.split(':')[0]}:${mStr}`)}
                                                    className={`py-2 rounded-lg text-sm font-semibold transition ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 active:bg-slate-200'}`}>
                                                    {mStr}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <button onClick={submitDayModalActividad} disabled={!dayModalActTipo || dayModalSaving}
                                    className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-base transition disabled:opacity-40">
                                    {dayModalSaving ? 'Guardando...' : 'Registrar asistencia'}
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── PLAN ── */}
                    {dayModalStep === 'plan' && (
                        <>
                            <div className="px-5 pt-2 pb-3 flex items-center gap-3 flex-shrink-0 border-b border-slate-100">
                                <button onClick={() => setDayModalStep('menu')} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 text-xl">‹</button>
                                <div>
                                    <p className="text-xs text-slate-400 capitalize">
                                        Inicio: {new Date(dayModal + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </p>
                                    <h3 className="font-bold text-slate-800">Iniciar plan</h3>
                                </div>
                            </div>
                            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Duración del plan</p>
                                    <div className="flex items-center gap-3">
                                        <input type="number" min="1" max="365" value={dayModalPlanDur} onChange={e => setDayModalPlanDur(e.target.value)}
                                            placeholder="ej: 20"
                                            className="flex-1 px-4 py-3.5 rounded-xl border border-slate-200 text-slate-800 text-lg font-medium focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-slate-50" />
                                        <span className="text-slate-500 font-medium">clases</span>
                                    </div>
                                </div>
                                <button onClick={submitDayModalPlan} disabled={!dayModalPlanDur || dayModalSaving}
                                    className="w-full py-4 rounded-2xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-bold text-base transition disabled:opacity-40">
                                    {dayModalSaving ? 'Guardando...' : 'Iniciar plan'}
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── PAGO ── */}
                    {dayModalStep === 'pago' && (
                        <>
                            <div className="px-5 pt-2 pb-3 flex items-center gap-3 flex-shrink-0 border-b border-slate-100">
                                <button onClick={() => setDayModalStep('menu')} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 text-xl">‹</button>
                                <div>
                                    <p className="text-xs text-slate-400 capitalize">
                                        {new Date(dayModal + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </p>
                                    <h3 className="font-bold text-slate-800">Marcar pago</h3>
                                </div>
                            </div>
                            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Tarifa</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {tarifas.map(t => (
                                            <button key={t.dias} onClick={() => setDayModalPagoDias(t.dias)}
                                                className={`flex flex-col items-start px-4 py-3.5 rounded-xl border transition ${dayModalPagoDias === t.dias ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                                                <span className="font-bold text-lg">${t.valor.toLocaleString('es-AR')}</span>
                                                <span className="text-xs opacity-80">{t.dias} días/sem</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Método de pago</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[{ value: 'efectivo', label: 'Efectivo' }, { value: 'transferencia', label: 'Transferencia' }].map(m => (
                                            <button key={m.value} onClick={() => setDayModalPagoMetodo(m.value)}
                                                className={`py-3.5 rounded-xl border font-semibold text-sm transition ${dayModalPagoMetodo === m.value ? 'bg-slate-800 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {(() => {
                                    const selDate = new Date(dayModal + 'T12:00:00');
                                    const esMesPasado = selDate < new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                                    const recargoAplicable = esMesPasado ? recargoMes : (selDate.getDate() > 10 ? recargoDiez : 0);
                                    if (recargoAplicable <= 0) return null;
                                    return (
                                        <button onClick={() => setDayModalPagoRecargo(!dayModalPagoRecargo)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition ${dayModalPagoRecargo ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                            <span className="text-sm font-medium">
                                                {esMesPasado ? 'Recargo mes vencido' : 'Recargo por día 10'} (+${recargoAplicable.toLocaleString('es-AR')})
                                            </span>
                                            <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${dayModalPagoRecargo ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                {dayModalPagoRecargo ? '✓' : ''}
                                            </span>
                                        </button>
                                    );
                                })()}
                                {dayModalPagoDias && (
                                    <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
                                        <span className="text-slate-500 text-sm">Total a cobrar</span>
                                        <span className="text-slate-800 font-bold text-xl">
                                            ${(() => {
                                                const t = tarifas.find(t => t.dias === dayModalPagoDias);
                                                if (!t) return '—';
                                                const selDate = new Date(dayModal + 'T12:00:00');
                                                const esMesPasado = selDate < new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                                                const recargoAplicable = esMesPasado ? recargoMes : (selDate.getDate() > 10 ? recargoDiez : 0);
                                                return (t.valor + (dayModalPagoRecargo ? recargoAplicable : 0)).toLocaleString('es-AR');
                                            })()}
                                        </span>
                                    </div>
                                )}
                                <button onClick={submitDayModalPago} disabled={!dayModalPagoDias || !dayModalPagoMetodo || dayModalSaving}
                                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-base transition disabled:opacity-40">
                                    {dayModalSaving ? 'Guardando...' : 'Confirmar cobro'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}
        </>
    );
}
