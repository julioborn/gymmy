'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePaymentEvents } from '@/hooks/usePaymentEvents';
import Swal from 'sweetalert2';
import { Pagination } from '@mui/material';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { swalBase, swalNotify } from '@/utils/swalConfig';

// Lazy loading de componentes
const FiltrosAlumnos = React.lazy(() => import('@/components/FiltroAlumnos'));
const ModalEditTarifas = React.lazy(() => import('@/components/ModalEditTarifas'));

type Tarifa = {
    dias: number;
    valor: number;
};

function calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return edad;
}

function calcularDiasRestantes(plan: any, asistencias: any[]): number | null {
    if (!plan || !plan.fechaInicio || !plan.duracion) return null;
    const fechaInicio = new Date(plan.fechaInicio);
    const duracion = plan.duracion;
    const asistenciasMusculacion = asistencias.filter(
        (asistencia) => asistencia.actividad === 'Musculación' && asistencia.presente &&
            new Date(asistencia.fecha) >= fechaInicio
    ).length;
    const diasRestantes = duracion - asistenciasMusculacion;
    return diasRestantes > 0 ? diasRestantes : 0;
}

function verificarPagoMesActual(pagos: any[]): boolean {
    const mesActual = new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase();
    return pagos.some(pago => pago.mes.toLowerCase() === mesActual);
}

