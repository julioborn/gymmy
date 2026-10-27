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

interface PlanHistorial {
    _id?: string;
    fechaInicio: string;
    fechaFin: string;
    duracion: number;
    asistenciasContadas: number;
}

interface Alumno {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    asistencia: Asistencia[];
    pagos: Pago[];
    planEntrenamiento: PlanEntrenamiento;
    planEntrenamientoHistorial: PlanHistorial[];
    gimnasioId: { nombre: string; logoUrl?: string };
}

interface EjercicioAsignado {
    nombre: string;
    notas: string;
    trepada1: string; trepada2: string; trepada3: string; trepada4: string; trepada5: string;
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
    'Musculación': 'bg-lime-400',
    'Intermitente': 'bg-orange-400',
    'Otro': 'bg-yellow-400',
};
const COMBO_PALETTE = [
    { bg: 'rgba(244, 163, 71, 0.07)', labelColor: '#d97706', dotColor: '#d97706' },
    { bg: 'rgba(16, 185, 129, 0.07)', labelColor: '#059669', dotColor: '#059669' },
    { bg: 'rgba(59, 130, 246, 0.07)', labelColor: '#2563eb', dotColor: '#2563eb' },
    { bg: 'rgba(139, 92, 246, 0.07)', labelColor: '#7c3aed', dotColor: '#7c3aed' },
];
const ACTIVIDAD_PILL: Record<string, string> = {
    'Musculación': 'bg-lime-400/10 text-lime-400 border border-lime-400/20',
    'Intermitente': 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    'Otro': 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
};

