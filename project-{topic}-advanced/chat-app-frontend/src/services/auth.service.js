```javascript
import apiClient from './api';

export const register = async (username, email, password) => {
  try {
    const response = await apiClient.post('/auth/register', { username, email, password });
    return response.data; // Should contain the JWT token
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const authenticate = async (username, password) => {
  try {
    const response = await apiClient.post('/auth/authenticate', { username, password });
    return response.data; // Should contain the JWT token
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await apiClient.get('/users/me');
    return response.data; // UserDto
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
```