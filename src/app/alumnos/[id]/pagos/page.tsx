'use client';

import { useParams } from 'next/navigation';
import { useAlumno } from '@/hooks/useAlumno';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { swalBase, swalDanger, swalNotify } from '@/utils/swalConfig';

export default function PagosPage() {
    const { id } = useParams();
    const { alumno, loading } = useAlumno(id as string);
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [filtroAnio, setFiltroAnio] = useState('Todos');
    const [filtroMetodo, setFiltroMetodo] = useState('Todos');
    const [orden, setOrden] = useState<'recientes' | 'antiguos'>('recientes');
    const [tarifas, setTarifas] = useState<any[]>([]);
    const [recargo, setRecargo] = useState<number>(0);

    useEffect(() => {
        const fetchTarifas = async () => {
            try {
                const res = await fetch('/api/tarifas');
                const data = await res.json();
                if (data.ok) {
                    setTarifas(data.tarifas);
                    setRecargo(data.recargo || 0); // en caso de que venga
                }
            } catch {
                // silenced
            }
        };

        fetchTarifas();
    }, []);

    const Loader = () => (
        <div className="flex justify-center items-center h-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-700"></div>
        </div>
    );

    if (loading || !alumno) {
        return <Loader />;
    }

    const pagos = alumno.pagos || [];

    const aniosDisponibles = Array.from(
        new Set(pagos.map((p: any) => new Date(p.fechaPago).getFullYear()))
    ).sort((a, b) => b - a);

    const pagosFiltrados = pagos
        .filter((pago: any) => {
            const fecha = new Date(pago.fechaPago);
            const anio = fecha.getFullYear();

            const dentroDeRango =
                (!fechaDesde || fecha >= new Date(fechaDesde)) &&
                (!fechaHasta || fecha <= new Date(fechaHasta));

            const coincideAnio = filtroAnio === 'Todos' || anio === Number(filtroAnio);
            const coincideMetodo =
                filtroMetodo === 'Todos' ||
                (pago.metodoPago?.toLowerCase() === filtroMetodo.toLowerCase());

            return dentroDeRango && coincideAnio && coincideMetodo;
        })
        .sort((a: any, b: any) =>
            orden === 'recientes'
                ? new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime()
                : new Date(a.fechaPago).getTime() - new Date(b.fechaPago).getTime()
        );

    const handleAgregarPago = async () => {
        const opcionesTarifas = tarifas.reduce((options, tarifa) => {
            options[tarifa.dias.toString()] = `${tarifa.dias} día${tarifa.dias > 1 ? 's' : ''} por semana - $${tarifa.valor}`;
            return options;
        }, {} as Record<string, string>);

        const { value: diasMusculacion } = await Swal.fire({
            ...swalBase,
            title: 'Selecciona los días de musculación por semana',
            input: 'select',
            inputOptions: opcionesTarifas,
            inputPlaceholder: 'Selecciona una opción',
            showCancelButton: true,
            confirmButtonText: 'Siguiente',
            cancelButtonText: 'Cancelar',
        });

        if (!diasMusculacion) return;

        const tarifaSeleccionada = tarifas.find(
            (tarifa) => tarifa.dias === Number(diasMusculacion)
        );

        if (!tarifaSeleccionada) {
            Swal.fire({
                ...swalNotify,
                icon: 'error',
                title: 'No se encontró una tarifa para los días seleccionados.',
            });
            return;
        }

        const { value: metodoPago } = await Swal.fire({
            ...swalBase,
            title: 'Selecciona el método de pago',
            input: 'radio',
            inputOptions: {
                efectivo: 'Efectivo',
                transferencia: 'Transferencia',
            },
            inputValidator: (value) => {
                if (!value) return 'Debes seleccionar un método de pago';
                return null;
            },
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
        });

        if (!metodoPago) return;

        const confirmacion = await Swal.fire({
            ...swalBase,
            title: 'Confirmar cobro',
            html: `
            <p>Días de musculación: <strong>${diasMusculacion}</strong></p>
            <p>Método de pago: <strong>${metodoPago}</strong></p>
            <p>Precio: $${tarifaSeleccionada.valor}</p>
            <div style="margin-top: 8px;">
                <input type="checkbox" id="swal-aplicar-recargo" ${new Date().getDate() > 10 ? 'checked' : ''}>
                <label for="swal-aplicar-recargo"> Aplicar recargo ($${recargo?.toFixed(2) || 0})</label>
            </div>
        `,
            preConfirm: () => {
                const checkbox = document.getElementById('swal-aplicar-recargo') as HTMLInputElement;
                return { aplicarRecargo: checkbox?.checked ?? false };
            },
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Registrar',
            cancelButtonText: 'Cancelar',
        });

        if (!confirmacion.isConfirmed) return;

        const aplicarRecargo = confirmacion.value?.aplicarRecargo;
        const montoRecargo = aplicarRecargo ? recargo || 0 : 0;
        const total = tarifaSeleccionada.valor + montoRecargo;

        const mesActual = new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase();

        try {
            const response = await fetch(`/api/alumnos/pagos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    alumnoId: id,
                    nuevoPago: {
                        mes: mesActual,
                        fechaPago: new Date(new Date().toISOString().split('T')[0] + "T12:00:00"),
                        diasMusculacion: Number(diasMusculacion),
                        tarifa: tarifaSeleccionada.valor,
                        recargo: montoRecargo,
                        metodoPago,
                    },
                }),
            });

            if (!response.ok) throw new Error('Error al registrar el pago');

            Swal.fire({ ...swalNotify, icon: 'success', title: 'Pago registrado correctamente' }).then(() => location.reload());
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo registrar el pago' });
        }
    };

    // const handleEditarPago = async (pago: any) => {
    //     const { value: nuevaFecha } = await Swal.fire({
    //         title: 'Editar fecha de pago',
    //         input: 'date',
    //         inputValue: new Date(pago.fechaPago).toISOString().split('T')[0],
    //         showCancelButton: true,
    //         confirmButtonText: 'Siguiente',
    //         cancelButtonText: 'Cancelar',
    //     });

    //     if (!nuevaFecha) return;

    //     const { value: nuevaTarifa } = await Swal.fire({
    //         title: 'Editar tarifa',
    //         input: 'number',
    //         inputValue: pago.tarifa,
    //         showCancelButton: true,
    //         confirmButtonText: 'Siguiente',
    //         cancelButtonText: 'Cancelar',
    //     });

    //     if (!nuevaTarifa) return;

    //     const { value: nuevosDias } = await Swal.fire({
    //         title: 'Editar días de musculación',
    //         input: 'number',
    //         inputValue: pago.diasMusculacion,
    //         showCancelButton: true,
    //         confirmButtonText: 'Guardar',
    //         cancelButtonText: 'Cancelar',
    //     });

    //     if (!nuevosDias) return;

    //     try {
    //         const res = await fetch(`/api/alumnos/${id}/pagos/${pago._id}`, {
    //             method: 'PUT',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //             },
    //             body: JSON.stringify({
    //                 nuevaFechaPago: new Date(nuevaFecha + "T12:00:00"),
    //                 tarifa: Number(nuevaTarifa),
    //                 diasMusculacion: Number(nuevosDias),
    //             }),
    //         });

    //         if (!res.ok) throw new Error('Error al actualizar el pago');

    //         Swal.fire('Pago actualizado', '', 'success').then(() => location.reload());
    //     } catch (error) {
    //         console.error('Error al actualizar el pago:', error);
    //         Swal.fire('Error', 'No se pudo actualizar el pago', 'error');
    //     }
    // };

    const handleEliminarPago = async (pagoId: string) => {
        const confirmacion = await Swal.fire({
            ...swalDanger,
            title: '¿Eliminar este pago?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });

        if (!confirmacion.isConfirmed) return;

        try {
            const res = await fetch(`/api/alumnos/${id}/pagos/${pagoId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Error al eliminar el pago');

            Swal.fire({ ...swalNotify, icon: 'success', title: 'Pago eliminado correctamente' }).then(() => location.reload());
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo eliminar el pago' });
        }
    };

    const inputCls = "border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300";

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 rounded-t-2xl px-6 py-5">
                <h1 className="text-xl font-bold text-white">Historial de Pagos</h1>
                <p className="text-emerald-200 text-sm mt-0.5">{alumno.nombre} {alumno.apellido}</p>
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
                        <label className="block text-xs text-slate-500 font-semibold mb-1">Año</label>
                        <select className={inputCls} value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)}>
                            <option value="Todos">Todos</option>
                            {aniosDisponibles.map((anio) => <option key={anio} value={anio}>{anio}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 font-semibold mb-1">Método</label>
                        <select className={inputCls} value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)}>
                            <option value="Todos">Todos</option>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 font-semibold mb-1">Orden</label>
                        <select className={inputCls} value={orden} onChange={(e) => setOrden(e.target.value as 'recientes' | 'antiguos')}>
                            <option value="recientes">Más recientes</option>
                            <option value="antiguos">Más antiguos</option>
                        </select>
                    </div>
                    <div className="flex items-end gap-2">
                        <button onClick={() => { setFechaDesde(''); setFechaHasta(''); setFiltroAnio('Todos'); setFiltroMetodo('Todos'); setOrden('recientes'); }} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
                            Limpiar
                        </button>
                        <button onClick={handleAgregarPago} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition">
                            + Registrar
                        </button>
                    </div>
                </div>

                {pagosFiltrados.length > 0 ? (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                        {pagosFiltrados.map((pago: any, index: number) => (
                            <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition flex justify-between items-center gap-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm flex-1">
                                    <div><p className="text-xs text-slate-400 font-semibold uppercase">Fecha</p><p className="font-medium text-slate-800">{new Date(pago.fechaPago).toLocaleDateString('es-AR')}</p></div>
                                    <div><p className="text-xs text-slate-400 font-semibold uppercase">Mes</p><p className="font-medium text-slate-800 capitalize">{pago.mes}</p></div>
                                    <div><p className="text-xs text-slate-400 font-semibold uppercase">Método</p><p className="font-medium text-slate-800 capitalize">{pago.metodoPago || '-'}</p></div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-semibold uppercase">Total</p>
                                        <p className="font-bold text-emerald-600">${pago.tarifa}</p>
                                        {pago.recargo ? <p className="text-xs text-slate-400">inc. ${pago.recargo} recargo</p> : null}
                                    </div>
                                </div>
                                <button onClick={() => handleEliminarPago(pago._id)} className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition flex-shrink-0">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 text-sm text-center py-8">No hay pagos para los filtros aplicados.</p>
                )}
            </div>
        </div>
    );
}
