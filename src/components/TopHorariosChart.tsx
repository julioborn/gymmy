'use client';

import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type TopHorariosChartProps = {
    topHorarios: { hora: string; frecuencia: number }[];
    color?: string;
};

function hexToRgba(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

const TopHorariosChart: React.FC<TopHorariosChartProps> = ({ topHorarios, color = '#10b981' }) => {
    return (
        <Bar
            data={{
                labels: topHorarios.map((h) => h.hora),
                datasets: [
                    {
                        label: 'Frecuencia',
                        data: topHorarios.map((h) => h.frecuencia),
                        backgroundColor: hexToRgba(color, 0.55),
                        borderColor: hexToRgba(color, 1),
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
};

export default TopHorariosChart;
