'use client'

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, animate } from 'framer-motion';
import { TrendingUp, Clock3, Dumbbell, Users, UserCheck, UserX } from 'lucide-react';
import TopHorariosChart from '@/components/TopHorariosChart';
import ActividadChart from '@/components/ActividadChart';

// ─── Magic UI: entrance + counter ──────────────────────────────────────────
function NumberTicker({ value }: { value: number }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const ctrl = animate(0, value, {
            duration: 1,
            ease: [0.16, 1, 0.3, 1],
            onUpdate(v) { setDisplay(Math.floor(v)); },
        });
        return ctrl.stop;
    }, [value]);
    return <>{display}</>;
}
function BlurFade({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, filter: 'blur(8px)', y: 12 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    );
}

type Asistencia = {
    fecha: string;
    actividad: string;
    presente: boolean;
};

type Alumno = {
    _id: string;
    nombre: string;
    apellido: string;
    asistencia: Asistencia[];
};

// ─── Glass card helper ──────────────────────────────────────────────────────
function glassStyle(rgb: string, intensity: 'neutral' | 'glow' = 'glow') {
    if (intensity === 'neutral') {
        return { background: 'linear-gradient(165deg, rgba(255,255,255,0.05), rgba(17,17,17,0.9))', border: '1px solid rgba(255,255,255,0.1)' } as React.CSSProperties;
    }
    return {
        background: `linear-gradient(165deg, rgba(${rgb},0.09), rgba(17,17,17,0.9))`,
        border: `1px solid rgba(${rgb},0.32)`,
        boxShadow: `0 0 0 1px rgba(${rgb},0.05) inset, 0 10px 26px -9px rgba(${rgb},0.34)`,
    } as React.CSSProperties;
}

const chartDarkScales = {
    y: { beginAtZero: true, ticks: { precision: 0, color: 'rgba(255,255,255,0.45)' }, grid: { color: 'rgba(255,255,255,0.07)' } },
    x: { ticks: { color: 'rgba(255,255,255,0.45)' }, grid: { color: 'rgba(255,255,255,0.04)' } },
};

