'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Asistencia = {
    _id: string;
    fecha: string;
    presente: boolean;
    actividad: string;
};

type Pago = {
    _id: string;
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
    _id: string;
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
        if (id) fetchAlumno();
    }, [id]);

    const fetchAlumno = async () => {
        try {
            const response = await fetch(`/api/alumnos/${id}`);
            if (response.ok) {
                const data = await response.json();
                setAlumno(data);
            } else {
                console.error('Error al obtener datos del alumno');
            }
        } catch (error) {
            console.error('Error en la solicitud:', error);
        }
    };

    if (!alumno) return <p>Cargando...</p>;

    return (
        <div className="max-w-2xl mx-auto bg-gray-50 p-8 rounded shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {alumno.nombre} {alumno.apellido}
            </h2>

            <div className="mb-4">
                <p><strong>DNI:</strong> {alumno.dni}</p>
                <p><strong>Fecha de Nacimiento:</strong> {new Date(alumno.fechaNacimiento).toLocaleDateString()}</p>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Plan de Entrenamiento</h3>
                <p><strong>Fecha de Inicio:</strong> {new Date(alumno.planEntrenamiento.fechaInicio).toLocaleDateString()}</p>
                <p><strong>Duración:</strong> {alumno.planEntrenamiento.duracion} días</p>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Asistencias</h3>
                {alumno.asistencia.length ? (
                    <ul className="list-disc pl-5">
                        {alumno.asistencia.map((asistencia) => (
                            <li key={asistencia._id}>
                                <strong>{new Date(asistencia.fecha).toLocaleDateString()}:</strong> {asistencia.actividad}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No hay registros de asistencia.</p>
                )}
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Pagos</h3>
                {alumno.pagos.length ? (
                    <ul className="list-disc pl-5">
                        {alumno.pagos.map((pago) => (
                            <li key={pago._id}>
                                <strong>{pago.mes}:</strong> ${pago.tarifa} - {pago.diasMusculacion} días/semana - Fecha: {new Date(pago.fechaPago).toLocaleDateString()}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No hay registros de pagos.</p>
                )}
            </div>
        </div>
    );
}
