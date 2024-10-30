// alumnos/[id]/ficha/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Asistencia = {
    fecha: string;
    presente: boolean;
    actividad: string;
};

type Pago = {
    mes: string;
    fechaPago: string;
    tarifa: number;
    diasMusculacion: number;
};

type PlanEntrenamiento = {
    fechaInicio: string;
    duracion: number;
};

type Alumno = {
    nombre: string;
    apellido: string;
    dni: string;
    fechaNacimiento: string;
    asistencia: Asistencia[];
    pagos: Pago[];
    planEntrenamiento: PlanEntrenamiento;
};

export default function FichaAlumno() {
    const { id } = useParams();
    const [alumno, setAlumno] = useState<Alumno | null>(null);

    useEffect(() => {
        const fetchAlumno = async () => {
            const response = await fetch(`/api/alumnos/${id}`);
            if (response.ok) {
                const data = await response.json();
                setAlumno(data);
            } else {
                console.error('Error al obtener los datos del alumno');
            }
        };
        fetchAlumno();
    }, [id]);

    if (!alumno) {
        return <p>Cargando...</p>;
    }

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 shadow rounded-lg">
            <h1 className="text-2xl font-bold mb-4">Ficha de {alumno.nombre} {alumno.apellido}</h1>
            <p><strong>DNI:</strong> {alumno.dni}</p>
            <p><strong>Fecha de Nacimiento:</strong> {new Date(alumno.fechaNacimiento).toLocaleDateString()}</p>

            {/* <div className="my-6">
                <h2 className="text-xl font-semibold">Plan de Entrenamiento</h2>
                <p><strong>Inicio:</strong> {new Date(alumno.planEntrenamiento.fechaInicio).toLocaleDateString()}</p>
                <p><strong>Duración:</strong> {alumno.planEntrenamiento.duracion} días</p>
            </div> */}

            <div className="my-6">
                <h2 className="text-xl font-semibold">Pagos</h2>
                <ul className="list-disc pl-5">
                    {alumno.pagos.map((pago, index) => (
                        <li key={index}>
                            <p><strong>Mes:</strong> {pago.mes}</p>
                            <p><strong>Fecha de Pago:</strong> {new Date(pago.fechaPago).toLocaleDateString()}</p>
                            <p><strong>Tarifa:</strong> ${pago.tarifa}</p>
                            <p><strong>Días de Musculación:</strong> {pago.diasMusculacion}</p>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="my-6">
                <h2 className="text-xl font-semibold">Asistencias</h2>
                <ul className="list-disc pl-5">
                    {alumno.asistencia.map((asistencia, index) => (
                        <li key={index}>
                            <p><strong>Fecha:</strong> {new Date(asistencia.fecha).toLocaleDateString()}</p>
                            <p><strong>Actividad:</strong> {asistencia.actividad}</p>
                            <p><strong>Presente:</strong> {asistencia.presente ? 'Sí' : 'No'}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}