```typescript
import axiosInstance from './axiosConfig';
import { User, AuthTokens } from '@context/AuthContext';

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserResponse {
  user: Omit<User, 'token'>; // User data excluding sensitive token
  tokens: AuthTokens;
}

export const registerUser = async (data: RegisterPayload): Promise<{ message: string; user: Omit<User, 'token'> }> => {
  const response = await axiosInstance.post('/auth/register', data);
  return response.data;
};

export const loginUser = async (data: LoginPayload): Promise<UserResponse> => {
  const response = await axiosInstance.post('/auth/login', data);
  return response.data;
};

export const logoutUser = async (): Promise<{ message: string }> => {
  const response = await axiosInstance.post('/auth/logout');
  return response.data;
};

export const refreshAuthTokens = async (refreshToken: string): Promise<AuthTokens> => {
  const response = await axiosInstance.post('/auth/refresh-tokens', { refreshToken });
  return response.data;
};

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const response = await axiosInstance.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token: string, newPassword: string): Promise<{ message: string }> => {
  const response = await axiosInstance.post(`/auth/reset-password?token=${token}`, { newPassword });
  return response.data;
};

export const verifyEmail = async (token: string): Promise<{ message: string }> => {
  const response = await axiosInstance.get(`/auth/verify-email?token=${token}`);
  return response.data;
};

export const resendVerificationEmail = async (email: string): Promise<{ message: string }> => {
  const response = await axiosInstance.post('/auth/resend-verification', { email });
  return response.data;
};
```