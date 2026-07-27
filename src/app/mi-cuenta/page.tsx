'use client';

import { useEffect, useRef, useState } from 'react';

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
    nombre: string;
    apellido: string;
    dni: string;
    asistencia: Asistencia[];
    pagos: Pago[];
    planEntrenamiento: PlanEntrenamiento;
    gimnasioId: { nombre: string };
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DIAS_SEMANA = ['Lu','Ma','Mi','Ju','Vi','Sa','Do'];

const ACTIVIDAD_DOT: Record<string, string> = {
    'Musculación': 'bg-blue-500',
    'Intermitente': 'bg-orange-400',
    'Otro': 'bg-yellow-400',
};
const ACTIVIDAD_PILL: Record<string, string> = {
    'Musculación': 'bg-blue-50 text-blue-700 border border-blue-100',
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

const PULL_THRESHOLD = 72;

export default function MiCuentaPage() {
    const [alumno, setAlumno] = useState<Alumno | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'resumen' | 'historial'>('resumen');
    const [pullY, setPullY] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const touchStartY = useRef(0);
    const [loadingPago, setLoadingPago] = useState(false);
    const [pagoResult, setPagoResult] = useState<'ok' | 'error' | 'pendiente' | null>(null);

    const now = new Date();
    const [calYear, setCalYear] = useState(now.getFullYear());
    const [calMonth, setCalMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    async function fetchAlumno() {
        const r = await fetch('/api/alumno/me');
        const data = await r.json();
        setAlumno(data);
    }

    useEffect(() => {
        fetchAlumno().catch(() => {}).finally(() => setLoading(false));
        const params = new URLSearchParams(window.location.search);
        const pago = params.get('pago');
        if (pago === 'ok' || pago === 'error' || pago === 'pendiente') {
            setPagoResult(pago as 'ok' | 'error' | 'pendiente');
            window.history.replaceState({}, '', '/mi-cuenta');
        }
    }, []);

    function onTouchStart(e: React.TouchEvent) {
        touchStartY.current = e.touches[0].clientY;
    }

    function onTouchMove(e: React.TouchEvent) {
        if (refreshing || window.scrollY > 8) return;
        const dy = e.touches[0].clientY - touchStartY.current;
        if (dy > 0) setPullY(Math.min(dy, PULL_THRESHOLD + 24));
    }

    async function onTouchEnd() {
        if (pullY >= PULL_THRESHOLD && !refreshing) {
            setRefreshing(true);
            try { await fetchAlumno(); } catch {}
            setRefreshing(false);
        }
        setPullY(0);
    }

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

    async function handlePagarMercadoPago() {
        setLoadingPago(true);
        try {
            const res = await fetch('/api/pagos/mp/crear-preferencia', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'No se pudo iniciar el pago');
                return;
            }
            window.location.href = data.init_point;
        } catch {
            alert('Error al conectar con MercadoPago');
        } finally {
            setLoadingPago(false);
        }
    }

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

    const ultimasAsistencias: [string, Asistencia[]][] = Object.entries(asistenciasMap)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 5);

    const pullProgress = Math.min(pullY / PULL_THRESHOLD, 1);
    const indicatorH = refreshing ? 48 : Math.round(pullProgress * 48);

    return (
        <div
            className="max-w-lg mx-auto pt-16 pb-12 px-4"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >

            {/* ── PULL TO REFRESH INDICATOR ── */}
            <div
                className="flex items-center justify-center overflow-hidden transition-[height] duration-150"
                style={{ height: indicatorH }}
            >
                <div
                    className={`w-7 h-7 rounded-full border-2 border-slate-700 border-t-emerald-400 ${refreshing ? 'animate-spin' : 'transition-transform duration-75'}`}
                    style={refreshing ? undefined : { transform: `rotate(${pullProgress * 270}deg)` }}
                />
            </div>

            {/* ── PAGO RESULT BANNER ── */}
            {pagoResult && (
                <div className={`mb-4 rounded-2xl px-4 py-3 flex items-center gap-3 ${
                    pagoResult === 'ok'
                        ? 'bg-emerald-50 border border-emerald-200'
                        : pagoResult === 'pendiente'
                        ? 'bg-amber-50 border border-amber-200'
                        : 'bg-red-50 border border-red-200'
                }`}>
                    <span className="text-lg">
                        {pagoResult === 'ok' ? '✅' : pagoResult === 'pendiente' ? '⏳' : '❌'}
                    </span>
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
                    <button onClick={() => setPagoResult(null)} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* ── PROFILE BANNER ── */}
            <div className="relative bg-slate-900 rounded-3xl px-5 pt-6 pb-5 mb-5 overflow-hidden">
                <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
                <div className="absolute top-4 -right-2 w-16 h-16 rounded-full bg-white/5" />

                <div className="flex items-center gap-4 relative">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <span className="text-white font-bold text-xl tracking-wide">{initials}</span>
                    </div>
                    <div className="min-w-0">
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

                <div className="mt-4 flex items-center gap-2 relative">
                    <span className="bg-white/10 text-slate-300 text-xs font-medium px-3 py-1 rounded-full">
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
                {(['resumen', 'historial'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            tab === t
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        {t === 'resumen' ? 'Resumen' : 'Historial'}
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
                            <p className="text-slate-400 text-xs mt-1.5 font-medium capitalize">Asistencias en {mesActual}</p>
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
                                <p className="text-slate-400 text-xs mt-1.5 font-medium">
                                    ${pagoEsteMes.tarifa.toLocaleString('es-AR')}
                                </p>
                            ) : (
                                <p className="text-slate-400 text-xs mt-1.5 font-medium capitalize">{mesActual}</p>
                            )}
                        </div>
                    </div>

                    {/* Botón MercadoPago — solo si cuota pendiente */}
                    {!pagoEsteMes && (
                        <button
                            onClick={handlePagarMercadoPago}
                            disabled={loadingPago}
                            className="w-full flex items-center justify-center gap-2.5 bg-[#009EE3] hover:bg-[#0088CC] active:bg-[#007AB8] disabled:opacity-60 text-white font-bold rounded-2xl px-4 py-3.5 transition-colors shadow-sm"
                        >
                            {loadingPago ? (
                                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                                </svg>
                            )}
                            <span>{loadingPago ? 'Redirigiendo...' : 'Pagar cuota con MercadoPago'}</span>
                        </button>
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
                        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-100 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl">🏆</span>
                            </div>
                            <div>
                                <p className="text-red-800 font-bold text-sm">¡Plan completado!</p>
                                <p className="text-red-500 text-xs mt-0.5">Completaste todas las sesiones del plan</p>
                            </div>
                        </div>
                    )}

                    {/* Últimas asistencias */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-4 pt-4 pb-3 border-b border-slate-50">
                            <h3 className="text-slate-800 text-sm font-bold">Últimas asistencias</h3>
                        </div>
                        {ultimasAsistencias.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <p className="text-slate-400 text-sm">Sin asistencias registradas aún.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {ultimasAsistencias.map(([dateKey, asists]) => {
                                    const [, mo, dy] = dateKey.split('-').map(Number);
                                    return (
                                        <div key={dateKey} className="flex items-center gap-3 px-4 py-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex flex-col items-center justify-center flex-shrink-0 border border-slate-100">
                                                <span className="text-slate-800 font-bold text-sm leading-none">{dy}</span>
                                                <span className="text-slate-400 text-[10px] font-medium leading-none mt-0.5">{MESES_CORTO[mo - 1]}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {asists.map(a => (
                                                    <span key={a._id} className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${ACTIVIDAD_PILL[a.actividad] || 'bg-slate-100 text-slate-600'}`}>
                                                        {a.actividad}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
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
                                {MESES_CORTO[calMonth]} {calYear}
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
                                const isToday = key === toLocalDateKey(now.toISOString());
                                const isSelected = key === selectedDay;
                                const hasData = asists.length > 0 || pagos.length > 0;

                                return (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedDay(isSelected ? null : key)}
                                        className={`relative flex flex-col items-center py-1.5 rounded-xl transition-all ${
                                            isSelected
                                                ? 'bg-slate-900'
                                                : hasData
                                                ? 'hover:bg-slate-50'
                                                : 'cursor-default'
                                        }`}
                                    >
                                        <span className={`text-xs font-semibold leading-none mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                                            isSelected
                                                ? 'text-white'
                                                : isToday
                                                ? 'bg-slate-900 text-white'
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
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
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
                        </div>
                    </div>

                    {/* Detalle día */}
                    {selectedDay && (selectedAsistencias.length > 0 || selectedPagos.length > 0) && (
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
                            <h3 className="text-slate-800 font-bold text-sm capitalize">
                                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-AR', {
                                    weekday: 'long', day: 'numeric', month: 'long'
                                })}
                            </h3>

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
                            <p className="text-slate-400 text-xs mt-1.5 font-medium">asistencias</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
                            <p className="text-3xl font-bold text-slate-900">
                                ${Object.entries(pagosMap)
                                    .filter(([key]) => key.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`))
                                    .reduce((sum, [, ps]) => sum + ps.reduce((s, p) => s + p.tarifa, 0), 0)
                                    .toLocaleString('es-AR')}
                            </p>
                            <p className="text-slate-400 text-xs mt-1.5 font-medium">pagado</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
