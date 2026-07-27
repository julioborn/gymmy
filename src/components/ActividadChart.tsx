'use client';

import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Props {
    data: { actividad: string; cantidad: number }[];
}

export default function ActividadChart({ data }: Props) {
    return (
        <Bar
            data={{
                labels: data.map(d => d.actividad),
                datasets: [
                    {
                        label: 'Asistencias',
                        data: data.map(d => d.cantidad),
                        backgroundColor: data.map(d =>
                            d.actividad === 'Musculación' ? 'rgba(59, 130, 246, 0.6)' :
                            d.actividad === 'Intermitente' ? 'rgba(249, 115, 22, 0.6)' :
                            'rgba(153, 102, 255, 0.6)'
                        ),
                        borderColor: data.map(d =>
                            d.actividad === 'Musculación' ? 'rgba(59, 130, 246, 1)' :
                            d.actividad === 'Intermitente' ? 'rgba(249, 115, 22, 1)' :
                            'rgba(153, 102, 255, 1)'
                        ),
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
