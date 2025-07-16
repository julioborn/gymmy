// components/ActividadChart.tsx
'use client';

import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
    data: { actividad: string; cantidad: number }[];
}

export default function ActividadChart({ data }: Props) {
    const chartData = {
        labels: data.map(d => d.actividad),
        datasets: [
            {
                label: 'Cantidad de Asistencias',
                data: data.map(d => d.cantidad),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
            }
        ]
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: true, text: 'Asistencias por Actividad' }
        }
    };

    return <Bar data={chartData} options={options} />;
}
