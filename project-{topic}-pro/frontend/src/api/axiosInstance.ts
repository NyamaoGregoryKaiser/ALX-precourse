```typescript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosInstance.interceptors.request.use(
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

axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle common errors like 401 Unauthorized globally
        if (error.response && error.response.status === 401) {
            // Potentially redirect to login or clear auth state
            console.error('Unauthorized access. Redirecting to login...');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // window.location.href = '/login'; // Or use a more sophisticated method with React Router
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
```