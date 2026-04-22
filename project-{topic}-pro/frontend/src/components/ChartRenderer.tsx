```typescript
import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line,
    PieChart, Pie, Cell,
    ScatterChart, Scatter
} from 'recharts';
import { ChartType } from '../types';

interface ChartRendererProps {
    type: ChartType;
    data: any[];
    configuration: Record<string, any>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6B6B'];

const ChartRenderer: React.FC<ChartRendererProps> = ({ type, data, configuration }) => {
    if (!data || data.length === 0) {
        return <div className="p-4 text-center text-gray-500">No data available to render chart.</div>;
    }

    const { xAxis = {}, yAxis = {}, bars = [], lines = [], dataKey, nameKey, title } = configuration;

    const renderTitle = title ? <h3 className="text-lg font-semibold mb-2">{title}</h3> : null;

    return (
        <div className="bg-white p-4 rounded shadow-md h-96">
            {renderTitle}
            <ResponsiveContainer width="100%" height="90%">
                {type === ChartType.BAR && (
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={xAxis.dataKey} />
                        <YAxis label={{ value: yAxis.label, angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        {bars.map((bar: any, index: number) => (
                            <Bar key={`bar-${index}`} dataKey={bar.dataKey} fill={bar.fill || COLORS[index % COLORS.length]} />
                        ))}
                    </BarChart>
                )}

                {type === ChartType.LINE && (
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={xAxis.dataKey} />
                        <YAxis label={{ value: yAxis.label, angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        {lines.map((line: any, index: number) => (
                            <Line key={`line-${index}`} type="monotone" dataKey={line.dataKey} stroke={line.stroke || COLORS[index % COLORS.length]} activeDot={{ r: 8 }} />
                        ))}
                    </LineChart>
                )}

                {type === ChartType.PIE && (
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey={dataKey || 'value'}
                            nameKey={nameKey || 'name'}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            label={(entry) => entry[nameKey || 'name']}
                        >
                            {data.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                )}

                {type === ChartType.SCATTER && (
                    <ScatterChart>
                        <CartesianGrid />
                        <XAxis type="number" dataKey={xAxis.dataKey} name={xAxis.name} />
                        <YAxis type="number" dataKey={yAxis.dataKey} name={yAxis.name} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Legend />
                        <Scatter name={configuration.seriesName || "Series 1"} data={data} fill={COLORS[0]} />
                    </ScatterChart>
                )}

                {type === ChartType.TABLE && (
                    <div className="overflow-x-auto h-full">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    {data.length > 0 && Object.keys(data[0]).map((key) => (
                                        <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{key}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {Object.values(row).map((value: any, colIndex) => (
                                            <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{String(value)}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </ResponsiveContainer>
        </div>
    );
};

export default ChartRenderer;
```