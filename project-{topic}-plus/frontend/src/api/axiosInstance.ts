```typescript
import axios from 'axios';
import { getAuthToken } from 'utils/auth';

// Base URL for the backend API
// Use environment variables for production readiness
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the authorization token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling (e.g., redirect on 401)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized errors, e.g., redirect to login
      console.error('Unauthorized, redirecting to login...');
      // Note: This simple redirect might cause issues if not handled carefully
      // within the React Router context. A more robust solution might involve
      // a global error handler or specific context updates.
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
```