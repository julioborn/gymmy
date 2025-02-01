'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import Swal from 'sweetalert2';
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
            .catch((error) => console.error('Error al cargar alumnos:', error));
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
        } catch (error) {
            console.error('Error al obtener los gastos:', error);
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
        } catch (error) {
            console.error('Error al obtener los ingresos adicionales:', error);
        }
    };
    useEffect(() => {
        fetchIngresos(selectedYear, selectedMonth);
    }, [selectedYear, selectedMonth]);

    const handleAgregarGasto = async () => {
        const { value: formData } = await Swal.fire({
            title: 'Registrar Gasto',
            html: `
                <input type="date" id="fecha-gasto" class="swal2-input" placeholder="Fecha">
                <input type="text" id="detalle-gasto" class="swal2-input" placeholder="Detalle">
                <input type="number" id="importe-gasto" class="swal2-input" placeholder="Importe">
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
                Swal.fire('Éxito', 'Gasto registrado correctamente', 'success');
                fetchGastos(selectedYear, selectedMonth);
            } else {
                Swal.fire('Error', 'No se pudo registrar el gasto', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Hubo un problema al registrar el gasto', 'error');
        }
    };

    const handleEditarGasto = async (id: string, fechaActual: string, detalleActual: string, importeActual: number) => {
        const { value: formData } = await Swal.fire({
            title: 'Editar Gasto',
            html: `
                <input type="date" id="fecha-gasto" class="swal2-input" value="${fechaActual}">
                <input type="text" id="detalle-gasto" class="swal2-input" value="${detalleActual}">
                <input type="number" id="importe-gasto" class="swal2-input" value="${importeActual}">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar Cambios',
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

            Swal.fire('Éxito', 'Gasto actualizado correctamente', 'success');
            fetchGastos(selectedYear, selectedMonth);
        } catch (error) {
            Swal.fire('Error', 'No se pudo actualizar el gasto', 'error');
        }
    };

    const handleEliminarGasto = async (id: string) => {
        console.log("Intentando eliminar gasto con ID:", id); // 👀 Verificar si el ID es correcto
        const confirm = await Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción eliminará el gasto de forma permanente.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
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
            console.log("Respuesta de eliminación:", data); // 👀 Ver respuesta de la API

            if (response.ok) {
                Swal.fire('Eliminado', 'El gasto ha sido eliminado', 'success');
                fetchGastos(selectedYear, selectedMonth);
            } else {
                Swal.fire('Error', data.error || 'No se pudo eliminar el gasto', 'error');
            }
        } catch (error) {
            console.error("Error al eliminar el gasto:", error);
            Swal.fire('Error', 'No se pudo eliminar el gasto', 'error');
        }
    };

    const handleAgregarIngreso = async () => {
        const { value: formData } = await Swal.fire({
            title: 'Registrar Ingreso',
            html: `
            <input type="date" id="fecha-ingreso" class="swal2-input" placeholder="Fecha">
            <input type="text" id="detalle-ingreso" class="swal2-input" placeholder="Detalle">
            <input type="number" id="importe-ingreso" class="swal2-input" placeholder="Importe">
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
                Swal.fire('Éxito', 'Ingreso registrado correctamente', 'success');
                fetchIngresos(selectedYear, selectedMonth);
            } else {
                Swal.fire('Error', 'No se pudo registrar el ingreso', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Hubo un problema al registrar el ingreso', 'error');
        }
    };

    const handleEditarIngreso = async (id: string, fechaActual: string, detalleActual: string, importeActual: number) => {
        const { value: formData } = await Swal.fire({
            title: 'Editar Ingreso',
            html: `
            <input type="date" id="fecha-ingreso" class="swal2-input" value="${fechaActual}">
            <input type="text" id="detalle-ingreso" class="swal2-input" value="${detalleActual}">
            <input type="number" id="importe-ingreso" class="swal2-input" value="${importeActual}">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar Cambios',
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
            Swal.fire('Éxito', 'Ingreso actualizado correctamente', 'success');
            fetchIngresos(selectedYear, selectedMonth);
        } catch (error) {
            Swal.fire('Error', 'No se pudo actualizar el ingreso', 'error');
        }
    };

    const handleEliminarIngreso = async (id: string) => {
        const confirm = await Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción eliminará el ingreso de forma permanente.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!confirm.isConfirmed) return;
        try {
            await fetch('/api/ingresos', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            Swal.fire('Eliminado', 'El ingreso ha sido eliminado', 'success');
            fetchIngresos(selectedYear, selectedMonth);
        } catch (error) {
            Swal.fire('Error', 'No se pudo eliminar el ingreso', 'error');
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

    return (
        <div className="bg-white p-6 rounded shadow-md max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Control Financiero</h2>

            <div className='flex space-x-2'>
                <div className="mb-6">
                    <select
                        id="year-selector"
                        className="border border-gray-300 px-3 py-2 bg-gray-50 p-4 rounded shadow cursor-pointer"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                    >
                        {availableYears.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-6">
                    <select
                        id="month-selector"
                        className="border border-gray-300 px-3 py-2 bg-gray-50 p-4 rounded shadow cursor-pointer"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    >
                        <option value={-1}>Todos</option>
                        {[
                            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                        ].map((month, index) => (
                            <option key={index} value={index}>
                                {month}
                            </option>
                        ))}
                    </select>
                </div>

            </div>

            {/* Sección de Ingresos Adicionales */}
            <div className="mt-2 bg-gray-50 p-4 rounded shadow border">
                <h3 className="text-xl font-semibold text-blue-600 mb-4">Ingresos Adicionales</h3>
                <p className="text-lg font-medium mb-4 text-gray-700">
                    Total de Ingresos Adicionales: <span className="text-blue-600 font-bold">${totalIngresosAdicionales.toLocaleString('es-ES')}</span>
                </p>
                <button
                    onClick={handleAgregarIngreso}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Agregar Ingreso
                </button>
                <div className="mt-4 overflow-auto max-h-60 border rounded p-2 bg-white">
                    {ingresosAdicionales.length > 0 ? (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-2 text-left">Fecha</th>
                                    <th className="p-2 text-left">Detalle</th>
                                    <th className="p-2 text-right">Importe</th>
                                    <th className="p-2 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ingresosAdicionales.map((ingreso) => (
                                    <tr key={ingreso._id} className="border-b"> {/* Cambia ingreso.id por ingreso._id */}
                                        <td className="p-2">{new Date(ingreso.fecha).toLocaleDateString('es-ES')}</td>
                                        <td className="p-2">{ingreso.detalle}</td>
                                        <td className="p-2 text-right text-blue-600 font-bold">
                                            ${ingreso.importe.toLocaleString('es-ES')}
                                        </td>
                                        <td className="p-2 text-right">
                                            <button
                                                onClick={() => handleEditarIngreso(ingreso._id, ingreso.fecha, ingreso.detalle, ingreso.importe)} // Cambia ingreso.id por ingreso._id
                                                className="bg-yellow-500 text-white px-2 py-2 rounded hover:bg-yellow-600 mx-1"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={() => handleEliminarIngreso(ingreso._id)} // Cambia ingreso.id por ingreso._id
                                                className="bg-red-500 text-white px-2 py-2 rounded hover:bg-red-600"
                                            >
                                                <FaTrashAlt />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-gray-500">No hay ingresos registrados.</p>
                    )}
                </div>
            </div>

            {/* Sección de Gastos */}
            <div className="mt-8 bg-gray-50 p-4 rounded shadow border">
                <h3 className="text-xl font-semibold text-red-600 mb-4">Gastos</h3>

                <p className="text-lg font-medium mb-4 text-gray-700">
                    Total de Gastos: <span className="text-red-600 font-bold">${totalGastos.toLocaleString('es-ES')}</span>
                </p>

                <button
                    onClick={handleAgregarGasto}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                    Agregar Gasto
                </button>

                <div className="mt-4 overflow-auto max-h-60 border rounded p-2 bg-white">
                    {gastos.length > 0 ? (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-2 text-left">Fecha</th>
                                    <th className="p-2 text-left">Detalle</th>
                                    <th className="p-2 text-right">Importe</th>
                                    <th className="p-2 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gastos.map((gasto) => (
                                    <tr key={gasto._id} className="border-b">
                                        <td className="p-2">{new Date(gasto.fecha).toLocaleDateString('es-ES')}</td>
                                        <td className="p-2">{gasto.detalle}</td>
                                        <td className="p-2 text-right text-red-600 font-bold">
                                            ${gasto.importe.toLocaleString('es-ES')}
                                        </td>
                                        <td className="p-2 text-right">
                                            <button
                                                onClick={() => handleEditarGasto(gasto._id, gasto.fecha, gasto.detalle, gasto.importe)}
                                                className="bg-yellow-500 text-white px-2 py-2 rounded hover:bg-yellow-600 mx-1"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={() => handleEliminarGasto(gasto._id)}
                                                className="bg-red-500 text-white px-2 py-2 rounded hover:bg-red-600"
                                            >
                                                <FaTrashAlt />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-gray-500">No hay gastos registrados.</p>
                    )}
                </div>
            </div>

            {/* Ingresos Totales (Combinados: pagos + ingresos adicionales) */}
            <div className="mt-6 bg-gray-50 p-4 rounded shadow border">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {selectedMonth === -1
                        ? `Ingresos Totales - ${selectedYear}`
                        : `Ingresos en ${[
                            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                        ][selectedMonth]} ${selectedYear}`}
                </h3>
                <p className="text-gray-700">
                    <span className="font-bold text-green-600">
                        ${totalIngresosCombinados.toLocaleString('es-ES')}
                    </span>
                </p>
            </div>

            {/* Resultado Final */}
            <div className="mt-6 bg-gray-50 p-4 rounded shadow border">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {selectedMonth === -1
                        ? `Resultado Final - ${selectedYear}`
                        : `Resultado Final en ${[
                            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                        ][selectedMonth]} ${selectedYear}`}
                </h3>
                <p className="text-gray-700">
                    <span className={`font-bold ${totalIngresosCombinados - totalGastos >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${(totalIngresosCombinados - totalGastos).toLocaleString('es-ES')}
                    </span>
                </p>
            </div>

            {/* Gráfico de ingresos vs gastos */}
            <div className="mt-8 bg-gray-50 p-4 rounded shadow border">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Ingresos | Gastos - {selectedYear}</h3>
                <Bar
                    data={{
                        labels: [
                            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
                        ],
                        datasets: [
                            {
                                label: `Ingresos (${selectedYear})`,
                                data: ingresosPorMes.map((valor, i) => (selectedMonth === -1 || selectedMonth === i ? valor : 0)),
                                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                                borderColor: 'rgba(75, 192, 192, 1)',
                                borderWidth: 1,
                            },
                            {
                                label: `Gastos (${selectedYear})`,
                                data: gastosMensuales.map((valor, i) => (selectedMonth === -1 || selectedMonth === i ? valor : 0)),
                                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                                borderColor: 'rgba(255, 99, 132, 1)',
                                borderWidth: 1,
                            },
                        ],
                    }}
                    options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                display: true,
                            },
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Monto en $',
                                },
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Meses',
                                },
                            },
                        },
                    }}
                    style={{ maxHeight: '400px' }}
                />
            </div>

            {/* Gráfico de horarios más frecuentes */}
            {/* <div className="mt-8 bg-gray-50 p-4 rounded shadow border">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">
                    Horarios más frecuentes
                </h3>
                <Bar
                    data={{
                        labels: topHorarios.map((h) => h.hora),
                        datasets: [
                            {
                                label: 'Frecuencia',
                                data: topHorarios.map((h) => h.frecuencia),
                                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                                borderColor: 'rgba(153, 102, 255, 1)',
                                borderWidth: 1,
                            },
                        ],
                    }}
                    options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                display: false,
                            },
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Frecuencia',
                                },
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Horarios',
                                },
                            },
                        },
                    }}
                    style={{ maxHeight: '400px' }}
                />
            </div> */}

        </div>
    );
};

export default ControlFinanciero;
