'use client';
import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useParams } from 'next/navigation';

type Asistencia = {
    fecha: string;  // Fecha de la asistencia
    presente: boolean; // Si estuvo presente o no
};

type Alumno = {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    asistencia: Asistencia[];
};

export default function HistorialAlumnoPage() {
    const [alumno, setAlumno] = useState<Alumno | null>(null);
    const params = useParams();
    const { id } = params; // Extraer el ID del alumno desde la URL

    useEffect(() => {
        const fetchAlumno = async () => {
            const response = await fetch(`/api/alumnos/${id}`);
            if (response.ok) {
                const data = await response.json();
                setAlumno(data);
            } else {
                console.error('Error fetching alumno');
            }
        };

        if (id) {
            fetchAlumno();
        }
    }, [id]);

    if (!alumno) {
        return <p>Cargando...</p>;
    }

    // Transformar las asistencias en eventos para el calendario
    const events = alumno.asistencia.map((asistencia) => ({
        title: asistencia.presente ? 'Presente' : 'Ausente',
        start: asistencia.fecha,
        color: asistencia.presente ? '#28a745' : '#dc3545', // Verde para presente, rojo para ausente
    }));

    return (
        <div className="max-w-5xl mx-auto bg-white p-8 rounded shadow-md">
            <h1 className="text-2xl font-semibold text-gray-800 mb-1">Asistencias</h1>
            <h2 className="text-2xl font-light text-gray-800 mb-4">{alumno.nombre} {alumno.apellido}</h2>
            <FullCalendar
                firstDay={1}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={events}
                locale="es" 
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,dayGridWeek,dayGridDay',
                }}
                buttonText={{
                    today: 'Hoy',
                    month: 'Mes',
                    week: 'Semana',
                    day: 'Día',
                }}
                height="auto"
            />
        </div>
    );
}
