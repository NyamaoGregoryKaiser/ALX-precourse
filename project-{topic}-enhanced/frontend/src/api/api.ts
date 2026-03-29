```typescript
import axios from 'axios';

// Get API base URL from environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Axios instance configured for the backend API.
 * Handles base URL and injects JWT token for authenticated requests.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor to attach the JWT token to every outgoing request
 * if a token is available in local storage.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor to handle common API errors, e.g., unauthorized.
 * You could use this to refresh tokens or redirect to login.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized errors, e.g., clear token and redirect to login
      console.warn('Unauthorized API call. Clearing token and redirecting to login.');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      // window.location.href = '/login'; // Uncomment to force redirect
    }
    return Promise.reject(error);
  }
);

export default api;
```