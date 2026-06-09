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
        <div className="max-w-3xl mx-auto space-y-4">
            <div className="px-1 pt-1">
                <h1 className="text-2xl font-bold text-white">Historial de Asistencia</h1>
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 text-left text-xs text-slate-500 font-bold uppercase">Nombre</th>
                                <th className="px-4 py-3 text-left text-xs text-slate-500 font-bold uppercase">DNI</th>
                                <th className="px-4 py-3 text-left text-xs text-slate-500 font-bold uppercase">Historial</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {alumnos.map((alumno) => (
                                <tr key={alumno._id} className="hover:bg-slate-50 transition">
                                    <td className="px-4 py-3 font-semibold text-slate-800">{alumno.nombre} {alumno.apellido}</td>
                                    <td className="px-4 py-3 text-slate-600">{alumno.dni}</td>
                                    <td className="px-4 py-3">
                                        {alumno.asistencia.length > 0 ? (
                                            <ul className="space-y-0.5">
                                                {alumno.asistencia.map((asistencia, index) => (
                                                    <li key={index} className="text-xs text-slate-600">
                                                        {new Date(asistencia.fecha).toLocaleString()} — {asistencia.presente ? 'Presente' : 'Ausente'}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-slate-400 text-xs">Sin registros</p>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
