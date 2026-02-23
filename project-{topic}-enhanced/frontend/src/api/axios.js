```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';

const instance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // This is crucial for sending cookies (JWT in our case)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token to headers if available
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt'); // Or retrieve from a secure storage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for global error handling or refresh tokens
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Example: If token expires or is invalid (401), redirect to login
    if (error.response && error.response.status === 401) {
      console.error('Unauthorized request - redirecting to login');
      localStorage.removeItem('jwt'); // Clear invalid token
      // window.location.href = '/login'; // Redirect to login page
    }
    return Promise.reject(error);
  }
);


export default instance;
```