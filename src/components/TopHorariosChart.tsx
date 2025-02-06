'use client';

import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type TopHorariosChartProps = {
    topHorarios: { hora: string; frecuencia: number }[];
};

const TopHorariosChart: React.FC<TopHorariosChartProps> = ({ topHorarios }) => {
    return (
        <div className="mt-8 bg-gray-50 p-4 rounded shadow border">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Horarios más frecuentes</h3>
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
                        legend: { display: false },
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Frecuencia' },
                        },
                        x: {
                            title: { display: true, text: 'Horarios' },
                        },
                    },
                }}
                style={{ maxHeight: '400px' }}
            />
        </div>
    );
};

export default TopHorariosChart;
