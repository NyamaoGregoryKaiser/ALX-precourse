import apiClient from './index';
import { ApiResponse, MLModel, CreateModelPayload, UpdateModelPayload } from './types';

export const getModels = async (): Promise<MLModel[]> => {
  const response = await apiClient.get<ApiResponse<MLModel[]>>('/models');
  return response.data.data;
};

export const getModelById = async (id: string): Promise<MLModel> => {
  const response = await apiClient.get<ApiResponse<MLModel>>(`/models/${id}`);
  return response.data.data;
};

export const createModel = async (payload: CreateModelPayload): Promise<MLModel> => {
  const response = await apiClient.post<ApiResponse<MLModel>>('/models', payload);
  return response.data.data;
};

export const updateModel = async (id: string, payload: UpdateModelPayload): Promise<MLModel> => {
  const response = await apiClient.put<ApiResponse<MLModel>>(`/models/${id}`, payload);
  return response.data.data;
};

export const deleteModel = async (id: string): Promise<void> => {
  await apiClient.delete<ApiResponse<undefined>>(`/models/${id}`);
};
```