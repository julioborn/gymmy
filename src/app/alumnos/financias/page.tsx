'use client';

import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Pago = {
    mes: string;
    fechaPago: string;
    tarifa: number;
    diasMusculacion: number;
};

type Alumno = {
    _id: string;
    nombre: string;
    apellido: string;
    pagos: Pago[];
};

const ControlFinanciero = () => {
    const [alumnos, setAlumnos] = useState<Alumno[]>([]);
    const [ingresosPorMes, setIngresosPorMes] = useState<number[]>([]);
    const [totalIngresos, setTotalIngresos] = useState<number>(0); // Total de ingresos anuales
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState<number[]>([]);

    useEffect(() => {
        fetch('/api/alumnos') // Asegúrate de que esta ruta sea correcta
            .then((res) => res.json())
            .then((data) => {
                setAlumnos(data);
                calcularAñosDisponibles(data);
                calcularIngresosPorMes(data, selectedYear);
            })
            .catch((error) => console.error('Error al cargar alumnos:', error));
    }, []);

    useEffect(() => {
        calcularIngresosPorMes(alumnos, selectedYear);
    }, [selectedYear]);

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

    const calcularIngresosPorMes = (alumnos: Alumno[], año: number) => {
        const meses = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
        ];

        const ingresos = meses.map((mes) => {
            return alumnos.reduce((total, alumno) => {
                const pagosDelMes = alumno.pagos.filter(
                    (pago) => pago.mes === mes && new Date(pago.fechaPago).getFullYear() === año
                );
                return total + pagosDelMes.reduce((subTotal, pago) => subTotal + pago.tarifa, 0);
            }, 0);
        });

        setIngresosPorMes(ingresos);

        // Calcular el total anual
        const total = ingresos.reduce((acc, ingreso) => acc + ingreso, 0);
        setTotalIngresos(total);
    };

    return (
        <div className="bg-white p-6 rounded shadow-md max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Control Financiero</h2>

            {/* Selector de año */}
            <div className="mb-6">
                <label htmlFor="year-selector" className="block text-gray-700 font-medium mb-2">
                    Selecciona el Año:
                </label>
                <select
                    id="year-selector"
                    className="border border-gray-300 px-3 py-2 bg-gray-50 p-4 rounded shadow"
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

            {/* Reporte Anual */}
            <div className="bg-gray-50 p-4 rounded shadow border">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Reporte Anual - 2024</h3>
                <p className="text-gray-700">
                    <span className="font-bold text-green-600">
                        ${totalIngresos.toLocaleString('es-ES')}
                    </span>
                </p>
            </div>

            {/* Gráfico de ingresos mensuales */}
            <div className="mt-8 bg-gray-50 p-4 rounded shadow border">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Ingresos Mensuales - {selectedYear}</h3>
                <Bar
                    data={{
                        labels: [
                            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
                        ],
                        datasets: [
                            {
                                label: `Ingresos (${selectedYear})`,
                                data: ingresosPorMes,
                                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                                borderColor: 'rgba(75, 192, 192, 1)',
                                borderWidth: 1,
                            },
                        ],
                    }}
                    options={{
                        responsive: true,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top',
                            },
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Monto ($)',
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
                />
            </div>

            {/* Lista de cuentas por cobrar
            <div className="bg-gray-100 p-4 rounded">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Cuentas por Cobrar - {selectedYear}</h3>
                <ul className="divide-y divide-gray-300">
                    {alumnos
                        .filter((alumno) => {
                            const mesesPagados = alumno.pagos
                                .filter((pago) => new Date(pago.fechaPago).getFullYear() === selectedYear)
                                .map((pago) => pago.mes);
                            const mesActual = new Date().toLocaleString('es-ES', { month: 'long' });
                            return !mesesPagados.includes(mesActual.toLowerCase());
                        })
                        .map((alumno) => {
                            const mesesAdeudados = [
                                'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                                'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
                            ].filter((mes) => {
                                return !alumno.pagos.some(
                                    (pago) => pago.mes === mes && new Date(pago.fechaPago).getFullYear() === selectedYear
                                );
                            });

                            return (
                                <li key={alumno._id} className="py-2">
                                    <details>
                                        <summary className="flex justify-between items-center cursor-pointer">
                                            <div className="flex items-center">
                                                <span className="font-semibold text-gray-800">
                                                    {alumno.nombre} {alumno.apellido}
                                                </span>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="w-4 h-4 ml-2 transition-transform details-summary-toggle-icon"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                            <span className="text-red-500 font-medium">Pagos Pendientes</span>
                                        </summary>
                                        <ul className="ml-4 mt-2 list-disc text-gray-700">
                                            {mesesAdeudados.map((mes) => (
                                                <li key={mes}>
                                                    <span className="capitalize">{mes}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                </li>
                            );
                        })}
                </ul>
                {alumnos.filter((alumno) => {
                    const mesesPagados = alumno.pagos
                        .filter((pago) => new Date(pago.fechaPago).getFullYear() === selectedYear)
                        .map((pago) => pago.mes);
                    const mesActual = new Date().toLocaleString('es-ES', { month: 'long' });
                    return !mesesPagados.includes(mesActual.toLowerCase());
                }).length === 0 && (
                        <p className="text-gray-500 text-center">Todos los alumnos están al día con sus pagos.</p>
                    )}
            </div> */}

        </div>
    );
};

export default ControlFinanciero;