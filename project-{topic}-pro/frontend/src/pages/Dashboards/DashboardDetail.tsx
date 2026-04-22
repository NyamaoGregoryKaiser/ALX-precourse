```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Dashboard, Chart, ChartType, DataSource } from '../../types';
import axiosInstance from '../../api/axiosInstance';
import ChartRenderer from '../../components/ChartRenderer';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

const DashboardDetail: React.FC = () => {
    useAuthRedirect();

    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [dashboard, setDashboard] = useState<Dashboard | null>(null);
    const [charts, setCharts] = useState<Chart[]>([]);
    const [dataSources, setDataSources] = useState<DataSource[]>([]); // For chart creation/editing
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chartDataCache, setChartDataCache] = useState<{ [chartId: string]: any[] }>({});
    const [showChartForm, setShowChartForm] = useState(false);
    const [editingChart, setEditingChart] = useState<Chart | null>(null);

    const [newChartName, setNewChartName] = useState('');
    const [newChartType, setNewChartType] = useState<ChartType>(ChartType.BAR);
    const [newChartQuery, setNewChartQuery] = useState('');
    const [newChartDataSourceId, setNewChartDataSourceId] = useState('');
    const [newChartConfig, setNewChartConfig] = useState<string>('{}'); // JSON string

    const fetchDashboardAndCharts = useCallback(async () => {
        try {
            setLoading(true);
            const dashboardResponse = await axiosInstance.get(`/dashboards/${id}`);
            setDashboard(dashboardResponse.data);

            const chartsResponse = await axiosInstance.get(`/dashboards/${id}/charts`);
            setCharts(chartsResponse.data);

            // Fetch data sources for chart creation/editing forms
            const dataSourcesResponse = await axiosInstance.get('/data-sources');
            setDataSources(dataSourcesResponse.data);

            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch dashboard or charts:', err);
            setError(err.response?.data?.message || 'Failed to load dashboard details.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchDashboardAndCharts();
    }, [fetchDashboardAndCharts]);

    // Function to fetch and cache chart data
    const fetchChartData = useCallback(async (chartId: string) => {
        if (chartDataCache[chartId]) return; // Use cache if available

        try {
            const response = await axiosInstance.get(`/dashboards/${id}/charts/${chartId}/data`);
            setChartDataCache(prev => ({ ...prev, [chartId]: response.data }));
        } catch (err: any) {
            console.error(`Failed to fetch data for chart ${chartId}:`, err);
            // Optionally, store an error in cache for this chart
            setChartDataCache(prev => ({ ...prev, [chartId]: [] })); // Set to empty array on error
        }
    }, [id, chartDataCache]);

    useEffect(() => {
        charts.forEach(chart => fetchChartData(chart.id));
    }, [charts, fetchChartData]);


    const resetChartForm = () => {
        setNewChartName('');
        setNewChartType(ChartType.BAR);
        setNewChartQuery('');
        setNewChartDataSourceId('');
        setNewChartConfig('{}');
        setEditingChart(null);
        setShowChartForm(false);
    };

    const handleChartSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const chartData = {
                name: newChartName,
                type: newChartType,
                query: newChartQuery,
                dataSourceId: newChartDataSourceId,
                configuration: JSON.parse(newChartConfig)
            };

            if (editingChart) {
                await axiosInstance.put(`/dashboards/${id}/charts/${editingChart.id}`, chartData);
            } else {
                await axiosInstance.post(`/dashboards/${id}/charts`, chartData);
            }
            resetChartForm();
            await fetchDashboardAndCharts(); // Re-fetch all data
            setChartDataCache({}); // Clear cache to force re-fetch chart data
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save chart.');
            console.error('Failed to save chart:', err);
        }
    };

    const handleEditChart = (chart: Chart) => {
        setEditingChart(chart);
        setNewChartName(chart.name);
        setNewChartType(chart.type);
        setNewChartQuery(chart.query);
        setNewChartDataSourceId(chart.dataSourceId);
        setNewChartConfig(JSON.stringify(chart.configuration, null, 2));
        setShowChartForm(true);
    };

    const handleDeleteChart = async (chartId: string) => {
        if (window.confirm('Are you sure you want to delete this chart?')) {
            try {
                await axiosInstance.delete(`/dashboards/${id}/charts/${chartId}`);
                await fetchDashboardAndCharts();
                setChartDataCache({});
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to delete chart.');
                console.error('Failed to delete chart:', err);
            }
        }
    };


    if (loading) return <div className="p-4 text-center">Loading dashboard...</div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
    if (!dashboard) return <div className="p-4 text-center">Dashboard not found.</div>;

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-3xl font-bold mb-2 text-gray-800">{dashboard.name}</h2>
            <p className="text-gray-600 mb-6">{dashboard.description}</p>

            <div className="flex justify-end gap-2 mb-6">
                <Link to={`/dashboards/${dashboard.id}/edit`} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded">
                    Edit Dashboard
                </Link>
                <button
                    onClick={() => setShowChartForm(!showChartForm)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                    {showChartForm ? 'Hide Chart Form' : 'Add New Chart'}
                </button>
            </div>

            {showChartForm && (
                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                    <h3 className="text-2xl font-semibold mb-4">{editingChart ? 'Edit Chart' : 'Create New Chart'}</h3>
                    <form onSubmit={handleChartSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="chartName" className="block text-sm font-medium text-gray-700">Chart Name</label>
                            <input
                                type="text"
                                id="chartName"
                                value={newChartName}
                                onChange={(e) => setNewChartName(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="chartType" className="block text-sm font-medium text-gray-700">Chart Type</label>
                            <select
                                id="chartType"
                                value={newChartType}
                                onChange={(e) => setNewChartType(e.target.value as ChartType)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            >
                                {Object.values(ChartType).map(type => (
                                    <option key={type} value={type}>{type.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="dataSource" className="block text-sm font-medium text-gray-700">Data Source</label>
                            <select
                                id="dataSource"
                                value={newChartDataSourceId}
                                onChange={(e) => setNewChartDataSourceId(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            >
                                <option value="">Select a Data Source</option>
                                {dataSources.map(ds => (
                                    <option key={ds.id} value={ds.id}>{ds.name} ({ds.type})</option>
                                ))}
                            </select>
                            {dataSources.length === 0 && (
                                <p className="text-sm text-red-500 mt-1">No data sources available. Please <Link to="/data-sources" className="underline">create one</Link> first.</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="chartQuery" className="block text-sm font-medium text-gray-700">SQL Query</label>
                            <textarea
                                id="chartQuery"
                                value={newChartQuery}
                                onChange={(e) => setNewChartQuery(e.target.value)}
                                rows={5}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono"
                                placeholder="E.g., SELECT month, sales FROM monthly_report;"
                                required
                            ></textarea>
                            <p className="text-xs text-gray-500 mt-1">Only SELECT statements are allowed for security reasons.</p>
                        </div>
                        <div>
                            <label htmlFor="chartConfig" className="block text-sm font-medium text-gray-700">Chart Configuration (JSON)</label>
                            <textarea
                                id="chartConfig"
                                value={newChartConfig}
                                onChange={(e) => setNewChartConfig(e.target.value)}
                                rows={8}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono"
                                placeholder={`{\n  "xAxis": { "dataKey": "category" },\n  "yAxis": { "label": "Value" },\n  "bars": [{ "dataKey": "value", "fill": "#8884d8" }],\n  "title": "My Bar Chart"\n}`}
                            ></textarea>
                            <p className="text-xs text-gray-500 mt-1">
                                This JSON configures the chart library (e.g., Recharts).
                                See <a href="http://recharts.org/en-US/api" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Recharts API</a> for options.
                                Example for a bar chart: `{"xAxis": {"dataKey": "month"}, "yAxis": {"label": "Sales ($)"}, "bars": [{"dataKey": "sales", "fill": "#8884d8"}], "title": "Monthly Sales Performance"}`
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            >
                                {editingChart ? 'Update Chart' : 'Create Chart'}
                            </button>
                            <button
                                type="button"
                                onClick={resetChartForm}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <h3 className="text-2xl font-semibold mb-4 text-gray-800">Charts</h3>
            {charts.length === 0 ? (
                <p className="text-gray-600">No charts in this dashboard yet. Add one above!</p>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {charts.map((chart) => (
                        <div key={chart.id} className="relative bg-white rounded-lg shadow-md p-4 border border-gray-200">
                            <h4 className="text-xl font-semibold mb-2 text-gray-900">{chart.name} ({chart.type.toUpperCase()})</h4>
                            <div className="absolute top-4 right-4 flex space-x-2">
                                <button
                                    onClick={() => handleEditChart(chart)}
                                    className="text-sm text-yellow-600 hover:text-yellow-800 font-medium"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDeleteChart(chart.id)}
                                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                                >
                                    Delete
                                </button>
                            </div>
                            {chartDataCache[chart.id] ? (
                                <ChartRenderer
                                    type={chart.type}
                                    data={chartDataCache[chart.id]}
                                    configuration={chart.configuration}
                                />
                            ) : (
                                <div className="text-center text-gray-500 h-64 flex items-center justify-center">Loading chart data...</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DashboardDetail;
```