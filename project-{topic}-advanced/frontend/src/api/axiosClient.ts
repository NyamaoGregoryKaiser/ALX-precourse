```typescript
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
} from './tokenStorage'; // Utility to handle token storage
import { API_ROUTES } from './apiRoutes'; // Centralized API routes
import { toast } from 'react-hot-toast'; // For notifications

interface DecodedToken {
  exp: number; // Expiration time in seconds since epoch
  userId: string;
  email: string;
  role: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach access token
axiosClient.interceptors.request.use(
  async (config) => {
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

// Response interceptor for token refresh and error handling
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If it's a 401 Unauthorized error and not a refresh token request itself
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark request as retried to avoid infinite loops

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        window.location.href = '/login'; // Redirect to login if no refresh token
        return Promise.reject(error);
      }

      try {
        const decodedToken = jwtDecode<DecodedToken>(refreshToken);
        const currentTime = Date.now() / 1000; // Current time in seconds

        if (decodedToken.exp < currentTime) {
          // Refresh token itself is expired
          clearTokens();
          window.location.href = '/login';
          toast.error('Session expired. Please log in again.');
          return Promise.reject(error);
        }

        // Attempt to refresh the access token
        const response = await axios.post<{ accessToken: string; refreshToken: string }>(
          `${API_BASE_URL}${API_ROUTES.AUTH.REFRESH_TOKEN}`,
          { refreshToken }
        );

        const newAccessToken = response.data.accessToken;
        const newRefreshToken = response.data.refreshToken;

        setAccessToken(newAccessToken);
        setRefreshToken(newRefreshToken);

        // Update the original request with the new access token and retry
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        clearTokens();
        window.location.href = '/login';
        toast.error('Failed to refresh session. Please log in again.');
        return Promise.reject(refreshError);
      }
    }

    // Generic error handling
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error:', error.response.data);
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      toast.error(error.response.data.message || 'An API error occurred.');
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network Error:', error.request);
      toast.error('Network error. Please check your internet connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
      toast.error('An unexpected error occurred.');
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
```