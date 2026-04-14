import axios from 'axios';
import { getToken, removeToken } from '../utils/localStorage';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific error codes globally
    if (error.response && error.response.status === 401) {
      // Unauthorized: token expired or invalid
      console.error('Unauthorized, logging out...');
      removeToken();
      // Redirect to login page - this might need to be handled by a global error handler or context provider in a real app
      // window.location.href = '/login';
    } else if (error.response && error.response.status === 403) {
      console.error('Forbidden: You do not have permission to access this resource.');
    } else if (error.response && error.response.status === 429) {
      console.error('Too many requests. Please try again later.');
    }
    return Promise.reject(error);
  }
);

export default api;