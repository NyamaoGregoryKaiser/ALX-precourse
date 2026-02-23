```javascript
import api from './axios';

export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.get('/auth/logout');
  return response.data;
};

export const getCurrentUser = async () => {
  // This endpoint might not exist explicitly. Usually, after login,
  // the user data is returned. Or, a '/me' endpoint can be created.
  // For simplicity, we'll assume user data is retrieved via existing routes or passed by context.
  // A '/me' endpoint would look like:
  const response = await api.get('/users/me'); // Requires backend /users/me endpoint
  return response.data;
};
```