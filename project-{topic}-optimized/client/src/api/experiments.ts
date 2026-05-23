import apiClient from './index';
import { ApiResponse, ExperimentRun, CreateExperimentPayload, UpdateExperimentPayload } from './types';

export const getExperiments = async (): Promise<ExperimentRun[]> => {
  const response = await apiClient.get<ApiResponse<ExperimentRun[]>>('/experiments');
  return response.data.data;
};

export const getExperimentById = async (id: string): Promise<ExperimentRun> => {
  const response = await apiClient.get<ApiResponse<ExperimentRun>>(`/experiments/${id}`);
  return response.data.data;
};

export const createExperiment = async (payload: CreateExperimentPayload): Promise<ExperimentRun> => {
  const response = await apiClient.post<ApiResponse<ExperimentRun>>('/experiments', payload);
  return response.data.data;
};

export const updateExperiment = async (id: string, payload: UpdateExperimentPayload): Promise<ExperimentRun> => {
  const response = await apiClient.put<ApiResponse<ExperimentRun>>(`/experiments/${id}`, payload);
  return response.data.data;
};

export const deleteExperiment = async (id: string): Promise<void> => {
  await apiClient.delete<ApiResponse<undefined>>(`/experiments/${id}`);
};
```