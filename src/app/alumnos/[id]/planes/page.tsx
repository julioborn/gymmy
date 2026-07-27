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

    const inputCls = "border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition";

    return (
        <div className="max-w-4xl mx-auto pt-4 pb-12 px-4 space-y-4">

            {/* Banner */}
            <div className="bg-slate-900 rounded-3xl px-6 pt-6 pb-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-violet-500 rounded-2xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white leading-tight">Historial de Planes</h1>
                    <p className="text-slate-400 text-xs mt-0.5">{alumno.nombre} {alumno.apellido}</p>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Desde</label>
                    <input type="date" className={inputCls} value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
                </div>
                <div>
                    <label className="block text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Hasta</label>
                    <input type="date" className={inputCls} value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
                </div>
                <div>
                    <label className="block text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Orden</label>
                    <select className={inputCls} value={orden} onChange={(e) => setOrden(e.target.value as 'recientes' | 'antiguos')}>
                        <option value="recientes">Más recientes</option>
                        <option value="antiguos">Más antiguos</option>
                    </select>
                </div>
                {(fechaDesde || fechaHasta || orden !== 'recientes') && (
                    <button onClick={() => { setFechaDesde(''); setFechaHasta(''); setOrden('recientes'); }} className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
                        Limpiar
                    </button>
                )}
            </div>

            {/* Lista de planes */}
            {historialFiltrado.length > 0 ? (
                <div className="space-y-3">
                    {historialFiltrado.map((plan: any, index: number) => (
                        <div key={plan._id || index} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex justify-between items-center gap-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-6 gap-y-3 flex-1">
                                <div>
                                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Inicio</p>
                                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{new Date(plan.fechaInicio).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Fin</p>
                                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{new Date(plan.fechaFin).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Días planificados</p>
                                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{plan.duracion}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Asistencias</p>
                                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{plan.asistenciasContadas}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Horario frecuente</p>
                                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{plan.horarioMasFrecuente}</p>
                                </div>
                            </div>
                            <button onClick={() => handleEliminarPlan(plan._id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 rounded-xl transition flex-shrink-0">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-8 text-center">
                    <p className="text-slate-400 text-sm">No hay planes finalizados para los filtros aplicados.</p>
                </div>
            )}
        </div>
    );
}
