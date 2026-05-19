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

const ACTIVIDAD_COLOR: Record<string, string> = {
    'Musculación': 'bg-blue-500',
    'Intermitente': 'bg-orange-500',
    'Otro': 'bg-slate-400',
};
const ACTIVIDAD_TEXT: Record<string, string> = {
    'Musculación': 'text-blue-400',
    'Intermitente': 'text-orange-400',
    'Otro': 'text-slate-400',
};

function toLocalDateKey(fechaStr: string): string {
    const d = new Date(fechaStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getCalendarDays(year: number, month: number): (number | null)[] {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay + 6) % 7; // lunes = 0
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
                <div className="border-t-4 border-blue-500 rounded-full w-10 h-10 animate-spin" />
            </div>
        );
    }

    if (!alumno) {
        return <div className="text-red-400 text-center py-16">Error al cargar tus datos.</div>;
    }

    const mesActual = MESES[now.getMonth()];
    const anioActual = now.getFullYear();

    // Maps por fecha
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

    // Resumen
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

    // Calendario
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

    const selectedKey = selectedDay;
    const selectedAsistencias = selectedKey ? (asistenciasMap[selectedKey] || []) : [];
    const selectedPagos = selectedKey ? (pagosMap[selectedKey] || []) : [];

    return (
        <div className="max-w-lg mx-auto pb-10 px-4">
            {/* Header */}
            <div className="flex items-center justify-between py-4 mb-2">
                <div>
                    <h1 className="text-xl font-bold text-white">
                        Hola, {alumno.nombre} 👋
                    </h1>
                    <p className="text-slate-400 text-sm">{(alumno.gimnasioId as any)?.nombre}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-800 rounded-xl p-1 mb-5">
                {(['resumen', 'historial'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                            tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {t === 'resumen' ? 'Resumen' : 'Historial'}
                    </button>
                ))}
            </div>

            {/* ── RESUMEN ───────────────────────────────────────────── */}
            {tab === 'resumen' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                            <div className="text-slate-400 text-xs mb-1">Asistencias este mes</div>
                            <div className="text-3xl font-bold text-white">{asistenciasEsteMes.length}</div>
                            <div className="text-slate-500 text-xs mt-1 capitalize">{mesActual}</div>
                        </div>
                        <div className={`border rounded-xl p-4 ${pagoEsteMes ? 'bg-emerald-900/30 border-emerald-700' : 'bg-red-900/20 border-red-800'}`}>
                            <div className="text-slate-400 text-xs mb-1">Cuota {mesActual}</div>
                            <div className={`text-lg font-bold ${pagoEsteMes ? 'text-emerald-400' : 'text-red-400'}`}>
                                {pagoEsteMes ? '✓ Pagada' : '✗ Pendiente'}
                            </div>
                            {pagoEsteMes && (
                                <div className="text-slate-400 text-xs mt-1">
                                    ${pagoEsteMes.tarifa.toLocaleString('es-AR')}
                                </div>
                            )}
                        </div>
                    </div>

                    {tienePlan && (
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-slate-300 text-sm font-semibold">Plan de entrenamiento</span>
                                <span className="text-xs text-slate-500">{asistenciasEnPlan}/{plan.duracion} sesiones</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min((asistenciasEnPlan / (plan.duracion || 1)) * 100, 100)}%` }}
                                />
                            </div>
                            <div className="text-slate-400 text-xs">
                                {plan.diasRestantes != null ? `${plan.diasRestantes} sesiones restantes` : 'En curso'}
                            </div>
                        </div>
                    )}

                    {plan?.terminado && (
                        <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-4 text-center">
                            <div className="text-2xl mb-1">🏆</div>
                            <div className="text-emerald-400 font-semibold text-sm">¡Plan completado!</div>
                        </div>
                    )}

                    {/* Últimas 5 asistencias */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                        <h3 className="text-slate-300 text-sm font-semibold mb-3">Últimas asistencias</h3>
                        {Object.keys(asistenciasMap).length === 0 ? (
                            <p className="text-slate-500 text-sm">Sin asistencias registradas.</p>
                        ) : (
                            <div className="space-y-2">
                                {Object.entries(asistenciasMap)
                                    .sort(([a], [b]) => b.localeCompare(a))
                                    .slice(0, 5)
                                    .flatMap(([, asists]) => asists)
                                    .map(a => (
                                        <div key={a._id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${ACTIVIDAD_COLOR[a.actividad] || 'bg-slate-500'}`} />
                                                <span className="text-white text-sm">{a.actividad}</span>
                                            </div>
                                            <span className="text-slate-400 text-xs">
                                                {new Date(a.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── HISTORIAL (CALENDARIO) ────────────────────────────── */}
            {tab === 'historial' && (
                <div className="space-y-4">
                    {/* Navegación mes */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 text-slate-300 transition-colors">‹</button>
                            <span className="text-white font-semibold capitalize">
                                {MESES_CORTO[calMonth]} {calYear}
                            </span>
                            <button
                                onClick={nextMonth}
                                disabled={calYear === now.getFullYear() && calMonth === now.getMonth()}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-30"
                            >›</button>
                        </div>

                        {/* Cabecera días */}
                        <div className="grid grid-cols-7 mb-1">
                            {DIAS_SEMANA.map(d => (
                                <div key={d} className="text-center text-slate-500 text-xs font-medium py-1">{d}</div>
                            ))}
                        </div>

                        {/* Grilla */}
                        <div className="grid grid-cols-7 gap-y-1">
                            {calDays.map((day, i) => {
                                if (!day) return <div key={`empty-${i}`} />;

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
                                        className={`relative flex flex-col items-center py-1.5 rounded-lg transition-colors ${
                                            isSelected
                                                ? 'bg-slate-600'
                                                : hasData
                                                ? 'hover:bg-slate-700'
                                                : 'cursor-default'
                                        }`}
                                    >
                                        <span className={`text-sm leading-none mb-1 ${
                                            isToday
                                                ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold'
                                                : hasData ? 'text-white font-medium' : 'text-slate-500'
                                        }`}>
                                            {day}
                                        </span>

                                        {/* Puntos de actividades */}
                                        <div className="flex gap-0.5 flex-wrap justify-center max-w-[28px]">
                                            {asists.map((a, idx) => (
                                                <span
                                                    key={idx}
                                                    className={`w-1.5 h-1.5 rounded-full ${ACTIVIDAD_COLOR[a.actividad] || 'bg-slate-400'}`}
                                                />
                                            ))}
                                            {pagos.length > 0 && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Leyenda */}
                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-700 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                <span className="text-slate-400 text-xs">Musculación</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                <span className="text-slate-400 text-xs">Intermitente</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                <span className="text-slate-400 text-xs">Pago</span>
                            </div>
                        </div>
                    </div>

                    {/* Detalle del día seleccionado */}
                    {selectedDay && (selectedAsistencias.length > 0 || selectedPagos.length > 0) && (
                        <div className="bg-slate-800 border border-slate-600 rounded-xl p-4 space-y-3">
                            <h3 className="text-white font-semibold text-sm">
                                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-AR', {
                                    weekday: 'long', day: 'numeric', month: 'long'
                                })}
                            </h3>

                            {selectedAsistencias.map(a => (
                                <div key={a._id} className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ACTIVIDAD_COLOR[a.actividad] || 'bg-slate-400'}`} />
                                    <span className={`text-sm font-medium ${ACTIVIDAD_TEXT[a.actividad] || 'text-slate-300'}`}>
                                        {a.actividad}
                                    </span>
                                </div>
                            ))}

                            {selectedPagos.map(p => (
                                <div key={p._id} className="flex items-center justify-between bg-emerald-900/20 border border-emerald-800/50 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                                        <span className="text-emerald-300 text-sm font-medium capitalize">Pago — {p.mes}</span>
                                    </div>
                                    <span className="text-emerald-400 font-bold text-sm">
                                        ${p.tarifa.toLocaleString('es-AR')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Resumen del mes */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold text-white">
                                {Object.entries(asistenciasMap)
                                    .filter(([key]) => key.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`))
                                    .reduce((sum, [, a]) => sum + a.length, 0)}
                            </div>
                            <div className="text-slate-400 text-xs mt-0.5">asistencias</div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold text-emerald-400">
                                ${Object.entries(pagosMap)
                                    .filter(([key]) => key.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`))
                                    .reduce((sum, [, ps]) => sum + ps.reduce((s, p) => s + p.tarifa, 0), 0)
                                    .toLocaleString('es-AR')}
                            </div>
                            <div className="text-slate-400 text-xs mt-0.5">pagado</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
