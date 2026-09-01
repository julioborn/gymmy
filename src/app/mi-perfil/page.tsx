'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface Asistencia {
    _id: string;
    fecha: string;
    presente: boolean;
    actividad: string;
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
    pagos: { _id: string; mes: string; fechaPago: string; tarifa: number; diasMusculacion: number; metodoPago: string }[];
    planEntrenamiento: PlanEntrenamiento;
}

interface EjercicioAsignado {
    nombre: string;
    notas: string;
    semana1: string; semana2: string; semana3: string; semana4: string; semana5: string;
    kg: string;
    kgAlumno1: string; kgAlumno2: string; kgAlumno3: string; kgAlumno4: string; kgAlumno5: string;
    observacionesAlumno1: string; observacionesAlumno2: string; observacionesAlumno3: string;
    observacionesAlumno4: string; observacionesAlumno5: string;
    grupoCombo: string;
}

interface DiaAsignado {
    titulo: string;
    descripcion: string;
    bloqueActivacion: string;
    ejercicios: EjercicioAsignado[];
}

interface PlanEj {
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
    'Musculación': 'bg-blue-600',
    'Intermitente': 'bg-orange-400',
    'Otro': 'bg-yellow-400',
};
const ACTIVIDAD_PILL: Record<string, string> = {
    'Musculación': 'bg-blue-50 text-blue-700 border border-blue-100',
    'Intermitente': 'bg-orange-50 text-orange-700 border border-orange-100',
    'Otro': 'bg-yellow-50 text-yellow-700 border border-yellow-100',
};
const COMBO_PALETTE = [
    { bg: 'rgba(244,163,71,0.07)', labelColor: '#d97706', dotColor: '#d97706' },
    { bg: 'rgba(16,185,129,0.07)', labelColor: '#059669', dotColor: '#059669' },
    { bg: 'rgba(59,130,246,0.07)', labelColor: '#2563eb', dotColor: '#2563eb' },
    { bg: 'rgba(139,92,246,0.07)', labelColor: '#7c3aed', dotColor: '#7c3aed' },
];

