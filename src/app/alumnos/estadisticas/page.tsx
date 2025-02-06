'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import TopHorariosChart from '@/components/TopHorariosChart';

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

const Estadisticas = () => {
    const { data: session } = useSession();
    const [alumnos, setAlumnos] = useState<Alumno[]>([]);
    const [topHorarios, setTopHorarios] = useState<{ hora: string; frecuencia: number }[]>([]);

    if (session && session.user?.role !== 'dueño') {
        redirect('/');
    }

    useEffect(() => {
        fetch('/api/alumnos')
            .then((res) => res.json())
            .then((data) => {
                setAlumnos(data);
                calcularTopHorarios(data);
            })
            .catch((error) => console.error('Error al cargar alumnos:', error));
    }, []);

    const calcularTopHorarios = (alumnos: Alumno[]) => {
        const horarioFrecuencia: { [hora: string]: number } = {};

        alumnos.forEach((alumno) => {
            alumno.asistencia
                .filter((asistencia) => asistencia.actividad === 'Musculación' && asistencia.presente)
                .forEach((asistencia) => {
                    const fecha = new Date(asistencia.fecha);
                    const horas = fecha.getHours();
                    const minutos = fecha.getMinutes();

                    let horarioRedondeado: string;
                    if (minutos < 15) {
                        horarioRedondeado = `${horas.toString().padStart(2, '0')}:00`;
                    } else if (minutos < 45) {
                        horarioRedondeado = `${horas.toString().padStart(2, '0')}:30`;
                    } else {
                        horarioRedondeado = `${(horas + 1).toString().padStart(2, '0')}:00`;
                    }

                    horarioFrecuencia[horarioRedondeado] = (horarioFrecuencia[horarioRedondeado] || 0) + 1;
                });
        });

        const top3 = Object.entries(horarioFrecuencia)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([hora, frecuencia]) => ({ hora, frecuencia }));

        setTopHorarios(top3);
    };

    return (
        <div className="bg-white p-6 rounded shadow-md max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Estadísticas</h2>
            <TopHorariosChart topHorarios={topHorarios} />
        </div>
    );
};

export default Estadisticas;
