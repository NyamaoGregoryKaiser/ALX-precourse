```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use((response) => {
    return response;
}, (error) => {
    if (error.response && error.response.status === 401) {
        // Handle unauthorized errors, e.g., redirect to login
        localStorage.removeItem('token');
        // window.location.href = '/login'; // Uncomment in a real app
    }
    return Promise.reject(error);
});

export const auth = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (username, email, password) => api.post('/auth/register', { username, email, password }),
};

export const jobs = {
    getAll: () => api.get('/jobs'),
    getById: (id) => api.get(`/jobs/${id}`),
    create: (jobData) => api.post('/jobs', jobData),
    update: (id, jobData) => api.patch(`/jobs/${id}`, jobData),
    delete: (id) => api.delete(`/jobs/${id}`),
    runNow: (id) => api.post(`/jobs/${id}/run`),
};

export const data = {
    getScrapedData: (jobId, limit = 100, offset = 0) => api.get(`/data/jobs/${jobId}/data`, { params: { limit, offset } }),
    getJobLogs: (jobId) => api.get(`/data/jobs/${jobId}/logs`),
};

export default api;
```