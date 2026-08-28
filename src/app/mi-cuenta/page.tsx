'use client';

import { useEffect, useState } from 'react';

interface Asistencia {
    _id: string;
    fecha: string;
    presente: boolean;
    actividad: string;
}

interface Pago {
    _id: string;
    mes: string;
    fechaPago: string;
    tarifa: number;
    diasMusculacion: number;
    metodoPago: string;
}

interface PlanEntrenamiento {
    fechaInicio: string | null;
    duracion: number | null;
    diasRestantes: number | null;
    terminado: boolean;
}

interface Alumno {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    asistencia: Asistencia[];
    pagos: Pago[];
    planEntrenamiento: PlanEntrenamiento;
    gimnasioId: { nombre: string; logoUrl?: string };
}

interface EjercicioAsignado {
    nombre: string;
    notas: string;
    semana1: string;
    semana2: string;
    semana3: string;
    semana4: string;
    semana5: string;
    kg: string;
    kgAlumno1: string;
    kgAlumno2: string;
    kgAlumno3: string;
    kgAlumno4: string;
    kgAlumno5: string;
    observacionesAlumno1: string;
    observacionesAlumno2: string;
    observacionesAlumno3: string;
    observacionesAlumno4: string;
    observacionesAlumno5: string;
    grupoCombo: string;
}

interface DiaAsignado {
    titulo: string;
    descripcion: string;
    bloqueActivacion: string;
    ejercicios: EjercicioAsignado[];
}

