'use client';

import { useParams } from 'next/navigation';
import { useAlumno } from '@/hooks/useAlumno';
import { useState } from 'react';
import Swal from 'sweetalert2';

export default function AsistenciasPage() {
    const { id } = useParams();
    const { alumno, loading } = useAlumno(id as string);
    const [filtroActividad, setFiltroActividad] = useState('Todas');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [orden, setOrden] = useState<'recientes' | 'antiguos'>('recientes');

    const Loader = () => (
        <div className="flex justify-center items-center h-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-700"></div>
        </div>
    );

    if (loading || !alumno) {
        return <Loader />;
    }

    const asistencias = alumno.asistencia || [];

    const asistenciasFiltradas = asistencias
        .filter((asistencia: any) => {
            const fecha = new Date(asistencia.fecha);

            const dentroDeRango =
                (!fechaDesde || fecha >= new Date(fechaDesde)) &&
                (!fechaHasta || fecha <= new Date(fechaHasta));

            const coincideActividad =
                filtroActividad === 'Todas' || asistencia.actividad === filtroActividad;

            return dentroDeRango && coincideActividad;
        })
        .sort((a: any, b: any) =>
            orden === 'recientes'
                ? new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
                : new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );

    const handleAgregarAsistencia = async () => {
        const { value: actividad } = await Swal.fire({
            title: 'Seleccionar tipo de actividad',
            input: 'select',
            inputOptions: {
                Musculación: 'Musculación',
                Intermitente: 'Intermitente',
                Otro: 'Otro',
            },
            inputPlaceholder: 'Selecciona una actividad',
            showCancelButton: true,
            confirmButtonText: 'Siguiente',
        });

        if (!actividad) return;

        const { value: fecha } = await Swal.fire({
            title: 'Seleccionar fecha',
            input: 'date',
            inputLabel: 'Fecha de asistencia',
            inputPlaceholder: 'Selecciona una fecha',
            inputValue: new Date().toISOString().split('T')[0],
            showCancelButton: true,
            confirmButtonText: 'Siguiente',
        });

        if (!fecha) return;

        const { value: hora } = await Swal.fire({
            title: 'Seleccionar hora',
            input: 'time',
            inputLabel: 'Hora de asistencia',
            inputPlaceholder: 'Selecciona una hora',
            showCancelButton: true,
            confirmButtonText: 'Registrar',
        });

        if (!hora) return;

        const fechaCompleta = new Date(`${fecha}T${hora}:00`);

        try {
            const response = await fetch(`/api/asistencias/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    actividad,
                    fecha: fechaCompleta,
                    presente: true,
                }),
            });

            if (!response.ok) throw new Error('Error al registrar asistencia');

            Swal.fire('Asistencia registrada con éxito', '', 'success');
            location.reload(); // o mejor: fetchAlumno() si lo tenés implementado
        } catch (error) {
            Swal.fire('Error', 'No se pudo registrar la asistencia', 'error');
            console.error(error);
        }
    };

    const handleEditarAsistencia = async (asistencia: any) => {
        const { value: nuevaActividad } = await Swal.fire({
            title: 'Editar actividad',
            input: 'select',
            inputOptions: {
                Musculación: 'Musculación',
                Intermitente: 'Intermitente',
                Otro: 'Otro',
            },
            inputValue: asistencia.actividad,
            showCancelButton: true,
            confirmButtonText: 'Siguiente',
        });

        if (!nuevaActividad) return;

        const fechaOriginal = new Date(asistencia.fecha);
        const fechaIso = fechaOriginal.toISOString().split('T')[0];
        const horaIso = fechaOriginal.toTimeString().slice(0, 5); // formato HH:MM

        const { value: nuevaFecha } = await Swal.fire({
            title: 'Editar fecha',
            input: 'date',
            inputValue: fechaIso,
            showCancelButton: true,
            confirmButtonText: 'Siguiente',
        });

        if (!nuevaFecha) return;

        const { value: nuevaHora } = await Swal.fire({
            title: 'Editar hora',
            input: 'time',
            inputValue: horaIso,
            showCancelButton: true,
            confirmButtonText: 'Guardar cambios',
        });

        if (!nuevaHora) return;

        const nuevaFechaCompleta = new Date(`${nuevaFecha}T${nuevaHora}:00`);

        try {
            const res = await fetch(`/api/asistencias/${asistencia._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actividad: nuevaActividad,
                    fecha: nuevaFechaCompleta,
                }),
            });

            if (!res.ok) throw new Error('Error al actualizar');

            Swal.fire('Actualizada', 'La asistencia fue modificada correctamente.', 'success');
            location.reload(); // o fetchAlumno()
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo actualizar la asistencia.', 'error');
        }
    };

    const handleEliminarAsistencia = async (asistenciaId: string) => {
        const confirmacion = await Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción eliminará la asistencia permanentemente.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            customClass: {
                confirmButton: 'bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded mr-2',
                cancelButton: 'bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded',
            },
            buttonsStyling: false,
        });

        if (!confirmacion.isConfirmed) return;

        try {
            const res = await fetch(`/api/asistencias/${asistenciaId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Error al eliminar la asistencia');

            Swal.fire('Eliminada', 'La asistencia fue eliminada con éxito.', 'success');
            location.reload();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo eliminar la asistencia.', 'error');
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow-md border">
            <h1 className="text-2xl font-semibold mb-4 text-gray-800 text-center">Historial de Asistencias</h1>

            <h2 className="text-xl font-medium text-center text-gray-700 mb-6">
                {alumno.nombre} {alumno.apellido}
            </h2>

            {/* Filtros responsivos como en la imagen */}
            <div className="w-full flex flex-col sm:flex-row sm:flex-wrap sm:gap-4 sm:items-end sm:justify-start mb-6 space-y-4 sm:space-y-0">
                <div className='flex justify-between'>
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                        <div className="flex-1">
                            <label className="block text-gray-700 text-sm font-semibold mb-1">Desde</label>
                            <input
                                type="date"
                                className="w-full border rounded px-3 py-1 bg-gray-200 text-gray-800"
                                value={fechaDesde}
                                onChange={(e) => setFechaDesde(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-gray-700 text-sm font-semibold mb-1">Hasta</label>
                            <input
                                type="date"
                                className="w-full border rounded px-3 py-1 bg-gray-200 text-gray-800"
                                value={fechaHasta}
                                onChange={(e) => setFechaHasta(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-gray-700 font-semibold text-sm mb-1">Actividad</label>
                    <select
                        className="w-full border rounded px-3 py-2 bg-gray-200"
                        value={filtroActividad}
                        onChange={(e) => setFiltroActividad(e.target.value)}
                    >
                        <option value="Todas">Todas</option>
                        <option value="Musculación">Musculación</option>
                        <option value="Intermitente">Intermitente</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>
                <div>
                    <label className="block text-gray-700 font-semibold text-sm mb-1">Orden</label>
                    <select
                        className="w-full border rounded px-3 py-2 bg-gray-200"
                        value={orden}
                        onChange={(e) => setOrden(e.target.value as 'recientes' | 'antiguos')}
                    >
                        <option value="recientes">Más recientes</option>
                        <option value="antiguos">Más antiguas</option>
                    </select>
                </div>
            </div>

            {/* Botón centrado */}
            <div className="flex justify-end mb-6">
                <button
                    onClick={() => {
                        setFechaDesde('');
                        setFechaHasta('');
                        setFiltroActividad('Todas');
                        setOrden('recientes');
                    }}
                    className="bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600 transition"
                >
                    Limpiar filtros
                </button>
            </div>

            {/* Botón registrar asistencia */}
            <div className="flex justify-start mb-6">
                <button
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
                    onClick={handleAgregarAsistencia}
                >
                    Registrar Asistencia
                </button>
            </div>

            {/* Lista de asistencias */}
            {asistenciasFiltradas.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {asistenciasFiltradas.map((asistencia: any, index: number) => (
                        <div
                            key={index}
                            className="p-4 border rounded-md bg-gray-50 shadow-sm hover:bg-blue-50 transition flex items-center justify-between gap-4"
                        >
                            {/* Columna izquierda: texto */}
                            <div className="space-y-1">
                                <p>
                                    <strong>Fecha:</strong>{' '}
                                    {(() => {
                                        const fecha = new Date(asistencia.fecha);
                                        const dia = String(fecha.getDate()).padStart(2, '0');
                                        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                                        const anio = fecha.getFullYear();
                                        return `${dia}/${mes}/${anio}`;
                                    })()}
                                </p>
                                <p>
                                    <strong>Hora:</strong>{' '}
                                    {new Date(asistencia.fecha).toLocaleTimeString('es-AR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false,
                                    })}
                                </p>
                                <p>
                                    <strong>Actividad:</strong> {asistencia.actividad}
                                </p>
                            </div>

                            {/* Columna derecha: botones */}
                            <div className="flex gap-2 mt-1 items-center">
                                <button
                                    onClick={() => handleEditarAsistencia(asistencia)}
                                    className="bg-yellow-500 text-white px-1.5 py-1.5 rounded"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-5" viewBox="0 0 20 20">
                                        <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => handleEliminarAsistencia(asistencia._id)}
                                    className="bg-red-600 text-white px-1.5 py-1.5 rounded"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-5" viewBox="0 0 20 20">
                                        <path
                                            fillRule="evenodd"
                                            d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-600 text-center">No hay asistencias para los filtros aplicados.</p>
            )}
        </div>
    );
}
