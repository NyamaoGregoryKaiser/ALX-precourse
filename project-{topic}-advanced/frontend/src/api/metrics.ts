```typescript
import axiosInstance from './axiosInstance';
import { MetricType } from '../../../backend/src/entities/MetricDefinition'; // Reuse backend enum

export interface MetricDefinition {
  id: string;
  serviceId: string;
  name: string;
  type: MetricType;
  unit?: string;
  thresholds?: {
    warning?: number;
    critical?: number;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export const createMetricDefinition = async (serviceId: string, data: Omit<MetricDefinition, 'id' | 'serviceId' | 'createdAt' | 'updatedAt'>) => {
  const response = await axiosInstance.post(`/services/${serviceId}/metrics`, data);
  return response.data;
};

export const getMetricDefinitionsByService = async (serviceId: string) => {
  const response = await axiosInstance.get(`/services/${serviceId}/metrics`);
  return response.data;
};

export const getMetricDefinitionById = async (serviceId: string, metricId: string) => {
  const response = await axiosInstance.get(`/services/${serviceId}/metrics/${metricId}`);
  return response.data;
};

export const updateMetricDefinition = async (serviceId: string, metricId: string, data: Partial<Omit<MetricDefinition, 'id' | 'serviceId' | 'createdAt' | 'updatedAt'>>) => {
  const response = await axiosInstance.put(`/services/${serviceId}/metrics/${metricId}`, data);
  return response.data;
};

export const deleteMetricDefinition = async (serviceId: string, metricId: string) => {
  const response = await axiosInstance.delete(`/services/${serviceId}/metrics/${metricId}`);
  return response.data;
};
```