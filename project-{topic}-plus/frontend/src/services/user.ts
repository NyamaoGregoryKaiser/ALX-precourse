```typescript
import api from './api';
import { User } from '../types';

export const getMe = async (token: string): Promise<User> => {
  // The token is automatically added by the interceptor.
  // We explicitly pass it here for initial load if needed, but not strictly necessary for API calls.
  const response = await api.get('/users/me');
  return response.data;
};

export const getUserById = async (userId: string): Promise<User> => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const searchUsers = async (query: string): Promise<User[]> => {
  const response = await api.get(`/users/search?q=${query}`);
  return response.data;
};

// In a real application, you'd have an API endpoint to update user profile
// export const updateUser = async (userId: string, data: Partial<User>): Promise<User> => {
//   const response = await api.patch(`/users/${userId}`, data);
//   return response.data;
// };
```