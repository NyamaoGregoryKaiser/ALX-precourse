import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for handling token refresh or invalid tokens (more advanced)
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Example: If 401 and not a login/register request, try to refresh token or logout
    if (error.response.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth')) {
      originalRequest._retry = true;
      // In a real app, you'd have a refresh token flow here
      console.error('Unauthorized, attempting to re-authenticate or refresh token...');
      localStorage.removeItem('jwtToken');
      window.location.href = '/login'; // Redirect to login
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;