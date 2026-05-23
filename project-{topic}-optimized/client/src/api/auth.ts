import apiClient from './index';
import { ApiResponse, LoginPayload, LoginResponseData, RegisterPayload, RegisterResponseData } from './types';

export const register = async (payload: RegisterPayload): Promise<RegisterResponseData> => {
  const response = await apiClient.post<ApiResponse<RegisterResponseData>>('/auth/register', payload);
  return response.data.data;
};

export const login = async (payload: LoginPayload): Promise<LoginResponseData> => {
  const response = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', payload);
  return response.data.data;
};

// Add user-related API calls if needed, e.g., get current user profile
```