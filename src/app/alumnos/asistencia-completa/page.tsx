'use client';
import React, { useEffect, useState } from 'react';

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

export default function HistorialAsistenciaPage() {
    const [alumnos, setAlumnos] = useState<Alumno[]>([]);

    useEffect(() => {
        const fetchAlumnos = async () => {
            const response = await fetch('/api/alumnos');
            if (response.ok) {
                const data = await response.json();
                setAlumnos(data);
            } else {
                console.error('Error fetching alumnos');
            }
        };

        fetchAlumnos();
    }, []);

    return (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded shadow-md">
            <h1 className="text-2xl font-semibold text-gray-800 mb-6">Historial Completo de Asistencia</h1>
            <table className="table-auto w-full text-left">
                <thead>
                    <tr>
                        <th className="px-4 py-2">Nombre</th>
                        <th className="px-4 py-2">DNI</th>
                        <th className="px-4 py-2">Historial de Asistencia</th>
                    </tr>
                </thead>
                <tbody>
                    {alumnos.map((alumno) => (
                        <tr key={alumno._id} className="border-t">
                            <td className="px-4 py-2">{alumno.nombre} {alumno.apellido}</td>
                            <td className="px-4 py-2">{alumno.dni}</td>
                            <td className="px-4 py-2">
                                {alumno.asistencia.length > 0 ? (
                                    <ul>
                                        {alumno.asistencia.map((asistencia, index) => (
                                            <li key={index}>
                                                {new Date(asistencia.fecha).toLocaleString()} - {asistencia.presente ? 'Presente' : 'Ausente'}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>No hay registros de asistencia</p>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
