import api from './api';
import { ILoginPayload, IRegisterPayload, IAuthTokens, IUser } from '@/types/auth.d';

export const register = async (userData: IRegisterPayload): Promise<{ user: IUser; tokens: IAuthTokens }> => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const login = async (credentials: ILoginPayload): Promise<{ user: IUser; tokens: IAuthTokens }> => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const refreshTokens = async (refreshToken: string): Promise<{ user: IUser; tokens: IAuthTokens }> => {
  const response = await api.post('/auth/refresh-tokens', { refreshToken });
  return response.data;
};

export const logout = async (refreshToken: string): Promise<void> => {
  await api.post('/auth/logout', { refreshToken });
};

export const getCurrentUserProfile = async (accessToken: string): Promise<IUser | null> => {
  // This endpoint is protected by the access token
  const response = await api.get('/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
};

export const updateCurrentUserProfile = async (userId: string, updateData: Partial<IUser>): Promise<IUser> => {
  const response = await api.patch(`/users/me`, updateData);
  return response.data;
};
```