import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token if available
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
  }
);

// Add a response interceptor to handle token expiration or invalidity
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If the response is 401 Unauthorized (e.g., token expired)
    if (error.response && error.response.status === 401) {
      console.error('Unauthorized request - token might be expired or invalid.');
      localStorage.removeItem('token');
      // Optionally, redirect to login page
      // window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;