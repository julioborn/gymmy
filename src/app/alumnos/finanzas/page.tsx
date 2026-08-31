'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import Swal from 'sweetalert2';
import { swalBase, swalDanger, swalNotify } from '@/utils/swalConfig';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Pago = {
    mes: string;
    fechaPago: string;
    tarifa: number;
    diasMusculacion: number;
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
                calcularIngresosPorMes(alumnos, selectedYear, selectedMonth);
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

        alumnos.forEach(alumno => {
            alumno.pagos.forEach(pago => {
                const fechaPago = new Date(pago.fechaPago);
                const pagoYear = fechaPago.getFullYear();
                const pagoMonth = fechaPago.getMonth();

                if (pagoYear === year) {
                    ingresosMensuales[pagoMonth] += pago.tarifa;
                }
            });
        });

        setIngresosPorMes(ingresosMensuales);

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

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const resultado = totalIngresosCombinados - totalGastos;

    const chevronSvg = (
        <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
    );

    const card = 'bg-white border border-black/[0.07] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_14px_rgba(0,0,0,0.04)]';
    const lbl = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest';

    return (
        <div className="max-w-lg mx-auto pt-4 pb-12 px-4 space-y-5">

            {/* Banner */}
            <div className="relative bg-[#111] rounded-2xl px-5 pt-5 pb-5 overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.05),transparent_55%)]" />
                <div className="pointer-events-none absolute -bottom-8 -right-4 w-36 h-36 rounded-full blur-3xl opacity-25" style={{ background: acento }} />
                <div className="relative flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest">Gestión económica</p>
                        <h1 className="text-xl font-bold text-white mt-0.5">Finanzas</h1>
                        <div className="mt-2.5">
                            <span className="bg-white/10 ring-1 ring-white/10 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                                {selectedMonth === -1 ? `Año ${selectedYear}` : `${meses[selectedMonth]} ${selectedYear}`}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="appearance-none bg-white/10 text-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 pr-7 focus:outline-none cursor-pointer"
                            >
                                {availableYears.map((year) => <option key={year} value={year} className="bg-slate-800 text-white">{year}</option>)}
                            </select>
                            {chevronSvg}
                        </div>
                        <div className="relative">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="appearance-none bg-white/10 text-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 pr-7 focus:outline-none cursor-pointer"
                            >
                                <option value={-1} className="bg-slate-800 text-white">Todos</option>
                                {meses.map((m, i) => <option key={i} value={i} className="bg-slate-800 text-white">{m}</option>)}
                            </select>
                            {chevronSvg}
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Summary */}
            <div className="grid grid-cols-3 gap-3">
                <div className={`${card} p-4`}>
                    <p className={`${lbl} mb-2`}>Ingresos</p>
                    <p className="text-2xl font-bold leading-none" style={{ color: acento }}>${totalIngresosCombinados.toLocaleString('es-ES')}</p>
                </div>
                <div className={`${card} p-4`}>
                    <p className={`${lbl} mb-2`}>Gastos</p>
                    <p className="text-2xl font-bold leading-none text-red-500">${totalGastos.toLocaleString('es-ES')}</p>
                </div>
                <div className={`${card} p-4`}>
                    <p className={`${lbl} mb-2`}>Resultado</p>
                    <p className={`text-2xl font-bold leading-none ${resultado >= 0 ? 'text-slate-800' : 'text-red-500'}`}>${resultado.toLocaleString('es-ES')}</p>
                </div>
            </div>

            {/* Ingresos Adicionales */}
            <div className={`${card} overflow-hidden`}>
                <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
                    <div>
                        <p className={lbl}>Ingresos adicionales</p>
                        <p className="text-xs text-slate-400 mt-0.5">Total: <span className="font-bold text-slate-700">${totalIngresosAdicionales.toLocaleString('es-ES')}</span></p>
                    </div>
                    <button onClick={handleAgregarIngreso} className="px-3 py-1.5 bg-[#111] hover:bg-zinc-800 active:scale-95 text-white text-xs font-semibold rounded-xl transition">
                        + Agregar
                    </button>
                </div>
                {ingresosAdicionales.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-50">
                                <th className="px-4 py-2 text-left text-[10px] text-slate-400 font-bold uppercase tracking-wide">Fecha</th>
                                <th className="px-4 py-2 text-left text-[10px] text-slate-400 font-bold uppercase tracking-wide">Detalle</th>
                                <th className="px-4 py-2 text-right text-[10px] text-slate-400 font-bold uppercase tracking-wide">Importe</th>
                                <th className="px-4 py-2" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {ingresosAdicionales.map((ingreso) => (
                                <tr key={ingreso._id} className="hover:bg-slate-50/60 transition">
                                    <td className="px-4 py-2.5 text-slate-500 text-xs">{new Date(ingreso.fecha).toLocaleDateString('es-ES')}</td>
                                    <td className="px-4 py-2.5 text-slate-700 text-xs">{ingreso.detalle}</td>
                                    <td className="px-4 py-2.5 text-right font-bold text-slate-800 text-xs">${ingreso.importe.toLocaleString('es-ES')}</td>
                                    <td className="px-4 py-2.5 text-right">
                                        <button onClick={() => handleEditarIngreso(ingreso._id, ingreso.fecha, ingreso.detalle, ingreso.importe)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition mr-1"><FaEdit size={11} /></button>
                                        <button onClick={() => handleEliminarIngreso(ingreso._id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition"><FaTrashAlt size={11} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-slate-400 text-sm text-center py-8">Sin ingresos registrados</p>
                )}
            </div>

            {/* Gastos */}
            <div className={`${card} overflow-hidden`}>
                <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
                    <div>
                        <p className={lbl}>Gastos</p>
                        <p className="text-xs text-slate-400 mt-0.5">Total: <span className="font-bold text-red-500">${totalGastos.toLocaleString('es-ES')}</span></p>
                    </div>
                    <button onClick={handleAgregarGasto} className="px-3 py-1.5 bg-red-500 hover:bg-red-400 active:scale-95 text-white text-xs font-semibold rounded-xl transition">
                        + Agregar
                    </button>
                </div>
                {gastos.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-50">
                                <th className="px-4 py-2 text-left text-[10px] text-slate-400 font-bold uppercase tracking-wide">Fecha</th>
                                <th className="px-4 py-2 text-left text-[10px] text-slate-400 font-bold uppercase tracking-wide">Detalle</th>
                                <th className="px-4 py-2 text-right text-[10px] text-slate-400 font-bold uppercase tracking-wide">Importe</th>
                                <th className="px-4 py-2" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {gastos.map((gasto) => (
                                <tr key={gasto._id} className="hover:bg-slate-50/60 transition">
                                    <td className="px-4 py-2.5 text-slate-500 text-xs">{new Date(gasto.fecha).toLocaleDateString('es-ES')}</td>
                                    <td className="px-4 py-2.5 text-slate-700 text-xs">{gasto.detalle}</td>
                                    <td className="px-4 py-2.5 text-right font-bold text-red-500 text-xs">${gasto.importe.toLocaleString('es-ES')}</td>
                                    <td className="px-4 py-2.5 text-right">
                                        <button onClick={() => handleEditarGasto(gasto._id, gasto.fecha, gasto.detalle, gasto.importe)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition mr-1"><FaEdit size={11} /></button>
                                        <button onClick={() => handleEliminarGasto(gasto._id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition"><FaTrashAlt size={11} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-slate-400 text-sm text-center py-8">Sin gastos registrados</p>
                )}
            </div>

            {/* Gráfico */}
            <div className={`${card} p-4`}>
                <p className={`${lbl} mb-4`}>Ingresos vs Gastos — {selectedYear}</p>
                <Bar
                    data={{
                        labels: meses,
                        datasets: [
                            {
                                label: `Ingresos (${selectedYear})`,
                                data: ingresosMensualesCombinados.map((valor, i) => (selectedMonth === -1 || selectedMonth === i ? valor : 0)),
                                backgroundColor: hexToRgba(acento, 0.55),
                                borderColor: hexToRgba(acento, 1),
                                borderWidth: 1,
                                borderRadius: 4,
                            },
                            {
                                label: `Gastos (${selectedYear})`,
                                data: gastosMensuales.map((valor, i) => (selectedMonth === -1 || selectedMonth === i ? valor : 0)),
                                backgroundColor: hexToRgba(acento2, 0.55),
                                borderColor: hexToRgba(acento2, 1),
                                borderWidth: 1,
                                borderRadius: 4,
                            },
                        ],
                    }}
                    options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: { legend: { display: true } },
                        scales: {
                            y: { beginAtZero: true, ticks: { precision: 0 } },
                            x: {},
                        },
                    }}
                    style={{ maxHeight: '280px' }}
                />
            </div>

        </div>
    );
};

export default ControlFinanciero;
