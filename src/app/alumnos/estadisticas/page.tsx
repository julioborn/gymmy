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

    useEffect(() => {
        if (status !== 'loading' && !['dueño', 'admin'].includes(session?.user?.role ?? '')) {
            router.push('/');
        }
    }, [session, status, router]);

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

                // Actividad
                actividadCount[actividad] = (actividadCount[actividad] || 0) + 1;

                // Por día
                const dia = new Date(fecha).toISOString().split('T')[0];
                diaCount[dia] = (diaCount[dia] || 0) + 1;

                // Horario
                const hora = new Date(fecha).getHours();
                const minutos = new Date(fecha).getMinutes();
                let horarioRedondeado = minutos < 15 ? `${hora.toString().padStart(2, '0')}:00`
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

    return (
        <div className="max-w-5xl mx-auto pt-4 pb-12 px-4 space-y-4">

            {/* Banner */}
            <div className="bg-slate-900 rounded-3xl px-6 pt-6 pb-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-blue-500 rounded-2xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white leading-tight">Estadísticas</h1>
                    <p className="text-slate-400 text-xs mt-0.5">{alumnos.length} alumnos registrados</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                    <p className="text-2xl font-bold text-slate-800 leading-tight">{totalAsistencias}</p>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-1">Total asistencias</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                    <p className="text-2xl font-bold text-blue-600 leading-tight">{promedio}</p>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-1">Promedio / día</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                    <p className="text-2xl font-bold text-amber-600 leading-tight">{topHorarios[0]?.hora ?? '-'}</p>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-1">Hora pico</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                    <p className="text-lg font-bold text-emerald-600 leading-tight truncate">{actividadLider}</p>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-1">Actividad líder</p>
                </div>
            </div>

            {/* Charts — side by side on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Horarios Musculación</h3>
                    <TopHorariosChart topHorarios={topHorarios} />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Asistencias por actividad</h3>
                    <ActividadChart data={porActividad} />
                </div>
            </div>

        </div>
    );
}
