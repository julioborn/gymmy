'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePaymentEvents } from '@/hooks/usePaymentEvents';
import Swal from 'sweetalert2';
import { ChevronLeft, ChevronRight, Users, UserPlus, DollarSign, Percent, Search, Activity } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { swalBase, swalNotify } from '@/utils/swalConfig';
import { estaAlDia, pagosVigentesDelMes, expandirPagosMixtos, getMesActual } from '@/lib/pagos';

// Lazy loading de componentes
const FiltrosAlumnos = React.lazy(() => import('@/components/FiltroAlumnos'));
const ModalEditTarifas = React.lazy(() => import('@/components/ModalEditTarifas'));

// Paleta "Dark Premium" de esta vista — neutros fijos, acentos de marca dinamicos
// (acento/acento2, los mismos que usa el resto de la app segun el tema del gym).
const SURFACE = '#121315';
const SURFACE_2 = '#191A1C';
const SURFACE_HOVER = '#1C1D1F';
const BORDER = '#303236';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_SECONDARY = '#A1A1AA';
const TEXT_MUTED = '#71717A';
const WARNING = '#FACC15';
const DANGER = '#EF4444';
const PAYMENT_BLUE = '#38BDF8';
const PAYMENT_BLUE_BG = '#102F3B';

type Tarifa = {
    dias: number;
    valor: number;
};

function normalize(s: string): string { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

function calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    // fechaNacimiento se guarda como medianoche UTC del dia real de nacimiento;
    // hay que leerla con los getters UTC, si no en Argentina (UTC-3) se lee un dia antes.
    let edad = hoy.getFullYear() - nacimiento.getUTCFullYear();
    const mes = hoy.getMonth() - nacimiento.getUTCMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getUTCDate())) {
        edad--;
    }
    return edad;
}

function calcularDiasRestantes(plan: any, asistencias: any[], planAlumnoActivo?: any): number | null {
    // Primero intentar con PlanAlumno (plan de ejercicios activo)
    if (planAlumnoActivo?.fechaInicio && planAlumnoActivo?.totalSesiones > 0) {
        const fechaInicio = new Date(planAlumnoActivo.fechaInicio);
        const hechas = asistencias.filter(
            a => a.actividad === 'Musculación' && a.presente && new Date(a.fecha) >= fechaInicio
        ).length;
        const restantes = planAlumnoActivo.totalSesiones - hechas;
        return restantes > 0 ? restantes : 0;
    }
    // Fallback al planEntrenamiento embebido
    if (!plan || !plan.fechaInicio || !plan.duracion) return null;
    const fechaInicio = new Date(plan.fechaInicio);
    const asistenciasMusculacion = asistencias.filter(
        a => a.actividad === 'Musculación' && a.presente && new Date(a.fecha) >= fechaInicio
    ).length;
    const diasRestantes = plan.duracion - asistenciasMusculacion;
    return diasRestantes > 0 ? diasRestantes : 0;
}

function verificarPagoMesActual(pagos: any[], exentoCuota?: boolean): boolean {
    return estaAlDia({ pagos, exentoCuota }, getMesActual(new Date()));
}

