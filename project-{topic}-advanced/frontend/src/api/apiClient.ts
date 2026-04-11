```typescript
import axios from 'axios';
import { toast } from 'react-toastify';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies, if any
});

// Request interceptor to add the JWT token to headers
apiClient.interceptors.request.use(
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

// Response interceptor to handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    // Optional: show success messages
    // if (response.data.message) {
    //   toast.success(response.data.message);
    // }
    return response;
  },
  (error) => {
    const originalRequest = error.config;
    if (error.response) {
      const { status, data } = error.response;
      let errorMessage = data.message || 'An unexpected error occurred.';

      switch (status) {
        case 400:
          toast.error(`Bad Request: ${errorMessage}`);
          break;
        case 401:
          toast.error(`Unauthorized: ${errorMessage}`);
          // Optionally, redirect to login if token expired or invalid
          if (errorMessage.includes('expired') || errorMessage.includes('Invalid token')) {
            localStorage.removeItem('jwtToken');
            // history.push('/login'); // If using useHistory
            window.location.href = '/login'; // Simple redirect
          }
          break;
        case 403:
          toast.error(`Forbidden: ${errorMessage}`);
          break;
        case 404:
          toast.error(`Not Found: ${errorMessage}`);
          break;
        case 409: // Conflict
          toast.error(`Conflict: ${errorMessage}`);
          break;
        case 429: // Too Many Requests
          toast.warn(`Too Many Requests: ${errorMessage}`);
          break;
        case 500:
          toast.error(`Server Error: ${errorMessage}`);
          break;
        default:
          toast.error(`Error ${status}: ${errorMessage}`);
      }
    } else if (error.request) {
      // The request was made but no response was received
      toast.error('No response from server. Please check your network connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      toast.error(`Error: ${error.message}`);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```