function toLocalDateKey(fechaStr: string): string {
    const d = new Date(fechaStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function planDateToKey(fecha: string | Date): string {
    const d = new Date(fecha);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() + offset * 60 * 1000);
    return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2,'0')}-${String(local.getDate()).padStart(2,'0')}`;
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
    const [aliasGimnasio, setAliasGimnasio] = useState<string>('');
    const [aliasCopied, setAliasCopied] = useState(false);

    const [planEj, setPlanEj] = useState<PlanEjAsignado | null>(null);
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [savingEj, setSavingEj] = useState<number | null>(null);
    const [selectedSemana, setSelectedSemana] = useState(1);
    const [selectedDia, setSelectedDia] = useState(0);
    const [expandedEj, setExpandedEj] = useState<number | null>(null);
    const [acento, setAcento] = useState('#a3e635');
    const [acento2, setAcento2] = useState('#a3e635');
    const [showCalentamiento, setShowCalentamiento] = useState(false);
    const [checkingIn, setCheckingIn] = useState(false);
    const [checkInResult, setCheckInResult] = useState<'ok' | 'duplicate' | 'error' | null>(null);

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

    async function fetchAlias() {
        try {
            const r = await fetch('/api/gimnasio/alias');
            const d = await r.json();
            setAliasGimnasio(d.alias ?? '');
        } catch { }
    }

    async function fetchPlan(alumnoId: string, alumnoData?: Alumno) {
        setLoadingPlan(true);
        try {
            const r = await fetch(`/api/plan-alumno/alumno/${alumnoId}`);
            const data: PlanEjAsignado | null = r.ok ? await r.json() : null;
            setPlanEj(data);
            if (data?.fechaInicio) {
                const inicio = new Date(data.fechaInicio);
                const totalSemanas = data.totalSemanas || 5;
                if (alumnoData && data.dias.length > 0) {
                    const diasLen = data.dias.length;
                    const sortedSessions = alumnoData.asistencia
                        .filter(a => a.actividad === 'Musculación' && a.presente && new Date(a.fecha) >= inicio)
                        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
                    const totalDone = sortedSessions.length;
                    const lastSession = sortedSessions[sortedSessions.length - 1];
                    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
                    const justAttended = lastSession && new Date(lastSession.fecha).getTime() > threeHoursAgo;
                    const effectiveDone = justAttended ? totalDone - 1 : totalDone;
                    const currentDayIdx = diasLen > 0 ? effectiveDone % diasLen : 0;
                    const currentWeek = diasLen > 0 ? Math.floor(effectiveDone / diasLen) + 1 : 1;
                    setSelectedDia(currentDayIdx);
                    setSelectedSemana(Math.min(currentWeek, totalSemanas));
                } else {
                    const diasTranscurridos = Math.floor((Date.now() - inicio.getTime()) / (1000 * 60 * 60 * 24));
                    setSelectedSemana(Math.min(Math.max(Math.floor(diasTranscurridos / 7) + 1, 1), totalSemanas));
                }
            }
        } finally {
            setLoadingPlan(false);
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
            if (res.ok) setExpandedEj(null);
        } finally {
            setSavingEj(null);
        }
    }

    async function handleCheckIn() {
        setCheckingIn(true);
        setCheckInResult(null);
        try {
            const res = await fetch('/api/alumno/check-in', { method: 'POST' });
            if (res.ok) {
                setCheckInResult('ok');
                fetchAlumno().catch(() => {});
                setTimeout(() => setCheckInResult(null), 4000);
            } else {
                const data = await res.json().catch(() => ({}));
                setCheckInResult(data.error?.includes('Ya registraste') ? 'duplicate' : 'error');
                setTimeout(() => setCheckInResult(null), 4000);
            }
        } catch {
            setCheckInResult('error');
            setTimeout(() => setCheckInResult(null), 4000);
        } finally {
            setCheckingIn(false);
        }
    }

    async function handlePagarMercadoPago() {
        setLoadingPago(true);
        try {
            const res = await fetch('/api/pagos/mp/crear-preferencia', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) { setPagoResult('error'); return; }
            if (data.alumnoId) sessionStorage.setItem('mp_alumno_id', data.alumnoId);
            const a = document.createElement('a');
            a.href = data.init_point;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch {
            setPagoResult('error');
        } finally {
            setLoadingPago(false);
        }
    }

    function updateEjAlumno(eIdx: number, field: string, value: string) {
        setPlanEj((prev) => {
            if (!prev) return prev;
            const dias = prev.dias.map((d, di) => {
                if (di !== selectedDia) return d;
                const targetCombo = d.ejercicios[eIdx]?.grupoCombo;
                const isKgField = field.startsWith('kgAlumno');
                return {
                    ...d,
                    ejercicios: d.ejercicios.map((e, ei) => {
                        if (ei === eIdx) return { ...e, [field]: value };
                        if (isKgField && targetCombo && e.grupoCombo === targetCombo) {
                            return { ...e, [field]: value };
                        }
                        return e;
                    }),
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

    function getTrepadaField(ej: EjercicioAsignado, sem: number): string {
        const map: Record<number, keyof EjercicioAsignado> = {
            1: 'trepada1', 2: 'trepada2', 3: 'trepada3', 4: 'trepada4', 5: 'trepada5',
        };
        return (ej[map[sem]] as string) || '';
    }

    function parseSeries(semVal: string): number {
        if (!semVal) return 1;
        const deMatch = semVal.match(/^(\d+)\s*de/i);
        if (deMatch) return Math.min(Math.max(parseInt(deMatch[1]), 1), 6);
        const seriesMatch = semVal.match(/^(\d+)\s*series/i);
        if (seriesMatch) return Math.min(Math.max(parseInt(seriesMatch[1]), 1), 6);
        if (/^\d+(\.\d+)+$/.test(semVal)) return Math.min(semVal.split('.').length, 6);
        if (semVal.includes('/')) return Math.min(semVal.split('/').length, 6);
        const xMatch = semVal.match(/^(\d+)\s*[xX]/);
        if (xMatch) return Math.min(Math.max(parseInt(xMatch[1]), 1), 6);
        return 1;
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
        fetchAlias();
        fetch('/api/gimnasio/tema')
            .then(r => r.json())
            .then(d => {
                if (d.temaAcento) setAcento(d.temaAcento);
                if (d.temaAcento2) setAcento2(d.temaAcento2);
            })
            .catch(() => {});

        const onVisible = () => { if (document.visibilityState === 'visible') fetchAlumno().catch(() => {}); };
        const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) fetchAlumno().catch(() => {}); };
        const onFocus = () => fetchAlumno().catch(() => {});
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('pageshow', onPageShow);
        window.addEventListener('focus', onFocus);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('pageshow', onPageShow);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="border-t-2 border-r-2 rounded-full w-8 h-8 animate-spin border-white/10" style={{ borderTopColor: '#a3e635', borderRightColor: '#a3e635' }} />
            </div>
        );
    }

    if (!alumno) {
        return <div className="text-white/30 text-center py-16 text-sm">Error al cargar tus datos.</div>;
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

    const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const planDaysMap: Record<string, 'active' | 'completed'> = {};
    const planBoundaryMap: Record<string, 'start' | 'end'> = {};

    // Prefer the newer plan: if planEj started after planEntrenamiento, use it as active
    const embStartTs = alumno.planEntrenamiento?.fechaInicio && !alumno.planEntrenamiento?.terminado
        ? new Date(alumno.planEntrenamiento.fechaInicio).getTime() : 0;
    const ejStartTs = planEj?.fechaInicio ? new Date(planEj.fechaInicio).getTime() : 0;
    const useEjPlan = ejStartTs > embStartTs;

    if (alumno.planEntrenamiento?.fechaInicio && !alumno.planEntrenamiento?.terminado && !useEjPlan) {
        const startStr = planDateToKey(alumno.planEntrenamiento.fechaInicio);
        planBoundaryMap[startStr] = 'start';
        const cur = new Date(startStr + 'T12:00:00');
        const today = new Date(todayKey + 'T12:00:00');
        while (cur <= today) {
            const k = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
            planDaysMap[k] = 'active';
            cur.setDate(cur.getDate() + 1);
        }
    } else if (planEj?.fechaInicio) {
        // If there's an outdated embedded plan that wasn't closed, show it as completed ending on the Nth session
        if (alumno.planEntrenamiento?.fechaInicio && !alumno.planEntrenamiento?.terminado && useEjPlan) {
            const oldStart = planDateToKey(alumno.planEntrenamiento.fechaInicio);
            const oldStartDate = new Date(oldStart + 'T12:00:00');
            const duracion = alumno.planEntrenamiento.duracion || 0;

            // Find the Nth Musculación session (N = duracion) → actual end date of old plan
            const sesiones = alumno.asistencia
                .filter((a: Asistencia) => a.actividad === 'Musculación' && a.presente && new Date(a.fecha) >= oldStartDate)
                .sort((a: Asistencia, b: Asistencia) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
            const endSession = duracion > 0 && sesiones.length >= duracion
                ? sesiones[duracion - 1]
                : sesiones[sesiones.length - 1];
            const oldEndStr = endSession
                ? toLocalDateKey(endSession.fecha)
                : (() => {
                    const d = new Date(planDateToKey(planEj.fechaInicio) + 'T12:00:00');
                    d.setDate(d.getDate() - 1);
                    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                })();

            planBoundaryMap[oldStart] = 'start';
            planBoundaryMap[oldEndStr] = 'end';
            const cur = new Date(oldStart + 'T12:00:00');
            const endDate = new Date(oldEndStr + 'T12:00:00');
            while (cur <= endDate) {
                const k = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
                planDaysMap[k] = 'completed';
                cur.setDate(cur.getDate() + 1);
            }
        }
    }

    for (const plan of (alumno.planEntrenamientoHistorial || [])) {
        if (!plan.fechaInicio || !plan.fechaFin) continue;
        const startStr = planDateToKey(plan.fechaInicio);
        const endStr = planDateToKey(plan.fechaFin);
        planBoundaryMap[startStr] = 'start';
        planBoundaryMap[endStr] = 'end';
        const cur = new Date(startStr + 'T12:00:00');
        const pe = new Date(endStr + 'T12:00:00');
        while (cur <= pe) {
            const k = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
            if (!planDaysMap[k]) planDaysMap[k] = 'completed';
            cur.setDate(cur.getDate() + 1);
        }
    }

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

    const planEjFechaInicio: Date | null = (() => {
        if (!planEj?.fechaInicio) return null;
        const s = planEj.fechaInicio.split('T')[0];
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d);
    })();
    const planEjTotal = planEj ? (planEj.dias?.length || 0) * (planEj.totalSemanas || 1) : 0;
    const planEjDone = planEjFechaInicio
        ? alumno.asistencia.filter(a =>
            a.actividad === 'Musculación' && a.presente && new Date(a.fecha) >= planEjFechaInicio
          ).length
        : 0;
    const planEjComplete = planEj != null && planEjTotal > 0 && planEjFechaInicio != null && planEjDone >= planEjTotal;

    const calDays = getCalendarDays(calYear, calMonth);
    const initials = getInitials(alumno.nombre, alumno.apellido);
    const gimnasioNombre = (alumno.gimnasioId as any)?.nombre ?? '';

    const daysInCurrentMonth = new Date(anioActual, now.getMonth() + 1, 0).getDate();
    const monthAsistBars = Array.from({ length: daysInCurrentMonth }, (_, i) => {
        const dayKey = `${anioActual}-${String(now.getMonth()+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;
        return (asistenciasMap[dayKey] || []).length;
    });

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

    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const planInicioDate = planEjFechaInicio;
    const todayMonday = new Date(now);
    todayMonday.setDate(todayMonday.getDate() - ((todayMonday.getDay() + 6) % 7));
    todayMonday.setHours(0, 0, 0, 0);
    const currentCalWeekMs = todayMonday.getTime();
    const weekStartMs = currentCalWeekMs - asistWeekOffset * msPerWeek;
    const weekEndMs = weekStartMs + msPerWeek;
    const weekStart = new Date(weekStartMs);
    const weekEnd = new Date(weekEndMs);

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

    const card = 'bg-[#111] border border-white/[0.07] rounded-2xl p-4';
    const lbl = 'text-[10px] font-bold text-white/40 uppercase tracking-widest';
    const num = 'text-3xl font-bold leading-none text-white';
    const sub = 'text-xs text-white/40 mt-1';

    return (
        <div className="max-w-lg mx-auto pt-4 pb-12 px-4 space-y-4">

            {/* ── PAGO RESULT BANNER ── */}
            {pagoResult && (
                <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${
                    pagoResult === 'ok'
                        ? 'bg-lime-400/10 border border-lime-400/20'
                        : pagoResult === 'pendiente'
                        ? 'bg-amber-500/10 border border-amber-500/20'
                        : 'bg-red-500/10 border border-red-500/20'
                }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        pagoResult === 'ok' ? 'bg-lime-400/20' : pagoResult === 'pendiente' ? 'bg-amber-500/20' : 'bg-red-500/20'
                    }`}>
                        {pagoResult === 'ok' && <IconCheck className="w-4 h-4 text-lime-400" />}
                        {pagoResult === 'pendiente' && <IconClock className="w-4 h-4 text-amber-400" />}
                        {pagoResult === 'error' && <IconX className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="flex-1">
                        <p className={`text-sm font-bold ${
                            pagoResult === 'ok' ? 'text-lime-400' : pagoResult === 'pendiente' ? 'text-amber-400' : 'text-red-400'
                        }`}>
                            {pagoResult === 'ok' ? '¡Pago recibido!' : pagoResult === 'pendiente' ? 'Pago en proceso' : 'El pago no se completó'}
                        </p>
                        <p className={`text-xs mt-0.5 ${
                            pagoResult === 'ok' ? 'text-lime-400/60' : pagoResult === 'pendiente' ? 'text-amber-400/60' : 'text-red-400/60'
                        }`}>
                            {pagoResult === 'ok'
                                ? 'Tu cuota quedó registrada. ¡Gracias!'
                                : pagoResult === 'pendiente'
                                ? 'Tu pago está siendo procesado. Se registrará en breve.'
                                : 'Podés intentarlo de nuevo cuando quieras.'}
                        </p>
                    </div>
                    <button onClick={() => setPagoResult(null)} className="text-white/30 hover:text-white/60 p-1">
                        <IconX className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── PROFILE BANNER ── */}
            <div className="relative bg-[#111] rounded-2xl border border-white/[0.07] px-5 pt-5 pb-5 overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(163,230,53,0.08),transparent_55%)]" />
                <div className="flex items-center gap-4 relative">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg bg-lime-400">
                        <span className="text-black font-bold text-xl tracking-wide">{initials}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-white/40 text-xs font-medium mb-0.5">¡Hola!</p>
                        <h1 className="text-white font-bold text-lg leading-tight truncate">
                            {alumno.nombre} {alumno.apellido}
                        </h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <svg className="w-3.5 h-3.5 text-white/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                            </svg>
                            <span className="text-white/40 text-xs truncate">{gimnasioNombre}</span>
                        </div>
                    </div>
                    <button title="Configuración" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.07] hover:bg-white/10 transition-colors flex-shrink-0">
                        <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                    </button>
                </div>

                <div className="mt-4 flex items-center gap-2 flex-wrap relative">
                    <span className="ring-1 ring-white/10 bg-white/[0.06] text-white/50 text-xs font-medium px-3 py-1 rounded-full">
                        DNI {alumno.dni}
                    </span>
                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                        pagoEsteMes ? 'bg-lime-400/15 text-lime-400' : 'bg-red-500/15 text-red-400'
                    }`}>
                        {pagoEsteMes && <span className="text-[11px]">👑</span>}
                        {pagoEsteMes ? 'Cuota al día' : 'Cuota pendiente'}
                    </span>
                    <button onClick={() => changeTab('historial')} className="ml-auto w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.07] hover:bg-white/10 transition-colors">
                        <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>
                    {alumno.dni === '43844409' && (
                        <button
                            onClick={handleCheckIn}
                            disabled={checkingIn}
                            title="Marcar presente"
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 transition-all"
                        >
                            {checkingIn ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : checkInResult === 'ok' ? (
                                <IconCheck className="w-4 h-4 text-lime-400" />
                            ) : checkInResult === 'duplicate' ? (
                                <IconClock className="w-4 h-4 text-amber-400" />
                            ) : checkInResult === 'error' ? (
                                <IconX className="w-4 h-4 text-red-400" />
                            ) : (
                                <span className="text-base leading-none select-none">✋</span>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* ── TAB SWITCHER ── */}
            <div className="flex gap-1 bg-[#1a1a1a] rounded-2xl p-1">
                <button onClick={() => changeTab('resumen')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'resumen' ? 'bg-lime-400 text-black shadow-sm' : 'text-white/40 hover:text-white/70'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                    </svg>
                    <span>Resumen</span>
                </button>
                <button onClick={() => changeTab('historial')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'historial' ? 'bg-lime-400 text-black shadow-sm' : 'text-white/40 hover:text-white/70'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span>Historial</span>
                </button>
                <button onClick={() => changeTab('plan')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'plan' ? 'bg-lime-400 text-black shadow-sm' : 'text-white/40 hover:text-white/70'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                    </svg>
                    <span>Mi Plan</span>
                </button>
            </div>

            {/* ── RESUMEN ── */}
            {tab === 'resumen' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className={card}>
                            <p className={`${lbl} mb-2`}>Asistencias</p>
                            <p className={num}>{asistenciasEsteMes.length}</p>
                            <p className={sub}>en {mesActual}</p>
                            <div className="flex items-end gap-[1.5px] h-7 mt-3">
                                {monthAsistBars.map((count, i) => (
                                    <div key={i} className="flex-1 rounded-[1px] transition-all"
                                        style={{ height: count > 0 ? '100%' : '35%', backgroundColor: count > 0 ? '#a3e635' : 'rgba(255,255,255,0.07)' }} />
                                ))}
                            </div>
                        </div>
                        <div className={`${card} flex flex-col`}>
                            <p className={`${lbl} mb-2`}>Cuota</p>
                            <p className={`text-xl font-bold leading-none ${pagoEsteMes ? 'text-white' : 'text-red-400'}`}>
                                {pagoEsteMes ? `$${pagoEsteMes.tarifa.toLocaleString('es-AR')}` : 'Pendiente'}
                            </p>
                            <div className="flex items-end justify-between mt-auto pt-3">
                                <p className={`text-sm font-semibold ${pagoEsteMes ? 'text-lime-400' : 'text-white/40'}`}>
                                    {pagoEsteMes ? 'Al día' : mesActual}
                                </p>
                                {pagoEsteMes && (
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(163,230,53,0.15)' }}>
                                        <IconCheck className="w-5 h-5 text-lime-400" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {!pagoEsteMes && aliasGimnasio && (
                        <div className="bg-[#111] border border-white/[0.07] rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/[0.06]">
                                <p className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-1">Transferí tu cuota</p>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-white font-bold text-base truncate">{aliasGimnasio}</span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(aliasGimnasio);
                                            setAliasCopied(true);
                                            setTimeout(() => setAliasCopied(false), 2000);
                                        }}
                                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/10 transition text-white/60 text-xs font-semibold"
                                    >
                                        {aliasCopied ? (
                                            <>
                                                <IconCheck className="w-3.5 h-3.5 text-lime-400" />
                                                <span className="text-lime-400">Copiado</span>
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
                            <a
                                href="https://www.mercadopago.com.ar"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-[#009EE3] hover:bg-[#0088CC] active:bg-[#007AB8] transition-colors"
                            >
                                <span className="text-white font-semibold text-sm">Abrir Mercado Pago</span>
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                            </a>
                        </div>
                    )}

                    {planEj && !planEjComplete && (
                        <div className={card}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                                    </svg>
                                    <p className={lbl}>Plan activo</p>
                                </div>
                                <span className="text-xs text-white/30 font-medium">{planEjDone} / {planEjTotal} sesiones</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                                <div className="h-2 rounded-full transition-all bg-lime-400"
                                    style={{ width: `${Math.min((planEjDone / (planEjTotal || 1)) * 100, 100)}%` }} />
                            </div>
                            <div className="flex items-center justify-between">
                                <p className={sub}>{Math.max(planEjTotal - planEjDone, 0)} sesiones restantes</p>
                                <button onClick={() => changeTab('plan')}
                                    className="flex items-center gap-1 text-xs font-semibold text-white/50 bg-white/[0.07] hover:bg-white/10 px-3 py-1.5 rounded-xl transition-colors">
                                    Ver mi plan
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {!planEj && tienePlan && (
                        <div className={card}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                                    </svg>
                                    <p className={lbl}>Plan activo</p>
                                </div>
                                <span className="text-xs text-white/30 font-medium">{asistenciasEnPlan} / {plan.duracion} sesiones</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                                <div className="h-2 rounded-full transition-all bg-lime-400"
                                    style={{ width: `${Math.min((asistenciasEnPlan / (plan.duracion || 1)) * 100, 100)}%` }} />
                            </div>
                            <div className="flex items-center justify-between">
                                <p className={sub}>{plan.diasRestantes != null ? `${plan.diasRestantes} sesiones restantes` : 'En curso'}</p>
                                <button onClick={() => changeTab('historial')}
                                    className="flex items-center gap-1 text-xs font-semibold text-white/50 bg-white/[0.07] hover:bg-white/10 px-3 py-1.5 rounded-xl transition-colors">
                                    Ver historial
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {(planEjComplete || (!planEj && plan?.terminado && plan?.fechaInicio && plan?.duracion)) && (
                        <div className="bg-lime-400/10 border border-lime-400/20 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-lime-400/20 flex items-center justify-center flex-shrink-0">
                                <IconTrophy className="w-6 h-6 text-lime-400" />
                            </div>
                            <div>
                                <p className="text-lime-400 font-bold text-sm">¡Plan completado!</p>
                                <p className="text-lime-400/60 text-xs mt-0.5">Completaste todas las sesiones del plan.</p>
                            </div>
                        </div>
                    )}

                    {/* ── ÚLTIMAS ASISTENCIAS ── */}
                    {(() => {
                        const ultimas = [...alumno.asistencia]
                            .filter(a => a.presente)
                            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                            .slice(0, 4);
                        if (ultimas.length === 0) return null;
                        const actColor: Record<string, string> = {
                            'Musculación': '#a3e635',
                            'Intermitente': '#f97316',
                            'Cardio': '#14b8a6',
                            'Movilidad': '#6366f1',
                            'Otro': '#eab308',
                        };
                        return (
                            <div className="bg-[#111] border border-white/[0.07] rounded-2xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.05]">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                        </svg>
                                        <span className="font-bold text-sm text-white">Últimas asistencias</span>
                                    </div>
                                    <button onClick={() => changeTab('historial')} className="flex items-center gap-1 text-xs font-semibold text-lime-400/80 hover:text-lime-400 transition-colors">
                                        Ver todas
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="divide-y divide-white/[0.04]">
                                    {ultimas.map(a => {
                                        const d = new Date(a.fecha);
                                        const bg = actColor[a.actividad] || '#6b7280';
                                        return (
                                            <div key={a._id} className="flex items-center gap-3 px-4 py-3">
                                                <div className="w-10 shrink-0">
                                                    <p className="text-white font-bold text-base leading-none">{d.getDate()}</p>
                                                    <p className="text-white/40 text-[10px] font-semibold uppercase leading-none mt-0.5">{MESES_CORTO[d.getMonth()]}</p>
                                                </div>
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                                    style={{ backgroundColor: `${bg}25` }}>
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bg }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-semibold text-sm truncate">{a.actividad}</p>
                                                </div>
                                                <span className="text-white/40 text-xs font-medium shrink-0">
                                                    {d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                </span>
                                                <svg className="w-4 h-4 text-white/15 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                                </svg>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* ── HISTORIAL ── */}
            {tab === 'historial' && (
                <div className="space-y-4">
                    <div className={card}>
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/[0.05] text-white/40 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                                </svg>
                            </button>
                            <span className="text-white font-bold capitalize text-sm">{MESES[calMonth]} {calYear}</span>
                            <button onClick={nextMonth}
                                disabled={calYear === now.getFullYear() && calMonth === now.getMonth()}
                                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/[0.05] text-white/40 transition-colors disabled:opacity-30">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-7 mb-1">
                            {DIAS_SEMANA.map(d => (
                                <div key={d} className="text-center text-white/30 text-xs font-semibold py-1">{d}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-y-1">
                            {calDays.map((day, i) => {
                                if (!day) return <div key={`e-${i}`} />;
                                const key = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                                const asists = asistenciasMap[key] || [];
                                const pagos = pagosMap[key] || [];
                                const isToday = key === toLocalDateKey(now.toISOString());
                                const isSelected = key === selectedDay;
                                const hasData = asists.length > 0 || pagos.length > 0;
                                const planDay = planDaysMap[key];
                                const planBoundary = planBoundaryMap[key];
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedDay(isSelected ? null : key)}
                                        className={`relative flex flex-col items-center py-1.5 rounded-xl transition-all ${
                                            isSelected ? 'bg-white/10'
                                            : planDay === 'active' ? 'bg-lime-400/[0.07] hover:bg-lime-400/10'
                                            : planDay === 'completed' ? 'bg-violet-500/[0.07] hover:bg-violet-500/10'
                                            : hasData ? 'hover:bg-white/[0.04]'
                                            : 'cursor-default'
                                        }`}
                                    >
                                        <span className={`text-xs font-semibold leading-none mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                                            isToday ? 'bg-lime-400 text-black'
                                            : planBoundary === 'start' ? 'bg-lime-400/80 text-black'
                                            : planBoundary === 'end' ? 'bg-violet-500 text-white'
                                            : (hasData || planDay) ? 'text-white'
                                            : 'text-white/25'
                                        }`}>
                                            {day}
                                        </span>
                                        <div className="flex gap-0.5 flex-wrap justify-center max-w-[28px]">
                                            {asists.map((a, idx) => (
                                                <span key={idx} className={`w-1.5 h-1.5 rounded-full ${ACTIVIDAD_DOT[a.actividad] || 'bg-white/40'}`} />
                                            ))}
                                            {pagos.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.06] flex-wrap">
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-lime-400" /><span className="text-white/40 text-xs">Musculación</span></div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" /><span className="text-white/40 text-xs">Intermitente</span></div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400" /><span className="text-white/40 text-xs">Otro</span></div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-white/40 text-xs">Pago</span></div>
                            {Object.values(planDaysMap).includes('active') && <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-lime-400/20" /><span className="text-white/40 text-xs">Plan activo</span></div>}
                            {Object.values(planDaysMap).includes('completed') && <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-500/20" /><span className="text-white/40 text-xs">Plan completado</span></div>}
                        </div>
                    </div>

                    {selectedDay && (selectedAsistencias.length > 0 || selectedPagos.length > 0 || planBoundaryMap[selectedDay]) && (
                        <div className={`${card} space-y-3`}>
                            <h3 className="text-white font-bold text-sm capitalize">
                                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            {planBoundaryMap[selectedDay] === 'start' && (
                                <div className="flex items-center gap-2 bg-lime-400/10 border border-lime-400/20 rounded-xl px-3 py-2.5">
                                    <span className="w-2 h-2 rounded-full bg-lime-400 flex-shrink-0" />
                                    <span className="text-lime-400 text-sm font-semibold">Inicio de plan{planEj?.nombre ? ` — ${planEj.nombre}` : ''}</span>
                                </div>
                            )}
                            {planBoundaryMap[selectedDay] === 'end' && (
                                <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-xl px-3 py-2.5">
                                    <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
                                    <span className="text-violet-400 text-sm font-semibold">Fin de plan</span>
                                </div>
                            )}
                            {selectedAsistencias.map(a => (
                                <div key={a._id} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ACTIVIDAD_DOT[a.actividad] || 'bg-white/40'}`} />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${ACTIVIDAD_PILL[a.actividad] || 'bg-white/10 text-white/60'}`}>{a.actividad}</span>
                                    </div>
                                    <span className="text-white/40 text-xs font-medium">
                                        {new Date(a.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                            {selectedPagos.map(p => (
                                <div key={p._id} className="flex items-center justify-between bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                                        <span className="text-emerald-400 text-sm font-semibold capitalize">Pago — {p.mes}</span>
                                    </div>
                                    <span className="text-emerald-400 font-bold text-sm">${p.tarifa.toLocaleString('es-AR')}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className={card}>
                            <p className={`${lbl} mb-2`}>Asistencias</p>
                            <p className={num}>
                                {Object.entries(asistenciasMap).filter(([key]) => key.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`)).reduce((sum, [, a]) => sum + a.length, 0)}
                            </p>
                            <p className={`${sub} capitalize`}>en {MESES_CORTO[calMonth]}</p>
                        </div>
                        <div className={card}>
                            <p className={`${lbl} mb-2`}>Pagado</p>
                            <p className="text-xl font-bold leading-none text-white">
                                ${Object.entries(pagosMap).filter(([key]) => key.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`)).reduce((sum, [, ps]) => sum + ps.reduce((s, p) => s + p.tarifa, 0), 0).toLocaleString('es-AR')}
                            </p>
                            <p className={`${sub} capitalize`}>en {MESES_CORTO[calMonth]}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MI PLAN ── */}
            {tab === 'plan' && (
                <div className="space-y-3">
                    {loadingPlan && (
                        <div className="flex justify-center py-12">
                            <div className="border-t-2 border-r-2 rounded-full w-8 h-8 animate-spin border-white/10" style={{ borderTopColor: '#a3e635' }} />
                        </div>
                    )}

                    {!loadingPlan && !planEj && (
                        <div className="bg-[#111] rounded-2xl border border-white/[0.07] p-10 text-center mt-2">
                            <div className="w-14 h-14 bg-white/[0.05] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-7 h-7 text-white/30" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                            </div>
                            <p className="text-white/70 font-semibold mb-1">Sin plan asignado</p>
                            <p className="text-white/30 text-sm">Tu entrenador todavía no te asignó un plan de entrenamiento.</p>
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
                        const diasLen = planEj.dias.length;
                        const sortedSessionsR = (planInicio && alumno)
                            ? alumno.asistencia
                                .filter((a) => a.actividad === 'Musculación' && a.presente && new Date(a.fecha) >= planInicio)
                                .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                            : [];
                        const totalDoneR = sortedSessionsR.length;
                        const lastSessionR = sortedSessionsR[sortedSessionsR.length - 1];
                        const threeHoursAgoR = Date.now() - 3 * 60 * 60 * 1000;
                        const justAttendedR = lastSessionR && new Date(lastSessionR.fecha).getTime() > threeHoursAgoR;
                        const effectiveDoneR = justAttendedR ? totalDoneR - 1 : totalDoneR;
                        const planComplete = diasLen > 0 && effectiveDoneR >= totalSem * diasLen;
                        const currentDayIdx = planComplete ? diasLen : (diasLen > 0 ? effectiveDoneR % diasLen : 0);
                        const sessionBasedWeekNum = planComplete ? totalSem + 1 : Math.min(Math.floor(effectiveDoneR / diasLen) + 1, totalSem);

                        return (
                            <>
                                <div className="bg-[#111] border border-white/[0.07] rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-white/40 text-xs font-semibold uppercase tracking-wide">{planEj.categoria}</p>
                                        <h2 className="text-white font-bold text-base truncate">{planEj.nombre}</h2>
                                        <p className="text-white/30 text-xs mt-0.5">{totalSesiones} sesiones · {totalSem} semanas · {planEj.dias.length} días/sem</p>
                                    </div>
                                    <div className="shrink-0 text-center rounded-xl px-3 py-2 bg-lime-400/10">
                                        <p className="text-xs font-bold uppercase tracking-wide text-lime-400">Semana</p>
                                        <p className="font-bold text-xl leading-none text-white">{sessionBasedWeekNum}</p>
                                        <p className="text-xs text-lime-400">de {totalSem}</p>
                                    </div>
                                </div>

                                {planEj.entradaCalor?.ejercicios?.length > 0 && (
                                    <div className="bg-[#111] border border-white/[0.07] rounded-2xl overflow-hidden">
                                        <button onClick={() => setShowCalentamiento(v => !v)}
                                            className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-white/[0.03] active:bg-white/[0.05] transition">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">🔥</span>
                                                <span className="text-sm font-semibold text-white/80">Entrada en calor</span>
                                                <span className="text-xs text-white/30 font-medium">{planEj.entradaCalor.ejercicios.length} ejercicios</span>
                                            </div>
                                            <svg className={`w-4 h-4 text-white/20 transition-transform duration-200 ${showCalentamiento ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                            </svg>
                                        </button>
                                        {showCalentamiento && (
                                            <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
                                                <div className="px-4 py-2 bg-white/[0.02] flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Ejercicio</span>
                                                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Días 1/2/3</span>
                                                </div>
                                                {planEj.entradaCalor.ejercicios.map((e, i) => (
                                                    <div key={i} className="flex items-center justify-between px-4 py-3">
                                                        <p className="text-sm font-medium text-white/80">{e.nombre}</p>
                                                        <span className="text-xs font-bold text-white/30 bg-white/[0.05] px-2 py-0.5 rounded-lg ml-3 shrink-0">S/R</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Semana selector */}
                                <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-3">
                                    <p className="text-xs font-bold text-white/30 uppercase tracking-wide mb-2 px-1">Semana</p>
                                    <div className="flex gap-1.5">
                                        {Array.from({ length: totalSem }, (_, i) => i + 1).map((sem) => {
                                            const isCurrent = sem === sessionBasedWeekNum;
                                            const isSelected = sem === selectedSemana;
                                            const isPast = sem < sessionBasedWeekNum;
                                            return (
                                                <button key={sem} onClick={() => setSelectedSemana(sem)}
                                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all relative overflow-hidden ${
                                                        isSelected ? 'bg-lime-400 text-black shadow-sm'
                                                        : isPast ? 'bg-white/[0.05] text-white/30'
                                                        : 'bg-white/[0.05] text-white/50 hover:bg-white/10'
                                                    }`}>
                                                    {sem === totalSem ? 'DESC' : sem}
                                                    {isPast && (
                                                        <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-lime-400 flex items-center justify-center pointer-events-none">
                                                            <svg className="w-2 h-2 text-black" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                            </svg>
                                                        </span>
                                                    )}
                                                    {isCurrent && !isSelected && (
                                                        <span className="absolute -top-1 -right-0.5 w-2 h-2 rounded-full bg-lime-400" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {selectedSemana === totalSem && (
                                        <p className="text-center text-xs text-white/30 mt-2 font-medium">Semana de descarga</p>
                                    )}
                                </div>

                                {/* Día selector */}
                                <div className="flex gap-1.5">
                                    {planEj.dias.map((d, i) => {
                                        const isDayDone = selectedSemana < sessionBasedWeekNum
                                            || (selectedSemana === sessionBasedWeekNum && i < currentDayIdx);
                                        const isCurrentDay = selectedSemana === sessionBasedWeekNum && i === currentDayIdx;
                                        return (
                                            <button key={i} onClick={() => { setSelectedDia(i); setExpandedEj(null); }}
                                                className={`relative flex-1 h-14 flex flex-col items-center justify-center rounded-2xl transition-all border overflow-hidden ${
                                                    selectedDia === i
                                                        ? 'bg-lime-400 text-black border-lime-400 shadow-sm'
                                                        : 'bg-[#111] text-white/50 border-white/[0.08] hover:border-white/20'
                                                }`}>
                                                <span className="text-sm font-bold leading-none">{`Día ${i + 1}`}</span>
                                                {isDayDone && (
                                                    <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-lime-400 flex items-center justify-center pointer-events-none">
                                                        <svg className="w-2 h-2 text-black" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                        </svg>
                                                    </span>
                                                )}
                                                {isCurrentDay && !isDayDone && selectedDia !== i && (
                                                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-lime-400" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {dia?.bloqueActivacion && (
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3">
                                        <p className="text-xs font-bold text-amber-400 mb-1">Bloque de activación</p>
                                        <p className="text-sm text-amber-300/80 leading-snug">{dia.bloqueActivacion}</p>
                                    </div>
                                )}

                                {dia && (
                                    <div className="bg-[#111] rounded-2xl border border-white/[0.07] overflow-hidden">
                                        <div className="grid grid-cols-[1fr_44px_76px_56px] border-b border-white/[0.07]">
                                            <div className="px-4 py-2.5">
                                                <p className="text-[8px] font-bold text-white/30 uppercase tracking-wide">Ejercicio</p>
                                            </div>
                                            <div className="px-1 py-2.5 flex items-center justify-center border-l border-white/[0.06]">
                                                <p className="text-[8px] font-bold text-white/30 uppercase tracking-wide text-center leading-tight">Trepada</p>
                                            </div>
                                            <div className="px-1 py-2.5 flex items-center justify-center border-l border-white/[0.06]">
                                                <p className="text-[8px] font-bold text-white/60 uppercase tracking-wide text-center leading-tight">Núcleo</p>
                                            </div>
                                            <div className="px-1 py-2.5 flex items-center justify-center border-l border-white/[0.06]">
                                                <p className="text-[8px] font-bold text-lime-400 uppercase tracking-wide text-center leading-tight">Mis KG</p>
                                            </div>
                                        </div>

                                        <div className="divide-y divide-white/[0.04]">
                                            {dia.ejercicios.map((ej, eIdx) => {
                                                const semVal = getSemanaField(ej, selectedSemana);
                                                const trepadaVal = getTrepadaField(ej, selectedSemana);
                                                const isExpanded = expandedEj === eIdx;
                                                const ci = ej.grupoCombo ? (comboIdx[ej.grupoCombo] ?? -1) : -1;
                                                const combo = ci >= 0 ? COMBO_PALETTE[ci % COMBO_PALETTE.length] : null;
                                                const prevEj = dia.ejercicios[eIdx - 1];
                                                const isFirstInCombo = combo && (!prevEj?.grupoCombo || prevEj.grupoCombo !== ej.grupoCombo);
                                                return (
                                                    <div key={eIdx} style={combo ? { backgroundColor: combo.bg } : undefined}>
                                                        <button onClick={() => setExpandedEj(isExpanded ? null : eIdx)}
                                                            className="w-full grid grid-cols-[1fr_44px_76px_56px] text-left hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]">
                                                            <div className="px-4 py-3 flex items-center gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    {isFirstInCombo && combo && (
                                                                        <div className="flex items-center gap-1 mb-0.5">
                                                                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: combo.dotColor }} />
                                                                            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: combo.labelColor }}>Combinado</span>
                                                                        </div>
                                                                    )}
                                                                    <p className="text-sm font-semibold text-white leading-tight">{ej.nombre}</p>
                                                                    {ej.kg && ej.kg !== '-' && (
                                                                        <p className="text-sm font-bold text-red-400 mt-0.5">{ej.kg} kg</p>
                                                                    )}
                                                                    {(() => {
                                                                        const obs = (ej[`observacionesAlumno${selectedSemana}` as keyof EjercicioAsignado] as string) || '';
                                                                        return obs ? <p className="text-[11px] text-white/30 mt-0.5 leading-snug">{obs}</p> : null;
                                                                    })()}
                                                                </div>
                                                                <IconChevron className={`w-3.5 h-3.5 text-white/20 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                            </div>
                                                            <div className="px-1 py-3 border-l border-white/[0.06] flex items-center justify-center">
                                                                <span className={`text-sm font-bold text-center leading-tight ${trepadaVal && trepadaVal !== '-' ? 'text-white/50' : 'text-white/10'}`}>
                                                                    {trepadaVal && trepadaVal !== '-' ? trepadaVal : '—'}
                                                                </span>
                                                            </div>
                                                            <div className="px-2 py-3 border-l border-white/[0.06] flex items-center justify-center">
                                                                <span className={`text-sm font-bold text-center leading-tight ${semVal ? 'text-white/80' : 'text-white/15'}`}>
                                                                    {semVal || '—'}
                                                                </span>
                                                            </div>
                                                            <div className="px-1 py-2 border-l border-white/[0.06] flex items-center justify-center">
                                                                {(() => {
                                                                    const kgVal = (ej[`kgAlumno${selectedSemana}` as keyof EjercicioAsignado] as string) || '';
                                                                    const kgParts = kgVal ? kgVal.split(',').map(v => v.trim()).filter(Boolean) : [];
                                                                    if (kgParts.length === 0) return <span className="text-xs font-bold text-white/15">—</span>;
                                                                    if (kgParts.length === 1) return <span className="text-sm font-bold text-lime-400">{kgParts[0]}</span>;
                                                                    return (
                                                                        <div className="grid grid-cols-2 gap-x-0.5 gap-y-0.5 w-full">
                                                                            {kgParts.map((kg, i) => (
                                                                                <span key={i} className="text-[10px] font-bold text-lime-400 text-center leading-tight">{kg}</span>
                                                                            ))}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </button>

                                                        {isExpanded && (() => {
                                                            const seriesCount = parseSeries(semVal);
                                                            const kgRaw = (ej[`kgAlumno${selectedSemana}` as keyof EjercicioAsignado] as string) || '';
                                                            const kgParts = kgRaw.split(',').map(v => v.trim());
                                                            while (kgParts.length < seriesCount) kgParts.push('');
                                                            return (
                                                                <div className="px-4 pb-4 pt-2 bg-white/[0.02] border-t border-white/[0.06] space-y-3">
                                                                    {ej.notas && <p className="text-xs text-white/30 italic">{ej.notas}</p>}
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div>
                                                                            <label className="text-xs font-bold text-white/30 uppercase tracking-wide mb-1.5 block">Trepada</label>
                                                                            <input type="text"
                                                                                value={(ej[`trepada${selectedSemana}` as keyof EjercicioAsignado] as string) || ''}
                                                                                onChange={(e) => updateEjAlumno(eIdx, `trepada${selectedSemana}`, e.target.value)}
                                                                                className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white bg-[#1a1a1a] focus:outline-none focus:border-lime-400/60 text-center"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-xs font-bold text-white/60 uppercase tracking-wide mb-1.5 block">Núcleo</label>
                                                                            <input type="text"
                                                                                value={semVal}
                                                                                onChange={(e) => updateEjAlumno(eIdx, `semana${selectedSemana}`, e.target.value)}
                                                                                className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white bg-[#1a1a1a] focus:outline-none focus:border-lime-400/60 text-center"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs font-bold text-white/30 uppercase tracking-wide mb-1.5 block">
                                                                            Mis KG{seriesCount > 1 && <span className="normal-case font-normal"> · {seriesCount} series</span>}
                                                                        </label>
                                                                        <div className={`grid gap-2 ${seriesCount === 1 ? 'grid-cols-1' : seriesCount <= 4 ? `grid-cols-${seriesCount}` : 'grid-cols-4'}`}>
                                                                            {Array.from({ length: seriesCount }, (_, si) => (
                                                                                <div key={si} className="flex flex-col gap-0.5">
                                                                                    {seriesCount > 1 && (
                                                                                        <span className="text-[10px] font-bold text-white/30 text-center">S{si + 1}</span>
                                                                                    )}
                                                                                    <input type="number" inputMode="decimal" placeholder="kg"
                                                                                        value={kgParts[si] || ''}
                                                                                        onChange={(e) => {
                                                                                            const newParts = [...kgParts];
                                                                                            newParts[si] = e.target.value;
                                                                                            updateEjAlumno(eIdx, `kgAlumno${selectedSemana}`, newParts.join(','));
                                                                                        }}
                                                                                        className="w-full border border-white/10 rounded-xl px-2 py-2.5 text-sm font-semibold text-white bg-[#1a1a1a] focus:outline-none focus:border-lime-400/60 text-center"
                                                                                    />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs font-bold text-white/30 uppercase tracking-wide">Observaciones</label>
                                                                        <input type="text"
                                                                            value={(ej[`observacionesAlumno${selectedSemana}` as keyof EjercicioAsignado] as string) || ''}
                                                                            onChange={(e) => updateEjAlumno(eIdx, `observacionesAlumno${selectedSemana}`, e.target.value)}
                                                                            className="mt-1 w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white bg-[#1a1a1a] focus:outline-none focus:border-lime-400/60"
                                                                        />
                                                                    </div>
                                                                    <button onClick={() => handleSaveEjercicio(eIdx)} disabled={savingEj === eIdx}
                                                                        className="w-full py-2.5 text-sm font-bold rounded-xl transition-all disabled:opacity-60 bg-lime-400 text-black hover:bg-lime-300 active:bg-lime-500">
                                                                        {savingEj === eIdx ? 'Guardando...' : 'Guardar'}
                                                                    </button>
                                                                </div>
                                                            );
                                                        })()}
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
