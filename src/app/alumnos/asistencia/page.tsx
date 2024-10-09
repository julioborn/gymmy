'use client';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

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
            } else {
                console.error('Error fetching alumnos');
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
                icon: 'success',
                title: 'Asistencia registrada correctamente',
                showConfirmButton: false,
                timer: 1500,
            });
        } catch (error) {
            console.error(error);
            Swal.fire({
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
        <div className="max-w-3xl mx-auto bg-white p-8 rounded shadow-md">
            <h1 className="text-2xl font-semibold text-gray-800 mb-6">Asistencia de Alumnos</h1>
            <table className="table-auto w-full text-left">
                <thead>
                    <tr>
                        <th className="px-4 py-2">Nombre</th>
                        <th className="px-4 py-2">DNI</th>
                        <th className="px-4 py-2">Registrar Asistencia</th>
                        <th className="px-4 py-2">Asistencias</th>
                    </tr>
                </thead>
                <tbody>
                    {alumnos.map((alumno) => {
                        const asistenciaHoy = yaAsistioHoy(alumno.asistencia);
                        return (
                            <tr key={alumno._id} className="border-t">
                                <td className="px-4 py-2">{alumno.nombre} {alumno.apellido}</td>
                                <td className="px-4 py-2">{alumno.dni}</td>
                                <td className="px-4 py-2">
                                    {asistenciaHoy ? (
                                        <div>
                                            <span className="text-green-600">Presente hoy</span>
                                            <br />
                                            <span className="text-gray-600 text-sm">
                                                {`${obtenerDiaSemana(new Date(asistenciaHoy.fecha))}, ${new Date(asistenciaHoy.fecha).toLocaleString()}`}
                                            </span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleAsistenciaChange(alumno._id)}
                                            className="bg-green-600 text-white p-2 rounded text-sm"
                                        >
                                            Marcar Presente
                                        </button>
                                    )}
                                </td>
                                <td className="px-4 py-2">
                                    <button
                                        onClick={() => router.push(`/alumnos/${alumno._id}/historial`)}
                                        className="bg-gray-600 text-white p-2 rounded text-sm"
                                    >
                                        Ver Historial
                                    </button></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
