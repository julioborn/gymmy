'use client';

import { useParams } from 'next/navigation';
import { useAlumno } from '@/hooks/useAlumno';
import { useState } from 'react';
import Swal from 'sweetalert2';

export default function PlanesPage() {
    const { id } = useParams();
    const { alumno, loading } = useAlumno(id as string);
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

    const historial = alumno.planEntrenamientoHistorial || [];

    const historialFiltrado = historial
        .filter((plan: any) => {
            const fechaInicio = new Date(plan.fechaInicio);
            const desdeValida = !fechaDesde || fechaInicio >= new Date(fechaDesde);
            const hastaValida = !fechaHasta || fechaInicio <= new Date(fechaHasta);
            return desdeValida && hastaValida;
        })
        .sort((a: any, b: any) =>
            orden === 'recientes'
                ? new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
                : new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
        );

    const handleEliminarPlan = async (planId: string) => {
        const confirmacion = await Swal.fire({
            title: '¿Eliminar este plan?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });

        if (!confirmacion.isConfirmed) return;

        try {
            const res = await fetch(`/api/alumnos/${id}/plan/${planId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Error al eliminar plan');

            Swal.fire('Plan eliminado', '', 'success').then(() => location.reload());
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo eliminar el plan', 'error');
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow-md border">
            <h1 className="text-2xl font-semibold mb-4 text-gray-800 text-center">Historial de Planes</h1>

            <h2 className="text-xl font-medium text-center text-gray-700 mb-6">
                {alumno.nombre} {alumno.apellido}
            </h2>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-4 justify-center">
                <div>
                    <label className="block text-sm text-gray-700 mb-1">Desde:</label>
                    <input
                        type="date"
                        value={fechaDesde}
                        onChange={(e) => setFechaDesde(e.target.value)}
                        className="border rounded px-2 py-1"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-700 mb-1">Hasta:</label>
                    <input
                        type="date"
                        value={fechaHasta}
                        onChange={(e) => setFechaHasta(e.target.value)}
                        className="border rounded px-2 py-1"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-700 mb-1">Orden:</label>
                    <select
                        value={orden}
                        onChange={(e) => setOrden(e.target.value as 'recientes' | 'antiguos')}
                        className="border rounded px-2 py-1"
                    >
                        <option value="recientes">Más recientes</option>
                        <option value="antiguos">Más antiguos</option>
                    </select>
                </div>
            </div>

            {/* Botón de limpiar filtros */}
            <div className="flex justify-center mb-6">
                <button
                    onClick={() => {
                        setFechaDesde('');
                        setFechaHasta('');
                        setOrden('recientes');
                    }}
                    className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
                >
                    Limpiar filtros
                </button>
            </div>

            {/* Lista de planes */}
            {historialFiltrado.length > 0 ? (
                <div className="space-y-4">
                    {historialFiltrado.map((plan: any, index: number) => (
                        <div
                            key={plan._id || index}
                            className="p-4 border rounded-md shadow-sm bg-gray-50 hover:bg-blue-50 transition flex justify-between items-center gap-4"
                        >
                            {/* Columna izquierda con la información */}
                            <div className="space-y-1">
                                <p>
                                    <strong>Inicio:</strong>{' '}
                                    {new Date(plan.fechaInicio).toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </p>
                                <p>
                                    <strong>Fin:</strong>{' '}
                                    {new Date(plan.fechaFin).toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </p>
                                <p>
                                    <strong>Días planificados:</strong> {plan.duracion}
                                </p>
                                <p>
                                    <strong>Asistencias realizadas:</strong> {plan.asistenciasContadas}
                                </p>
                                <p>
                                    <strong>Día más frecuente:</strong> {plan.horarioMasFrecuente}
                                </p>
                            </div>

                            {/* Botón a la derecha alineado al centro */}
                            <div className="flex items-center gap-2 mt-1">
                                <button
                                    onClick={() => handleEliminarPlan(plan._id)}
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
                <p className="text-gray-600 text-center">No hay planes finalizados registrados para los filtros aplicados.</p>
            )}
        </div>
    );
}
