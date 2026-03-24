```typescript
import api from '../config/api';
import { User, LoginData, RegisterData } from '../types'; // Define these types

interface AuthResponse {
  access_token: string;
  user: Omit<User, 'password'>; // User object without password
}

const login = async (credentials: LoginData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', credentials);
  if (response.data.access_token) {
    localStorage.setItem('accessToken', response.data.access_token);
    localStorage.setItem('user', JSON.stringify(response.data.user)); // Store user details (non-sensitive)
  }
  return response.data;
};

const register = async (userData: RegisterData): Promise<Omit<User, 'password'>> => {
  const response = await api.post<Omit<User, 'password'>>('/auth/register', userData);
  return response.data;
};

const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
};

const getCurrentUser = (): Omit<User, 'password'> | null => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    return JSON.parse(userStr);
  }
  return null;
};

const getToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

export const authService = {
  login,
  register,
  logout,
  getCurrentUser,
  getToken,
};
```