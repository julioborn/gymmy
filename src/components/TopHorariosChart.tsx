'use client';

import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type TopHorariosChartProps = {
    topHorarios: { hora: string; frecuencia: number }[];
};

const TopHorariosChart: React.FC<TopHorariosChartProps> = ({ topHorarios }) => {
    return (
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
