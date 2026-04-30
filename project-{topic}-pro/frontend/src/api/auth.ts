```typescript
import { API_BASE_URL } from '../config';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  user?: T;
  token?: string;
  errors?: any[];
}

interface UserData {
  id: string;
  username: string;
  email: string;
}

export const registerUser = async (userData: any): Promise<ApiResponse<UserData>> => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return response.json();
};

export const loginUser = async (credentials: any): Promise<ApiResponse<UserData>> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  return response.json();
};

export const fetchUserProfile = async (token: string): Promise<ApiResponse<UserData>> => {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
};
```