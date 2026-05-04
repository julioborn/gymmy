'use client';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { swalNotify } from '@/utils/swalConfig';

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

export default function AsistenciaSemanaPage() {
    const [alumnos, setAlumnos] = useState<Alumno[]>([]);
    const router = useRouter(); // Inicializamos el router

    useEffect(() => {
        const fetchAlumnos = async () => {
            const response = await fetch('/api/alumnos');
            if (response.ok) {
                const data = await response.json();
                setAlumnos(data);
            }
        };

        fetchAlumnos();
    }, []);

    // Función para verificar si el alumno ya tiene asistencia para el día de hoy
    const yaAsistioHoy = (asistencias: Asistencia[]): Asistencia | null => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);  // Establecer la hora a las 00:00:00 para comparar solo fechas

        const asistenciaHoy = asistencias.find(asistencia => {
            const fechaAsistencia = new Date(asistencia.fecha);
            fechaAsistencia.setHours(0, 0, 0, 0);
            return fechaAsistencia.getTime() === hoy.getTime() && asistencia.presente;
        });

        return asistenciaHoy || null;
    };

    const handleAsistenciaChange = async (alumnoId: string) => {
        const fecha = new Date();  // Generar la fecha y hora actual
        const presente = true;  // El alumno está presente

        try {
            const response = await fetch(`/api/asistencias/${alumnoId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fecha, presente }),  // Enviar la fecha y el estado de asistencia
            });

            if (!response.ok) {
                throw new Error('Error al registrar asistencia');
            }

            const data = await response.json();
            setAlumnos((prevAlumnos) =>
                prevAlumnos.map((alumno) =>
                    alumno._id === alumnoId
                        ? { ...alumno, asistencia: [...alumno.asistencia, { fecha: fecha.toISOString(), presente }] }
                        : alumno
                )
            );

            // Alerta de éxito con SweetAlert
            Swal.fire({
                ...swalNotify,
                icon: 'success',
                title: 'Asistencia registrada correctamente',
                showConfirmButton: false,
                timer: 1500,
            });
        } catch {
            Swal.fire({
                ...swalNotify,
                icon: 'error',
                title: 'Error al registrar asistencia',
                text: 'Hubo un problema al registrar la asistencia.',
            });
        }
    };

    const obtenerDiaSemana = (fecha: Date): string => {
        const diasSemana = [
            'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
        ];
        return diasSemana[fecha.getDay()];
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-t-2xl px-6 py-5">
                <h1 className="text-xl font-bold text-white">Asistencia de Alumnos</h1>
            </div>
            <div className="bg-white rounded-b-2xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gradient-to-r from-slate-700 to-slate-600">
                                <th className="px-4 py-3 text-left text-xs text-slate-200 font-bold uppercase">Nombre</th>
                                <th className="px-4 py-3 text-left text-xs text-slate-200 font-bold uppercase">DNI</th>
                                <th className="px-4 py-3 text-left text-xs text-slate-200 font-bold uppercase">Asistencia</th>
                                <th className="px-4 py-3 text-left text-xs text-slate-200 font-bold uppercase">Historial</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {alumnos.map((alumno) => {
                                const asistenciaHoy = yaAsistioHoy(alumno.asistencia);
                                return (
                                    <tr key={alumno._id} className="hover:bg-slate-50 transition">
                                        <td className="px-4 py-3 font-semibold text-slate-800">{alumno.nombre} {alumno.apellido}</td>
                                        <td className="px-4 py-3 text-slate-600">{alumno.dni}</td>
                                        <td className="px-4 py-3">
                                            {asistenciaHoy ? (
                                                <div>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Presente hoy</span>
                                                    <p className="text-xs text-slate-400 mt-0.5">{`${obtenerDiaSemana(new Date(asistenciaHoy.fecha))}, ${new Date(asistenciaHoy.fecha).toLocaleString()}`}</p>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleAsistenciaChange(alumno._id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition">
                                                    Marcar Presente
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => router.push(`/alumnos/${alumno._id}/historial`)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition">
                                                Ver Historial
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
