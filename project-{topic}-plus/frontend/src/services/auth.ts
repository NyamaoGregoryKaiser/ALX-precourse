```typescript
import api from './api';
import { User } from '../types';

interface AuthResponse {
  token: string;
  user: User;
}

export const register = async (username: string, email: string, password: string): Promise<User> => {
  const response = await api.post('/auth/register', { username, email, password });
  return response.data.user;
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', { email, password });
  return { token: response.data.token, user: response.data.user };
};

// No explicit logout API call for JWT, client-side token removal is sufficient
// If backend had token blacklisting, this would be an API call
export const logout = async (): Promise<void> => {
  // await api.post('/auth/logout');
  // client-side removal handled by AuthContext
};
```