// Ventana de paginación: siempre primera/última página + vecinos de la actual,
// con "..." en los huecos, para que no crezca sin límite con muchos alumnos.
function getPageList(current: number, total: number): (number | '...')[] {
    const delta = 1;
    const range: (number | '...')[] = [];
    const start = Math.max(2, current - delta);
    const end = Math.min(total - 1, current + delta);
    range.push(1);
    if (start > 2) range.push('...');
    for (let i = start; i <= end; i++) range.push(i);
    if (end < total - 1) range.push('...');
    if (total > 1) range.push(total);
    return range;
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
    const [hoyExpanded, setHoyExpanded] = useState(false);
    const [slotsExpanded, setSlotsExpanded] = useState<Record<string, boolean>>({ mañana: false, siesta: false, tarde: false, noche: false });
    const [dePasoResultados, setDePasoResultados] = useState<any[]>([]);
    const [buscandoDePaso, setBuscandoDePaso] = useState(false);

    const fetchAlumnos = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const response = await fetch('/api/alumnos');
            if (!response.ok) throw new Error('Error en la solicitud');
            const data = await response.json();
            const alumnosConDatos = data.map((alumno: any) => {
                const diasRestantes = calcularDiasRestantes(alumno.planEntrenamiento, alumno.asistencia, alumno.planAlumnoActivo);
                const edad = alumno.fechaNacimiento ? calcularEdad(alumno.fechaNacimiento) : null;
                return { ...alumno, diasRestantes, edad };
            });
            setAlumnos(alumnosConDatos);
        } catch {
            // silenced
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAlumnos();
        fetch('/api/gimnasio/tema')
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.temaAcento) setAcento(d.temaAcento); if (d?.temaAcento2) setAcento2(d.temaAcento2); })
            .catch(() => {});
    }, []);

    usePaymentEvents(() => fetchAlumnos(true));

    useEffect(() => {
        const q = busqueda.trim();
        if (q.length < 2) {
            setDePasoResultados([]);
            return;
        }
        const timeout = setTimeout(async () => {
            setBuscandoDePaso(true);
            try {
                const response = await fetch(`/api/alumnos-de-paso?q=${encodeURIComponent(q)}`);
                if (!response.ok) throw new Error('Error en la solicitud');
                const data = await response.json();
                setDePasoResultados(data.registros ?? []);
            } catch {
                setDePasoResultados([]);
            } finally {
                setBuscandoDePaso(false);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [busqueda]);

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
            const q = normalize(busqueda);
            const coincideBusqueda = normalize(alumno.nombre).includes(q) || normalize(alumno.apellido).includes(q) || alumno.dni.includes(busqueda);
            const coincideLetraApellido = filtroLetraApellido ? alumno.apellido.startsWith(filtroLetraApellido) : true;
            const coincideDiasEntrena = filtroDiasEntrena
                ? alumno.diasEntrenaSemana === parseInt(filtroDiasEntrena)
                : true;
            const coincidePago = filtroPago === ''
                ? true
                : filtroPago === 'pagado'
                    ? verificarPagoMesActual(alumno.pagos, alumno.exentoCuota)
                    : !verificarPagoMesActual(alumno.pagos, alumno.exentoCuota);
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
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/30"></div>
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

    const handleGenerateExcel = () => {
        const mesActual = getMesActual(new Date());
        const mesLabel = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' });

        const formattedData = [...alumnos]
            .sort((a, b) => (a.apellido || '').localeCompare(b.apellido || '', 'es'))
            .map((alumno) => {
                const pagosMes = pagosVigentesDelMes(alumno.pagos, mesActual);
                const ultimoPago = pagosMes.length
                    ? pagosMes.reduce((max, p) => new Date(p.fechaPago) > new Date(max.fechaPago) ? p : max)
                    : null;
                const totalPagado = pagosMes.reduce((sum, p) => sum + (p.tarifa ?? 0), 0);
                return {
                    'Apellido y Nombre': `${alumno.apellido || ''} ${alumno.nombre || ''}`.trim(),
                    'Fecha de pago': ultimoPago
                        ? new Date(ultimoPago.fechaPago).toLocaleDateString('es-AR')
                        : '-',
                    'Días/semana': alumno.diasEntrenaSemana || '-',
                    'Precio cuota': pagosMes.length ? `$${totalPagado}` : '-',
                    'Estado': alumno.exentoCuota ? 'Exento' : pagosMes.length ? 'Pagó' : 'No pagó',
                };
            });

        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        // Ancho de columnas
        worksheet['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 10 }];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, mesLabel);
        XLSX.writeFile(workbook, `Alumnos_${mesLabel.replace(' ', '_')}.xlsx`);
    };


    // ── Hoy en el gimnasio ──────────────────────────────────────────────────
    type TurnSlot = 'mañana' | 'siesta' | 'tarde' | 'noche';
    const getArgInfo = (fechaStr: string): { key: string; hour: number; hora: string } => {
        const d = new Date(fechaStr);
        const arg = new Date(d.getTime() - 3 * 60 * 60 * 1000);
        const key = `${arg.getUTCFullYear()}-${String(arg.getUTCMonth()+1).padStart(2,'0')}-${String(arg.getUTCDate()).padStart(2,'0')}`;
        const hour = arg.getUTCHours();
        const hora = `${String(hour).padStart(2,'0')}:${String(arg.getUTCMinutes()).padStart(2,'0')}`;
        return { key, hour, hora };
    };
    const todayArgKey = (() => {
        const now = new Date();
        const arg = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        return `${arg.getUTCFullYear()}-${String(arg.getUTCMonth()+1).padStart(2,'0')}-${String(arg.getUTCDate()).padStart(2,'0')}`;
    })();
    const slotOf = (hour: number): TurnSlot =>
        hour < 12 ? 'mañana' : hour < 15 ? 'siesta' : hour < 20 ? 'tarde' : 'noche';

    const hoyPorTurno: Record<TurnSlot, { nombre: string; apellido: string; actividad: string; hora: string; id: string; exentoCuota?: boolean; pagado?: boolean; pagosDelMes: { metodoPago: string; tarifa: number; fechaPago: string }[] }[]> = {
        mañana: [], siesta: [], tarde: [], noche: [],
    };
    if (!isLoading) {
        const mesActualHoy = getMesActual(new Date());
        for (const alumno of alumnos) {
            const pagadoHoy = verificarPagoMesActual(alumno.pagos, alumno.exentoCuota);
            const pagosDelMesHoy = alumno.exentoCuota ? [] : expandirPagosMixtos(pagosVigentesDelMes(alumno.pagos, mesActualHoy));
            for (const a of (alumno.asistencia || [])) {
                if (!a.presente) continue;
                const { key, hour, hora } = getArgInfo(a.fecha);
                if (key !== todayArgKey) continue;
                hoyPorTurno[slotOf(hour)].push({
                    nombre: alumno.nombre, apellido: alumno.apellido,
                    actividad: a.actividad, hora, id: alumno._id,
                    exentoCuota: !!alumno.exentoCuota, pagado: pagadoHoy,
                    pagosDelMes: pagosDelMesHoy as any,
                });
            }
        }
        for (const s of Object.keys(hoyPorTurno) as TurnSlot[]) {
            hoyPorTurno[s].sort((a, b) => a.hora.localeCompare(b.hora));
        }
    }
    const totalHoy = hoyPorTurno.mañana.length + hoyPorTurno.siesta.length + hoyPorTurno.tarde.length + hoyPorTurno.noche.length;
    const SLOT_CONFIG: { key: TurnSlot; label: string; bg: string; text: string }[] = [
        { key: 'mañana', label: 'Mañana',  bg: 'bg-amber-400/10',  text: 'text-amber-400' },
        { key: 'siesta', label: 'Siesta',  bg: 'bg-orange-400/10', text: 'text-orange-400' },
        { key: 'tarde',  label: 'Tarde',   bg: 'bg-sky-400/10',    text: 'text-sky-400'   },
        { key: 'noche',  label: 'Noche',   bg: 'bg-indigo-400/10', text: 'text-indigo-400'},
    ];
    const ACTIVIDAD_COLOR: Record<string, string> = {
        'Musculación': 'bg-blue-400/20 text-blue-400',
        'Intermitente': 'bg-orange-400/20 text-orange-400',
        'Otro': 'bg-yellow-400/20 text-yellow-400',
    };

    return (
        <div className="max-w-7xl mx-auto pt-4 pb-12 px-4 lg:px-8">

            {/* Hero */}
            <div className="rounded-[26px] px-5 py-5 mb-4" style={{ background: SURFACE, border: `1px solid ${BORDER}`, boxShadow: '0 12px 28px -20px rgba(0,0,0,0.7)' }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: acento2 }}>
                        <Users size={24} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>Gestión</span>
                        <h1 className="text-[28px] sm:text-[30px] font-bold tracking-tight leading-tight" style={{ color: TEXT_PRIMARY }}>Alumnos</h1>
                    </div>
                    {!isLoading && (
                        <span className="ml-auto flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full shrink-0" style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}>
                            <Users size={14} />
                            {alumnos.length}
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                    <button
                        onClick={() => router.push('/alumnos/nuevo')}
                        className="flex items-center justify-center gap-2 px-4 py-4 rounded-2xl border text-sm font-bold transition-all duration-200 active:scale-[0.98] hover:brightness-125"
                        style={{ background: `${acento2}17`, borderColor: `${acento2}40`, color: acento2 }}
                    >
                        <UserPlus size={16} />
                        Registrar
                    </button>
                    {session?.user?.role === 'recepcion' && (
                        <div className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 rounded-2xl border" style={{ background: `${acento}14`, borderColor: `${acento}38` }}>
                            <span className="text-[10px] font-semibold uppercase tracking-wide capitalize" style={{ color: `${acento}B3` }}>{new Date().toLocaleDateString('es-AR', { month: 'long' })}</span>
                            <span className="text-sm font-bold tabular-nums" style={{ color: acento }}>
                                {alumnos.filter(a => verificarPagoMesActual(a.pagos, a.exentoCuota)).length}/{alumnos.length} alumnos
                            </span>
                        </div>
                    )}
                    {!['profesor', 'recepcion'].includes(session?.user?.role ?? '') && (
                        <>
                            <button className="flex items-center justify-center gap-2 px-4 py-4 bg-amber-400/10 border border-amber-400/25 hover:bg-amber-400/15 hover:brightness-125 active:scale-[0.98] text-amber-300 text-sm font-bold rounded-2xl transition-all duration-200" onClick={handleConfiguracionTarifas}>
                                <DollarSign size={16} />
                                Cuotas
                            </button>
                            <button className="flex items-center justify-center gap-2 px-4 py-4 bg-orange-400/10 border border-orange-400/25 hover:bg-orange-400/15 hover:brightness-125 active:scale-[0.98] text-orange-300 text-sm font-bold rounded-2xl transition-all duration-200" onClick={handleConfiguracionRecargos}>
                                <Percent size={16} />
                                Recargo
                            </button>
                        </>
                    )}
                    {session?.user?.role === 'dueño' && (
                        <button
                            onClick={handleGenerateExcel}
                            className="flex items-center justify-center gap-2 px-4 py-4 bg-emerald-400/10 border border-emerald-400/25 hover:bg-emerald-400/15 hover:brightness-125 active:scale-[0.98] text-emerald-300 text-sm font-bold rounded-2xl transition-all duration-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 48 48">
                                <path fill="#169154" d="M29,6H15.744C14.781,6,14,6.781,14,7.744v7.259h15V6z"></path>
                                <path fill="#18482a" d="M14,33.054v7.202C14,41.219,14.781,42,15.743,42H29v-8.946H14z"></path>
                                <path fill="#0c8045" d="M14 15.003H29V24.005H14z"></path>
                                <path fill="#17472a" d="M14 24.005H29V33.055H14z"></path>
                                <path fill="#29c27f" d="M42.256,6H29v9.003h15V7.744C44,6.781,43.219,6,42.256,6z"></path>
                                <path fill="#27663f" d="M29,33.054V42h13.257C43.219,42,44,41.219,44,40.257v-7.202H29z"></path>
                                <path fill="#19ac65" d="M29 15.003H44V24.005H29z"></path>
                                <path fill="#129652" d="M29 24.005H44V33.055H29z"></path>
                                <path fill="#0c7238" d="M22.319,34H5.681C4.753,34,4,33.247,4,32.319V15.681C4,14.753,4.753,14,5.681,14h16.638C23.247,14,24,14.753,24,15.681v16.638C24,33.247,23.247,34,22.319,34z"></path>
                                <path fill="#fff" d="M9.807 19L12.193 19 14.129 22.754 16.175 19 18.404 19 15.333 24 18.474 29 16.123 29 14.013 25.07 11.912 29 9.526 29 12.719 23.982z"></path>
                            </svg>
                            Balance
                        </button>
                    )}
                    {/* Revisar nombres — oculto por ahora, reactivar cuando haga falta
                    {['dueño', 'admin'].includes(session?.user?.role ?? '') && (
                        <button
                            onClick={() => router.push('/alumnos/revision-nombres')}
                            className="col-span-2 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-sky-400/10 border border-sky-400/25 hover:bg-sky-400/15 active:scale-95 text-sky-300 text-sm font-semibold rounded-2xl transition-all"
                        >
                            <Search size={15} />
                            Revisar nombres
                        </button>
                    )}
                    */}
                </div>
            </div>

            {/* Hoy en el gimnasio */}
            <div className="rounded-2xl mb-4 overflow-hidden transition-all duration-200" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <button
                    onClick={() => setHoyExpanded(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-4"
                >
                    <div className="flex items-center gap-2.5">
                        <Activity size={16} style={{ color: acento }} />
                        <span className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>Hoy en el gimnasio</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isLoading && (
                            <span className="text-[26px] font-bold tabular-nums leading-none" style={{ color: TEXT_PRIMARY }}>{totalHoy}</span>
                        )}
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`transition-transform duration-200 shrink-0 ${hoyExpanded ? 'rotate-180' : ''}`} style={{ color: TEXT_MUTED }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                    </div>
                </button>

                {hoyExpanded && (
                    <div className="px-4 pb-4 pt-3 transition-all duration-200" style={{ borderTop: `1px solid ${BORDER}` }}>
                        {isLoading ? (
                            <div className="space-y-1.5">
                                {[1,2,3].map(i => <div key={i} className="h-9 rounded-xl bg-white/[0.06] animate-pulse" />)}
                            </div>
                        ) : totalHoy === 0 ? (
                            <p className="text-sm text-center py-4" style={{ color: TEXT_MUTED }}>Nadie fue hoy todavía.</p>
                        ) : (
                            <div className="space-y-2">
                                {SLOT_CONFIG.filter(s => hoyPorTurno[s.key].length > 0).map(slot => (
                                    <div key={slot.key} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: SURFACE_2 }}>
                                        <button
                                            type="button"
                                            onClick={() => setSlotsExpanded(prev => ({ ...prev, [slot.key]: !prev[slot.key] }))}
                                            className="w-full flex items-center justify-between px-3 py-2.5"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-xs font-bold uppercase tracking-wide ${slot.text}`}>{slot.label}</span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${slot.bg} ${slot.text}`}>{hoyPorTurno[slot.key].length}</span>
                                            </div>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`transition-transform duration-200 ${slotsExpanded[slot.key] ? 'rotate-180' : ''}`} style={{ color: TEXT_MUTED }}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                            </svg>
                                        </button>
                                        {slotsExpanded[slot.key] && (
                                            <div className="px-3 pb-2.5 pt-1 space-y-1">
                                                {hoyPorTurno[slot.key].map((a, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => router.push(`/alumnos/${a.id}/historial`)}
                                                        className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 px-3 py-2 rounded-xl cursor-pointer active:scale-[0.99] transition-all duration-200"
                                                        style={{ background: 'transparent' }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.background = SURFACE_HOVER)}
                                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                                    >
                                                        <div className="flex items-center gap-2.5 basis-full sm:basis-0 sm:flex-1 min-w-0">
                                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: SURFACE, color: TEXT_SECONDARY }}>
                                                                {a.nombre?.[0]}{a.apellido?.[0]}
                                                            </div>
                                                            <span className="flex-1 min-w-0 text-sm font-semibold truncate" style={{ color: TEXT_PRIMARY }}>
                                                                {a.apellido}, {a.nombre}
                                                            </span>
                                                            <span className="sm:hidden text-xs font-medium shrink-0 tabular-nums" style={{ color: TEXT_MUTED }}>{a.hora}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 pl-9 sm:pl-0">
                                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${ACTIVIDAD_COLOR[a.actividad] ?? 'bg-white/[0.1] text-white/60'}`}>
                                                                {a.actividad}
                                                            </span>
                                                            {a.exentoCuota ? (
                                                                <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: SURFACE, color: TEXT_MUTED }}>
                                                                    Exenta
                                                                </span>
                                                            ) : a.pagado && a.pagosDelMes.length > 0 ? (
                                                                <div className="flex flex-col gap-1 shrink-0">
                                                                    {a.pagosDelMes.map((p, pi) => (
                                                                        <span key={pi} className="inline-flex flex-col items-center leading-tight px-2.5 py-1 rounded-xl text-[10px] font-bold" style={{ background: PAYMENT_BLUE_BG, color: PAYMENT_BLUE }}>
                                                                            <span className="capitalize">{p.metodoPago === 'mercadopago' ? 'MP' : p.metodoPago}</span>
                                                                            <span className="tabular-nums">${p.tarifa.toLocaleString('es-AR')}</span>
                                                                            {a.pagosDelMes.length === 1 && p.fechaPago && <span className="tabular-nums opacity-70">{new Date(p.fechaPago).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</span>}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : !a.pagado ? (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(239,68,68,0.15)', color: DANGER }}>
                                                                    Debe
                                                                </span>
                                                            ) : null}
                                                            <span className="hidden sm:inline-flex text-xs font-medium shrink-0 tabular-nums" style={{ color: TEXT_MUTED }}>{a.hora}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="rounded-[18px] p-4 space-y-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>

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
                        acentoFocus={acento2}
                    />
                </Suspense>

                {/* Resultados de alumnos de paso */}
                {busqueda.trim().length >= 2 && (buscandoDePaso || dePasoResultados.length > 0) && (
                    <div className="rounded-2xl overflow-hidden" style={{ background: SURFACE_2, border: `1px solid ${acento2}40` }}>
                        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
                            <UserPlus size={14} style={{ color: acento2 }} />
                            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: acento2 }}>De paso</span>
                            {!buscandoDePaso && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${acento2}26`, color: acento2 }}>{dePasoResultados.length}</span>
                            )}
                        </div>
                        <div className="px-3 py-2 space-y-1">
                            {buscandoDePaso ? (
                                <div className="h-9 rounded-xl bg-white/[0.06] animate-pulse" />
                            ) : (
                                dePasoResultados.map((r) => (
                                    <div key={r._id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-2 py-2 rounded-xl transition-all duration-200" style={{ background: 'transparent' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = SURFACE_HOVER)}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <div className="flex items-center gap-2.5 basis-full sm:basis-0 sm:flex-1 min-w-0">
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${acento2}26`, color: acento2 }}>
                                                {r.nombre?.[0]}{r.apellido?.[0]}
                                            </div>
                                            <span className="flex-1 min-w-0 text-sm font-semibold truncate" style={{ color: TEXT_PRIMARY }}>
                                                {r.apellido}, {r.nombre}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 pl-9 sm:pl-0">
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: SURFACE, color: TEXT_SECONDARY }}>{r.actividad}</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>${Number(r.monto).toLocaleString('es-AR')}</span>
                                            <span className="text-xs tabular-nums" style={{ color: TEXT_MUTED }}>{new Date(r.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Lista */}
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-[88px] rounded-2xl bg-white/[0.05] animate-pulse" />
                        ))}
                    </div>
                ) : alumnosFiltrados.length === 0 ? (
                    <div className="py-14 text-center">
                        <p className="text-sm font-medium" style={{ color: TEXT_MUTED }}>No se encontraron alumnos</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            {paginatedAlumnos.map((alumno) => {
                                const pagado = verificarPagoMesActual(alumno.pagos, alumno.exentoCuota);
                                const pagosDelMes = alumno.exentoCuota ? [] : expandirPagosMixtos(pagosVigentesDelMes(alumno.pagos, getMesActual(new Date())));
                                const metodoLabel = (m?: string) => m === 'mercadopago' ? 'MercadoPago' : m;
                                const dr = alumno.diasRestantes;
                                const planText = dr != null
                                    ? `${dr} día${dr !== 1 ? 's' : ''} de plan`
                                    : 'Sin plan';
                                const planColor = dr == null
                                    ? DANGER
                                    : dr === 0
                                        ? DANGER
                                        : dr <= 5
                                            ? WARNING
                                            : TEXT_SECONDARY;
                                return (
                                    <div
                                        key={alumno._id}
                                        className="group flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.99]"
                                        style={{ background: '#1B1C1E', border: `1px solid ${BORDER}`, paddingLeft: 18, paddingRight: 18, paddingTop: 14, paddingBottom: 14 }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = SURFACE_HOVER; e.currentTarget.style.borderColor = '#45474C'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#1B1C1E'; e.currentTarget.style.borderColor = BORDER; }}
                                        onClick={() => router.push(`/alumnos/${alumno._id}/historial`)}
                                    >
                                        <div className="flex items-center gap-4 basis-full sm:basis-0 sm:flex-1 min-w-0">
                                        <div className={`w-[54px] h-[54px] rounded-2xl flex items-center justify-center shrink-0 text-sm font-semibold ${pagado ? '' : 'bg-red-500/15 text-red-400'}`}
                                            style={pagado ? { background: 'rgba(34,197,94,0.14)', color: '#4ADE80' } : undefined}>
                                            {alumno.nombre?.[0]}{alumno.apellido?.[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-base leading-snug" style={{ color: TEXT_PRIMARY }}>
                                                {alumno.apellido}, {alumno.nombre}
                                            </p>
                                            <p className="text-[13px] mt-0.5" style={{ color: planColor }}>
                                                {alumno.edad ? `${alumno.edad} años · ` : ''}{planText}
                                            </p>
                                            {alumno.area && (
                                                <span className="inline-block text-[11px] font-semibold px-1.5 py-0.5 rounded-md mt-1" style={{ background: SURFACE_2, color: TEXT_SECONDARY }}>
                                                    {({
                                                        salud: '❤️ Salud', rendimiento: '🏅 Rend.', formacion: '🌱 Formación',
                                                        fuerza: '💪 Fuerza', masa_muscular: '🏋️ Masa musc.', composicion: '⚖️ Composición', retomar: '🔄 Retomar',
                                                    } as Record<string, string>)[alumno.area] ?? alumno.area}
                                                </span>
                                            )}
                                        </div>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2 ml-auto sm:ml-0">
                                            {alumno.exentoCuota ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: SURFACE_2, color: TEXT_SECONDARY }}>
                                                    Exenta
                                                </span>
                                            ) : pagado && pagosDelMes.length > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    {pagosDelMes.map((p, pi) => (
                                                        <span key={pi} className="inline-flex flex-col items-center leading-tight px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap" style={{ background: PAYMENT_BLUE_BG, color: PAYMENT_BLUE }}>
                                                            <span className="capitalize">{metodoLabel(p.metodoPago)}</span>
                                                            <span className="tabular-nums text-sm font-bold">${(p.tarifa ?? 0).toLocaleString('es-AR')}</span>
                                                            {pagosDelMes.length === 1 && p.fechaPago && (
                                                                <span className="tabular-nums opacity-70">{new Date(p.fechaPago).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })}</span>
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : pagado ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                                                    </svg>
                                                    Pagó
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.15)', color: DANGER }}>
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
                                                    </svg>
                                                    Debe
                                                </span>
                                            )}
                                            <svg className="w-4 h-4 text-zinc-500 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                            </svg>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {Math.ceil(alumnosFiltrados.length / itemsPerPage) > 1 && (
                            <div className="flex justify-center items-center gap-1.5 flex-wrap pt-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="flex items-center justify-center w-8 h-8 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                    style={{ color: TEXT_SECONDARY }}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {getPageList(page, Math.ceil(alumnosFiltrados.length / itemsPerPage)).map((n, i) =>
                                    n === '...' ? (
                                        <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-sm select-none" style={{ color: TEXT_MUTED }}>
                                            ···
                                        </span>
                                    ) : (
                                        <button
                                            key={n}
                                            onClick={() => setPage(n)}
                                            className="w-8 h-8 rounded-lg text-sm font-bold transition-all"
                                            style={n === page ? { background: acento2, color: '#0a0a0a' } : { color: TEXT_SECONDARY }}
                                        >
                                            {n}
                                        </button>
                                    )
                                )}
                                <button
                                    onClick={() => setPage(p => Math.min(Math.ceil(alumnosFiltrados.length / itemsPerPage), p + 1))}
                                    disabled={page === Math.ceil(alumnosFiltrados.length / itemsPerPage)}
                                    className="flex items-center justify-center w-8 h-8 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                    style={{ color: TEXT_SECONDARY }}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
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
