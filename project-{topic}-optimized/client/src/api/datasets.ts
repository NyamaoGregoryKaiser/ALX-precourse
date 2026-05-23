import apiClient from './index';
import { ApiResponse, Dataset, CreateDatasetPayload, UpdateDatasetPayload } from './types';

export const getDatasets = async (): Promise<Dataset[]> => {
  const response = await apiClient.get<ApiResponse<Dataset[]>>('/datasets');
  return response.data.data;
};

export const getDatasetById = async (id: string): Promise<Dataset> => {
  const response = await apiClient.get<ApiResponse<Dataset>>(`/datasets/${id}`);
  return response.data.data;
};

export const createDataset = async (payload: CreateDatasetPayload): Promise<Dataset> => {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('name', payload.name);
  if (payload.description) formData.append('description', payload.description);

  const response = await apiClient.post<ApiResponse<Dataset>>('/datasets', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

export const updateDataset = async (id: string, payload: UpdateDatasetPayload): Promise<Dataset> => {
  const response = await apiClient.put<ApiResponse<Dataset>>(`/datasets/${id}`, payload);
  return response.data.data;
};

export const deleteDataset = async (id: string): Promise<void> => {
  await apiClient.delete<ApiResponse<undefined>>(`/datasets/${id}`);
};
```