import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // If you plan to use httpOnly cookies
});

// Request interceptor to add the JWT token to headers
axiosInstance.interceptors.request.use(
  (config) => {
    const token = Cookies.get('jwt'); // Retrieve token from cookie
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling (e.g., redirect on 401)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if the error is a 401 Unauthorized
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      Cookies.remove('jwt');
      // Using window.location.href to force a full page reload and clear state
      // In a real application, you might use history.push or a context update
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;