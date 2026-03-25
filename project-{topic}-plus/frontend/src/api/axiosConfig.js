```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token to headers
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle global errors (e.g., 401, 403)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status) {
      switch (error.response.status) {
        case 401:
          console.error('Unauthorized access. Redirecting to login...');
          // Optional: Clear token and redirect to login page
          localStorage.removeItem('jwtToken');
          window.location.href = '/login'; // Or use react-router-dom's navigate
          break;
        case 403:
          console.error('Forbidden access. You do not have permission.');
          // Optional: Show a specific message or redirect to an access denied page
          break;
        case 429:
          console.error('Rate limit exceeded. Please try again later.');
          // Optional: Show a user-friendly message
          break;
        default:
          // Handle other errors
          console.error(`API Error: ${error.response.status}`, error.response.data);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
```