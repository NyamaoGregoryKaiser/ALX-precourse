```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1'; // Default to backend's development port

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
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

// Response interceptor for handling token expiration and refreshing
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized and not a refresh token request itself
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh-tokens') {
      originalRequest._retry = true; // Mark request as retried
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          // Attempt to refresh token
          const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh-tokens`, { refreshToken });
          const { access, refresh } = refreshResponse.data.tokens;

          localStorage.setItem('accessToken', access.token);
          localStorage.setItem('refreshToken', refresh.token);

          // Retry the original request with the new access token
          originalRequest.headers.Authorization = `Bearer ${access.token}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
          // If refresh fails, clear tokens and redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login'; // Or use react-router's navigate
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available, redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login'; // Or use react-router's navigate
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```