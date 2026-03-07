```typescript
import axios from 'axios';
import { AuthContextType } from '../context/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for sending/receiving HTTP-only cookies (refresh token)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach access token
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Check for 401 Unauthorized and if it's not a refresh token request itself
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark request as retried
      try {
        // Attempt to refresh the token
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const { accessToken } = res.data;

        localStorage.setItem('accessToken', accessToken); // Update local storage
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`; // Update default header

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError: any) {
        // If refresh fails, log out the user
        localStorage.removeItem('accessToken');
        // Redirect to login page - this would typically be handled by a global error handler or AuthContext
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
```