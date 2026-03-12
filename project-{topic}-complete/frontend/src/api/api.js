import axios from 'axios';

// Get backend URL from environment variable
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true, // Crucial for sending HTTP-only cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to handle global API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check for specific error statuses
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        // Unauthorized, potentially token expired or invalid
        console.error('API Error: Unauthorized. Redirecting to login...');
        // Optionally redirect to login page or dispatch a logout action
        // window.location.href = '/login';
      } else if (status === 403) {
        console.error('API Error: Forbidden. You do not have access.');
      } else {
        console.error(`API Error: ${status} - ${data.message || 'Unknown error'}`);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API Error: No response received from server.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;