export default function ListaAlumnosPage() {
    const { data: session } = useSession();
    const [alumnos, setAlumnos] = useState<any[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroLetraApellido, setFiltroLetraApellido] = useState('');
    const [filtroPago, setFiltroPago] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [ordenDiasRestantes, setOrdenDiasRestantes] = useState('');
    const [tarifas, setTarifas] = useState<Tarifa[]>([]);
    const [recargoDiez, setRecargoDiez] = useState<number>(0);
    const [recargoMes, setRecargoMes] = useState<number>(0);
    const router = useRouter();
    const [editandoTarifas, setEditandoTarifas] = useState(false);
    const [page, setPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [filtroDiasEntrena, setFiltroDiasEntrena] = useState('');
    const [filtroArea, setFiltroArea] = useState('');
    const [acento, setAcento] = useState('#10b981');
    const [acento2, setAcento2] = useState('#f97316');

    const fetchAlumnos = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/alumnos');
            if (!response.ok) throw new Error('Error en la solicitud');
            const data = await response.json();
            const alumnosConDatos = data.map((alumno: any) => {
                const diasRestantes = calcularDiasRestantes(alumno.planEntrenamiento, alumno.asistencia);
                const edad = alumno.fechaNacimiento ? calcularEdad(alumno.fechaNacimiento) : null;
                return { ...alumno, diasRestantes, edad };
            });
            setAlumnos(alumnosConDatos);
        } catch {
            // silenced
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAlumnos();
        fetch('/api/gimnasio/tema')
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.temaAcento) setAcento(d.temaAcento); if (d?.temaAcento2) setAcento2(d.temaAcento2); })
            .catch(() => {});
    }, []);

    usePaymentEvents(fetchAlumnos);

    const fetchTarifas = async () => {
        try {
            const response = await fetch('/api/tarifas');
            const data = await response.json();
            if (data.ok && Array.isArray(data.tarifas)) {
                setTarifas(data.tarifas);
            }
        } catch {
            // silenced
        }
    };

    const handleConfiguracionTarifas = async () => {
        if (tarifas.length === 0) {
            await Swal.fire({ ...swalNotify, icon: 'error', title: 'Error', text: 'No se encontraron cuotas. Por favor, recarga la página.' });
            return;
        }

        const tarifaInputs = tarifas
            .map(tarifa => `
                <div>
                    <label class="swal-form-label">Días ${tarifa.dias} por semana</label>
                    <input type="text" inputmode="numeric" id="tarifa-${tarifa.dias}" class="swal2-input" value="${tarifa.valor}">
                </div>
            `).join('');

        const result = await Swal.fire({
            ...swalBase,
            title: 'Configurar Cuotas',
            html: `<div class="swal-form-body">${tarifaInputs}</div>`,
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                const updatedTarifas = tarifas.map((tarifa) => {
                    const valor = (document.getElementById(`tarifa-${tarifa.dias}`) as HTMLInputElement).value;
                    return { ...tarifa, valor: Number(valor) };
                });
                return updatedTarifas;
            },
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
        });

        const nuevasTarifas = result.value as Tarifa[] | undefined;
        if (nuevasTarifas) {
            try {
                const response = await fetch('/api/tarifas', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevasTarifas),
                });
                if (response.ok) {
                    Swal.fire({ ...swalNotify, icon: 'success', title: 'Tarifas actualizadas' });
                    setTarifas(nuevasTarifas);
                } else {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudieron actualizar las tarifas' });
                }
            } catch {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar las tarifas' });
            }
        }
    };

    useEffect(() => {
        fetchTarifas();
    }, []);

    const guardarTarifas = async (nuevasTarifas: Tarifa[]) => {
        try {
            const response = await fetch('/api/tarifas', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevasTarifas),
            });
            if (!response.ok) throw new Error('Error al actualizar tarifas');
            Swal.fire({ ...swalNotify, icon: 'success', title: 'Tarifas actualizadas' });
            setTarifas(nuevasTarifas);
            setEditandoTarifas(false);
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudieron actualizar las tarifas' });
        }
    };

    const alumnosFiltrados = alumnos
        .filter((alumno) => {
            const coincideBusqueda = alumno.nombre.toLowerCase().includes(busqueda.toLowerCase()) || alumno.dni.includes(busqueda);
            const coincideLetraApellido = filtroLetraApellido ? alumno.apellido.startsWith(filtroLetraApellido) : true;
            const coincideDiasEntrena = filtroDiasEntrena
                ? alumno.diasEntrenaSemana === parseInt(filtroDiasEntrena)
                : true;
            const coincidePago = filtroPago === ''
                ? true
                : filtroPago === 'pagado'
                    ? verificarPagoMesActual(alumno.pagos)
                    : !verificarPagoMesActual(alumno.pagos);
            const coincideArea = filtroArea ? alumno.area === filtroArea : true;
            return coincideBusqueda && coincideLetraApellido && coincidePago && coincideDiasEntrena && coincideArea;
        })
        .sort((a, b) => {
            if (ordenDiasRestantes === 'asc') {
                return (a.diasRestantes ?? Infinity) - (b.diasRestantes ?? Infinity);
            } else if (ordenDiasRestantes === 'desc') {
                return (b.diasRestantes ?? Infinity) - (a.diasRestantes ?? Infinity);
            } else {
                return a.apellido.localeCompare(b.apellido);
            }
        });

    const paginatedAlumnos = alumnosFiltrados.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
    );

    const Loader = () => (
        <div className="flex justify-center items-center h-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-400"></div>
        </div>
    );

    useEffect(() => {
        fetchRecargo();
    }, []);

    const fetchRecargo = async () => {
        try {
            const response = await fetch('/api/recargo');
            const data = await response.json();
            setRecargoDiez(data.montoDiez ?? 0);
            setRecargoMes(data.montoMes ?? 0);
        } catch {
            // silenced
        }
    };

    const handleConfiguracionRecargos = async () => {
        const { value: result } = await Swal.fire({
            ...swalBase,
            title: 'Configurar Recargos',
            html: `
                <div class="swal-form-body">
                    <div style="margin-bottom:1rem;">
                        <label class="swal-form-label">Recargo pasando el día 10 del mes ($)</label>
                        <input type="text" inputmode="numeric" id="recargo-diez" class="swal2-input" value="${recargoDiez}" placeholder="0">
                    </div>
                    <div>
                        <label class="swal-form-label">Recargo pasando el mes completo ($)</label>
                        <input type="text" inputmode="numeric" id="recargo-mes" class="swal2-input" value="${recargoMes}" placeholder="0">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const rawD = (document.getElementById('recargo-diez') as HTMLInputElement)?.value ?? '';
                const rawM = (document.getElementById('recargo-mes') as HTMLInputElement)?.value ?? '';
                const d = parseInt(rawD.replace(/\D/g, ''), 10) || 0;
                const m = parseInt(rawM.replace(/\D/g, ''), 10) || 0;
                return { montoDiez: d, montoMes: m };
            },
        });

        if (result) {
            try {
                const response = await fetch('/api/recargo', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(result),
                });
                if (response.ok) {
                    setRecargoDiez(result.montoDiez);
                    setRecargoMes(result.montoMes);
                    Swal.fire({ ...swalNotify, icon: 'success', title: 'Recargos actualizados' });
                } else {
                    Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudieron actualizar los recargos' });
                }
            } catch {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'Ocurrió un problema al actualizar los recargos' });
            }
        }
    };

    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
    };

    const handleGenerateExcel = () => {
        const categorizarFranjaHoraria = (horario: string) => {
            const [hora] = horario.split(':').map(Number);
            if (hora >= 7 && hora < 12) return 'Mañana';
            if (hora >= 12 && hora < 16) return 'Siesta';
            if (hora >= 16 && hora < 24) return 'Tarde';
            return '-';
        };

        const calcularHorarioMasFrecuenteDelMes = (asistencias: any[]) => {
            const mesActual = new Date().getMonth();
            const añoActual = new Date().getFullYear();
            const horarios = asistencias
                .filter((asistencia: { fecha: string | number | Date; actividad: string }) => {
                    const fechaAsistencia = new Date(asistencia.fecha);
                    return (
                        asistencia.actividad === 'Musculación' &&
                        fechaAsistencia.getMonth() === mesActual &&
                        fechaAsistencia.getFullYear() === añoActual
                    );
                })
                .map((asistencia: { fecha: string | number | Date }) =>
                    new Date(asistencia.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
                );
            if (horarios.length === 0) return '-';
            const frecuencia = horarios.reduce((acc: { [x: string]: any }, horario: string | number) => {
                acc[horario] = (acc[horario] || 0) + 1;
                return acc;
            }, {});
            const horarioMasFrecuente = Object.keys(frecuencia).reduce((a, b) => (frecuencia[a] > frecuencia[b] ? a : b));
            return categorizarFranjaHoraria(horarioMasFrecuente);
        };

        const formattedData = alumnos.map((alumno) => {
            const pagoMesActual = alumno.pagos.find(
                (pago: { mes: string }) =>
                    pago.mes.toLowerCase() ===
                    new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase()
            );
            const horarioMasFrecuenteDelMes = calcularHorarioMasFrecuenteDelMes(alumno.asistencia || []);
            return {
                Apellido: alumno.apellido,
                Nombre: alumno.nombre,
                Pago: pagoMesActual ? `$${pagoMesActual.tarifa}` : 'No pagó',
                'Fecha de Pago': pagoMesActual
                    ? new Date(pagoMesActual.fechaPago).toLocaleDateString('es-ES')
                    : '-',
                Adeuda: pagoMesActual ? 'No' : 'Sí',
                'Días que asiste': alumno.diasEntrenaSemana || '-',
                Horario: horarioMasFrecuenteDelMes,
                Mes: new Date().toLocaleString('es-ES', { month: 'long' }),
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance Mensual');
        XLSX.writeFile(workbook, `Balance_Mensual_${new Date().toLocaleDateString('es-ES')}.xlsx`);
    };

    const card = 'bg-white border border-black/[0.07] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_14px_rgba(0,0,0,0.04)]';

    return (
        <div className="max-w-7xl mx-auto pt-4 pb-12 px-4 lg:px-8">

            {/* Banner */}
            <div className="relative bg-[#111] rounded-2xl px-5 pt-5 pb-5 overflow-hidden mb-5 lg:px-8 lg:py-7">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.05),transparent_55%)]" />
                <div className="pointer-events-none absolute -bottom-8 -right-4 w-36 h-36 rounded-full blur-3xl opacity-25" style={{ background: acento2 }} />
                <div className="relative">
                    <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest">Gestión de alumnos</p>
                    <h1 className="text-xl font-bold text-white mt-0.5 lg:text-2xl">Alumnos</h1>
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        {!isLoading && (
                            <span className="bg-white/10 ring-1 ring-white/10 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                                {alumnos.length} inscriptos
                            </span>
                        )}
                        <button
                            className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-full text-white transition-all active:scale-95"
                            style={{ background: acento }}
                            onClick={() => router.push('/alumnos/nuevo')}
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Registrar
                        </button>
                        <button className="px-3 py-1 bg-white/10 hover:bg-white/15 active:scale-95 text-white text-[11px] font-semibold rounded-full transition-all" onClick={handleConfiguracionTarifas}>Cuotas</button>
                        <button className="px-3 py-1 bg-white/10 hover:bg-white/15 active:scale-95 text-white text-[11px] font-semibold rounded-full transition-all" onClick={handleConfiguracionRecargos}>Recargo</button>
                        {session?.user?.role === 'dueño' && (
                            <button
                                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 active:scale-95 text-white px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                                onClick={handleGenerateExcel}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="12" height="12" viewBox="0 0 48 48">
                                    <path fill="#169154" d="M29,6H15.744C14.781,6,14,6.781,14,7.744v7.259h15V6z"></path>
                                    <path fill="#18482a" d="M14,33.054v7.202C14,41.219,14.781,42,15.743,42H29v-8.946H14z"></path>
                                    <path fill="#0c8045" d="M14 15.003H29V24.005000000000003H14z"></path>
                                    <path fill="#17472a" d="M14 24.005H29V33.055H14z"></path>
                                    <g>
                                        <path fill="#29c27f" d="M42.256,6H29v9.003h15V7.744C44,6.781,43.219,6,42.256,6z"></path>
                                        <path fill="#27663f" d="M29,33.054V42h13.257C43.219,42,44,41.219,44,40.257v-7.202H29z"></path>
                                        <path fill="#19ac65" d="M29 15.003H44V24.005000000000003H29z"></path>
                                        <path fill="#129652" d="M29 24.005H44V33.055H29z"></path>
                                    </g>
                                    <path fill="#0c7238" d="M22.319,34H5.681C4.753,34,4,33.247,4,32.319V15.681C4,14.753,4.753,14,5.681,14h16.638 C23.247,14,24,14.753,24,15.681v16.638C24,33.247,23.247,34,22.319,34z"></path>
                                    <path fill="#fff" d="M9.807 19L12.193 19 14.129 22.754 16.175 19 18.404 19 15.333 24 18.474 29 16.123 29 14.013 25.07 11.912 29 9.526 29 12.719 23.982z"></path>
                                </svg>
                                Balance
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className={`${card} p-4 space-y-4`}>

                {/* Filtros */}
                <Suspense fallback={<Loader />}>
                    <FiltrosAlumnos
                        busqueda={busqueda}
                        setBusqueda={setBusqueda}
                        filtroPago={filtroPago}
                        setFiltroPago={setFiltroPago}
                        ordenDiasRestantes={ordenDiasRestantes}
                        setOrdenDiasRestantes={setOrdenDiasRestantes}
                        filtroDiasEntrena={filtroDiasEntrena}
                        setFiltroDiasEntrena={setFiltroDiasEntrena}
                        diasDisponibles={[...Array.from(new Set(alumnos.map((a) => a.diasEntrenaSemana)))].filter(Boolean).sort((a, b) => a - b)}
                        filtroArea={filtroArea}
                        setFiltroArea={setFiltroArea}
                        limpiarFiltros={() => {
                            setBusqueda('');
                            setFiltroPago('');
                            setOrdenDiasRestantes('');
                            setFiltroDiasEntrena('');
                            setFiltroArea('');
                        }}
                    />
                </Suspense>

                {/* Lista */}
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : alumnosFiltrados.length === 0 ? (
                    <div className="py-14 text-center">
                        <p className="text-slate-400 text-sm font-medium">No se encontraron alumnos</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            {paginatedAlumnos.map((alumno) => {
                                const pagado = verificarPagoMesActual(alumno.pagos);
                                const dr = alumno.diasRestantes;
                                const planText = dr != null
                                    ? `${dr} día${dr !== 1 ? 's' : ''} de plan`
                                    : 'Sin plan';
                                const planColor = dr == null
                                    ? 'text-red-400'
                                    : dr === 0
                                        ? 'text-red-500'
                                        : dr <= 5
                                            ? 'text-amber-500'
                                            : 'text-slate-400';
                                return (
                                    <div
                                        key={alumno._id}
                                        className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 active:scale-[0.99] cursor-pointer transition-all"
                                        onClick={() => router.push(`/alumnos/${alumno._id}/historial`)}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${pagado ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                            {alumno.nombre?.[0]}{alumno.apellido?.[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-800 text-sm truncate">
                                                {alumno.apellido}, {alumno.nombre}
                                            </p>
                                            <p className={`text-xs mt-0.5 ${planColor}`}>
                                                {alumno.edad ? `${alumno.edad} años · ` : ''}{planText}
                                            </p>
                                            {alumno.area && (
                                                <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5 bg-slate-100 text-slate-500">
                                                    {({ salud: '❤️ Salud', fitness: '💪 Fitness', rendimiento: '🏅 Rendimiento', formacion: '🌱 Formación' } as Record<string, string>)[alumno.area] ?? alumno.area}
                                                </span>
                                            )}
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2">
                                            {pagado ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                                                    </svg>
                                                    Pagó
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
                                                    </svg>
                                                    Debe
                                                </span>
                                            )}
                                            <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                            </svg>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-center pt-2">
                            <Pagination
                                count={Math.ceil(alumnosFiltrados.length / itemsPerPage)}
                                page={page}
                                onChange={handlePageChange}
                                color="primary"
                            />
                        </div>
                    </>
                )}

                {editandoTarifas && (
                    <Suspense fallback={<Loader />}>
                        <ModalEditTarifas
                            tarifas={tarifas}
                            onClose={() => setEditandoTarifas(false)}
                            onSave={guardarTarifas}
                        />
                    </Suspense>
                )}

            </div>
        </div>
    );
}
