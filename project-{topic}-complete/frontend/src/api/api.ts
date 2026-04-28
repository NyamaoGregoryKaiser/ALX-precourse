import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

API.interceptors.request.use(
  (config) => {
    const token = Cookies.get('jwtToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific error cases, e.g., 401 Unauthorized
    if (error.response && error.response.status === 401) {
      // Potentially log out the user or refresh token
      console.error('Unauthorized request. Redirecting to login...');
      Cookies.remove('jwtToken'); // Clear invalid token
      // Optionally, redirect to login page
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);