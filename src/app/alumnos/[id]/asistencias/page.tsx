'use client';

import { useParams } from 'next/navigation';
import { useAlumno } from '@/hooks/useAlumno';
import { useState } from 'react';
import Swal from 'sweetalert2';
import { swalDanger, swalNotify } from '@/utils/swalConfig';

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

            Swal.fire({ ...swalNotify, icon: 'success', title: 'Asistencia registrada con éxito' });
            location.reload(); // o mejor: fetchAlumno() si lo tenés implementado
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo registrar la asistencia' });
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

            Swal.fire({ ...swalNotify, icon: 'success', title: 'La asistencia fue modificada correctamente.' });
            location.reload(); // o fetchAlumno()
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo actualizar la asistencia.' });
        }
    };

    const handleEliminarAsistencia = async (asistenciaId: string) => {
        const confirmacion = await Swal.fire({
            ...swalDanger,
            title: '¿Estás seguro?',
            text: 'Esta acción eliminará la asistencia permanentemente.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });

        if (!confirmacion.isConfirmed) return;

        try {
            const res = await fetch(`/api/asistencias/${asistenciaId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Error al eliminar la asistencia');

            Swal.fire({ ...swalNotify, icon: 'success', title: 'La asistencia fue eliminada con éxito.' });
            location.reload();
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo eliminar la asistencia.' });
        }
    };

    const inputCls = "border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300";
    const colorMap: Record<string, string> = { Musculación: 'bg-blue-100 text-blue-700', Intermitente: 'bg-orange-100 text-orange-700', Otro: 'bg-yellow-100 text-yellow-700' };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-t-2xl px-6 py-5">
                <h1 className="text-xl font-bold text-white">Asistencias</h1>
                <p className="text-slate-300 text-sm mt-0.5">{alumno.nombre} {alumno.apellido}</p>
            </div>

            <div className="bg-white rounded-b-2xl shadow-xl p-5">
                {/* Filtros */}
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
                        <label className="block text-xs text-slate-500 font-semibold mb-1">Actividad</label>
                        <select className={inputCls} value={filtroActividad} onChange={(e) => setFiltroActividad(e.target.value)}>
                            <option value="Todas">Todas</option>
                            <option value="Musculación">Musculación</option>
                            <option value="Intermitente">Intermitente</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 font-semibold mb-1">Orden</label>
                        <select className={inputCls} value={orden} onChange={(e) => setOrden(e.target.value as 'recientes' | 'antiguos')}>
                            <option value="recientes">Más recientes</option>
                            <option value="antiguos">Más antiguas</option>
                        </select>
                    </div>
                    <div className="flex items-end gap-2">
                        <button onClick={() => { setFechaDesde(''); setFechaHasta(''); setFiltroActividad('Todas'); setOrden('recientes'); }} className="px-3 py-1.5 mb-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
                            Limpiar
                        </button>
                        <button onClick={handleAgregarAsistencia} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition">
                            + Registrar
                        </button>
                    </div>
                </div>

                {asistenciasFiltradas.length > 0 ? (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                        {asistenciasFiltradas.map((asistencia: any, index: number) => {
                            const f = new Date(asistencia.fecha);
                            const badgeCls = colorMap[asistencia.actividad] || 'bg-slate-100 text-slate-700';
                            return (
                                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeCls}`}>{asistencia.actividad}</span>
                                        <span className="text-sm font-medium text-slate-700">{f.toLocaleDateString('es-AR')}</span>
                                        <span className="text-sm text-slate-500">{f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditarAsistencia(asistencia)} className="p-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-lg transition">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" /></svg>
                                        </button>
                                        <button onClick={() => handleEliminarAsistencia(asistencia._id)} className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-slate-500 text-sm text-center py-8">No hay asistencias para los filtros aplicados.</p>
                )}
            </div>
        </div>
    );
}
