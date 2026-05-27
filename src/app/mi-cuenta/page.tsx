'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

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
    'Otro': 'bg-slate-400',
};
const ACTIVIDAD_LABEL: Record<string, string> = {
    'Musculación': 'text-blue-600',
    'Intermitente': 'text-orange-500',
    'Otro': 'text-slate-500',
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

export default function MiCuentaPage() {
    const { data: session } = useSession();
    const [alumno, setAlumno] = useState<Alumno | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'resumen' | 'historial'>('resumen');

    const now = new Date();
    const [calYear, setCalYear] = useState(now.getFullYear());
    const [calMonth, setCalMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/alumno/me')
            .then(r => r.json())
            .then(data => { setAlumno(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="border-t-2 border-slate-300 rounded-full w-8 h-8 animate-spin" />
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

    return (
        <div className="max-w-lg mx-auto pb-10 px-4">

            {/* Header */}
            <div className="py-4 mb-4">
                <h1 className="text-xl font-bold text-white">
                    Hola, {alumno.nombre}
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">{(alumno.gimnasioId as any)?.nombre}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1 mb-5">
                {(['resumen', 'historial'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                            tab === t
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {t === 'resumen' ? 'Resumen' : 'Historial'}
                    </button>
                ))}
            </div>

            {/* ── RESUMEN ── */}
            {tab === 'resumen' && (
                <div className="space-y-3">

                    {/* Asistencias + Cuota */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-2xl p-4">
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">
                                Asistencias
                            </p>
                            <p className="text-4xl font-bold text-slate-900">{asistenciasEsteMes.length}</p>
                            <p className="text-slate-400 text-xs mt-1 capitalize">{mesActual}</p>
                        </div>

                        <div className="bg-white rounded-2xl p-4">
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">
                                Cuota
                            </p>
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                pagoEsteMes
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-red-50 text-red-500'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${pagoEsteMes ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                {pagoEsteMes ? 'Al día' : 'Pendiente'}
                            </div>
                            {pagoEsteMes && (
                                <p className="text-slate-400 text-xs mt-2">
                                    ${pagoEsteMes.tarifa.toLocaleString('es-AR')}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Plan */}
                    {tienePlan && (
                        <div className="bg-white rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-slate-700 text-sm font-semibold">Plan de entrenamiento</p>
                                <span className="text-xs text-slate-400">{asistenciasEnPlan}/{plan.duracion}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2">
                                <div
                                    className="bg-slate-800 h-1.5 rounded-full transition-all"
                                    style={{ width: `${Math.min((asistenciasEnPlan / (plan.duracion || 1)) * 100, 100)}%` }}
                                />
                            </div>
                            <p className="text-slate-400 text-xs">
                                {plan.diasRestantes != null ? `${plan.diasRestantes} sesiones restantes` : 'En curso'}
                            </p>
                        </div>
                    )}

                    {plan?.terminado && (
                        <div className="bg-white rounded-2xl p-4 text-center">
                            <p className="text-2xl mb-1">🏆</p>
                            <p className="text-slate-800 font-semibold text-sm">¡Plan completado!</p>
                        </div>
                    )}

                    {/* Últimas asistencias */}
                    <div className="bg-white rounded-2xl p-4">
                        <h3 className="text-slate-700 text-sm font-semibold mb-3">Últimas asistencias</h3>
                        {Object.keys(asistenciasMap).length === 0 ? (
                            <p className="text-slate-400 text-sm">Sin asistencias registradas.</p>
                        ) : (
                            <div className="space-y-2.5">
                                {Object.entries(asistenciasMap)
                                    .sort(([a], [b]) => b.localeCompare(a))
                                    .slice(0, 5)
                                    .flatMap(([, asists]) => asists)
                                    .map(a => (
                                        <div key={a._id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${ACTIVIDAD_DOT[a.actividad] || 'bg-slate-300'}`} />
                                                <span className={`text-sm font-medium ${ACTIVIDAD_LABEL[a.actividad] || 'text-slate-600'}`}>
                                                    {a.actividad}
                                                </span>
                                            </div>
                                            <span className="text-slate-400 text-xs">
                                                {new Date(a.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Cerrar sesión */}
                    <button
                        onClick={() => signOut()}
                        className="w-full bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-400 hover:text-slate-600 rounded-2xl py-3.5 text-sm font-medium transition-all"
                    >
                        Cerrar sesión
                    </button>
                </div>
            )}

            {/* ── HISTORIAL ── */}
            {tab === 'historial' && (
                <div className="space-y-3">

                    {/* Calendario */}
                    <div className="bg-white rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={prevMonth}
                                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors text-lg"
                            >
                                ‹
                            </button>
                            <span className="text-slate-800 font-semibold capitalize text-sm">
                                {MESES_CORTO[calMonth]} {calYear}
                            </span>
                            <button
                                onClick={nextMonth}
                                disabled={calYear === now.getFullYear() && calMonth === now.getMonth()}
                                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-30 text-lg"
                            >
                                ›
                            </button>
                        </div>

                        <div className="grid grid-cols-7 mb-2">
                            {DIAS_SEMANA.map(d => (
                                <div key={d} className="text-center text-slate-400 text-xs font-medium py-1">{d}</div>
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
                                        className={`relative flex flex-col items-center py-1.5 rounded-xl transition-colors ${
                                            isSelected
                                                ? 'bg-slate-900'
                                                : hasData
                                                ? 'hover:bg-slate-100'
                                                : 'cursor-default'
                                        }`}
                                    >
                                        <span className={`text-sm leading-none mb-1 ${
                                            isSelected
                                                ? 'text-white font-bold'
                                                : isToday
                                                ? 'bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs'
                                                : hasData
                                                ? 'text-slate-800 font-semibold'
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
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-slate-400 text-xs">Pago</span>
                            </div>
                        </div>
                    </div>

                    {/* Detalle día */}
                    {selectedDay && (selectedAsistencias.length > 0 || selectedPagos.length > 0) && (
                        <div className="bg-white rounded-2xl p-4 space-y-3">
                            <h3 className="text-slate-800 font-semibold text-sm capitalize">
                                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-AR', {
                                    weekday: 'long', day: 'numeric', month: 'long'
                                })}
                            </h3>

                            {selectedAsistencias.map(a => (
                                <div key={a._id} className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ACTIVIDAD_DOT[a.actividad] || 'bg-slate-300'}`} />
                                    <span className={`text-sm font-medium ${ACTIVIDAD_LABEL[a.actividad] || 'text-slate-600'}`}>
                                        {a.actividad}
                                    </span>
                                </div>
                            ))}

                            {selectedPagos.map(p => (
                                <div key={p._id} className="flex items-center justify-between bg-emerald-50 rounded-xl px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                        <span className="text-emerald-700 text-sm font-medium capitalize">Pago — {p.mes}</span>
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
                        <div className="bg-white rounded-2xl p-4 text-center">
                            <p className="text-3xl font-bold text-slate-900">
                                {Object.entries(asistenciasMap)
                                    .filter(([key]) => key.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`))
                                    .reduce((sum, [, a]) => sum + a.length, 0)}
                            </p>
                            <p className="text-slate-400 text-xs mt-1">asistencias</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 text-center">
                            <p className="text-3xl font-bold text-slate-900">
                                ${Object.entries(pagosMap)
                                    .filter(([key]) => key.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`))
                                    .reduce((sum, [, ps]) => sum + ps.reduce((s, p) => s + p.tarifa, 0), 0)
                                    .toLocaleString('es-AR')}
                            </p>
                            <p className="text-slate-400 text-xs mt-1">pagado</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
