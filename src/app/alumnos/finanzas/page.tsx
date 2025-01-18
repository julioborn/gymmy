'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

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

const ControlFinanciero = () => {
    const { data: session } = useSession();
    const [alumnos, setAlumnos] = useState<Alumno[]>([]);
    const [ingresosPorMes, setIngresosPorMes] = useState<number[]>([]);
    const [totalIngresos, setTotalIngresos] = useState<number>(0);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [topHorarios, setTopHorarios] = useState<{ hora: string; frecuencia: number }[]>([]);

    if (session && session.user?.role !== 'dueño') {
        redirect('/');
    }

    useEffect(() => {
        fetch('/api/alumnos')
            .then((res) => res.json())
            .then((data) => {
                setAlumnos(data);
                calcularAñosDisponibles(data);
                calcularIngresosPorMes(data, selectedYear);
                calcularTopHorarios(data);
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

        const total = ingresos.reduce((acc, ingreso) => acc + ingreso, 0);
        setTotalIngresos(total);
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

    return (
        <div className="bg-white p-6 rounded shadow-md max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Control Financiero</h2>

            <div className="mb-6">
                <label htmlFor="year-selector" className="block text-gray-700 font-medium mb-2">
                    Selecciona el Año:
                </label>
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

            <div className="bg-gray-50 p-4 rounded shadow border">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Reporte Anual - {selectedYear}</h3>
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
                        maintainAspectRatio: true,
                    }}
                    style={{ maxHeight: '400px', overflow: 'hidden' }}
                />
            </div>

            {/* Gráfico de horarios más frecuentes */}
            <div className="mt-8 bg-gray-50 p-4 rounded shadow border">
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
            </div>
        </div>
    );
};

export default ControlFinanciero;
