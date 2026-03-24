```typescript
import api from '../config/api';
import { Task, CreateTaskData, UpdateTaskData, Comment, CreateCommentData, UpdateCommentData } from '../types';

// Task-related services
const getTasksByProject = async (projectId: string): Promise<Task[]> => {
  const response = await api.get<Task[]>(`/projects/${projectId}/tasks`);
  return response.data;
};

const getTaskById = async (taskId: string): Promise<Task> => {
  // Note: The backend route is nested, but if we have the task ID, we might access it directly or via project context.
  // For simplicity, assuming you have the projectId from route context.
  // This assumes the frontend fetches tasks within a project detail view.
  // A more robust implementation might fetch `tasks/:id` directly if the backend supports it with auth.
  // For now, let's assume it's always nested:
  console.warn("getTaskById called without projectId, this might fail if the backend strictly enforces nested routes.");
  // For now, let's assume projectId is accessible or task ID is globally unique for direct access.
  // This will likely need adjustment based on specific URL structure.
  // For this example, let's assume we derive project ID from the task detail view URL:
  // e.g., /projects/:projectId/tasks/:taskId
  // A safer approach would be: const response = await api.get<Task>(`/projects/${projectId}/tasks/${taskId}`);
  // But the service often doesn't have projectId.
  // A quick fix for this example: The backend `tasks.controller.ts` has `@Get(':id')`,
  // meaning if you hit `api/tasks/:id` it will work. But the controller is prefixed with `projects/:projectId/tasks`.
  // Let's adjust this to reflect the nested route properly.
  // The route is actually '/projects/:projectId/tasks/:id'. So we need projectId.
  // This means the component calling this function must provide projectId.
  // For a truly flexible frontend, the backend might offer `/tasks/:id` or we always get project ID.
  // Let's assume the frontend will provide projectId along with taskId.
  // Update: The current backend `/tasks/:id` route is actually accessible from `/projects/:projectId/tasks/:id`
  // So a direct `tasksService.getTaskById(projectId, taskId)` is needed.
  // For simplicity, I'll update the function signature.
  throw new Error("Please call getTaskById with both projectId and taskId: tasksService.getTaskById(projectId, taskId)");
};

const getTaskByIdInProject = async (projectId: string, taskId: string): Promise<Task> => {
  const response = await api.get<Task>(`/projects/${projectId}/tasks/${taskId}`);
  return response.data;
};


const createTask = async (projectId: string, taskData: CreateTaskData): Promise<Task> => {
  const response = await api.post<Task>(`/projects/${projectId}/tasks`, taskData);
  return response.data;
};

const updateTask = async (projectId: string, taskId: string, taskData: UpdateTaskData): Promise<Task> => {
  const response = await api.patch<Task>(`/projects/${projectId}/tasks/${taskId}`, taskData);
  return response.data;
};

const deleteTask = async (projectId: string, taskId: string): Promise<void> => {
  await api.delete(`/projects/${projectId}/tasks/${taskId}`);
};

// Comment-related services
const getCommentsByTask = async (taskId: string): Promise<Comment[]> => {
  // This also assumes projectId is available in context or passed, or backend handles `tasks/:taskId/comments` directly.
  // Based on backend, it's `tasks/:taskId/comments`. So projectId is NOT strictly needed here.
  const response = await api.get<Comment[]>(`/tasks/${taskId}/comments`);
  return response.data;
};

const createComment = async (taskId: string, commentData: CreateCommentData): Promise<Comment> => {
  const response = await api.post<Comment>(`/tasks/${taskId}/comments`, commentData);
  return response.data;
};

const updateComment = async (taskId: string, commentId: string, commentData: UpdateCommentData): Promise<Comment> => {
  const response = await api.patch<Comment>(`/tasks/${taskId}/comments/${commentId}`, commentData);
  return response.data;
};

const deleteComment = async (taskId: string, commentId: string): Promise<void> => {
  await api.delete(`/tasks/${taskId}/comments/${commentId}`);
};


export const tasksService = {
  getTasksByProject,
  getTaskById: getTaskByIdInProject, // Rename to make it clear it needs projectId
  createTask,
  updateTask,
  deleteTask,
  getCommentsByTask,
  createComment,
  updateComment,
  deleteComment,
};
```