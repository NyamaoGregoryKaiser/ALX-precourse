```typescript
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DashboardMetricData } from '../api/dashboard';

interface ChartComponentProps {
  data: DashboardMetricData[];
  metricName: string;
  unit?: string;
}

const ChartComponent: React.FC<ChartComponentProps> = ({ data, metricName, unit }) => {
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500">No data available for this metric.</p>;
  }

  // Data expects 'time' and 'value' fields for charting
  const formattedData = data.map(item => ({
    ...item,
    time: new Date(item.time).toLocaleString(), // Format timestamp for display
    value: parseFloat(item.value.toFixed(2)) // Round values for cleaner display
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={formattedData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis label={{ value: unit, angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#8884d8"
          activeDot={{ r: 8 }}
          name={`${metricName} ${unit ? `(${unit})` : ''}`}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ChartComponent;
```