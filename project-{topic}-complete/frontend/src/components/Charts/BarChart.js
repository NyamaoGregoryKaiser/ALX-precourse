import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function BarChart({ data, config }) {
  if (!data || data.length === 0 || !config) {
    return <div className="chart-placeholder">No data or configuration for Bar Chart</div>;
  }

  const { title, xAxis, yAxis, colorField } = config;

  return (
    <div className="chart-wrapper">
      <h3 className="chart-title">{title || 'Bar Chart'}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart
          data={data}
          margin={{
            top: 20, right: 30, left: 20, bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxis} />
          <YAxis dataKey={yAxis} />
          <Tooltip />
          <Legend />
          <Bar dataKey={yAxis} fill={colorField ? '#8884d8' : '#82ca9d'} />
          {/* If there's a colorField, you might want to map colors dynamically
              For simplicity, we use a single color or basic conditional.
              A more advanced implementation would use multiple Bars or custom legend.
          */}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BarChart;