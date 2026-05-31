```typescript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000'; // Default to backend's default port

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific error codes globally if needed
    if (error.response && error.response.status === 401) {
      // Potentially redirect to login or clear auth state
      console.log('Unauthorized request, token might be expired.');
      // Example: window.location.href = '/login';
      // Or dispatch logout action if using a state management library
    }
    return Promise.reject(error);
  }
);

export default api;
```