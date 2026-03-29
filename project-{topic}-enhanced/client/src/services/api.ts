import axios from 'axios';
import { getAuthTokens, setAuthTokens, clearAuthTokens } from '@/utils/authHelpers';
import { toast } from 'react-toastify';
import logger from '@/utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add access token
axiosInstance.interceptors.request.use(
  (config) => {
    const tokens = getAuthTokens();
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // If error status is 401 Unauthorized and not a refresh token request itself
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = getAuthTokens();

      if (tokens?.refreshToken) {
        try {
          logger.info('Access token expired, attempting to refresh...');
          const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh-tokens`, {
            refreshToken: tokens.refreshToken,
          });

          const { accessToken, refreshToken } = refreshResponse.data.tokens;
          setAuthTokens({ accessToken, refreshToken });
          logger.info('Tokens refreshed successfully.');

          // Update original request with new access token and retry
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return axiosInstance(originalRequest);
        } catch (refreshError: any) {
          logger.error('Failed to refresh tokens:', refreshError.response?.data?.message || refreshError.message);
          clearAuthTokens();
          toast.error('Session expired. Please log in again.');
          // Redirect to login page
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available, clear session and redirect
        clearAuthTokens();
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;