```typescript
import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import ChartCard from '../components/ChartCard';
import { lineChartOptions, donutChartOptions } from '../utils/chart-options';

interface Monitor {
  id: string;
  name: string;
  url: string;
  status: 'active' | 'paused';
  lastCheckAt?: string;
  project: {
    id: string;
    name: string;
  };
}

interface MetricSummary {
  monitorId: string;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  uptimePercentage: number;
  averageResponseTimeMs: number;
  statusCodeCounts: { [key: string]: number };
}

const Dashboard: React.FC = () => {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loadingMonitors, setLoadingMonitors] = useState(true);
  const [monitorError, setMonitorError] = useState<string | null>(null);

  const [monitorSummaries, setMonitorSummaries] = useState<Map<string, MetricSummary>>(new Map());
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [summaryErrors, setSummaryErrors] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchMonitors = async () => {
      setLoadingMonitors(true);
      try {
        const response = await api.get('/monitors');
        setMonitors(response.data);
        setMonitorError(null);
      } catch (err: any) {
        console.error('Failed to fetch monitors:', err);
        setMonitorError(err.response?.data?.message || 'Failed to load monitors.');
      } finally {
        setLoadingMonitors(false);
      }
    };

    fetchMonitors();
  }, []);

  useEffect(() => {
    const fetchSummaries = async () => {
      if (monitors.length === 0) {
        setLoadingSummaries(false);
        return;
      }

      setLoadingSummaries(true);
      const newSummaries = new Map<string, MetricSummary>();
      const newErrors = new Map<string, string>();

      for (const monitor of monitors) {
        try {
          const response = await api.get(`/metrics/monitors/${monitor.id}/summary?interval=24h`);
          newSummaries.set(monitor.id, response.data);
        } catch (err: any) {
          console.error(`Failed to fetch summary for monitor ${monitor.name}:`, err);
          newErrors.set(monitor.id, err.response?.data?.message || 'Failed to load summary.');
        }
      }
      setMonitorSummaries(newSummaries);
      setSummaryErrors(newErrors);
      setLoadingSummaries(false);
    };

    fetchSummaries();
  }, [monitors]);

  const uptimeData = monitors.map(monitor => ({
    x: monitor.name,
    y: monitorSummaries.get(monitor.id)?.uptimePercentage ?? 0,
  }));

  const responseTimeData = monitors.map(monitor => ({
    x: monitor.name,
    y: monitorSummaries.get(monitor.id)?.averageResponseTimeMs ?? 0,
  }));

  const overallUptime = monitors.length > 0
    ? (Array.from(monitorSummaries.values()).reduce((sum, s) => sum + s.uptimePercentage, 0) / monitors.length).toFixed(2)
    : 'N/A';

  const activeMonitorsCount = monitors.filter(m => m.status === 'active').length;
  const pausedMonitorsCount = monitors.filter(m => m.status === 'paused').length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {loadingMonitors ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : monitorError ? (
        <p className="text-red-500 text-center text-lg">{monitorError}</p>
      ) : monitors.length === 0 ? (
        <p className="text-gray-600 text-center text-lg">No monitors configured yet. Go to Projects to add one!</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white shadow-md rounded-lg p-6 flex flex-col justify-center items-center">
              <h3 className="text-lg font-medium text-gray-500">Total Monitors</h3>
              <p className="text-4xl font-bold text-gray-900 mt-2">{monitors.length}</p>
            </div>
            <div className="bg-white shadow-md rounded-lg p-6 flex flex-col justify-center items-center">
              <h3 className="text-lg font-medium text-gray-500">Active Monitors</h3>
              <p className="text-4xl font-bold text-green-600 mt-2">{activeMonitorsCount}</p>
            </div>
            <div className="bg-white shadow-md rounded-lg p-6 flex flex-col justify-center items-center">
              <h3 className="text-lg font-medium text-gray-500">Paused Monitors</h3>
              <p className="text-4xl font-bold text-yellow-600 mt-2">{pausedMonitorsCount}</p>
            </div>
            <div className="bg-white shadow-md rounded-lg p-6 flex flex-col justify-center items-center">
              <h3 className="text-lg font-medium text-gray-500">Overall Uptime (24h)</h3>
              <p className={`text-4xl font-bold mt-2 ${parseFloat(overallUptime) >= 99 ? 'text-green-600' : 'text-red-600'}`}>
                {overallUptime}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Monitor Uptime Percentage (Last 24h)"
              series={[{ name: 'Uptime %', data: uptimeData }]}
              options={{ ...lineChartOptions, xaxis: { type: 'category', categories: monitors.map(m => m.name) }, yaxis: { title: { text: 'Uptime (%)' }, min: 0, max: 100 } }}
              loading={loadingSummaries}
              error={Array.from(summaryErrors.values()).join(', ')}
            />
            <ChartCard
              title="Average Response Time (Last 24h)"
              series={[{ name: 'Avg. Response Time (ms)', data: responseTimeData }]}
              options={{ ...lineChartOptions, xaxis: { type: 'category', categories: monitors.map(m => m.name) }, yaxis: { title: { text: 'Response Time (ms)' } } }}
              loading={loadingSummaries}
              error={Array.from(summaryErrors.values()).join(', ')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {monitors.slice(0, 2).map(monitor => { // Show top 2 monitor status codes
              const summary = monitorSummaries.get(monitor.id);
              const seriesData = summary?.statusCodeCounts ? Object.values(summary.statusCodeCounts) : [];
              const labelsData = summary?.statusCodeCounts ? Object.keys(summary.statusCodeCounts) : [];

              return (
                <ChartCard
                  key={monitor.id}
                  title={`${monitor.name} Status Codes (24h)`}
                  series={seriesData}
                  options={{ ...donutChartOptions, labels: labelsData }}
                  loading={loadingSummaries}
                  error={summaryErrors.get(monitor.id)}
                  height={300}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
```