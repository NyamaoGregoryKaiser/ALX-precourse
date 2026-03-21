```typescript
import axios from 'axios';
import { AuthTokens, User, Project, Task } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken'); // Or from a more secure store
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Check if the error is 401 (Unauthorized) and not for the refresh token endpoint itself
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh-token') {
      originalRequest._retry = true; // Mark request as retried
      const refreshToken = localStorage.getItem('refreshToken'); // Retrieve refresh token

      if (refreshToken) {
        try {
          // Attempt to refresh token
          const refreshRes = await api.post('/auth/refresh-token', { refreshToken });
          const { accessToken } = refreshRes.data;

          localStorage.setItem('accessToken', accessToken); // Update stored access token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`; // Update original request header

          return api(originalRequest); // Retry the original request
        } catch (refreshError) {
          // Refresh token failed, clear tokens and redirect to login
          console.error('Failed to refresh token:', refreshError);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login'; // Redirect to login page
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available, redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  register: (userData: any): Promise<AuthTokens & { user: User }> =>
    api.post('/auth/register', userData).then((res) => res.data),
  login: (credentials: any): Promise<AuthTokens & { user: User }> =>
    api.post('/auth/login', credentials).then((res) => res.data),
  logout: (): Promise<any> =>
    api.post('/auth/logout').then((res) => res.data),
};

// User Service (requires admin role on backend)
export const userService = {
  getUsers: (): Promise<User[]> =>
    api.get('/users').then((res) => res.data),
  getUser: (id: string): Promise<User> =>
    api.get(`/users/${id}`).then((res) => res.data),
  updateUserRole: (id: string, role: string): Promise<{user: User, message: string}> =>
    api.put(`/users/${id}/role`, { role }).then((res) => res.data),
  deleteUser: (id: string): Promise<void> =>
    api.delete(`/users/${id}`).then((res) => res.data),
};

// Project Service
export const projectService = {
  createProject: (projectData: Partial<Project>): Promise<Project> =>
    api.post('/projects', projectData).then((res) => res.data),
  getProjects: (): Promise<Project[]> =>
    api.get('/projects').then((res) => res.data),
  getProject: (id: string): Promise<Project> =>
    api.get(`/projects/${id}`).then((res) => res.data),
  updateProject: (id: string, updateData: Partial<Project>): Promise<Project> =>
    api.put(`/projects/${id}`, updateData).then((res) => res.data),
  deleteProject: (id: string): Promise<void> =>
    api.delete(`/projects/${id}`).then((res) => res.data),
};

// Task Service
export const taskService = {
  createTask: (taskData: Partial<Task>): Promise<Task> =>
    api.post('/tasks', taskData).then((res) => res.data),
  getTasksByProject: (projectId: string): Promise<Task[]> =>
    api.get(`/tasks/project/${projectId}`).then((res) => res.data),
  getTask: (id: string): Promise<Task> =>
    api.get(`/tasks/${id}`).then((res) => res.data),
  updateTask: (id: string, updateData: Partial<Task>): Promise<Task> =>
    api.put(`/tasks/${id}`, updateData).then((res) => res.data),
  deleteTask: (id: string): Promise<void> =>
    api.delete(`/tasks/${id}`).then((res) => res.data),
};

export default api;
```