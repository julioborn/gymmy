'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { motion, animate } from 'framer-motion';
import { Wallet, TrendingDown, Scale, Banknote, Landmark, Plus } from 'lucide-react';
import Swal from 'sweetalert2';
import { swalBase, swalDanger, swalNotify } from '@/utils/swalConfig';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ─── Magic UI: entrance + counter ──────────────────────────────────────────
function NumberTicker({ value }: { value: number }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const ctrl = animate(0, value, {
            duration: 1,
            ease: [0.16, 1, 0.3, 1],
            onUpdate(v) { setDisplay(Math.floor(v)); },
        });
        return ctrl.stop;
    }, [value]);
    return <>{display.toLocaleString('es-ES')}</>;
}
function BlurFade({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, filter: 'blur(8px)', y: 12 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    );
}
function glassStyle(rgb: string, intensity: 'neutral' | 'glow' = 'glow'): React.CSSProperties {
    if (intensity === 'neutral') {
        return { background: 'linear-gradient(165deg, rgba(255,255,255,0.05), rgba(17,17,17,0.9))', border: '1px solid rgba(255,255,255,0.1)' };
    }
    return {
        background: `linear-gradient(165deg, rgba(${rgb},0.09), rgba(17,17,17,0.9))`,
        border: `1px solid rgba(${rgb},0.32)`,
        boxShadow: `0 0 0 1px rgba(${rgb},0.05) inset, 0 10px 26px -9px rgba(${rgb},0.34)`,
    };
}
const chartDarkScales = {
    y: { beginAtZero: true, ticks: { precision: 0, color: 'rgba(255,255,255,0.45)' }, grid: { color: 'rgba(255,255,255,0.07)' } },
    x: { ticks: { color: 'rgba(255,255,255,0.45)' }, grid: { color: 'rgba(255,255,255,0.04)' } },
};
const chartDarkLegend = { labels: { color: 'rgba(255,255,255,0.6)', boxWidth: 12, font: { size: 11 } } };

type Pago = {
    mes: string;
    fechaPago: string;
    tarifa: number;
    diasMusculacion: number;
    metodoPago?: string;
    montoEfectivo?: number;
    montoTransferencia?: number;
};

type Asistencia = {
    fecha: string;
    actividad: string;
    presente: boolean;
};

type Alumno = {
    _id: string;
    nombre: string;
    apellido: string;
    pagos: Pago[];
    asistencia: Asistencia[];
};

type Gasto = {
    _id: string; // Agregamos ID para MongoDB
    fecha: string;
    detalle: string;
    importe: number;
};

type Ingreso = {
    _id: string;
    fecha: string;
    detalle: string;
    importe: number;
};

