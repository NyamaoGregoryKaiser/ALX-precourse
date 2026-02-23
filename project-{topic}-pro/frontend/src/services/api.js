```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token to headers
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

// Response interceptor to handle global errors (e.g., token expiration)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If the error response has a status of 401 (Unauthorized)
    // and the message indicates token failure, it might be an expired token.
    if (error.response && error.response.status === 401) {
      // Potentially log out the user and redirect to login
      console.error('Unauthorized request - Token might be expired or invalid. Logging out...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login page - this needs to be handled outside the interceptor
      // or by a global error handler in a context/hook.
      // For now, just remove tokens and let the UI react.
      // window.location.href = '/login'; // Or use a more React-friendly way
    }
    return Promise.reject(error);
  }
);

export default api;
```