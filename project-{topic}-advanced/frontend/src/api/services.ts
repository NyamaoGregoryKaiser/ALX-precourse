```typescript
import axiosInstance from './axiosInstance';

export interface Service {
  id: string;
  name: string;
  description?: string;
  apiKey?: string; // Should only be visible on creation/regeneration for security
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const createService = async (data: { name: string; description?: string }) => {
  const response = await axiosInstance.post('/services', data);
  return response.data;
};

export const getServices = async () => {
  const response = await axiosInstance.get('/services');
  return response.data;
};

export const getServiceById = async (id: string) => {
  const response = await axiosInstance.get(`/services/${id}`);
  return response.data;
};

export const updateService = async (id: string, data: { name?: string; description?: string }) => {
  const response = await axiosInstance.put(`/services/${id}`, data);
  return response.data;
};

export const deleteService = async (id: string) => {
  const response = await axiosInstance.delete(`/services/${id}`);
  return response.data;
};

export const regenerateApiKey = async (id: string) => {
  const response = await axiosInstance.post(`/services/${id}/regenerate-api-key`);
  return response.data;
};
```