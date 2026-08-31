'use client'

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import TopHorariosChart from '@/components/TopHorariosChart';
import ActividadChart from '@/components/ActividadChart';

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

export default function Estadisticas() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [alumnos, setAlumnos] = useState<Alumno[]>([]);
    const [topHorarios, setTopHorarios] = useState<{ hora: string; frecuencia: number }[]>([]);
    const [porActividad, setPorActividad] = useState<{ actividad: string; cantidad: number }[]>([]);
    const [porDia, setPorDia] = useState<{ fecha: string; cantidad: number }[]>([]);
    const [promedio, setPromedio] = useState<number>(0);
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
        const actividadCount: Record<string, number> = {};
        const diaCount: Record<string, number> = {};
        const horarioFrecuencia: Record<string, number> = {};

        alumnos.forEach(alumno => {
            alumno.asistencia.forEach(({ fecha, actividad, presente }) => {
                if (!presente) return;

                actividadCount[actividad] = (actividadCount[actividad] || 0) + 1;

                const dia = new Date(fecha).toISOString().split('T')[0];
                diaCount[dia] = (diaCount[dia] || 0) + 1;

                const hora = new Date(fecha).getHours();
                const minutos = new Date(fecha).getMinutes();
                const horarioRedondeado = minutos < 15 ? `${hora.toString().padStart(2, '0')}:00`
                    : minutos < 45 ? `${hora.toString().padStart(2, '0')}:30`
                    : `${(hora + 1).toString().padStart(2, '0')}:00`;
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
        setPromedio(diaData.length ? Math.round((Object.values(diaCount).reduce((a, b) => a + b, 0) / diaData.length) * 100) / 100 : 0);
    };

    const totalAsistencias = porDia.reduce((a, b) => a + b.cantidad, 0);
    const actividadLider = [...porActividad].sort((a, b) => b.cantidad - a.cantidad)[0]?.actividad ?? '-';

    const card = 'bg-white border border-black/[0.07] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_14px_rgba(0,0,0,0.04)] p-4';
    const lbl = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest';
    const num = 'text-3xl font-bold leading-none';

    return (
        <div className="max-w-lg mx-auto pt-4 pb-12 px-4 space-y-5">

            {/* Banner */}
            <div className="relative bg-[#111] rounded-2xl px-5 pt-5 pb-5 overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.05),transparent_55%)]" />
                <div className="pointer-events-none absolute -bottom-8 -right-4 w-36 h-36 rounded-full blur-3xl opacity-25" style={{ background: acento2 }} />
                <div className="relative">
                    <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest">Resumen general</p>
                    <h1 className="text-xl font-bold text-white mt-0.5">Estadísticas</h1>
                    <div className="flex items-center gap-2 mt-2.5">
                        <span className="bg-white/10 ring-1 ring-white/10 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                            {alumnos.length} alumnos
                        </span>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className={card}>
                    <p className={`${lbl} mb-2`}>Total asistencias</p>
                    <p className={`${num} text-slate-900`}>{totalAsistencias}</p>
                </div>
                <div className={card}>
                    <p className={`${lbl} mb-2`}>Promedio / día</p>
                    <p className={`${num} text-slate-900`}>{promedio}</p>
                </div>
                <div className={card}>
                    <p className={`${lbl} mb-2`}>Hora pico</p>
                    <p className={`${num}`} style={{ color: acento2 }}>{topHorarios[0]?.hora ?? '-'}</p>
                </div>
                <div className={card}>
                    <p className={`${lbl} mb-2`}>Actividad líder</p>
                    <p className="text-xl font-bold leading-tight truncate" style={{ color: acento }}>{actividadLider}</p>
                </div>
            </div>

            {/* Charts */}
            <div className={card}>
                <h3 className={`${lbl} mb-4`}>Horarios Musculación</h3>
                <TopHorariosChart topHorarios={topHorarios} color={acento2} />
            </div>

            <div className={card}>
                <h3 className={`${lbl} mb-4`}>Asistencias por actividad</h3>
                <ActividadChart data={porActividad} colors={[acento, acento2]} />
            </div>

        </div>
    );
}
