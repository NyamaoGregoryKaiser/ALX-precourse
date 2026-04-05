```typescript
import React from 'react';
import ReactApexChart from 'react-apexcharts';

interface ChartCardProps {
  title: string;
  series: any[];
  options: any;
  loading: boolean;
  error?: string | null;
  height?: string | number;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, series, options, loading, error, height = 350 }) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-4 h-full flex flex-col">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">{title}</h3>
      <div className="flex-1 flex items-center justify-center">
        {loading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <div className="w-full">
            <ReactApexChart options={options} series={series} type={options.chart?.type || 'line'} height={height} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartCard;
```