```typescript
import api from './axiosConfig';
import { TokenResponse, User } from '../types';

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

export const registerUser = async (data: RegisterData): Promise<TokenResponse> => {
  const response = await api.post<TokenResponse>('/auth/register', data);
  return response.data;
};

export const loginUser = async (data: LoginData): Promise<TokenResponse> => {
  // Axios expects form-urlencoded for OAuth2PasswordRequestForm
  const formData = new URLSearchParams();
  formData.append('username', data.email);
  formData.append('password', data.password);

  const response = await api.post<TokenResponse>(
    '/auth/token',
    formData.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  return response.data;
};

export const getMe = async (): Promise<User> => {
  const response = await api.get<User>('/users/me');
  return response.data;
};
```