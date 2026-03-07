```typescript
import axiosInstance from './axiosInstance';
import { Service } from './services';
import { MetricDefinition } from './metrics';

export interface DashboardMetricData {
  time: string;
  metricName: string;
  unit?: string;
  value: number;
}

export interface ServiceDashboardData {
  service: Service;
  metrics: {
    definition: MetricDefinition;
    latestValue: number | null;
    historicalData: DashboardMetricData[];
  }[];
}

export interface GlobalDashboardServiceSummary {
  id: string;
  name: string;
  description?: string;
  metricCount: number;
  metricsSummary: {
    metricName: string;
    metricType: string;
    unit?: string;
    latestValue: number | null;
  }[];
  createdAt: string;
}

export interface GetServiceDashboardQuery {
  timeRange?: '1h' | '24h' | '7d' | '30d' | '1y';
  interval?: '1h' | '1d' | '7d' | '30d';
  aggregateFunction?: 'avg' | 'min' | 'max' | 'sum' | 'count';
}

export const getGlobalDashboardSummary = async () => {
  const response = await axiosInstance.get<{ status: string; data: GlobalDashboardServiceSummary[] }>('/dashboard/summary');
  return response.data.data;
};

export const getServiceDashboardData = async (serviceId: string, query: GetServiceDashboardQuery) => {
  const response = await axiosInstance.get<{ status: string; data: ServiceDashboardData }>(`/dashboard/${serviceId}`, { params: query });
  return response.data.data;
};
```