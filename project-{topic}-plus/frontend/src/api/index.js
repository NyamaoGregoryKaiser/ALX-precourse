```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const tokens = JSON.parse(localStorage.getItem('tokens'));
    if (tokens && tokens.access && tokens.access.token) {
      config.headers.Authorization = `Bearer ${tokens.access.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Check if it's a 401 and not a refresh token request itself
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const tokens = JSON.parse(localStorage.getItem('tokens'));
        if (!tokens || !tokens.refresh || !tokens.refresh.token) {
          throw new Error('No refresh token available');
        }

        const refreshTokenResponse = await apiClient.post('/auth/refresh-tokens', {
          refreshToken: tokens.refresh.token,
        });

        localStorage.setItem('tokens', JSON.stringify(refreshTokenResponse.data));
        originalRequest.headers.Authorization = `Bearer ${refreshTokenResponse.data.access.token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        localStorage.removeItem('tokens');
        window.location.href = '/login'; // Or use react-router-dom history.push
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const auth = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  register: (username, email, password, role) => apiClient.post('/auth/register', { username, email, password, role }),
  logout: (refreshToken) => apiClient.post('/auth/logout', { refreshToken }),
};

// User API
export const users = {
  getProfile: (userId) => apiClient.get(`/users/${userId}`),
  updateProfile: (userId, data) => apiClient.patch(`/users/${userId}`, data),
  getAllUsers: (params) => apiClient.get('/users', { params }), // Admin/Editor only
  createUser: (data) => apiClient.post('/users', data), // Admin only
  updateUser: (userId, data) => apiClient.patch(`/users/${userId}`, data), // Admin/Editor
  deleteUser: (userId) => apiClient.delete(`/users/${userId}`), // Admin only
};

// Category API
export const categories = {
  getAll: (params) => apiClient.get('/categories', { params }),
  getById: (id) => apiClient.get(`/categories/${id}`),
  create: (data) => apiClient.post('/categories', data), // Admin/Editor only
  update: (id, data) => apiClient.patch(`/categories/${id}`, data), // Admin/Editor only
  delete: (id) => apiClient.delete(`/categories/${id}`), // Admin/Editor only
};

// Post API
export const posts = {
  getAll: (params) => apiClient.get('/posts', { params }),
  getById: (id) => apiClient.get(`/posts/${id}`),
  create: (data) => apiClient.post('/posts', data), // Admin/Editor only
  update: (id, data) => apiClient.patch(`/posts/${id}`, data), // Author/Admin only
  delete: (id) => apiClient.delete(`/posts/${id}`), // Author/Admin only
};
```