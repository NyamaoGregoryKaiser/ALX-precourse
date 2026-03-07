```typescript
import axios from 'axios';
import { TOKEN_KEY } from '../contexts/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific error codes globally if needed
    if (error.response && error.response.status === 401) {
      // Potentially redirect to login page or clear token
      console.log('Unauthorized request, token might be expired.');
      // Example: window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
```