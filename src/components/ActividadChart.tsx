'use client';

import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function hexToRgba(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

interface Props {
    data: { actividad: string; cantidad: number }[];
    colors?: [string, string];
}

export default function ActividadChart({ data, colors = ['#10b981', '#f97316'] }: Props) {
    return (
        <Bar
            data={{
                labels: data.map(d => d.actividad),
                datasets: [
                    {
                        label: 'Asistencias',
                        data: data.map(d => d.cantidad),
                        backgroundColor: data.map((_, i) => hexToRgba(colors[i % 2], 0.55)),
                        borderColor: data.map((_, i) => hexToRgba(colors[i % 2], 1)),
                        borderWidth: 1,
                        borderRadius: 6,
                    },
                ],
            }}
            options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                    x: {},
                },
            }}
            style={{ maxHeight: '220px' }}
        />
    );
}
