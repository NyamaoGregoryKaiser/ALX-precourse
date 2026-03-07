```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getServiceDashboardData, ServiceDashboardData, GetServiceDashboardQuery } from '../api/dashboard';
import { MetricDefinition, MetricType, createMetricDefinition, updateMetricDefinition, deleteMetricDefinition } from '../api/metrics';
import ChartComponent from '../components/ChartComponent';
import { Service } from '../api/services';

const ServiceDetail: React.FC = () => {
  const { id: serviceId } = useParams<{ id: string }>();
  const [dashboardData, setDashboardData] = useState<ServiceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryParams, setQueryParams] = useState<GetServiceDashboardQuery>({
    timeRange: '24h',
    interval: '1h',
    aggregateFunction: 'avg',
  });

  const [showAddMetricForm, setShowAddMetricForm] = useState(false);
  const [newMetricName, setNewMetricName] = useState('');
  const [newMetricType, setNewMetricType] = useState<MetricType>(MetricType.CUSTOM_GAUGE);
  const [newMetricUnit, setNewMetricUnit] = useState('');
  const [addMetricLoading, setAddMetricLoading] = useState(false);
  const [addMetricError, setAddMetricError] = useState<string | null>(null);
  const [currentEditingMetric, setCurrentEditingMetric] = useState<MetricDefinition | null>(null);

  const fetchServiceData = useCallback(async () => {
    if (!serviceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getServiceDashboardData(serviceId, queryParams);
      setDashboardData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch service dashboard data.');
      console.error('Error fetching service dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [serviceId, queryParams]);

  useEffect(() => {
    fetchServiceData();
  }, [fetchServiceData]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setQueryParams((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddOrUpdateMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) return;

    setAddMetricLoading(true);
    setAddMetricError(null);

    try {
      if (currentEditingMetric) {
        await updateMetricDefinition(serviceId, currentEditingMetric.id, {
          name: newMetricName,
          type: newMetricType,
          unit: newMetricUnit || undefined,
        });
        alert('Metric updated successfully!');
      } else {
        await createMetricDefinition(serviceId, {
          name: newMetricName,
          type: newMetricType,
          unit: newMetricUnit || undefined,
          thresholds: {}, // Default empty thresholds
        });
        alert('Metric added successfully!');
      }
      setShowAddMetricForm(false);
      setCurrentEditingMetric(null);
      setNewMetricName('');
      setNewMetricType(MetricType.CUSTOM_GAUGE);
      setNewMetricUnit('');
      fetchServiceData(); // Refresh data
    } catch (err: any) {
      setAddMetricError(err.response?.data?.message || 'Failed to save metric.');
      console.error('Error saving metric:', err);
    } finally {
      setAddMetricLoading(false);
    }
  };

  const handleEditMetric = (metric: MetricDefinition) => {
    setCurrentEditingMetric(metric);
    setNewMetricName(metric.name);
    setNewMetricType(metric.type);
    setNewMetricUnit(metric.unit || '');
    setShowAddMetricForm(true);
  };

  const handleDeleteMetric = async (metricId: string, metricName: string) => {
    if (!serviceId) return;
    if (window.confirm(`Are you sure you want to delete the metric "${metricName}"? All associated data points will also be deleted.`)) {
      try {
        await deleteMetricDefinition(serviceId, metricId);
        alert('Metric deleted successfully!');
        fetchServiceData(); // Refresh data
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete metric.');
        console.error('Error deleting metric:', err);
      }
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6 text-center">Loading service data...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-6 text-red-500 text-center">Error: {error}</div>;
  }

  if (!dashboardData) {
    return <div className="container mx-auto p-6 text-center">No dashboard data found.</div>;
  }

  const { service, metrics } = dashboardData;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4 text-gray-800">{service.name} Dashboard</h1>
      <p className="text-gray-600 mb-6">{service.description || 'No description.'}</p>

      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-md">
        <div className="flex space-x-4">
          <div>
            <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700">Time Range:</label>
            <select
              name="timeRange"
              id="timeRange"
              value={queryParams.timeRange}
              onChange={handleQueryChange}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="1h">Last 1 Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          <div>
            <label htmlFor="interval" className="block text-sm font-medium text-gray-700">Interval:</label>
            <select
              name="interval"
              id="interval"
              value={queryParams.interval}
              onChange={handleQueryChange}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="1h">Hourly</option>
              <option value="1d">Daily</option>
              <option value="7d">Weekly</option>
              <option value="30d">Monthly</option>
            </select>
          </div>
          <div>
            <label htmlFor="aggregateFunction" className="block text-sm font-medium text-gray-700">Aggregate By:</label>
            <select
              name="aggregateFunction"
              id="aggregateFunction"
              value={queryParams.aggregateFunction}
              onChange={handleQueryChange}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="avg">Average</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
              <option value="sum">Sum</option>
              <option value="count">Count</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => {
            setShowAddMetricForm(!showAddMetricForm);
            setCurrentEditingMetric(null);
            setNewMetricName('');
            setNewMetricType(MetricType.CUSTOM_GAUGE);
            setNewMetricUnit('');
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-200"
        >
          {showAddMetricForm ? 'Cancel Add Metric' : 'Add New Metric'}
        </button>
      </div>

      {showAddMetricForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">{currentEditingMetric ? 'Edit Metric' : 'Add New Metric Definition'}</h2>
          {addMetricError && <p className="text-red-500 mb-4">{addMetricError}</p>}
          <form onSubmit={handleAddOrUpdateMetric} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="metricName" className="block text-gray-700 font-bold mb-2">Metric Name:</label>
              <input
                type="text"
                id="metricName"
                value={newMetricName}
                onChange={(e) => setNewMetricName(e.target.value)}
                className="shadow border rounded w-full py-2 px-3 text-gray-700"
                required
              />
            </div>
            <div>
              <label htmlFor="metricType" className="block text-gray-700 font-bold mb-2">Metric Type:</label>
              <select
                id="metricType"
                value={newMetricType}
                onChange={(e) => setNewMetricType(e.target.value as MetricType)}
                className="shadow border rounded w-full py-2 px-3 text-gray-700"
                required
              >
                {Object.values(MetricType).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="metricUnit" className="block text-gray-700 font-bold mb-2">Unit (Optional):</label>
              <input
                type="text"
                id="metricUnit"
                value={newMetricUnit}
                onChange={(e) => setNewMetricUnit(e.target.value)}
                className="shadow border rounded w-full py-2 px-3 text-gray-700"
                placeholder="e.g., ms, %, count"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-200"
                disabled={addMetricLoading}
              >
                {addMetricLoading ? 'Saving...' : currentEditingMetric ? 'Update Metric' : 'Create Metric'}
              </button>
            </div>
          </form>
        </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {metrics.length === 0 ? (
          <p className="lg:col-span-2 text-center text-gray-600 text-lg bg-white p-8 rounded-lg shadow-md">
            No metrics defined for this service yet. Add one above!
          </p>
        ) : (
          metrics.map((metric) => (
            <div key={metric.definition.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">{metric.definition.name}</h3>
                <div className="space-x-2">
                  <button onClick={() => handleEditMetric(metric.definition)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                  <button onClick={() => handleDeleteMetric(metric.definition.id, metric.definition.name)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-2">
                Type: {metric.definition.type} {metric.definition.unit && `| Unit: ${metric.definition.unit}`}
              </p>
              <p className="text-gray-700 mb-4">
                Latest Value: {metric.latestValue !== null ? `${metric.latestValue.toFixed(2)} ${metric.definition.unit || ''}` : 'N/A'}
              </p>
              <ChartComponent
                data={metric.historicalData}
                metricName={metric.definition.name}
                unit={metric.definition.unit}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ServiceDetail;
```