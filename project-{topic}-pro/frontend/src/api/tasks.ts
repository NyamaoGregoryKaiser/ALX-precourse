```typescript
import { API_BASE_URL } from '../config';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in-progress' | 'completed';
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

interface TasksApiResponse {
  success: boolean;
  message?: string;
  tasks?: Task[];
  task?: Task;
  errors?: any[];
}

export const fetchTasks = async (token: string, status?: string): Promise<TasksApiResponse> => {
  const query = status ? `?status=${status}` : '';
  const response = await fetch(`${API_BASE_URL}/tasks${query}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
};

export const createTask = async (token: string, taskData: Partial<Task>): Promise<TasksApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(taskData),
  });
  return response.json();
};

export const updateTask = async (token: string, taskId: string, taskData: Partial<Task>): Promise<TasksApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(taskData),
  });
  return response.json();
};

export const deleteTask = async (token: string, taskId: string): Promise<TasksApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  // DELETE typically returns 204 No Content, so parsing JSON might fail.
  // We'll return a success status if the response is 204.
  if (response.status === 204) {
    return { success: true, message: 'Task deleted successfully.' };
  }
  return response.json(); // For other error responses
};
```