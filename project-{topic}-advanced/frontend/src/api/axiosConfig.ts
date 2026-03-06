```typescript
import axios from 'axios';
import { getAccessToken, getRefreshToken, setAuthTokens, clearAuthTokens } from '@utils/localStorage';
import { AuthTokens } from '@context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for sending cookies if used for refresh tokens
});

// Request interceptor to add access token to headers
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration and refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Check if the error is 401 Unauthorized and not a refresh token request itself
    if (error.response?.status === 401 && originalRequest.url !== '/auth/refresh-tokens' && !originalRequest._retry) {
      originalRequest._retry = true; // Mark request as retried
      const refreshToken = getRefreshToken();

      if (refreshToken) {
        try {
          const res = await axiosInstance.post<AuthTokens>('/auth/refresh-tokens', { refreshToken });
          const newTokens = res.data;
          setAuthTokens(newTokens); // Store new tokens
          // Update the original request's header with the new access token
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return axiosInstance(originalRequest); // Retry the original request
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
          clearAuthTokens(); // Clear all tokens on refresh failure
          // Redirect to login page or show an error
          window.location.href = '/login'; // Or use react-router-dom for navigation
          return Promise.reject(refreshError);
        }
      } else {
        clearAuthTokens(); // No refresh token available
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
```