function toLocalDateKey(fechaStr: string): string {
    const d = new Date(fechaStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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

function IconChevron({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
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

export default function MiPerfilPage() {
    const { data: session } = useSession();
    const myId = session?.user?.id;
    const myNombre = session?.user?.nombre ?? '';
    const myApellido = session?.user?.apellido ?? '';
    const myRole = session?.user?.role ?? 'profesor';

    const [alumnoId, setAlumnoId] = useState<string | null>(null);
    const [alumno, setAlumno] = useState<Alumno | null>(null);
    const [loading, setLoading] = useState(true);
    const [creando, setCreando] = useState(false);

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
    const changeTab = (t: Tab) => { setTab(t); window.location.hash = t; };

    const [planEj, setPlanEj] = useState<PlanEj | null>(null);
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [savingEj, setSavingEj] = useState<number | null>(null);
    const [selectedSemana, setSelectedSemana] = useState(1);
    const [selectedDia, setSelectedDia] = useState(0);
    const [expandedEj, setExpandedEj] = useState<number | null>(null);

    const [acento, setAcento] = useState('#111111');
    const [acento2, setAcento2] = useState('#10b981');
    const [showCalentamiento, setShowCalentamiento] = useState(false);

    const now = new Date();
    const [asistWeekOffset, setAsistWeekOffset] = useState(0);
    const [calYear, setCalYear] = useState(now.getFullYear());
    const [calMonth, setCalMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    const initials = `${myNombre[0] ?? ''}${myApellido[0] ?? ''}`.toUpperCase() || '?';
    const roleLabel = myRole === 'profesor' ? 'Profesor/a' : myRole === 'admin' ? 'Admin' : myRole === 'dueño' ? 'Dueño/a' : myRole;

    async function fetchAlumnoData(id: string) {
        const r = await fetch(`/api/alumnos/${id}`);
        if (!r.ok) return null;
        return await r.json() as Alumno;
    }

    async function fetchPlan(id: string, alumnoData?: Alumno) {
        setLoadingPlan(true);
        try {
            const r = await fetch(`/api/plan-alumno/alumno/${id}`);
            const data: PlanEj | null = r.ok ? await r.json() : null;
            setPlanEj(data);
            if (data?.fechaInicio && alumnoData && data.dias.length > 0) {
                const inicio = new Date(data.fechaInicio);
                const totalSemanas = data.totalSemanas || 5;
                const sessionsDone = alumnoData.asistencia.filter(a =>
                    a.actividad === 'Musculación' && a.presente && new Date(a.fecha) >= inicio
                ).length;
                const diasLen = data.dias.length;
                setSelectedDia(sessionsDone % diasLen);
                setSelectedSemana(Math.min(Math.floor(sessionsDone / diasLen) + 1, totalSemanas));
            }
        } finally {
            setLoadingPlan(false);
        }
    }

    async function crearAlumnoVinculado() {
        if (!myId) return;
        setCreando(true);
        try {
            const r = await fetch(`/api/empleados/${myId}/alumno-vinculado`, { method: 'POST' });
            const data = await r.json();
            if (data.alumnoId) {
                setAlumnoId(data.alumnoId);
                const alumnoData = await fetchAlumnoData(data.alumnoId);
                setAlumno(alumnoData);
                await fetchPlan(data.alumnoId, alumnoData ?? undefined);
            }
        } finally {
            setCreando(false);
        }
    }

    function updateEjAlumno(eIdx: number, field: string, value: string) {
        setPlanEj((prev) => {
            if (!prev) return prev;
            const dias = prev.dias.map((d, di) => {
                if (di !== selectedDia) return d;
                return { ...d, ejercicios: d.ejercicios.map((e, ei) => ei === eIdx ? { ...e, [field]: value } : e) };
            });
            return { ...prev, dias };
        });
    }

    async function handleSaveEjercicio(eIdx: number) {
        if (!planEj || !alumnoId) return;
        setSavingEj(eIdx);
        try {
            const res = await fetch(`/api/plan-alumno/alumno/${alumnoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: planEj._id, dias: planEj.dias }),
            });
            if (res.ok) setExpandedEj(null);
        } finally {
            setSavingEj(null);
        }
    }

    function getSemanaField(ej: EjercicioAsignado, sem: number): string {
        const map: Record<number, keyof EjercicioAsignado> = {
            1: 'semana1', 2: 'semana2', 3: 'semana3', 4: 'semana4', 5: 'semana5',
        };
        return (ej[map[sem]] as string) || '';
    }

    useEffect(() => {
        if (!myId) return;
        fetch('/api/gimnasio/tema').then(r => r.json()).then(d => {
            if (d.temaAcento) setAcento(d.temaAcento);
            if (d.temaAcento2) setAcento2(d.temaAcento2);
        }).catch(() => {});

        fetch(`/api/empleados/${myId}/alumno-vinculado`)
            .then(r => r.json())
            .then(async (d) => {
                if (d.alumnoId) {
                    setAlumnoId(d.alumnoId);
                    const alumnoData = await fetchAlumnoData(d.alumnoId);
                    setAlumno(alumnoData);
                    if (alumnoData) await fetchPlan(d.alumnoId, alumnoData);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [myId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="border-t-2 border-r-2 rounded-full w-8 h-8 animate-spin border-slate-300" style={{ borderTopColor: acento, borderRightColor: acento }} />
            </div>
        );
    }

    if (!alumnoId || !alumno) {
        return (
            <div className="max-w-lg mx-auto pt-4 pb-12 px-4 space-y-4">
                <div className="bg-[#111] rounded-2xl px-5 pt-5 pb-5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: acento }}>
                            <span className="text-white font-bold text-xl">{initials}</span>
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg leading-tight">{myNombre} {myApellido}</h1>
                            <span className="text-slate-400 text-xs">{roleLabel}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-white border border-black/[0.07] rounded-2xl shadow-sm p-10 text-center">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                    </div>
                    <p className="text-slate-700 font-semibold mb-1">Activá tu perfil</p>
                    <p className="text-slate-400 text-sm mb-5">Creá tu perfil de alumno para registrar asistencias y tu plan de entrenamiento.</p>
                    <button
                        onClick={crearAlumnoVinculado}
                        disabled={creando}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition"
                        style={{ background: acento }}
                    >
                        {creando ? 'Creando...' : 'Activar perfil'}
                    </button>
                </div>
            </div>
        );
    }

    const mesActual = MESES[now.getMonth()];
    const anioActual = now.getFullYear();

    const asistenciasMap: Record<string, Asistencia[]> = {};
    alumno.asistencia.filter(a => a.presente).forEach(a => {
        const key = toLocalDateKey(a.fecha);
        if (!asistenciasMap[key]) asistenciasMap[key] = [];
        asistenciasMap[key].push(a);
    });

    const pagosMap: Record<string, { _id: string; mes: string; tarifa: number }[]> = {};
    alumno.pagos.forEach(p => {
        const key = toLocalDateKey(p.fechaPago);
        if (!pagosMap[key]) pagosMap[key] = [];
        pagosMap[key].push(p);
    });

    const planInicioKey = planEj?.fechaInicio ? toLocalDateKey(planEj.fechaInicio) : null;
    const lastMusculacionKey = planInicioKey
        ? Object.entries(asistenciasMap)
            .filter(([key, asists]) => key >= planInicioKey && asists.some(a => a.actividad === 'Musculación'))
            .map(([key]) => key).sort().pop() ?? null
        : null;

    const asistenciasEsteMes = alumno.asistencia.filter(a => {
        const f = new Date(a.fecha);
        return a.presente && f.getMonth() === now.getMonth() && f.getFullYear() === anioActual;
    });

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

    function prevMonth() {
        setSelectedDay(null);
        if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1);
    }
    function nextMonth() {
        setSelectedDay(null);
        if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1);
    }

    const selectedAsistencias = selectedDay ? (asistenciasMap[selectedDay] || []) : [];
    const selectedPagos = selectedDay ? (pagosMap[selectedDay] || []) : [];

    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const planInicioDate = planEj?.fechaInicio ? new Date(planEj.fechaInicio) : null;
    const todayMonday = new Date(now);
    todayMonday.setDate(todayMonday.getDate() - ((todayMonday.getDay() + 6) % 7));
    todayMonday.setHours(0, 0, 0, 0);
    const currentCalWeekMs = todayMonday.getTime();
    const weekStartMs = currentCalWeekMs - asistWeekOffset * msPerWeek;
    const weekEndMs = weekStartMs + msPerWeek;
    const weekStart = new Date(weekStartMs);

    let planWeekNum: number | null = null;
    if (planInicioDate) {
        const planMonday = new Date(planInicioDate);
        planMonday.setDate(planMonday.getDate() - ((planMonday.getDay() + 6) % 7));
        planMonday.setHours(0, 0, 0, 0);
        const n = Math.floor((weekStartMs - planMonday.getTime()) / msPerWeek) + 1;
        planWeekNum = n >= 1 ? n : null;
    }

    const asistenciasEnSemana = [...alumno.asistencia]
        .filter(a => { const d = new Date(a.fecha); return a.presente && d >= weekStart && d < new Date(weekEndMs); })
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    const musculacionEnSemana = asistenciasEnSemana.filter(a => a.actividad === 'Musculación').length;
    const diasPorSemana = planEj?.dias?.length ?? 0;

    const card = 'bg-white border border-black/[0.07] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_14px_rgba(0,0,0,0.04)] p-4';
    const lbl = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest';
    const num = 'text-3xl font-bold leading-none';
    const sub = 'text-xs text-slate-500 mt-1';

    return (
        <div className="max-w-lg mx-auto pt-4 pb-12 px-4 space-y-4">

            {/* ── BANNER ── */}
            <div className="relative bg-[#111] rounded-2xl px-5 pt-5 pb-5 overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.05),transparent_55%)]" />
                <div className="pointer-events-none absolute -bottom-8 -right-4 w-36 h-36 rounded-full blur-3xl opacity-30" style={{ background: acento2 }} />
                <div className="flex items-center gap-4 relative">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg" style={{ background: acento }}>
                        <span className="text-white font-bold text-xl tracking-wide">{initials}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-white font-bold text-lg leading-tight truncate">{myNombre} {myApellido}</h1>
                        <span className="text-slate-400 text-xs mt-1 block">{roleLabel}</span>
                    </div>
                </div>
            </div>

            {/* ── TABS ── */}
            <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
                {(['resumen', 'historial', 'plan'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => changeTab(t)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        {t === 'resumen' ? 'Resumen' : t === 'historial' ? 'Historial' : 'Mi Plan'}
                    </button>
                ))}
            </div>

            {/* ── RESUMEN ── */}
            {tab === 'resumen' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className={card}>
                            <p className={`${lbl} mb-3`}>Asistencias</p>
                            <p className={`${num} text-slate-900`}>{asistenciasEsteMes.length}</p>
                            <p className={sub}>en {mesActual}</p>
                        </div>
                        <div className={card}>
                            <p className={`${lbl} mb-3`}>Plan</p>
                            {tienePlan ? (
                                <>
                                    <p className={`${num} text-slate-900`}>{asistenciasEnPlan}</p>
                                    <p className={sub}>sesiones completadas</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-slate-400 text-sm font-medium mt-1">Sin plan</p>
                                    <p className={sub}>no asignado</p>
                                </>
                            )}
                        </div>
                    </div>

                    {tienePlan && (
                        <div className={card}>
                            <div className="flex items-center justify-between mb-3">
                                <p className={lbl}>Plan activo</p>
                                <span className="text-xs text-slate-400 font-medium">{asistenciasEnPlan} / {plan.duracion} sesiones</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                                <div
                                    className="h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min((asistenciasEnPlan / (plan.duracion || 1)) * 100, 100)}%`, background: acento2 }}
                                />
                            </div>
                            <p className={sub}>{plan.diasRestantes != null ? `${plan.diasRestantes} sesiones restantes` : 'En curso'}</p>
                        </div>
                    )}

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

                    <div className="bg-white border border-black/[0.07] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_14px_rgba(0,0,0,0.04)] overflow-hidden">
                        <div className="px-3 pt-3 pb-2.5 border-b border-black/[0.05] flex items-center justify-between gap-2">
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
                        {asistenciasEnSemana.length === 0 ? (
                            <div className="px-4 py-7 text-center">
                                <p className="text-slate-400 text-sm">Sin asistencias esta semana.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {asistenciasEnSemana.map(a => {
                                    const d = new Date(a.fecha);
                                    return (
                                        <div key={a._id} className="flex items-center gap-3 px-4 py-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex flex-col items-center justify-center flex-shrink-0 border border-black/[0.06]">
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
                        {diasPorSemana > 0 && planWeekNum && planWeekNum >= 1 && (
                            <div className="px-4 py-2.5 bg-slate-50 border-t border-black/[0.05] flex items-center gap-2">
                                <div className="flex gap-1 flex-1">
                                    {Array.from({ length: diasPorSemana }, (_, i) => (
                                        <div key={i} className="h-1.5 flex-1 rounded-full"
                                            style={{ background: i < musculacionEnSemana ? acento2 : '#e2e8f0' }} />
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
                    <div className={card}>
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                                </svg>
                            </button>
                            <span className="text-slate-900 font-bold capitalize text-sm">{MESES[calMonth]} {calYear}</span>
                            <button
                                onClick={nextMonth}
                                disabled={calYear === now.getFullYear() && calMonth === now.getMonth()}
                                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors disabled:opacity-30"
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
                                const key = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                                const asists = asistenciasMap[key] || [];
                                const isPlanStart = key === planInicioKey;
                                const isPlanDay = !isPlanStart && !!planInicioKey && !!lastMusculacionKey
                                    && key >= planInicioKey && key <= lastMusculacionKey;
                                const isToday = key === toLocalDateKey(now.toISOString());
                                const isSelected = key === selectedDay;
                                const hasData = asists.length > 0 || isPlanStart;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedDay(isSelected ? null : key)}
                                        className={`relative flex flex-col items-center py-1.5 rounded-xl transition-all ${
                                            isSelected ? 'bg-slate-100'
                                            : isPlanStart ? 'bg-violet-100 hover:bg-violet-200'
                                            : isPlanDay ? 'hover:bg-violet-50'
                                            : hasData ? 'hover:bg-slate-50'
                                            : 'cursor-default'
                                        }`}
                                        style={isPlanDay && !isSelected ? { background: 'rgba(139,92,246,0.06)' } : undefined}
                                    >
                                        <span className={`text-xs font-semibold leading-none mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                                            isSelected ? 'text-slate-900'
                                            : isToday ? 'bg-[#111] text-white'
                                            : isPlanStart ? 'bg-violet-600 text-white'
                                            : hasData ? 'text-slate-800'
                                            : 'text-slate-400'
                                        }`}>{day}</span>
                                        <div className="flex gap-0.5 flex-wrap justify-center max-w-[28px]">
                                            {asists.map((a, idx) => (
                                                <span key={idx} className={`w-1.5 h-1.5 rounded-full ${ACTIVIDAD_DOT[a.actividad] || 'bg-slate-400'}`} />
                                            ))}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-black/[0.06] flex-wrap">
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" /><span className="text-slate-400 text-xs">Musculación</span></div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" /><span className="text-slate-400 text-xs">Intermitente</span></div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400" /><span className="text-slate-400 text-xs">Otro</span></div>
                            {planInicioKey && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-600" /><span className="text-slate-400 text-xs">Inicio de plan</span></div>}
                            {lastMusculacionKey && <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(139,92,246,0.18)' }} /><span className="text-slate-400 text-xs">Días de plan</span></div>}
                        </div>
                    </div>

                    {selectedDay && selectedAsistencias.length > 0 && (
                        <div className={`${card} space-y-3`}>
                            <h3 className="text-slate-900 font-bold text-sm capitalize">
                                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            {selectedDay === planInicioKey && (
                                <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5">
                                    <span className="w-2 h-2 rounded-full bg-violet-600 flex-shrink-0" />
                                    <span className="text-violet-700 text-sm font-semibold">Inicio de plan — {planEj?.nombre}</span>
                                </div>
                            )}
                            {selectedAsistencias.map(a => (
                                <div key={a._id} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ACTIVIDAD_DOT[a.actividad] || 'bg-slate-400'}`} />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${ACTIVIDAD_PILL[a.actividad] || 'bg-slate-100 text-slate-600'}`}>{a.actividad}</span>
                                    </div>
                                    <span className="text-slate-400 text-xs font-medium">
                                        {new Date(a.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className={card}>
                            <p className={`${lbl} mb-2`}>Asistencias</p>
                            <p className={`${num} text-slate-900`}>
                                {Object.entries(asistenciasMap).filter(([key]) => key.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`)).reduce((sum, [, a]) => sum + a.length, 0)}
                            </p>
                            <p className={`${sub} capitalize`}>en {MESES_CORTO[calMonth]}</p>
                        </div>
                        <div className={card}>
                            <p className={`${lbl} mb-2`}>Sesiones totales</p>
                            <p className={`${num} text-slate-900`}>{alumno.asistencia.filter(a => a.presente).length}</p>
                            <p className={sub}>historial completo</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MI PLAN ── */}
            {tab === 'plan' && (
                <div className="space-y-3">
                    {loadingPlan && (
                        <div className="flex justify-center py-12">
                            <div className="border-t-2 border-r-2 rounded-full w-8 h-8 animate-spin border-slate-300" style={{ borderTopColor: acento }} />
                        </div>
                    )}

                    {!loadingPlan && !planEj && (
                        <div className="bg-white rounded-2xl border border-black/[0.07] shadow-sm p-10 text-center mt-2">
                            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                            </div>
                            <p className="text-slate-600 font-semibold mb-1">Sin plan asignado</p>
                            <p className="text-slate-400 text-sm">Todavía no tenés un plan de entrenamiento asignado.</p>
                        </div>
                    )}

                    {!loadingPlan && planEj && (() => {
                        const totalSem = planEj.totalSemanas || 5;
                        const dia = planEj.dias[selectedDia];
                        const totalSesiones = totalSem * planEj.dias.length;

                        const comboIdx: Record<string, number> = {};
                        let nextComboIdx = 0;
                        (dia?.ejercicios ?? []).forEach((e: EjercicioAsignado) => {
                            if (e.grupoCombo && comboIdx[e.grupoCombo] === undefined) {
                                comboIdx[e.grupoCombo] = nextComboIdx++;
                            }
                        });

                        const planInicio = planEj.fechaInicio ? new Date(planEj.fechaInicio) : null;
                        const sessionsDone = planInicio
                            ? alumno.asistencia.filter(a =>
                                a.actividad === 'Musculación' && a.presente && new Date(a.fecha) >= planInicio
                              ).length
                            : 0;
                        const currentDayIdx = planEj.dias.length > 0 ? sessionsDone % planEj.dias.length : 0;
                        const sessionBasedWeekNum = planEj.dias.length > 0
                            ? Math.min(Math.floor(sessionsDone / planEj.dias.length) + 1, totalSem)
                            : 1;

                        return (
                            <>
                                <div className="bg-[#111] rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{planEj.categoria}</p>
                                        <h2 className="text-white font-bold text-base truncate">{planEj.nombre}</h2>
                                        <p className="text-slate-600 text-xs mt-0.5">{totalSesiones} sesiones · {totalSem} semanas · {planEj.dias.length} días/sem</p>
                                    </div>
                                    <div className="shrink-0 text-center rounded-xl px-3 py-2" style={{ background: `${acento2}25` }}>
                                        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: acento2 }}>Semana</p>
                                        <p className="font-bold text-xl leading-none text-white">{sessionBasedWeekNum}</p>
                                        <p className="text-xs" style={{ color: acento2 }}>de {totalSem}</p>
                                    </div>
                                </div>

                                {planEj.entradaCalor?.ejercicios?.length > 0 && (
                                    <div className="bg-white border border-black/[0.07] rounded-2xl shadow-sm overflow-hidden">
                                        <button
                                            onClick={() => setShowCalentamiento(v => !v)}
                                            className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">🔥</span>
                                                <span className="text-sm font-semibold text-slate-700">Entrada en calor</span>
                                                <span className="text-xs text-slate-400 font-medium">{planEj.entradaCalor.ejercicios.length} ejercicios</span>
                                            </div>
                                            <svg className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${showCalentamiento ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                            </svg>
                                        </button>
                                        {showCalentamiento && (
                                            <div className="border-t border-black/[0.06] divide-y divide-slate-100">
                                                <div className="px-4 py-2 bg-slate-50 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ejercicio</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Días 1/2/3</span>
                                                </div>
                                                {planEj.entradaCalor.ejercicios.map((e, i) => (
                                                    <div key={i} className="flex items-center justify-between px-4 py-3">
                                                        <p className="text-sm font-medium text-slate-700">{e.nombre}</p>
                                                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg ml-3 shrink-0">S/R</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="bg-white rounded-2xl border border-black/[0.07] shadow-sm p-3">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">Semana</p>
                                    <div className="flex gap-1.5">
                                        {Array.from({ length: totalSem }, (_, i) => i + 1).map((sem) => {
                                            const isCurrent = sem === sessionBasedWeekNum;
                                            const isSelected = sem === selectedSemana;
                                            const isPast = sem < sessionBasedWeekNum;
                                            return (
                                                <button
                                                    key={sem}
                                                    onClick={() => setSelectedSemana(sem)}
                                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all relative overflow-hidden ${
                                                        isSelected ? 'bg-slate-900 text-white shadow-sm'
                                                        : isPast ? 'bg-slate-50 text-slate-400'
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
                                                    {isCurrent && !isSelected && (
                                                        <span className="absolute -top-1 -right-0.5 w-2 h-2 rounded-full border border-white" style={{ background: acento }} />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {selectedSemana === 5 && (
                                        <p className="text-center text-xs text-slate-400 mt-2 font-medium">Semana de descarga</p>
                                    )}
                                </div>

                                <div className="flex gap-1.5">
                                    {planEj.dias.map((d, i) => {
                                        const isDayDone = selectedSemana < sessionBasedWeekNum
                                            || (selectedSemana === sessionBasedWeekNum && i < currentDayIdx);
                                        const isCurrentDay = selectedSemana === sessionBasedWeekNum && i === currentDayIdx;
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => { setSelectedDia(i); setExpandedEj(null); }}
                                                className={`relative flex-1 h-14 flex flex-col items-center justify-center rounded-2xl transition-all border overflow-hidden ${
                                                    selectedDia === i
                                                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                                        : 'bg-white text-slate-500 border-black/[0.08] hover:border-black/20'
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
                                                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: acento }} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {dia?.bloqueActivacion && (
                                    <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                                        <p className="text-xs font-bold text-amber-700 mb-1">Bloque de activación</p>
                                        <p className="text-sm text-amber-800 leading-snug">{dia.bloqueActivacion}</p>
                                    </div>
                                )}

                                {dia && (
                                    <div className="bg-white rounded-2xl border border-black/[0.07] shadow-sm overflow-hidden">
                                        <div className="grid grid-cols-[1fr_96px_68px] border-b border-black/[0.07]">
                                            <div className="px-4 py-2.5">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ejercicio</p>
                                            </div>
                                            <div className="px-2 py-2.5 text-center border-l border-black/[0.06]">
                                                <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">Sem {selectedSemana}</p>
                                            </div>
                                            <div className="px-2 py-2.5 text-center border-l border-black/[0.06]">
                                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Mis KG</p>
                                            </div>
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {dia.ejercicios.map((ej, eIdx) => {
                                                const semVal = getSemanaField(ej, selectedSemana);
                                                const isExpanded = expandedEj === eIdx;
                                                const ci = ej.grupoCombo ? (comboIdx[ej.grupoCombo] ?? -1) : -1;
                                                const combo = ci >= 0 ? COMBO_PALETTE[ci % COMBO_PALETTE.length] : null;
                                                const prevEj = dia.ejercicios[eIdx - 1];
                                                const isFirstInCombo = combo && (!prevEj?.grupoCombo || prevEj.grupoCombo !== ej.grupoCombo);
                                                return (
                                                    <div key={eIdx} style={combo ? { backgroundColor: combo.bg } : undefined}>
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
                                                            <div className="px-2 py-3 border-l border-black/[0.06] flex items-center justify-center">
                                                                <span className={`text-xs font-bold text-center leading-tight ${semVal ? 'text-slate-800' : 'text-slate-300'}`}>
                                                                    {semVal || '—'}
                                                                </span>
                                                            </div>
                                                            <div className="px-2 py-3 border-l border-black/[0.06] flex items-center justify-center">
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
                                                        {isExpanded && (
                                                            <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-black/[0.06] space-y-3">
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
                                                                            className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Observaciones</label>
                                                                        <input
                                                                            type="text"
                                                                            value={(ej[`observacionesAlumno${selectedSemana}` as keyof EjercicioAsignado] as string) || ''}
                                                                            onChange={(e) => updateEjAlumno(eIdx, `observacionesAlumno${selectedSemana}`, e.target.value)}
                                                                            className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleSaveEjercicio(eIdx)}
                                                                    disabled={savingEj === eIdx}
                                                                    className="w-full py-2.5 text-sm font-bold rounded-xl transition-all disabled:opacity-60 bg-slate-900 text-white hover:bg-slate-700 active:bg-slate-800"
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