interface PlanEjAsignado {
    _id: string;
    nombre: string;
    categoria: string;
    descripcion: string;
    totalSemanas: number;
    fechaInicio?: string;
    entradaCalor: { ejercicios: { nombre: string; notas: string }[] };
    dias: DiaAsignado[];
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DIAS_SEMANA = ['Lu','Ma','Mi','Ju','Vi','Sa','Do'];

const ACTIVIDAD_DOT: Record<string, string> = {
    'Musculación': 'bg-slate-800',
    'Intermitente': 'bg-orange-400',
    'Otro': 'bg-yellow-400',
};
const COMBO_PALETTE = [
    { bg: 'rgba(244, 163, 71, 0.09)', labelColor: '#b36000', dotColor: '#f4a347' },
    { bg: 'rgba(52, 211, 153, 0.09)', labelColor: '#047857', dotColor: '#34d399' },
    { bg: 'rgba(96, 165, 250, 0.09)', labelColor: '#1d4ed8', dotColor: '#60a5fa' },
    { bg: 'rgba(167, 139, 250, 0.09)', labelColor: '#6d28d9', dotColor: '#a78bfa' },
];

const ACTIVIDAD_PILL: Record<string, string> = {
    'Musculación': 'bg-slate-100 text-slate-700 border border-slate-200',
    'Intermitente': 'bg-orange-50 text-orange-700 border border-orange-100',
    'Otro': 'bg-yellow-50 text-yellow-700 border border-yellow-100',
};

function toLocalDateKey(fechaStr: string): string {
    const d = new Date(fechaStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getCalendarDays(year: number, month: number): (number | null)[] {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay + 6) % 7;
    const days: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
}

function getInitials(nombre: string, apellido: string) {
    return `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase();
}

function IconCheck({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
    );
}

function IconX({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
    );
}

function IconClock({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
    );
}

function IconTrophy({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
        </svg>
    );
}

function IconChevron({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
    );
}

export default function MiCuentaPage() {
    const [alumno, setAlumno] = useState<Alumno | null>(null);
    const [loading, setLoading] = useState(true);
    const validTabs = ['resumen', 'historial', 'plan'] as const;
    type Tab = typeof validTabs[number];
    const getInitialTab = (): Tab => {
        if (typeof window !== 'undefined') {
            const hash = window.location.hash.replace('#', '') as Tab;
            if (validTabs.includes(hash)) return hash;
        }
        return 'resumen';
    };
    const [tab, setTab] = useState<Tab>(getInitialTab);

    const changeTab = (t: Tab) => {
        setTab(t);
        window.location.hash = t;
    };
    const [loadingPago, setLoadingPago] = useState(false);
    const [pagoResult, setPagoResult] = useState<'ok' | 'error' | 'pendiente' | null>(null);
    const [pagoError, setPagoError] = useState<string | null>(null);
    const [aliasGimnasio, setAliasGimnasio] = useState<string>('');
    const [tieneMP, setTieneMP] = useState(false);
    const [aliasCopied, setAliasCopied] = useState(false);

    const [planEj, setPlanEj] = useState<PlanEjAsignado | null>(null);
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [savingPlan, setSavingPlan] = useState(false);
    const [planSaved, setPlanSaved] = useState(false);
    const [savingEj, setSavingEj] = useState<number | null>(null);
    const [selectedSemana, setSelectedSemana] = useState(1);
    const [selectedDia, setSelectedDia] = useState(0);
    const [expandedEj, setExpandedEj] = useState<number | null>(null);

    const now = new Date();
    const [asistWeekOffset, setAsistWeekOffset] = useState(0);
    const [calYear, setCalYear] = useState(now.getFullYear());
    const [calMonth, setCalMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    async function fetchAlumno() {
        const r = await fetch('/api/alumno/me');
        const data = await r.json();
        setAlumno(data);
        return data as Alumno;
    }

    async function fetchPagoConfig() {
        try {
            const r = await fetch('/api/alumno/pago-config');
            if (!r.ok) return;
            const d = await r.json();
            setAliasGimnasio(d.alias ?? '');
            setTieneMP(!!d.tieneMP);
        } catch { /* ignorar */ }
    }

    async function fetchPlan(alumnoId: string, alumnoData?: Alumno) {
        setLoadingPlan(true);
        try {
            const r = await fetch(`/api/plan-alumno/alumno/${alumnoId}`);
            const data: PlanEjAsignado | null = r.ok ? await r.json() : null;
            setPlanEj(data);
            if (data?.fechaInicio) {
                const inicio = new Date(data.fechaInicio);
                const hoy = new Date();
                const diasTranscurridos = Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
                const semanaActual = Math.min(Math.max(Math.floor(diasTranscurridos / 7) + 1, 1), data.totalSemanas || 5);
                setSelectedSemana(semanaActual);
                if (alumnoData && data.dias.length > 0) {
                    const now = new Date();
                    const TWO_HOURS = 2 * 60 * 60 * 1000;
                    const sessionsDone = alumnoData.asistencia.filter(a => {
                        if (a.actividad !== 'Musculación' || !a.presente) return false;
                        const f = new Date(a.fecha);
                        return f >= inicio && (now.getTime() - f.getTime()) >= TWO_HOURS;
                    }).length;
                    setSelectedDia(sessionsDone % data.dias.length);
                }
            }
        } finally {
            setLoadingPlan(false);
        }
    }

    async function handleSavePlan() {
        if (!planEj || !alumno) return;
        setSavingPlan(true);
        try {
            const res = await fetch(`/api/plan-alumno/alumno/${alumno._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: planEj._id, dias: planEj.dias }),
            });
            if (res.ok) {
                setPlanSaved(true);
                setTimeout(() => setPlanSaved(false), 2500);
            }
        } finally {
            setSavingPlan(false);
        }
    }

    async function handleSaveEjercicio(ejIdx: number) {
        if (!planEj || !alumno) return;
        setSavingEj(ejIdx);
        try {
            const res = await fetch(`/api/plan-alumno/alumno/${alumno._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: planEj._id, dias: planEj.dias }),
            });
            if (res.ok) {
                setExpandedEj(null);
            }
        } finally {
            setSavingEj(null);
        }
    }

    async function handlePagarMercadoPago() {
        setPagoError(null);
        setLoadingPago(true);
        try {
            const res = await fetch('/api/pagos/mp/crear-preferencia', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) {
                setPagoError(data.error ?? 'No se pudo iniciar el pago.');
                return;
            }
            if (data.alumnoId) sessionStorage.setItem('mp_alumno_id', data.alumnoId);
            const a = document.createElement('a');
            a.href = data.init_point;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch {
            setPagoError('Error de conexión. Intentá de nuevo.');
        } finally {
            setLoadingPago(false);
        }
    }

    function updateEjAlumno(eIdx: number, field: string, value: string) {
        setPlanEj((prev) => {
            if (!prev) return prev;
            const dias = prev.dias.map((d, di) => {
                if (di !== selectedDia) return d;
                return {
                    ...d,
                    ejercicios: d.ejercicios.map((e, ei) => ei === eIdx ? { ...e, [field]: value } : e),
                };
            });
            return { ...prev, dias };
        });
    }

    function getSemanaField(ej: EjercicioAsignado, sem: number): string {
        const map: Record<number, keyof EjercicioAsignado> = {
            1: 'semana1', 2: 'semana2', 3: 'semana3', 4: 'semana4', 5: 'semana5',
        };
        return (ej[map[sem]] as string) || '';
    }

    function getCurrentWeekLabel(plan: PlanEjAsignado): string {
        if (!plan.fechaInicio) return '';
        const inicio = new Date(plan.fechaInicio);
        const hoy = new Date();
        const dias = Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
        const sem = Math.min(Math.max(Math.floor(dias / 7) + 1, 1), plan.totalSemanas || 5);
        return sem.toString();
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const pago = params.get('pago');
        const paymentId = params.get('payment_id');

        if (pago === 'ok' || pago === 'error' || pago === 'pendiente') {
            setPagoResult(pago as 'ok' | 'error' | 'pendiente');
            window.history.replaceState({}, '', '/mi-cuenta');
            if (pago === 'ok' && paymentId) {
                fetch(`/api/pagos/mp/verificar?payment_id=${paymentId}`)
                    .then(r => r.json())
                    .then(data => { if (data.ok) fetchAlumno().catch(() => {}); })
                    .catch(() => {});
            }
        }

        fetchAlumno()
            .then(data => { if (data?._id) fetchPlan(data._id, data); })
            .catch(() => {})
            .finally(() => setLoading(false));
        fetchPagoConfig();

        const onVisible = () => {
            if (document.visibilityState === 'visible') fetchAlumno().catch(() => {});
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="border-t-2 border-r-2 border-emerald-400 rounded-full w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!alumno) {
        return <div className="text-slate-400 text-center py-16 text-sm">Error al cargar tus datos.</div>;
    }

    const mesActual = MESES[now.getMonth()];
    const anioActual = now.getFullYear();

    const asistenciasMap: Record<string, Asistencia[]> = {};
    alumno.asistencia.filter(a => a.presente).forEach(a => {
        const key = toLocalDateKey(a.fecha);
        if (!asistenciasMap[key]) asistenciasMap[key] = [];
        asistenciasMap[key].push(a);
    });

    const pagosMap: Record<string, Pago[]> = {};
    alumno.pagos.forEach(p => {
        const key = toLocalDateKey(p.fechaPago);
        if (!pagosMap[key]) pagosMap[key] = [];
        pagosMap[key].push(p);
    });

    const planInicioKey = planEj?.fechaInicio ? toLocalDateKey(planEj.fechaInicio) : null;
    const planEndKey = planEj?.fechaInicio && planEj?.totalSemanas
        ? (() => {
            const end = new Date(planEj.fechaInicio);
            end.setDate(end.getDate() + planEj.totalSemanas * 7 - 1);
            return toLocalDateKey(end.toISOString());
        })()
        : null;

    const asistenciasEsteMes = alumno.asistencia.filter(a => {
        const f = new Date(a.fecha);
        return a.presente && f.getMonth() === now.getMonth() && f.getFullYear() === anioActual;
    });
    const pagoEsteMes = alumno.pagos.find(p => p.mes.toLowerCase() === mesActual);
    const plan = alumno.planEntrenamiento;
    const tienePlan = plan?.fechaInicio && !plan?.terminado;
    let asistenciasEnPlan = 0;
    if (tienePlan && plan.fechaInicio) {
        const fechaInicio = new Date(plan.fechaInicio);
        asistenciasEnPlan = alumno.asistencia.filter(a =>
            a.actividad === 'Musculación' && a.presente && new Date(a.fecha) >= fechaInicio
        ).length;
    }

    const calDays = getCalendarDays(calYear, calMonth);
    const initials = getInitials(alumno.nombre, alumno.apellido);
    const gimnasioNombre = (alumno.gimnasioId as any)?.nombre ?? '';
    const isSporttime = gimnasioNombre.toLowerCase().includes('sport');

    function prevMonth() {
        setSelectedDay(null);
        if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
        else setCalMonth(m => m - 1);
    }
    function nextMonth() {
        setSelectedDay(null);
        if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
        else setCalMonth(m => m + 1);
    }

    const selectedAsistencias = selectedDay ? (asistenciasMap[selectedDay] || []) : [];
    const selectedPagos = selectedDay ? (pagosMap[selectedDay] || []) : [];

    // Week-navigable attendance
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const planInicioDate = planEj?.fechaInicio ? new Date(planEj.fechaInicio) : null;
    // Always use calendar week (Mon–Sun), never aligned to plan start date
    const todayMonday = new Date(now);
    todayMonday.setDate(todayMonday.getDate() - ((todayMonday.getDay() + 6) % 7));
    todayMonday.setHours(0, 0, 0, 0);
    const currentCalWeekMs = todayMonday.getTime();

    const weekStartMs = currentCalWeekMs - asistWeekOffset * msPerWeek;
    const weekEndMs = weekStartMs + msPerWeek;
    const weekStart = new Date(weekStartMs);
    const weekEnd = new Date(weekEndMs);

    // Plan week number = how many calendar weeks since the Monday of plan start week
    let planWeekNum: number | null = null;
    if (planInicioDate) {
        const planMonday = new Date(planInicioDate);
        planMonday.setDate(planMonday.getDate() - ((planMonday.getDay() + 6) % 7));
        planMonday.setHours(0, 0, 0, 0);
        const n = Math.floor((weekStartMs - planMonday.getTime()) / msPerWeek) + 1;
        planWeekNum = n >= 1 ? n : null;
    }

    const asistenciasEnSemana = [...alumno.asistencia]
        .filter(a => { const d = new Date(a.fecha); return a.presente && d >= weekStart && d < weekEnd; })
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    const musculacionEnSemana = asistenciasEnSemana.filter(a => a.actividad === 'Musculación').length;
    const diasPorSemana = planEj?.dias?.length ?? 0;

    return (
        <div className="max-w-lg mx-auto pt-8 pb-12 px-4">

            {/* ── PAGO RESULT BANNER ── */}
            {pagoResult && (
                <div className={`mb-4 rounded-2xl px-4 py-3 flex items-center gap-3 ${
                    pagoResult === 'ok'
                        ? 'bg-emerald-50 border border-emerald-200'
                        : pagoResult === 'pendiente'
                        ? 'bg-amber-50 border border-amber-200'
                        : 'bg-red-50 border border-red-200'
                }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        pagoResult === 'ok' ? 'bg-emerald-100' : pagoResult === 'pendiente' ? 'bg-amber-100' : 'bg-red-100'
                    }`}>
                        {pagoResult === 'ok' && <IconCheck className="w-4 h-4 text-emerald-600" />}
                        {pagoResult === 'pendiente' && <IconClock className="w-4 h-4 text-amber-600" />}
                        {pagoResult === 'error' && <IconX className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="flex-1">
                        <p className={`text-sm font-bold ${
                            pagoResult === 'ok' ? 'text-emerald-700' : pagoResult === 'pendiente' ? 'text-amber-700' : 'text-red-700'
                        }`}>
                            {pagoResult === 'ok' ? '¡Pago recibido!' : pagoResult === 'pendiente' ? 'Pago en proceso' : 'El pago no se completó'}
                        </p>
                        <p className={`text-xs mt-0.5 ${
                            pagoResult === 'ok' ? 'text-emerald-600' : pagoResult === 'pendiente' ? 'text-amber-600' : 'text-red-500'
                        }`}>
                            {pagoResult === 'ok'
                                ? 'Tu cuota quedó registrada. ¡Gracias!'
                                : pagoResult === 'pendiente'
                                ? 'Tu pago está siendo procesado. Se registrará en breve.'
                                : 'Podés intentarlo de nuevo cuando quieras.'}
                        </p>
                    </div>
                    <button onClick={() => setPagoResult(null)} className="text-slate-400 hover:text-slate-600 p-1">
                        <IconX className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── PROFILE BANNER ── */}
            <div className="relative bg-[#111] rounded-3xl px-5 pt-6 pb-5 mb-5 overflow-hidden">
                <div className="pointer-events-none absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/[0.03]" />
                <div className={`pointer-events-none absolute -bottom-8 -right-2 w-24 h-24 rounded-full ${isSporttime ? 'bg-[#d1e08b]/10' : 'bg-emerald-500/10'}`} />

                <div className="flex items-center gap-4 relative">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${isSporttime ? 'bg-[#f4a347]' : 'bg-emerald-500'}`}>
                        <span className="text-white font-bold text-xl tracking-wide">{initials}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-white font-bold text-lg leading-tight truncate">
                            {alumno.nombre} {alumno.apellido}
                        </h1>
                        <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                            </svg>
                            <span className="text-slate-400 text-xs truncate">{gimnasioNombre}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-2 flex-wrap relative">
                    <span className="ring-1 ring-white/20 bg-white/10 text-slate-300 text-xs font-medium px-3 py-1 rounded-full">
                        DNI {alumno.dni}
                    </span>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        pagoEsteMes
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                    }`}>
                        {pagoEsteMes ? 'Cuota al día' : 'Cuota pendiente'}
                    </span>
                </div>
            </div>

            {/* ── TAB SWITCHER ── */}
            <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-5">
                {(['resumen', 'historial', 'plan'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => changeTab(t)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            tab === t
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        {t === 'resumen' ? 'Resumen' : t === 'historial' ? 'Historial' : 'Mi Plan'}
                    </button>
                ))}
            </div>

            {/* ── RESUMEN ── */}
            {tab === 'resumen' && (
                <div className="space-y-4">

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
                                <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                </svg>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 leading-none">{asistenciasEsteMes.length}</p>
                            <p className="text-slate-400 text-xs mt-1.5 font-medium capitalize">en {mesActual}</p>
                        </div>

                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${
                                pagoEsteMes ? 'bg-emerald-50' : 'bg-red-50'
                            }`}>
                                <svg className={`w-4 h-4 ${pagoEsteMes ? 'text-emerald-600' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                                </svg>
                            </div>
                            <p className={`text-sm font-bold leading-none ${pagoEsteMes ? 'text-emerald-600' : 'text-red-500'}`}>
                                {pagoEsteMes ? 'Al día' : 'Pendiente'}
                            </p>
                            {pagoEsteMes ? (
                                <p className="text-slate-700 text-sm font-bold mt-1.5">
                                    ${pagoEsteMes.tarifa.toLocaleString('es-AR')}
                                </p>
                            ) : (
                                <p className="text-slate-400 text-xs mt-1.5 font-medium capitalize">{mesActual}</p>
                            )}
                        </div>
                    </div>

                    {/* Opciones de pago — solo si cuota pendiente */}
                    {!pagoEsteMes && (aliasGimnasio || tieneMP) && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            {/* Alias / transferencia */}
                            {aliasGimnasio && (
                                <div className="px-5 py-4 border-b border-slate-100">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Transferí tu cuota</p>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-slate-800 font-bold text-base truncate">{aliasGimnasio}</span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(aliasGimnasio);
                                                setAliasCopied(true);
                                                setTimeout(() => setAliasCopied(false), 2000);
                                            }}
                                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition text-slate-600 text-xs font-semibold"
                                        >
                                            {aliasCopied ? (
                                                <>
                                                    <IconCheck className="w-3.5 h-3.5 text-emerald-500" />
                                                    <span className="text-emerald-600">Copiado</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                                                    </svg>
                                                    Copiar alias
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* MercadoPago Checkout Pro */}
                            {tieneMP && (
                                <div className="px-5 py-4">
                                    {pagoError && (
                                        <p className="text-red-500 text-xs mb-3 text-center font-medium">{pagoError}</p>
                                    )}
                                    <button
                                        onClick={handlePagarMercadoPago}
                                        disabled={loadingPago}
                                        className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-[#009EE3] hover:bg-[#0088CC] active:bg-[#007AB8] disabled:opacity-60 transition-colors"
                                    >
                                        {loadingPago ? (
                                            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.27c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.95z"/>
                                                </svg>
                                                <span className="text-white font-bold text-sm">Pagar con Mercado Pago</span>
                                            </>
                                        )}
                                    </button>
                                    <p className="text-center text-slate-400 text-[11px] mt-2">Te redirigimos al checkout seguro de MP</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Plan de entrenamiento */}
                    {tienePlan && (
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                                        </svg>
                                    </div>
                                    <span className="text-slate-800 text-sm font-semibold">Plan activo</span>
                                </div>
                                <span className="text-xs text-slate-400 font-medium">{asistenciasEnPlan} / {plan.duracion} sesiones</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                                <div
                                    className="bg-emerald-500 h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min((asistenciasEnPlan / (plan.duracion || 1)) * 100, 100)}%` }}
                                />
                            </div>
                            <p className="text-slate-400 text-xs">
                                {plan.diasRestantes != null ? `${plan.diasRestantes} sesiones restantes` : 'En curso'}
                            </p>
                        </div>
                    )}

                    {/* Plan completado */}
                    {plan?.terminado && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <IconTrophy className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-emerald-800 font-bold text-sm">¡Plan completado!</p>
                                <p className="text-emerald-600 text-xs mt-0.5">Completaste todas las sesiones del plan.</p>
                            </div>
                        </div>
                    )}

                    {/* Asistencias por semana navegable */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {/* Nav header */}
                        <div className="px-3 pt-3 pb-2.5 border-b border-slate-50 flex items-center justify-between gap-2">
                            <button
                                onClick={() => setAsistWeekOffset(o => o + 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors flex-shrink-0"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                                </svg>
                            </button>
                            <div className="text-center min-w-0">
                                <p className="text-slate-800 text-sm font-bold leading-tight">
                                    {planWeekNum && planWeekNum >= 1 ? `Semana ${planWeekNum} del plan` : 'Asistencias'}
                                </p>
                                <p className="text-slate-400 text-xs mt-0.5">
                                    {weekStart.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} — {new Date(weekEndMs - 1).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                </p>
                            </div>
                            <button
                                onClick={() => setAsistWeekOffset(o => Math.max(0, o - 1))}
                                disabled={asistWeekOffset === 0}
                                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors flex-shrink-0 disabled:opacity-30"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                </svg>
                            </button>
                        </div>

                        {/* Entries */}
                        {asistenciasEnSemana.length === 0 ? (
                            <div className="px-4 py-7 text-center">
                                <p className="text-slate-400 text-sm">Sin asistencias esta semana.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {asistenciasEnSemana.map(a => {
                                    const d = new Date(a.fecha);
                                    return (
                                        <div key={a._id} className="flex items-center gap-3 px-4 py-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex flex-col items-center justify-center flex-shrink-0 border border-slate-100">
                                                <span className="text-slate-800 font-bold text-sm leading-none">{d.getDate()}</span>
                                                <span className="text-slate-400 text-[10px] font-medium leading-none mt-0.5">{MESES_CORTO[d.getMonth()]}</span>
                                            </div>
                                            <div className="flex-1 flex items-center gap-2 flex-wrap">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${ACTIVIDAD_PILL[a.actividad] || 'bg-slate-100 text-slate-600'}`}>
                                                    {a.actividad}
                                                </span>
                                                <span className="text-xs text-slate-400 font-medium">
                                                    {d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Plan progress bar for this week */}
                        {diasPorSemana > 0 && planWeekNum && planWeekNum >= 1 && (
                            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                                <div className="flex gap-1 flex-1">
                                    {Array.from({ length: diasPorSemana }, (_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 flex-1 rounded-full ${i < musculacionEnSemana ? 'bg-emerald-400' : 'bg-slate-200'}`}
                                        />
                                    ))}
                                </div>
                                <span className="text-xs text-slate-400 font-medium shrink-0">{musculacionEnSemana}/{diasPorSemana}</span>
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* ── HISTORIAL ── */}
            {tab === 'historial' && (
                <div className="space-y-4">

                    {/* Calendario */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={prevMonth}
                                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                                </svg>
                            </button>
                            <span className="text-slate-800 font-bold capitalize text-sm">
                                {MESES[calMonth]} {calYear}
                            </span>
                            <button
                                onClick={nextMonth}
                                disabled={calYear === now.getFullYear() && calMonth === now.getMonth()}
                                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-30"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-7 mb-1">
                            {DIAS_SEMANA.map(d => (
                                <div key={d} className="text-center text-slate-400 text-xs font-semibold py-1">{d}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-y-1">
                            {calDays.map((day, i) => {
                                if (!day) return <div key={`e-${i}`} />;

                                const key = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                                const asists = asistenciasMap[key] || [];
                                const pagos = pagosMap[key] || [];
                                const isPlanStart = key === planInicioKey;
                                const isPlanDay = !isPlanStart && !!planInicioKey && !!planEndKey
                                    && key >= planInicioKey && key <= planEndKey;
                                const isToday = key === toLocalDateKey(now.toISOString());
                                const isSelected = key === selectedDay;
                                const hasData = asists.length > 0 || pagos.length > 0 || isPlanStart;

                                return (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedDay(isSelected ? null : key)}
                                        className={`relative flex flex-col items-center py-1.5 rounded-xl transition-all ${
                                            isSelected
                                                ? 'bg-[#111]'
                                                : isPlanStart
                                                ? 'bg-violet-100 hover:bg-violet-200'
                                                : isPlanDay
                                                ? 'hover:bg-violet-100'
                                                : hasData
                                                ? 'hover:bg-slate-50'
                                                : 'cursor-default'
                                        }`}
                                        style={isPlanDay && !isSelected ? { background: 'rgba(109,40,217,0.07)' } : undefined}
                                    >
                                        <span className={`text-xs font-semibold leading-none mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                                            isSelected
                                                ? 'text-white'
                                                : isToday
                                                ? 'bg-[#111] text-white'
                                                : isPlanStart
                                                ? 'bg-violet-600 text-white'
                                                : hasData
                                                ? 'text-slate-800'
                                                : 'text-slate-400'
                                        }`}>
                                            {day}
                                        </span>
                                        <div className="flex gap-0.5 flex-wrap justify-center max-w-[28px]">
                                            {asists.map((a, idx) => (
                                                <span key={idx} className={`w-1.5 h-1.5 rounded-full ${ACTIVIDAD_DOT[a.actividad] || 'bg-slate-300'}`} />
                                            ))}
                                            {pagos.length > 0 && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-800" />
                                <span className="text-slate-400 text-xs">Musculación</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-orange-400" />
                                <span className="text-slate-400 text-xs">Intermitente</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                                <span className="text-slate-400 text-xs">Otro</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-slate-400 text-xs">Pago</span>
                            </div>
                            {planInicioKey && (
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-violet-600" />
                                    <span className="text-slate-400 text-xs">Inicio de plan</span>
                                </div>
                            )}
                            {planEndKey && (
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(109,40,217,0.15)' }} />
                                    <span className="text-slate-400 text-xs">Días de plan</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detalle día */}
                    {selectedDay && (selectedAsistencias.length > 0 || selectedPagos.length > 0 || selectedDay === planInicioKey) && (
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
                            <h3 className="text-slate-800 font-bold text-sm capitalize">
                                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-AR', {
                                    weekday: 'long', day: 'numeric', month: 'long'
                                })}
                            </h3>

                            {selectedDay === planInicioKey && (
                                <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5">
                                    <span className="w-2 h-2 rounded-full bg-violet-600 flex-shrink-0" />
                                    <span className="text-violet-700 text-sm font-semibold">Inicio de plan — {planEj?.nombre}</span>
                                </div>
                            )}

                            {selectedAsistencias.map(a => (
                                <div key={a._id} className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ACTIVIDAD_DOT[a.actividad] || 'bg-slate-300'}`} />
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${ACTIVIDAD_PILL[a.actividad] || 'bg-slate-100 text-slate-600'}`}>
                                        {a.actividad}
                                    </span>
                                </div>
                            ))}

                            {selectedPagos.map(p => (
                                <div key={p._id} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                        <span className="text-emerald-700 text-sm font-semibold capitalize">Pago — {p.mes}</span>
                                    </div>
                                    <span className="text-emerald-700 font-bold text-sm">
                                        ${p.tarifa.toLocaleString('es-AR')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Resumen del mes */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
                            <p className="text-3xl font-bold text-slate-900">
                                {Object.entries(asistenciasMap)
                                    .filter(([key]) => key.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`))
                                    .reduce((sum, [, a]) => sum + a.length, 0)}
                            </p>
                            <p className="text-slate-400 text-xs mt-1.5 font-medium capitalize">asistencias en {MESES_CORTO[calMonth]}</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
                            <p className="text-3xl font-bold text-slate-900">
                                ${Object.entries(pagosMap)
                                    .filter(([key]) => key.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`))
                                    .reduce((sum, [, ps]) => sum + ps.reduce((s, p) => s + p.tarifa, 0), 0)
                                    .toLocaleString('es-AR')}
                            </p>
                            <p className="text-slate-400 text-xs mt-1.5 font-medium capitalize">pagado en {MESES_CORTO[calMonth]}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MI PLAN ── */}
            {tab === 'plan' && (
                <div className="space-y-3">
                    {loadingPlan && (
                        <div className="flex justify-center py-12">
                            <div className="border-t-2 border-r-2 border-emerald-400 rounded-full w-8 h-8 animate-spin" />
                        </div>
                    )}

                    {!loadingPlan && !planEj && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center mt-2">
                            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                            </div>
                            <p className="text-slate-600 font-semibold mb-1">Sin plan asignado</p>
                            <p className="text-slate-400 text-sm">Tu entrenador todavía no te asignó un plan de entrenamiento.</p>
                        </div>
                    )}

                    {!loadingPlan && planEj && (() => {
                        const totalSem = planEj.totalSemanas || 5;
                        const currentWeekStr = getCurrentWeekLabel(planEj);
                        const currentWeekNum = parseInt(currentWeekStr) || 1;
                        const dia = planEj.dias[selectedDia];
                        const totalSesiones = totalSem * planEj.dias.length;

                        // Build combo color index map for current día
                        const comboIdx: Record<string, number> = {};
                        let nextComboIdx = 0;
                        (dia?.ejercicios ?? []).forEach((e: EjercicioAsignado) => {
                            if (e.grupoCombo && comboIdx[e.grupoCombo] === undefined) {
                                comboIdx[e.grupoCombo] = nextComboIdx++;
                            }
                        });

                        // Current day index: only count sessions registered 2+ hours ago
                        const planInicio = planEj.fechaInicio ? new Date(planEj.fechaInicio) : null;
                        const nowTs = Date.now();
                        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
                        const sessionsDone = planInicio && alumno
                            ? alumno.asistencia.filter(a => {
                                if (a.actividad !== 'Musculación' || !a.presente) return false;
                                const f = new Date(a.fecha);
                                return f >= planInicio && (nowTs - f.getTime()) >= TWO_HOURS_MS;
                              }).length
                            : 0;
                        const currentDayIdx = planEj.dias.length > 0 ? sessionsDone % planEj.dias.length : 0;

                        return (
                            <>
                                {/* Plan header */}
                                <div className="bg-[#111] rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">{planEj.categoria}</p>
                                        <h2 className="text-white font-bold text-base truncate">{planEj.nombre}</h2>
                                        <p className="text-slate-500 text-xs mt-0.5">{totalSesiones} sesiones · {totalSem} semanas · {planEj.dias.length} días/sem</p>
                                    </div>
                                    <div className={`shrink-0 text-center rounded-xl px-3 py-2 ${isSporttime ? 'bg-[#d1e08b]/20' : 'bg-emerald-500/20'}`}>
                                        <p className={`text-xs font-bold uppercase tracking-wide ${isSporttime ? 'text-[#d1e08b]' : 'text-emerald-400'}`}>Semana</p>
                                        <p className={`font-bold text-xl leading-none ${isSporttime ? 'text-[#edf5bc]' : 'text-emerald-300'}`}>{currentWeekNum}</p>
                                        <p className={`text-xs ${isSporttime ? 'text-[#b8cc60]' : 'text-emerald-500'}`}>de {totalSem}</p>
                                    </div>
                                </div>

                                {/* Week selector */}
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">Semana</p>
                                    <div className="flex gap-1.5">
                                        {Array.from({ length: totalSem }, (_, i) => i + 1).map((sem) => {
                                            const isCurrent = sem === currentWeekNum;
                                            const isSelected = sem === selectedSemana;
                                            const isPast = sem < currentWeekNum;
                                            return (
                                                <button
                                                    key={sem}
                                                    onClick={() => setSelectedSemana(sem)}
                                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all relative overflow-hidden ${
                                                        isSelected
                                                            ? 'bg-[#111] text-white shadow-sm'
                                                            : isPast
                                                            ? 'bg-slate-50 text-slate-400'
                                                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {sem}
                                                    {isPast && (
                                                        <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center pointer-events-none">
                                                            <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                            </svg>
                                                        </span>
                                                    )}
                                                    {isCurrent && (
                                                        <span className={`absolute -top-1 -right-0.5 w-2 h-2 rounded-full border border-white ${isSporttime ? 'bg-[#f4a347]' : 'bg-emerald-500'}`} />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {selectedSemana === 5 && (
                                        <p className="text-center text-xs text-slate-400 mt-2 font-medium">Semana de descarga</p>
                                    )}
                                </div>

                                {/* Day selector */}
                                <div className="flex gap-1.5">
                                    {planEj.dias.map((d, i) => {
                                        const isDayDone = selectedSemana < currentWeekNum
                                            || (selectedSemana === currentWeekNum && i < currentDayIdx);
                                        const isCurrentDay = selectedSemana === currentWeekNum && i === currentDayIdx;
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => { setSelectedDia(i); setExpandedEj(null); }}
                                                className={`relative flex-1 h-14 flex flex-col items-center justify-center rounded-2xl transition-all border overflow-hidden ${
                                                    selectedDia === i
                                                        ? 'bg-[#111] text-white border-slate-900 shadow-sm'
                                                        : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'
                                                }`}
                                            >
                                                <span className="text-sm font-bold leading-none">{`Día ${i + 1}`}</span>
                                                {isDayDone && (
                                                    <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center pointer-events-none">
                                                        <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                        </svg>
                                                    </span>
                                                )}
                                                {isCurrentDay && !isDayDone && (
                                                    <span className={`absolute top-1 right-1 w-2 h-2 rounded-full border border-white ${isSporttime ? 'bg-[#f4a347]' : 'bg-emerald-500'}`} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Bloque activación */}
                                {dia?.bloqueActivacion && (
                                    <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                                        <p className="text-xs font-bold text-amber-700 mb-1">Bloque de activación</p>
                                        <p className="text-sm text-amber-800 leading-snug">{dia.bloqueActivacion}</p>
                                    </div>
                                )}

                                {/* Exercise table */}
                                {dia && (
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                        {/* Header */}
                                        <div className="grid grid-cols-[1fr_96px_68px] border-b border-slate-100">
                                            <div className="px-4 py-2.5">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ejercicio</p>
                                            </div>
                                            <div className="px-2 py-2.5 text-center border-l border-slate-100">
                                                <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">Sem {selectedSemana}</p>
                                            </div>
                                            <div className="px-2 py-2.5 text-center border-l border-slate-100">
                                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Mis KG</p>
                                            </div>
                                        </div>

                                        {/* Rows */}
                                        <div className="divide-y divide-slate-50">
                                            {dia.ejercicios.map((ej, eIdx) => {
                                                const semVal = getSemanaField(ej, selectedSemana);
                                                const isExpanded = expandedEj === eIdx;
                                                const ci = ej.grupoCombo ? (comboIdx[ej.grupoCombo] ?? -1) : -1;
                                                const combo = ci >= 0 ? COMBO_PALETTE[ci % COMBO_PALETTE.length] : null;
                                                const prevEj = dia.ejercicios[eIdx - 1];
                                                const isFirstInCombo = combo && (!prevEj?.grupoCombo || prevEj.grupoCombo !== ej.grupoCombo);
                                                return (
                                                    <div
                                                        key={eIdx}
                                                        style={combo ? { backgroundColor: combo.bg } : undefined}
                                                    >
                                                        <button
                                                            onClick={() => setExpandedEj(isExpanded ? null : eIdx)}
                                                            className="w-full grid grid-cols-[1fr_96px_68px] text-left hover:bg-slate-50 transition-colors active:bg-slate-100"
                                                        >
                                                            <div className="px-4 py-3 flex items-center gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    {isFirstInCombo && combo && (
                                                                        <div className="flex items-center gap-1 mb-0.5">
                                                                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: combo.dotColor }} />
                                                                            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: combo.labelColor }}>Combinado</span>
                                                                        </div>
                                                                    )}
                                                                    <p className="text-sm font-semibold text-slate-800 leading-tight">{ej.nombre}</p>
                                                                    {ej.kg && ej.kg !== '-' && (
                                                                        <p className="text-sm font-bold text-red-500 mt-0.5">{ej.kg} kg</p>
                                                                    )}
                                                                    {(() => {
                                                                        const obs = (ej[`observacionesAlumno${selectedSemana}` as keyof EjercicioAsignado] as string) || '';
                                                                        return obs ? <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{obs}</p> : null;
                                                                    })()}
                                                                </div>
                                                                <IconChevron className={`w-3.5 h-3.5 text-slate-300 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                            </div>
                                                            <div className="px-2 py-3 border-l border-slate-100 flex items-center justify-center">
                                                                <span className={`text-xs font-bold text-center leading-tight ${semVal ? 'text-slate-800' : 'text-slate-300'}`}>
                                                                    {semVal || '—'}
                                                                </span>
                                                            </div>
                                                            <div className="px-2 py-3 border-l border-slate-100 flex items-center justify-center">
                                                                {(() => {
                                                                    const kgVal = (ej[`kgAlumno${selectedSemana}` as keyof EjercicioAsignado] as string) || '';
                                                                    return (
                                                                        <span className={`text-sm font-bold ${kgVal ? 'text-emerald-600' : 'text-slate-200'}`}>
                                                                            {kgVal || '—'}
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </button>

                                                        {/* Expanded: input mis KG + observaciones */}
                                                        {isExpanded && (
                                                            <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100 space-y-3">
                                                                {ej.notas && (
                                                                    <p className="text-xs text-slate-500 italic">{ej.notas}</p>
                                                                )}
                                                                <div className="flex flex-col gap-2">
                                                                    <div>
                                                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Mis KG</label>
                                                                        <input
                                                                            type="number"
                                                                            inputMode="numeric"
                                                                            value={(ej[`kgAlumno${selectedSemana}` as keyof EjercicioAsignado] as string) || ''}
                                                                            onChange={(e) => updateEjAlumno(eIdx, `kgAlumno${selectedSemana}`, e.target.value)}
                                                                            className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Observaciones</label>
                                                                        <input
                                                                            type="text"
                                                                            value={(ej[`observacionesAlumno${selectedSemana}` as keyof EjercicioAsignado] as string) || ''}
                                                                            onChange={(e) => updateEjAlumno(eIdx, `observacionesAlumno${selectedSemana}`, e.target.value)}
                                                                            className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleSaveEjercicio(eIdx)}
                                                                    disabled={savingEj === eIdx}
                                                                    className="w-full py-2.5 text-sm font-bold rounded-xl transition-all disabled:opacity-60 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white"
                                                                >
                                                                    {savingEj === eIdx ? 'Guardando...' : 'Guardar'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
