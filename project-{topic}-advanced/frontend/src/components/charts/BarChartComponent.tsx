import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartProps {
  data: any[]; // Processed data from backend
  config: { // Visualization config from backend
    xAxisLabel?: string;
    yAxisLabel?: string;
    backgroundColor?: string;
    labelColumn: string; // Column to use for x-axis labels
    valueColumn: string; // Column to use for y-axis values
  };
  title?: string;
}

const BarChartComponent: React.FC<BarChartProps> = ({ data, config, title }) => {
  const chartData = {
    labels: data.map(item => item[config.labelColumn]),
    datasets: [
      {
        label: config.yAxisLabel || 'Value',
        data: data.map(item => item[config.valueColumn]),
        backgroundColor: config.backgroundColor || 'rgba(75, 192, 192, 0.6)',
        borderColor: config.backgroundColor ? config.backgroundColor.replace('0.6', '1') : 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: !!title,
        text: title,
        font: { size: 16 }
      },
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        title: {
          display: !!config.xAxisLabel,
          text: config.xAxisLabel,
        },
      },
      y: {
        title: {
          display: !!config.yAxisLabel,
          text: config.yAxisLabel,
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default BarChartComponent;