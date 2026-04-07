import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1', // Proxy to backend set up in Nginx or dev server
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Check if the error is 401 Unauthorized and not a refresh token request itself
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          // No refresh token, or it's already expired/invalidated, force logout
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login'; // Redirect to login
          return Promise.reject(error);
        }

        const res = await axios.post('/api/v1/auth/refresh-token', { refreshToken });
        const { access, refresh } = res.data;

        localStorage.setItem('accessToken', access.token);
        localStorage.setItem('refreshToken', refresh.token);

        // Update the original request's header with the new access token
        originalRequest.headers.Authorization = `Bearer ${access.token}`;
        return api(originalRequest); // Retry the original request
      } catch (refreshError) {
        // Refresh token failed, force logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login'; // Redirect to login
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default api;