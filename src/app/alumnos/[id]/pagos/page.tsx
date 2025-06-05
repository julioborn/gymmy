'use client';

import { useParams } from 'next/navigation';
import { useAlumno } from '@/hooks/useAlumno';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

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
                } else {
                    console.error('Error al obtener tarifas:', data.error);
                }
            } catch (error) {
                console.error('Error al obtener tarifas:', error);
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
                icon: 'error',
                title: 'Error',
                text: 'No se encontró una tarifa para los días seleccionados.',
            });
            return;
        }

        const { value: metodoPago } = await Swal.fire({
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

            Swal.fire('Pago registrado correctamente', '', 'success').then(() => location.reload());
        } catch (error) {
            console.error('Error al registrar el pago:', error);
            Swal.fire('Error', 'No se pudo registrar el pago', 'error');
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

            Swal.fire('Pago eliminado correctamente', '', 'success').then(() => location.reload());
        } catch (error) {
            console.error('Error al eliminar el pago:', error);
            Swal.fire('Error', 'No se pudo eliminar el pago', 'error');
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow-md border">
            <h1 className="text-2xl font-semibold mb-4 text-gray-800 text-center">Historial de Pagos</h1>

            <h2 className="text-xl font-medium text-center text-gray-700 mb-6">
                {alumno.nombre} {alumno.apellido}
            </h2>

            {/* Filtros */}
            <div className="w-full flex flex-col sm:flex-row sm:flex-wrap sm:gap-4 sm:items-end sm:justify-start mb-6 space-y-4 sm:space-y-0">
                <div className='flex justify-between'>
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                        <div className="flex-1">
                            <label className="block text-gray-700 text-sm font-semibold mb-1">Desde</label>
                            <input
                                type="date"
                                className="w-full border rounded px-3 py-2 bg-gray-200 text-gray-800"
                                value={fechaDesde}
                                onChange={(e) => setFechaDesde(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-gray-700 text-sm font-semibold mb-1">Hasta</label>
                            <input
                                type="date"
                                className="w-full border rounded px-3 py-2 bg-gray-200 text-gray-800"
                                value={fechaHasta}
                                onChange={(e) => setFechaHasta(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-gray-700 font-semibold text-sm mb-1">Año</label>
                    <select
                        className="w-full border rounded px-3 py-2 bg-gray-200"
                        value={filtroAnio}
                        onChange={(e) => setFiltroAnio(e.target.value)}
                    >
                        <option value="Todos">Todos</option>
                        {aniosDisponibles.map((anio) => (
                            <option key={anio} value={anio}>{anio}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-gray-700 font-semibold text-sm mb-1">Método</label>
                    <select
                        className="w-full border rounded px-3 py-2 bg-gray-200"
                        value={filtroMetodo}
                        onChange={(e) => setFiltroMetodo(e.target.value)}
                    >
                        <option value="Todos">Todos</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
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
                        <option value="antiguos">Más antiguos</option>
                    </select>
                </div>
            </div>

            {/* Botón centrado */}
            <div className="flex justify-end mb-6">
                <button
                    onClick={() => {
                        setFechaDesde('');
                        setFechaHasta('');
                        setFiltroAnio('Todos');
                        setFiltroMetodo('Todos');
                        setOrden('recientes');
                    }}
                    className="bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600 transition"
                >
                    Limpiar filtros
                </button>
            </div>

            {/* Botón registrar pago */}
            <div className="flex justify-start mb-6">
                <button
                    onClick={handleAgregarPago}
                    className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                >
                    Registrar pago
                </button>
            </div>

            {/* Lista de pagos */}
            {pagosFiltrados.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {pagosFiltrados.map((pago: any, index: number) => (
                        <div
                            key={index}
                            className="p-4 border rounded-md shadow-sm bg-gray-50 hover:bg-green-50 transition flex justify-between items-center"
                        >
                            <div className="space-y-1">
                                <p><strong>Fecha de pago:</strong> {new Date(pago.fechaPago).toLocaleDateString('es-AR')}</p>
                                <p><strong>Mes:</strong> {pago.mes}</p>
                                <p><strong>Método:</strong> {pago.metodoPago}</p>
                                <p><strong>Monto:</strong> ${pago.tarifa - (pago.recargo || 0)}</p>
                                {pago.recargo ? (
                                    <>
                                        <p><strong>Recargo:</strong> ${pago.recargo}</p>
                                        <p><strong>Total con recargo:</strong> ${pago.tarifa}</p>
                                    </>
                                ) : null}
                            </div>

                            <div className="flex items-center gap-2">
                                {/* <button
                                    onClick={() => handleEditarPago(pago)}
                                    className="bg-yellow-500 text-white px-1.5 py-1.5 rounded"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-5" viewBox="0 0 20 20">
                                        <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                    </svg>
                                </button> */}
                                <button
                                    onClick={() => handleEliminarPago(pago._id)}
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
                <p className="text-gray-600 text-center">No hay pagos para los filtros aplicados.</p>
            )}
        </div>
    );
}
