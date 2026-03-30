import axios from 'axios';
import { User, Project, Task, TaskStatus, TaskPriority } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle global errors, e.g., token expiration
    if (error.response && error.response.status === 401 && error.response.data.message === 'Authentication token expired.') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login'; // Redirect to login page
    }
    return Promise.reject(error);
  }
);

// --- Auth Endpoints ---
export const authApi = {
  register: (data: Pick<User, 'firstName' | 'lastName' | 'email' | 'password'>) => api.post('/auth/register', data),
  login: (data: Pick<User, 'email' | 'password'>) => api.post('/auth/login', data),
  getMe: () => api.get<User>('/auth/me'),
};

// --- User Endpoints --- (Admin only, or for fetching assignable users)
export const userApi = {
  getAllUsers: () => api.get<User[]>('/users'),
  getUserById: (userId: string) => api.get<User>(`/users/${userId}`),
  updateUserRole: (userId: string, role: 'user' | 'admin') => api.patch<User>(`/users/${userId}`, { role }),
};

// --- Project Endpoints ---
export const projectApi = {
  createProject: (data: Pick<Project, 'name' | 'description'>) => api.post<Project>('/projects', data),
  getAllProjects: () => api.get<Project[]>('/projects'),
  getProjectById: (projectId: string) => api.get<Project>(`/projects/${projectId}`),
  updateProject: (projectId: string, data: Partial<Pick<Project, 'name' | 'description'>>) => api.patch<Project>(`/projects/${projectId}`, data),
  deleteProject: (projectId: string) => api.delete(`/projects/${projectId}`),
  getProjectTasks: (projectId: string) => api.get<Task[]>(`/projects/${projectId}/tasks`),
};

// --- Task Endpoints ---
export const taskApi = {
  createTask: (data: Pick<Task, 'title' | 'description' | 'projectId' | 'assignedToId' | 'status' | 'priority' | 'dueDate'>) => api.post<Task>(`/projects/${data.projectId}/tasks`, data),
  getTaskById: (taskId: string) => api.get<Task>(`/tasks/${taskId}`),
  updateTask: (taskId: string, data: Partial<Pick<Task, 'title' | 'description' | 'assignedToId' | 'status' | 'priority' | 'dueDate'>>) => api.patch<Task>(`/tasks/${taskId}`, data),
  deleteTask: (taskId: string) => api.delete(`/tasks/${taskId}`),
  getAssignedTasks: (status?: TaskStatus) => api.get<Task[]>(`/tasks/assigned${status ? `?status=${status}` : ''}`),
};

export default api;
```

#### `frontend/src/contexts/AuthContext.tsx`
```typescript