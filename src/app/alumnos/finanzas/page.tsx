'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
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

const ControlFinanciero = () => {
    const { data: session } = useSession();
    const [alumnos, setAlumnos] = useState<Alumno[]>([]);
    const [ingresosPorMes, setIngresosPorMes] = useState<number[]>([]);
    const [totalIngresos, setTotalIngresos] = useState<number>(0);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [topHorarios, setTopHorarios] = useState<{ hora: string; frecuencia: number }[]>([]);
    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [totalGastos, setTotalGastos] = useState<number>(0);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // Mes actual
    const [gastosMensuales, setGastosMensuales] = useState<number[]>(new Array(12).fill(0));
    const [ingresosAdicionales, setIngresosAdicionales] = useState<Ingreso[]>([]);
    const [ingresosMensualesAdicionales, setIngresosMensualesAdicionales] = useState<number[]>(new Array(12).fill(0));
    const [totalIngresosAdicionales, setTotalIngresosAdicionales] = useState<number>(0);

    if (session && session.user?.role !== 'dueño') {
        redirect('/');
    }

    useEffect(() => {
        fetch('/api/alumnos')
            .then((res) => res.json())
            .then((data) => {
                setAlumnos(data);
                calcularAñosDisponibles(data);
                calcularIngresosPorMes(alumnos, selectedYear, selectedMonth);
                calcularTopHorarios(data);
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

    const calcularTopHorarios = (alumnos: Alumno[]) => {
        const horarioFrecuencia: { [hora: string]: number } = {};

        alumnos.forEach((alumno) => {
            alumno.asistencia
                .filter((asistencia) => asistencia.actividad === 'Musculación' && asistencia.presente)
                .forEach((asistencia) => {
                    const fecha = new Date(asistencia.fecha);
                    const horas = fecha.getHours();
                    const minutos = fecha.getMinutes();

                    // Redondear el horario
                    let horarioRedondeado: string;
                    if (minutos < 15) {
                        horarioRedondeado = `${horas.toString().padStart(2, '0')}:00`;
                    } else if (minutos < 45) {
                        horarioRedondeado = `${horas.toString().padStart(2, '0')}:30`;
                    } else {
                        horarioRedondeado = `${(horas + 1).toString().padStart(2, '0')}:00`;
                    }

                    // Contar la frecuencia
                    horarioFrecuencia[horarioRedondeado] = (horarioFrecuencia[horarioRedondeado] || 0) + 1;
                });
        });

        // Obtener el top 3 horarios más frecuentes
        const top3 = Object.entries(horarioFrecuencia)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([hora, frecuencia]) => ({ hora, frecuencia }));

        setTopHorarios(top3);
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
    const selectCls = "border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300";
    const resultado = totalIngresosCombinados - totalGastos;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-t-2xl px-6 py-5">
                <h1 className="text-xl font-bold text-white">Control Financiero</h1>
            </div>

            <div className="bg-white rounded-b-2xl shadow-xl p-6 space-y-6">
                {/* Filtros */}
                <div className="flex flex-wrap gap-3">
                    <select className={selectCls} value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                        {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                    <select className={selectCls} value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                        <option value={-1}>Todos los meses</option>
                        {meses.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                </div>

                {/* Resumen */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                        <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mb-1">Ingresos Totales</p>
                        <p className="text-2xl font-bold text-emerald-700">${totalIngresosCombinados.toLocaleString('es-ES')}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{selectedMonth === -1 ? selectedYear : `${meses[selectedMonth]} ${selectedYear}`}</p>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                        <p className="text-xs text-red-600 font-semibold uppercase tracking-wide mb-1">Gastos Totales</p>
                        <p className="text-2xl font-bold text-red-700">${totalGastos.toLocaleString('es-ES')}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{selectedMonth === -1 ? selectedYear : `${meses[selectedMonth]} ${selectedYear}`}</p>
                    </div>
                    <div className={`${resultado >= 0 ? 'bg-slate-50 border-slate-100' : 'bg-red-50 border-red-100'} border rounded-xl p-4`}>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Resultado Final</p>
                        <p className={`text-2xl font-bold ${resultado >= 0 ? 'text-slate-800' : 'text-red-700'}`}>${resultado.toLocaleString('es-ES')}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{selectedMonth === -1 ? selectedYear : `${meses[selectedMonth]} ${selectedYear}`}</p>
                    </div>
                </div>

                {/* Ingresos Adicionales */}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-100">
                        <div>
                            <h3 className="text-sm font-bold text-slate-700">Ingresos Adicionales</h3>
                            <p className="text-xs text-slate-500">Total: <span className="font-bold text-blue-600">${totalIngresosAdicionales.toLocaleString('es-ES')}</span></p>
                        </div>
                        <button onClick={handleAgregarIngreso} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition">
                            + Agregar
                        </button>
                    </div>
                    <div className="overflow-auto max-h-56">
                        {ingresosAdicionales.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead><tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-4 py-2 text-left text-xs text-slate-500 font-semibold">Fecha</th>
                                    <th className="px-4 py-2 text-left text-xs text-slate-500 font-semibold">Detalle</th>
                                    <th className="px-4 py-2 text-right text-xs text-slate-500 font-semibold">Importe</th>
                                    <th className="px-4 py-2 text-right text-xs text-slate-500 font-semibold">Acciones</th>
                                </tr></thead>
                                <tbody className="divide-y divide-slate-50">
                                    {ingresosAdicionales.map((ingreso) => (
                                        <tr key={ingreso._id} className="hover:bg-slate-50 transition">
                                            <td className="px-4 py-2 text-slate-700">{new Date(ingreso.fecha).toLocaleDateString('es-ES')}</td>
                                            <td className="px-4 py-2 text-slate-700">{ingreso.detalle}</td>
                                            <td className="px-4 py-2 text-right font-bold text-blue-600">${ingreso.importe.toLocaleString('es-ES')}</td>
                                            <td className="px-4 py-2 text-right">
                                                <button onClick={() => handleEditarIngreso(ingreso._id, ingreso.fecha, ingreso.detalle, ingreso.importe)} className="p-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-lg transition mr-1"><FaEdit /></button>
                                                <button onClick={() => handleEliminarIngreso(ingreso._id)} className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition"><FaTrashAlt /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-slate-500 text-sm text-center py-6">No hay ingresos registrados.</p>
                        )}
                    </div>
                </div>

                {/* Gastos */}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-100">
                        <div>
                            <h3 className="text-sm font-bold text-slate-700">Gastos</h3>
                            <p className="text-xs text-slate-500">Total: <span className="font-bold text-red-600">${totalGastos.toLocaleString('es-ES')}</span></p>
                        </div>
                        <button onClick={handleAgregarGasto} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition">
                            + Agregar
                        </button>
                    </div>
                    <div className="overflow-auto max-h-56">
                        {gastos.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead><tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-4 py-2 text-left text-xs text-slate-500 font-semibold">Fecha</th>
                                    <th className="px-4 py-2 text-left text-xs text-slate-500 font-semibold">Detalle</th>
                                    <th className="px-4 py-2 text-right text-xs text-slate-500 font-semibold">Importe</th>
                                    <th className="px-4 py-2 text-right text-xs text-slate-500 font-semibold">Acciones</th>
                                </tr></thead>
                                <tbody className="divide-y divide-slate-50">
                                    {gastos.map((gasto) => (
                                        <tr key={gasto._id} className="hover:bg-slate-50 transition">
                                            <td className="px-4 py-2 text-slate-700">{new Date(gasto.fecha).toLocaleDateString('es-ES')}</td>
                                            <td className="px-4 py-2 text-slate-700">{gasto.detalle}</td>
                                            <td className="px-4 py-2 text-right font-bold text-red-600">${gasto.importe.toLocaleString('es-ES')}</td>
                                            <td className="px-4 py-2 text-right">
                                                <button onClick={() => handleEditarGasto(gasto._id, gasto.fecha, gasto.detalle, gasto.importe)} className="p-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-lg transition mr-1"><FaEdit /></button>
                                                <button onClick={() => handleEliminarGasto(gasto._id)} className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition"><FaTrashAlt /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-slate-500 text-sm text-center py-6">No hay gastos registrados.</p>
                        )}
                    </div>
                </div>

                {/* Gráfico */}
                <div className="border border-slate-100 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Ingresos vs Gastos — {selectedYear}</h3>
                    <Bar
                        data={{
                            labels: meses,
                            datasets: [
                                {
                                    label: `Ingresos (${selectedYear})`,
                                    data: ingresosPorMes.map((valor, i) => (selectedMonth === -1 || selectedMonth === i ? valor : 0)),
                                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                                    borderColor: 'rgba(16, 185, 129, 1)',
                                    borderWidth: 1,
                                },
                                {
                                    label: `Gastos (${selectedYear})`,
                                    data: gastosMensuales.map((valor, i) => (selectedMonth === -1 || selectedMonth === i ? valor : 0)),
                                    backgroundColor: 'rgba(239, 68, 68, 0.6)',
                                    borderColor: 'rgba(239, 68, 68, 1)',
                                    borderWidth: 1,
                                },
                            ],
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: { legend: { display: true } },
                            scales: {
                                y: { beginAtZero: true, title: { display: true, text: 'Monto en $' } },
                                x: { title: { display: true, text: 'Meses' } },
                            },
                        }}
                        style={{ maxHeight: '400px' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ControlFinanciero;
