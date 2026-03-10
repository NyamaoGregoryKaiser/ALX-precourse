```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Intercept responses for global error handling or token refresh
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Example: if (error.response.status === 401 && error.response.data.message === 'Token expired') {
    //   // Handle token refresh or logout
    // }
    return Promise.reject(error);
  }
);

export default api;
```