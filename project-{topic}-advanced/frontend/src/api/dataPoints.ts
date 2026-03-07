```typescript
import axiosInstance from './axiosInstance';

export interface DataPoint {
  id: string;
  metricDefinitionId: string;
  value: number;
  timestamp: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface MetricDataQuery {
  metricDefinitionId?: string;
  startDate?: string;
  endDate?: string;
  interval?: '1h' | '1d' | '7d' | '30d';
  aggregateFunction?: 'avg' | 'min' | 'max' | 'sum' | 'count';
}

export const getMetricData = async (serviceId: string, query: MetricDataQuery) => {
  const response = await axiosInstance.get(`/data-points/${serviceId}`, { params: query });
  return response.data;
};

// Note: Submitting data points would typically be done by the monitored service itself,
// not directly from the frontend of the monitoring system.
// For demonstration, a `submitDataPoint` function might be useful for testing or manual input.
export const submitDataPoint = async (apiKey: string, data: {
    serviceId: string;
    metricName: string;
    value: number;
    timestamp: string;
    metadata?: Record<string, any>;
}) => {
    const response = await axiosInstance.post('/data-points/submit', data, {
        headers: {
            'X-API-Key': apiKey,
        },
    });
    return response.data;
};
```