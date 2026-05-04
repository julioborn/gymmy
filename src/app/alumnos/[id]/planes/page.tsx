'use client';

import { useParams } from 'next/navigation';
import { useAlumno } from '@/hooks/useAlumno';
import { useState } from 'react';
import Swal from 'sweetalert2';
import { swalDanger, swalNotify } from '@/utils/swalConfig';

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
            ...swalDanger,
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

            Swal.fire({ ...swalNotify, icon: 'success', title: 'Plan eliminado' }).then(() => location.reload());
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo eliminar el plan' });
        }
    };

    const inputCls = "border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300";

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-red-800 to-red-700 rounded-t-2xl px-6 py-5">
                <h1 className="text-xl font-bold text-white">Historial de Planes</h1>
                <p className="text-red-200 text-sm mt-0.5">{alumno.nombre} {alumno.apellido}</p>
            </div>

            <div className="bg-white rounded-b-2xl shadow-xl p-5">
                <div className="flex flex-wrap gap-3 mb-4">
                    <div>
                        <label className="block text-xs text-slate-500 font-semibold mb-1">Desde</label>
                        <input type="date" className={inputCls} value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 font-semibold mb-1">Hasta</label>
                        <input type="date" className={inputCls} value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 font-semibold mb-1">Orden</label>
                        <select className={inputCls} value={orden} onChange={(e) => setOrden(e.target.value as 'recientes' | 'antiguos')}>
                            <option value="recientes">Más recientes</option>
                            <option value="antiguos">Más antiguos</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={() => { setFechaDesde(''); setFechaHasta(''); setOrden('recientes'); }} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
                            Limpiar
                        </button>
                    </div>
                </div>

                {historialFiltrado.length > 0 ? (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                        {historialFiltrado.map((plan: any, index: number) => (
                            <div key={plan._id || index} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition flex justify-between items-center gap-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm flex-1">
                                    <div><p className="text-xs text-slate-400 font-semibold uppercase">Inicio</p><p className="font-medium text-slate-800">{new Date(plan.fechaInicio).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
                                    <div><p className="text-xs text-slate-400 font-semibold uppercase">Fin</p><p className="font-medium text-slate-800">{new Date(plan.fechaFin).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
                                    <div><p className="text-xs text-slate-400 font-semibold uppercase">Días planificados</p><p className="font-medium text-slate-800">{plan.duracion}</p></div>
                                    <div><p className="text-xs text-slate-400 font-semibold uppercase">Asistencias</p><p className="font-medium text-slate-800">{plan.asistenciasContadas}</p></div>
                                    <div><p className="text-xs text-slate-400 font-semibold uppercase">Horario frecuente</p><p className="font-medium text-slate-800">{plan.horarioMasFrecuente}</p></div>
                                </div>
                                <button onClick={() => handleEliminarPlan(plan._id)} className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition flex-shrink-0">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 text-sm text-center py-8">No hay planes finalizados para los filtros aplicados.</p>
                )}
            </div>
        </div>
    );
}
