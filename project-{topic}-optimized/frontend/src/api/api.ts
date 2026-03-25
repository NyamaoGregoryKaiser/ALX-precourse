import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * Base URL for the backend API, fetched from environment variables.
 * Defaults to `http://localhost:3000/api/v1` if `VITE_API_BASE_URL` is not set.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

/**
 * Axios instance configured for the Task Management System API.
 * It automatically adds the JWT token to requests if available in localStorage
 * and handles common error responses.
 */
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to attach JWT token to outgoing requests.
 * If a token exists in localStorage, it's added to the Authorization header.
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
  },
);

/**
 * Response interceptor to handle common API errors.
 * Specifically handles 401 Unauthorized errors by clearing the token
 * and redirecting to the login page.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login if unauthorized
      localStorage.removeItem('token');
      // Use window.location.href to force a full page reload and clear state
      window.location.href = '/login';
    }
    // Propagate the error for further handling by calling components
    return Promise.reject(error);
  },
);

export default api;