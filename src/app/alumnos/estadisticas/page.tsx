'use client'

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
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
    const { data: session } = useSession();
    const [alumnos, setAlumnos] = useState<Alumno[]>([]);
    const [topHorarios, setTopHorarios] = useState<{ hora: string; frecuencia: number }[]>([]);
    const [porActividad, setPorActividad] = useState<{ actividad: string; cantidad: number }[]>([]);
    const [porDia, setPorDia] = useState<{ fecha: string; cantidad: number }[]>([]);
    const [promedio, setPromedio] = useState<number>(0);

    if (session && session.user?.role !== 'dueño') {
        redirect('/');
    }

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

    return (
        <div className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-t-2xl px-6 py-5">
                <h1 className="text-xl font-bold text-white">Estadísticas</h1>
            </div>
            <div className="bg-white rounded-b-2xl shadow-xl p-6">
                <div className="grid gap-6">
                    <div>
                        <h3 className="text-base font-bold text-slate-700 mb-3">Top horarios Musculación</h3>
                        <TopHorariosChart topHorarios={topHorarios} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-700 mb-3">Asistencias por tipo de actividad</h3>
                        <ActividadChart data={porActividad} />
                    </div>
                </div>
            </div>
        </div>
    );
}