function hexToRgba(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

const ControlFinanciero = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [alumnos, setAlumnos] = useState<Alumno[]>([]);
    const [ingresosPorMes, setIngresosPorMes] = useState<number[]>([]);
    const [, setTotalIngresos] = useState<number>(0);
    const [efectivoPorMes, setEfectivoPorMes] = useState<number[]>(new Array(12).fill(0));
    const [transferenciaPorMes, setTransferenciaPorMes] = useState<number[]>(new Array(12).fill(0));
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [totalGastos, setTotalGastos] = useState<number>(0);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [gastosMensuales, setGastosMensuales] = useState<number[]>(new Array(12).fill(0));
    const [ingresosAdicionales, setIngresosAdicionales] = useState<Ingreso[]>([]);
    const [ingresosMensualesAdicionales, setIngresosMensualesAdicionales] = useState<number[]>(new Array(12).fill(0));
    const [totalIngresosAdicionales, setTotalIngresosAdicionales] = useState<number>(0);
    const [acento, setAcento] = useState('#10b981');
    const [acento2, setAcento2] = useState('#f97316');

    useEffect(() => {
        if (status !== 'loading' && !['dueño', 'admin'].includes(session?.user?.role ?? '')) {
            router.push('/');
        }
    }, [session, status, router]);

    useEffect(() => {
        fetch('/api/gimnasio/tema')
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d?.temaAcento) setAcento(d.temaAcento);
                if (d?.temaAcento2) setAcento2(d.temaAcento2);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetch('/api/alumnos')
            .then((res) => res.json())
            .then((data) => {
                setAlumnos(data);
                calcularAñosDisponibles(data);
                calcularIngresosPorMes(data, selectedYear, selectedMonth);
            })
            .catch(() => { /* silenced */ });
    }, []);

    useEffect(() => {
        calcularIngresosPorMes(alumnos, selectedYear, selectedMonth);
    }, [selectedYear, selectedMonth, alumnos]);

    const calcularAñosDisponibles = (alumnos: Alumno[]) => {
        const años = new Set<number>();
        alumnos.forEach((alumno) =>
            alumno.pagos.forEach((pago) => {
                const año = new Date(pago.fechaPago).getFullYear();
                años.add(año);
            })
        );
        setAvailableYears(Array.from(años).sort((a, b) => a - b));
    };

    const calcularIngresosPorMes = (alumnos: Alumno[], year: number, month: number) => {
        let ingresosMensuales = new Array(12).fill(0);
        let efectivoMensual = new Array(12).fill(0);
        let transferenciaMensual = new Array(12).fill(0);

        alumnos.forEach(alumno => {
            alumno.pagos.forEach(pago => {
                const fechaPago = new Date(pago.fechaPago);
                const pagoYear = fechaPago.getFullYear();
                const pagoMonth = fechaPago.getMonth();

                if (pagoYear === year) {
                    ingresosMensuales[pagoMonth] += pago.tarifa;
                    if (pago.metodoPago === 'efectivo') efectivoMensual[pagoMonth] += pago.tarifa;
                    else if (pago.metodoPago === 'transferencia') transferenciaMensual[pagoMonth] += pago.tarifa;
                    else if (pago.metodoPago === 'mixto') {
                        efectivoMensual[pagoMonth] += pago.montoEfectivo ?? 0;
                        transferenciaMensual[pagoMonth] += pago.montoTransferencia ?? 0;
                    }
                }
            });
        });

        setIngresosPorMes(ingresosMensuales);
        setEfectivoPorMes(efectivoMensual);
        setTransferenciaPorMes(transferenciaMensual);

        if (month === -1) {
            // Si se selecciona "Todos", mostrar el total anual
            setTotalIngresos(ingresosMensuales.reduce((acc, val) => acc + val, 0));
        } else {
            // Mostrar solo el total del mes seleccionado
            setTotalIngresos(ingresosMensuales[month] || 0);
        }
    };

    gastos.forEach(gasto => {
        const fechaGasto = new Date(gasto.fecha);
        const gastoMonth = fechaGasto.getMonth();
        gastosMensuales[gastoMonth] += gasto.importe;
    });

    const fetchGastos = async (year: number, month: number) => {
        try {
            const response = await fetch('/api/gastos');
            const data = await response.json();

            let newGastosMensuales = new Array(12).fill(0);

            data.forEach((gasto: any) => {
                const fechaGasto = new Date(gasto.fecha);
                const gastoYear = fechaGasto.getFullYear();
                const gastoMonth = fechaGasto.getMonth();

                if (gastoYear === year) {
                    newGastosMensuales[gastoMonth] += gasto.importe;
                }
            });

            // **Aquí se usa `setGastosMensuales` correctamente**
            setGastosMensuales(newGastosMensuales);

            if (month === -1) {
                setTotalGastos(newGastosMensuales.reduce((acc, val) => acc + val, 0));
            } else {
                setTotalGastos(newGastosMensuales[month] || 0);
            }

            setGastos(data
                .filter((g: { fecha: string | number | Date }) => {
                    const fechaGasto = new Date(g.fecha);
                    return month === -1
                        ? fechaGasto.getFullYear() === year
                        : fechaGasto.getFullYear() === year && fechaGasto.getMonth() === month;
                })
                .sort(ordenarPorFecha) // Aplica el ordenamiento antes de guardarlo en el estado
            );
        } catch {
            // silenced
        }
    };
    useEffect(() => {
        fetchGastos(selectedYear, selectedMonth);
    }, [selectedYear, selectedMonth]);

    const fetchIngresos = async (year: number, month: number) => {
        try {
            const response = await fetch('/api/ingresos');
            const data = await response.json();
            let nuevosIngresosMensuales = new Array(12).fill(0);
            data.forEach((ingreso: any) => {
                const fecha = new Date(ingreso.fecha);
                if (fecha.getFullYear() === year) {
                    nuevosIngresosMensuales[fecha.getMonth()] += ingreso.importe;
                }
            });
            setIngresosMensualesAdicionales(nuevosIngresosMensuales);
            if (month === -1) {
                setTotalIngresosAdicionales(nuevosIngresosMensuales.reduce((acc, val) => acc + val, 0));
            } else {
                setTotalIngresosAdicionales(nuevosIngresosMensuales[month] || 0);
            }
            setIngresosAdicionales(
                data.filter((ingreso: { fecha: string | number | Date }) => {
                    const fecha = new Date(ingreso.fecha);
                    return month === -1
                        ? fecha.getFullYear() === year
                        : fecha.getFullYear() === year && fecha.getMonth() === month;
                })
                    .sort(ordenarPorFecha) // Aplica el ordenamiento antes de guardarlo en el estado
            );
        } catch {
            // silenced
        }
    };
    useEffect(() => {
        fetchIngresos(selectedYear, selectedMonth);
    }, [selectedYear, selectedMonth]);

    const handleAgregarGasto = async () => {
        const { value: formData } = await Swal.fire({
            ...swalBase,
            title: 'Registrar Gasto',
            html: `
                <div class="swal-form-body">
                    <label class="swal-form-label">Fecha</label>
                    <input type="date" id="fecha-gasto" class="swal2-input">
                    <label class="swal-form-label">Detalle</label>
                    <input type="text" id="detalle-gasto" class="swal2-input" placeholder="Descripción del gasto">
                    <label class="swal-form-label">Importe ($)</label>
                    <input type="number" id="importe-gasto" class="swal2-input" placeholder="0">
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Agregar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const fecha = ajustarFechaLocal((document.getElementById('fecha-gasto') as HTMLInputElement).value).toISOString();
                const detalle = (document.getElementById('detalle-gasto') as HTMLInputElement).value;
                const importe = Number((document.getElementById('importe-gasto') as HTMLInputElement).value);
                if (!fecha || !detalle || importe <= 0) {
                    Swal.showValidationMessage('Todos los campos son obligatorios y el importe debe ser mayor a 0');
                    return null;
                }
                return { fecha, detalle, importe };
            },
        });

        if (!formData) return;

        try {
            const response = await fetch('/api/gastos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                Swal.fire({ ...swalNotify, icon: 'success', title: 'Gasto registrado correctamente' });
                fetchGastos(selectedYear, selectedMonth);
            } else {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo registrar el gasto' });
            }
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'Hubo un problema al registrar el gasto' });
        }
    };

    const handleEditarGasto = async (id: string, fechaActual: string, detalleActual: string, importeActual: number) => {
        const fechaISO = new Date(fechaActual).toISOString().split('T')[0];
        const { value: formData } = await Swal.fire({
            ...swalBase,
            title: 'Editar Gasto',
            html: `
                <div class="swal-form-body">
                    <label class="swal-form-label">Fecha</label>
                    <input type="date" id="fecha-gasto" class="swal2-input" value="${fechaISO}">
                    <label class="swal-form-label">Detalle</label>
                    <input type="text" id="detalle-gasto" class="swal2-input" value="${detalleActual}">
                    <label class="swal-form-label">Importe ($)</label>
                    <input type="number" id="importe-gasto" class="swal2-input" value="${importeActual}">
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const fecha = ajustarFechaLocal((document.getElementById('fecha-gasto') as HTMLInputElement).value).toISOString();
                const detalle = (document.getElementById('detalle-gasto') as HTMLInputElement).value;
                const importe = Number((document.getElementById('importe-gasto') as HTMLInputElement).value);
                if (!fecha || !detalle || importe <= 0) {
                    Swal.showValidationMessage('Todos los campos son obligatorios y el importe debe ser mayor a 0');
                    return null;
                }
                return { fecha, detalle, importe };
            },
        });

        if (!formData) return;

        try {
            await fetch('/api/gastos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...formData }),
            });
            Swal.fire({ ...swalNotify, icon: 'success', title: 'Gasto actualizado correctamente' });
            fetchGastos(selectedYear, selectedMonth);
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo actualizar el gasto' });
        }
    };

    const handleEliminarGasto = async (id: string) => {
        const confirm = await Swal.fire({
            ...swalDanger,
            title: '¿Eliminar gasto?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
        });

        if (!confirm.isConfirmed) return;

        try {
            const response = await fetch('/api/gastos', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const data = await response.json();
            if (response.ok) {
                Swal.fire({ ...swalNotify, icon: 'success', title: 'Gasto eliminado' });
                fetchGastos(selectedYear, selectedMonth);
            } else {
                Swal.fire({ ...swalNotify, icon: 'error', title: data.error || 'No se pudo eliminar el gasto' });
            }
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo eliminar el gasto' });
        }
    };

    const handleAgregarIngreso = async () => {
        const { value: formData } = await Swal.fire({
            ...swalBase,
            title: 'Registrar Ingreso',
            html: `
                <div class="swal-form-body">
                    <label class="swal-form-label">Fecha</label>
                    <input type="date" id="fecha-ingreso" class="swal2-input">
                    <label class="swal-form-label">Detalle</label>
                    <input type="text" id="detalle-ingreso" class="swal2-input" placeholder="Descripción del ingreso">
                    <label class="swal-form-label">Importe ($)</label>
                    <input type="number" id="importe-ingreso" class="swal2-input" placeholder="0">
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Agregar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const fecha = ajustarFechaLocal((document.getElementById('fecha-ingreso') as HTMLInputElement).value).toISOString();
                const detalle = (document.getElementById('detalle-ingreso') as HTMLInputElement).value;
                const importe = Number((document.getElementById('importe-ingreso') as HTMLInputElement).value);
                if (!fecha || !detalle || importe <= 0) {
                    Swal.showValidationMessage('Todos los campos son obligatorios y el importe debe ser mayor a 0');
                    return null;
                }
                return { fecha, detalle, importe };
            },
        });
        if (!formData) return;
        try {
            const response = await fetch('/api/ingresos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                Swal.fire({ ...swalNotify, icon: 'success', title: 'Ingreso registrado correctamente' });
                fetchIngresos(selectedYear, selectedMonth);
            } else {
                Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo registrar el ingreso' });
            }
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'Hubo un problema al registrar el ingreso' });
        }
    };

    const handleEditarIngreso = async (id: string, fechaActual: string, detalleActual: string, importeActual: number) => {
        const fechaISO = new Date(fechaActual).toISOString().split('T')[0];
        const { value: formData } = await Swal.fire({
            ...swalBase,
            title: 'Editar Ingreso',
            html: `
                <div class="swal-form-body">
                    <label class="swal-form-label">Fecha</label>
                    <input type="date" id="fecha-ingreso" class="swal2-input" value="${fechaISO}">
                    <label class="swal-form-label">Detalle</label>
                    <input type="text" id="detalle-ingreso" class="swal2-input" value="${detalleActual}">
                    <label class="swal-form-label">Importe ($)</label>
                    <input type="number" id="importe-ingreso" class="swal2-input" value="${importeActual}">
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const fecha = ajustarFechaLocal((document.getElementById('fecha-ingreso') as HTMLInputElement).value).toISOString();
                const detalle = (document.getElementById('detalle-ingreso') as HTMLInputElement).value;
                const importe = Number((document.getElementById('importe-ingreso') as HTMLInputElement).value);
                if (!fecha || !detalle || importe <= 0) {
                    Swal.showValidationMessage('Todos los campos son obligatorios y el importe debe ser mayor a 0');
                    return null;
                }
                return { fecha, detalle, importe };
            },
        });
        if (!formData) return;
        try {
            await fetch('/api/ingresos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...formData }),
            });
            Swal.fire({ ...swalNotify, icon: 'success', title: 'Ingreso actualizado correctamente' });
            fetchIngresos(selectedYear, selectedMonth);
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo actualizar el ingreso' });
        }
    };

    const handleEliminarIngreso = async (id: string) => {
        const confirm = await Swal.fire({
            ...swalDanger,
            title: '¿Eliminar ingreso?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!confirm.isConfirmed) return;
        try {
            await fetch('/api/ingresos', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            Swal.fire({ ...swalNotify, icon: 'success', title: 'Ingreso eliminado' });
            fetchIngresos(selectedYear, selectedMonth);
        } catch {
            Swal.fire({ ...swalNotify, icon: 'error', title: 'No se pudo eliminar el ingreso' });
        }
    };

    const ajustarFechaLocal = (fechaString: string) => {
        const [year, month, day] = fechaString.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0); // Ajustamos a las 12:00 PM para evitar el desfase
    };

    const ordenarPorFecha = (a: { fecha: string }, b: { fecha: string }) => {
        return new Date(a.fecha).getTime() - new Date(b.fecha).getTime(); // Ordena de más reciente a más antiguo
    };


    // Combinar los ingresos: pagos de alumnos + ingresos adicionales
    const ingresosMensualesCombinados = new Array(12).fill(0);
    for (let i = 0; i < 12; i++) {
        ingresosMensualesCombinados[i] = ingresosPorMes[i] + ingresosMensualesAdicionales[i];
    }
    const totalIngresosCombinados =
        selectedMonth === -1
            ? ingresosMensualesCombinados.reduce((acc, val) => acc + val, 0)
            : ingresosMensualesCombinados[selectedMonth] || 0;

    const totalEfectivo = selectedMonth === -1
        ? efectivoPorMes.reduce((acc, val) => acc + val, 0)
        : efectivoPorMes[selectedMonth] || 0;
    const totalTransferencia = selectedMonth === -1
        ? transferenciaPorMes.reduce((acc, val) => acc + val, 0)
        : transferenciaPorMes[selectedMonth] || 0;

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const resultado = totalIngresosCombinados - totalGastos;

    const chevronSvg = (
        <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
    );

    const lbl = 'text-[10px] font-bold text-white/40 uppercase tracking-widest';
    const editBtn = 'p-1.5 bg-white/10 hover:bg-white/15 text-white/60 rounded-lg transition mr-1';
    const delBtn = 'p-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg transition';

    return (
        <div className="max-w-7xl mx-auto pt-4 pb-12 px-4 lg:px-8 space-y-4">

            {/* Banner */}
            <BlurFade delay={0}>
                <div className="rounded-[2rem] p-[1.5px]" style={{ background: `linear-gradient(135deg, ${acento} 0%, ${acento2} 100%)`, boxShadow: `0 0 28px -9px ${acento}50, 0 0 36px -14px ${acento2}38` }}>
                    <div className="relative bg-[#111] rounded-[30px] px-5 pt-5 pb-5 overflow-hidden">
                        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                        <div className="pointer-events-none absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20" style={{ background: acento }} />
                        <div className="pointer-events-none absolute -bottom-8 -left-4 w-40 h-40 rounded-full blur-3xl opacity-15" style={{ background: acento2 }} />
                        <div className="relative flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${acento}, ${acento2})` }}>
                                    <Wallet size={20} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">Gestión económica</p>
                                    <h1 className="text-xl font-bold text-white leading-tight">Finanzas</h1>
                                    <span className="inline-block mt-1.5 bg-white/10 ring-1 ring-white/10 text-white/70 text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                                        {selectedMonth === -1 ? `Año ${selectedYear}` : `${meses[selectedMonth]} ${selectedYear}`}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="relative">
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                        className="appearance-none bg-white/10 text-white/80 text-xs font-semibold rounded-xl px-3 py-1.5 pr-7 focus:outline-none cursor-pointer"
                                    >
                                        {availableYears.map((year) => <option key={year} value={year} className="bg-slate-800 text-white">{year}</option>)}
                                    </select>
                                    {chevronSvg}
                                </div>
                                <div className="relative">
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                        className="appearance-none bg-white/10 text-white/80 text-xs font-semibold rounded-xl px-3 py-1.5 pr-7 focus:outline-none cursor-pointer"
                                    >
                                        <option value={-1} className="bg-slate-800 text-white">Todos</option>
                                        {meses.map((m, i) => <option key={i} value={i} className="bg-slate-800 text-white">{m}</option>)}
                                    </select>
                                    {chevronSvg}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </BlurFade>

            {/* KPI Summary */}
            <div className="grid grid-cols-3 gap-2 lg:gap-3">
                <BlurFade delay={0.05}>
                    <div className="rounded-2xl p-3 lg:p-4 h-full" style={glassStyle('16,185,129')}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <TrendingDown size={12} className="text-emerald-400 rotate-180 shrink-0" />
                            <p className={lbl}>Ingresos</p>
                        </div>
                        <p className="text-base lg:text-2xl font-bold leading-tight text-white tabular-nums break-all">$<NumberTicker value={totalIngresosCombinados} /></p>
                    </div>
                </BlurFade>
                <BlurFade delay={0.1}>
                    <div className="rounded-2xl p-3 lg:p-4 h-full" style={glassStyle('239,68,68')}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <TrendingDown size={12} className="text-red-400 shrink-0" />
                            <p className={lbl}>Gastos</p>
                        </div>
                        <p className="text-base lg:text-2xl font-bold leading-tight text-white tabular-nums break-all">$<NumberTicker value={totalGastos} /></p>
                    </div>
                </BlurFade>
                <BlurFade delay={0.15}>
                    <div className="rounded-2xl p-3 lg:p-4 h-full" style={glassStyle(resultado >= 0 ? '16,185,129' : '239,68,68')}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Scale size={12} className={resultado >= 0 ? 'text-emerald-400 shrink-0' : 'text-red-400 shrink-0'} />
                            <p className={lbl}>Resultado</p>
                        </div>
                        <p className="text-base lg:text-2xl font-bold leading-tight text-white tabular-nums break-all">${resultado.toLocaleString('es-ES')}</p>
                    </div>
                </BlurFade>
            </div>

            {/* Cuotas por método de pago */}
            <div className="grid grid-cols-2 gap-2 lg:gap-3">
                <BlurFade delay={0.2}>
                    <div className="rounded-2xl p-3 lg:p-4 h-full" style={glassStyle('16,185,129')}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Banknote size={12} className="text-emerald-400 shrink-0" />
                            <p className={lbl}>Cuotas en efectivo</p>
                        </div>
                        <p className="text-base lg:text-2xl font-bold leading-tight text-white tabular-nums break-all">$<NumberTicker value={totalEfectivo} /></p>
                    </div>
                </BlurFade>
                <BlurFade delay={0.25}>
                    <div className="rounded-2xl p-3 lg:p-4 h-full" style={glassStyle('14,165,233')}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Landmark size={12} className="text-sky-400 shrink-0" />
                            <p className={lbl}>Cuotas por transferencia</p>
                        </div>
                        <p className="text-base lg:text-2xl font-bold leading-tight text-white tabular-nums break-all">$<NumberTicker value={totalTransferencia} /></p>
                    </div>
                </BlurFade>
            </div>

            {/* Desktop: tables left, chart right */}
            <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-4 space-y-4 lg:space-y-0">
                <div className="space-y-4">
                    {/* Ingresos Adicionales */}
                    <BlurFade delay={0.3}>
                        <div className="rounded-2xl overflow-hidden" style={glassStyle('0,0,0', 'neutral')}>
                            <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
                                <div>
                                    <p className={lbl}>Ingresos adicionales</p>
                                    <p className="text-xs text-white/40 mt-0.5">Total: <span className="font-bold text-white/70">${totalIngresosAdicionales.toLocaleString('es-ES')}</span></p>
                                </div>
                                <button onClick={handleAgregarIngreso} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white text-xs font-semibold rounded-xl transition">
                                    <Plus size={13} /> Agregar
                                </button>
                            </div>
                            {ingresosAdicionales.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm min-w-[480px]">
                                        <thead>
                                            <tr className="bg-white/[0.03] border-b border-white/10">
                                                <th className="px-4 py-2 text-left text-[10px] text-white/40 font-bold uppercase tracking-wide">Fecha</th>
                                                <th className="px-4 py-2 text-left text-[10px] text-white/40 font-bold uppercase tracking-wide">Detalle</th>
                                                <th className="px-4 py-2 text-right text-[10px] text-white/40 font-bold uppercase tracking-wide">Importe</th>
                                                <th className="px-4 py-2" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.06]">
                                            {ingresosAdicionales.map((ingreso) => (
                                                <tr key={ingreso._id} className="hover:bg-white/[0.03] transition">
                                                    <td className="px-4 py-2.5 text-white/50 text-xs whitespace-nowrap">{new Date(ingreso.fecha).toLocaleDateString('es-ES')}</td>
                                                    <td className="px-4 py-2.5 text-white/70 text-xs">{ingreso.detalle}</td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-white text-xs whitespace-nowrap">${ingreso.importe.toLocaleString('es-ES')}</td>
                                                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                                        <button onClick={() => handleEditarIngreso(ingreso._id, ingreso.fecha, ingreso.detalle, ingreso.importe)} className={editBtn}><FaEdit size={11} /></button>
                                                        <button onClick={() => handleEliminarIngreso(ingreso._id)} className={delBtn}><FaTrashAlt size={11} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-white/30 text-sm text-center py-8">Sin ingresos registrados</p>
                            )}
                        </div>
                    </BlurFade>

                    {/* Gastos */}
                    <BlurFade delay={0.35}>
                        <div className="rounded-2xl overflow-hidden" style={glassStyle('0,0,0', 'neutral')}>
                            <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
                                <div>
                                    <p className={lbl}>Gastos</p>
                                    <p className="text-xs text-white/40 mt-0.5">Total: <span className="font-bold text-red-400">${totalGastos.toLocaleString('es-ES')}</span></p>
                                </div>
                                <button onClick={handleAgregarGasto} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-400 active:scale-95 text-white text-xs font-semibold rounded-xl transition">
                                    <Plus size={13} /> Agregar
                                </button>
                            </div>
                            {gastos.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm min-w-[480px]">
                                        <thead>
                                            <tr className="bg-white/[0.03] border-b border-white/10">
                                                <th className="px-4 py-2 text-left text-[10px] text-white/40 font-bold uppercase tracking-wide">Fecha</th>
                                                <th className="px-4 py-2 text-left text-[10px] text-white/40 font-bold uppercase tracking-wide">Detalle</th>
                                                <th className="px-4 py-2 text-right text-[10px] text-white/40 font-bold uppercase tracking-wide">Importe</th>
                                                <th className="px-4 py-2" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.06]">
                                            {gastos.map((gasto) => (
                                                <tr key={gasto._id} className="hover:bg-white/[0.03] transition">
                                                    <td className="px-4 py-2.5 text-white/50 text-xs whitespace-nowrap">{new Date(gasto.fecha).toLocaleDateString('es-ES')}</td>
                                                    <td className="px-4 py-2.5 text-white/70 text-xs">{gasto.detalle}</td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-red-400 text-xs whitespace-nowrap">${gasto.importe.toLocaleString('es-ES')}</td>
                                                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                                        <button onClick={() => handleEditarGasto(gasto._id, gasto.fecha, gasto.detalle, gasto.importe)} className={editBtn}><FaEdit size={11} /></button>
                                                        <button onClick={() => handleEliminarGasto(gasto._id)} className={delBtn}><FaTrashAlt size={11} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-white/30 text-sm text-center py-8">Sin gastos registrados</p>
                            )}
                        </div>
                    </BlurFade>
                </div>

                {/* Gráfico (sidebar en desktop) */}
                <BlurFade delay={0.4}>
                    <div className="rounded-2xl p-4 lg:self-start" style={glassStyle('0,0,0', 'neutral')}>
                        <p className={`${lbl} mb-4`}>Ingresos vs Gastos — {selectedYear}</p>
                        <Bar
                            data={{
                                labels: meses,
                                datasets: [
                                    {
                                        label: `Ingresos (${selectedYear})`,
                                        data: ingresosMensualesCombinados,
                                        backgroundColor: 'rgba(16,185,129,0.55)',
                                        borderColor: 'rgba(16,185,129,1)',
                                        borderWidth: 1,
                                        borderRadius: 4,
                                    },
                                    {
                                        label: `Gastos (${selectedYear})`,
                                        data: gastosMensuales,
                                        backgroundColor: 'rgba(239,68,68,0.55)',
                                        borderColor: 'rgba(239,68,68,1)',
                                        borderWidth: 1,
                                        borderRadius: 4,
                                    },
                                ],
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: true,
                                plugins: { legend: { display: true, labels: chartDarkLegend.labels } },
                                scales: chartDarkScales,
                            }}
                            style={{ maxHeight: '280px' }}
                        />
                    </div>
                </BlurFade>
            </div>

        </div>
    );
};

export default ControlFinanciero;