export default function Estadisticas() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [alumnos, setAlumnos] = useState<Alumno[]>([]);
    const [topHorarios, setTopHorarios] = useState<{ hora: string; frecuencia: number }[]>([]);
    const [porActividad, setPorActividad] = useState<{ actividad: string; cantidad: number }[]>([]);
    const [porDia, setPorDia] = useState<{ fecha: string; cantidad: number }[]>([]);
    const [promedio, setPromedio] = useState<number>(0);
    const [alumnosActivos, setAlumnosActivos] = useState<number>(0);
    const [acento, setAcento] = useState('#10b981');
    const [acento2, setAcento2] = useState('#f97316');

    useEffect(() => {
        if (status !== 'loading' && !['dueño', 'admin'].includes(session?.user?.role ?? '')) {
            router.push('/');
        }
    }, [session, status, router]);

    useEffect(() => {
        fetch('/api/gimnasio/tema')
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d?.temaAcento) setAcento(d.temaAcento);
                if (d?.temaAcento2) setAcento2(d.temaAcento2);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetch('/api/alumnos')
            .then(res => res.json())
            .then(data => {
                setAlumnos(data);
                calcularEstadisticas(data);
            });
    }, []);

    const calcularEstadisticas = (alumnos: Alumno[]) => {
        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

        const actividadCount: Record<string, number> = {};
        const diaCount: Record<string, number> = {};
        const horarioFrecuencia: Record<string, number> = {};
        const alumnosActivosSet = new Set<string>();

        alumnos.forEach(alumno => {
            alumno.asistencia.forEach(({ fecha, actividad, presente }) => {
                if (!presente) return;
                const fechaObj = new Date(fecha);
                if (fechaObj < inicioMes) return;

                actividadCount[actividad] = (actividadCount[actividad] || 0) + 1;
                alumnosActivosSet.add(alumno._id);

                const dia = fechaObj.toISOString().split('T')[0];
                diaCount[dia] = (diaCount[dia] || 0) + 1;

                const hora = fechaObj.getHours();
                const minutos = fechaObj.getMinutes();
                const horarioRedondeado = minutos < 15 ? `${hora.toString().padStart(2, '0')}:00`
                    : minutos < 45 ? `${hora.toString().padStart(2, '0')}:30`
                    : `${((hora + 1) % 24).toString().padStart(2, '0')}:00`;
                horarioFrecuencia[horarioRedondeado] = (horarioFrecuencia[horarioRedondeado] || 0) + 1;
            });
        });

        const actividadData = Object.entries(actividadCount).map(([actividad, cantidad]) => ({ actividad, cantidad }));
        const diaData = Object.entries(diaCount).sort().map(([fecha, cantidad]) => ({ fecha, cantidad }));
        const top3 = Object.entries(horarioFrecuencia)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([hora, frecuencia]) => ({ hora, frecuencia }));

        setPorActividad(actividadData);
        setPorDia(diaData);
        setTopHorarios(top3);
        setPromedio(diaData.length ? Math.round(Object.values(diaCount).reduce((a, b) => a + b, 0) / diaData.length) : 0);
        setAlumnosActivos(alumnosActivosSet.size);
    };

    const actividadLider = [...porActividad].sort((a, b) => b.cantidad - a.cantidad)[0]?.actividad ?? '-';
    const mesActual = new Date().toLocaleDateString('es-AR', { month: 'long' });
    const sinAsistenciaMes = Math.max(alumnos.length - alumnosActivos, 0);

    return (
        <div className="max-w-7xl mx-auto pt-4 pb-12 px-4 lg:px-8 space-y-4">

            {/* Banner */}
            <BlurFade delay={0}>
                <div className="rounded-[2rem] p-[1.5px]" style={{ background: `linear-gradient(135deg, ${acento} 0%, ${acento2} 100%)`, boxShadow: `0 0 28px -9px ${acento}50, 0 0 36px -14px ${acento2}38` }}>
                    <div className="relative bg-[#111] rounded-[30px] px-5 pt-5 pb-5 overflow-hidden">
                        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                        <div className="pointer-events-none absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20" style={{ background: acento }} />
                        <div className="pointer-events-none absolute -bottom-8 -left-4 w-40 h-40 rounded-full blur-3xl opacity-15" style={{ background: acento2 }} />
                        <div className="relative flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${acento}, ${acento2})` }}>
                                <TrendingUp size={20} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">Resumen general</p>
                                <h1 className="text-xl font-bold text-white leading-tight">Estadísticas</h1>
                            </div>
                            <span className="ml-auto flex items-center gap-1.5 bg-white/10 ring-1 ring-white/10 text-white/80 text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0">
                                <Users size={11} />
                                {alumnos.length}
                            </span>
                        </div>
                    </div>
                </div>
            </BlurFade>

            {/* KPI Cards — {mesActual} */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <BlurFade delay={0.05}>
                    <div className="rounded-2xl p-4 h-full" style={glassStyle('14,165,233')}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#0ea5e9' }}>
                                <TrendingUp size={14} className="text-white" />
                            </div>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Promedio / día</p>
                        </div>
                        <p className="text-3xl font-bold leading-none text-white tabular-nums">{promedio}</p>
                        <p className="text-white/30 text-[10px] font-semibold mt-1.5 capitalize">{mesActual}</p>
                    </div>
                </BlurFade>
                <BlurFade delay={0.1}>
                    <div className="rounded-2xl p-4 h-full" style={glassStyle('139,92,246')}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#8b5cf6' }}>
                                <UserCheck size={14} className="text-white" />
                            </div>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Alumnos activos</p>
                        </div>
                        <p className="text-3xl font-bold leading-none text-white tabular-nums"><NumberTicker value={alumnosActivos} /></p>
                        <p className="text-white/30 text-[10px] font-semibold mt-1.5 capitalize">{mesActual}</p>
                    </div>
                </BlurFade>
                <BlurFade delay={0.15}>
                    <div className="rounded-2xl p-4 h-full" style={glassStyle('245,158,11')}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#f59e0b' }}>
                                <Clock3 size={14} className="text-white" />
                            </div>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Hora pico</p>
                        </div>
                        <p className="text-3xl font-bold leading-none text-white tabular-nums">{topHorarios[0]?.hora ?? '-'}</p>
                    </div>
                </BlurFade>
                <BlurFade delay={0.2}>
                    <div className="rounded-2xl p-4 h-full" style={glassStyle('163,230,53')}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#a3e635' }}>
                                <Dumbbell size={14} className="text-white" />
                            </div>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Actividad líder</p>
                        </div>
                        <p className="text-xl font-bold leading-tight text-white truncate">{actividadLider}</p>
                    </div>
                </BlurFade>
                <BlurFade delay={0.25}>
                    <div className="rounded-2xl p-4 h-full" style={glassStyle('239,68,68')}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#ef4444' }}>
                                <UserX size={14} className="text-white" />
                            </div>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Sin asistencia</p>
                        </div>
                        <p className="text-3xl font-bold leading-none text-white tabular-nums"><NumberTicker value={sinAsistenciaMes} /></p>
                        <p className="text-white/30 text-[10px] font-semibold mt-1.5 capitalize">{mesActual}</p>
                    </div>
                </BlurFade>
            </div>

            {/* Charts — side by side on desktop */}
            <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-4 lg:space-y-0">
                <BlurFade delay={0.25}>
                    <div className="rounded-2xl p-4" style={glassStyle('0,0,0', 'neutral')}>
                        <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">Horarios Musculación</h3>
                        <TopHorariosChart topHorarios={topHorarios} color={acento2} scales={chartDarkScales} />
                    </div>
                </BlurFade>

                <BlurFade delay={0.3}>
                    <div className="rounded-2xl p-4" style={glassStyle('0,0,0', 'neutral')}>
                        <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">Asistencias por actividad</h3>
                        <ActividadChart data={porActividad} colors={[acento, acento2]} scales={chartDarkScales} />
                    </div>
                </BlurFade>
            </div>

        </div>
    );
}
