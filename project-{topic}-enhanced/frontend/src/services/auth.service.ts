```typescript
import api from './api';
import { AuthResponse, LoginPayload, RegisterPayload, User } from '../types';

export const loginUser = async (credentials: LoginPayload): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', credentials);
  return response.data;
};

export const registerUser = async (userData: RegisterPayload): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/register', userData);
  return response.data;
};

export const getCurrentUser = (): User | null => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const getToken = (): string | null => {
  return localStorage.getItem('jwt_token');
};

export const saveAuthData = (token: string, user: User) => {
  localStorage.setItem('jwt_token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const logoutUser = () => {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user');
  // Add any other cleanup needed
};
```