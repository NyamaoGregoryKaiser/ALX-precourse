```typescript
// Define common types used across the frontend application

import { TaskStatus, TaskPriority } from './enums'; // Assuming you create enums.ts

// --- User Types ---
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string; // Password should typically not be sent to frontend, but exists in backend entity
  roles: string[]; // e.g., ['ADMIN', 'USER']
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginData extends Pick<User, 'email' | 'password'> {}
export interface RegisterData extends Pick<User, 'firstName' | 'lastName' | 'email' | 'password'> {}


// --- Project Types ---
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  owner: User; // The owner of the project
  tasks?: Task[]; // Optionally include tasks when fetching project detail
}

export interface CreateProjectData extends Pick<Project, 'name' | 'description'> {}
export interface UpdateProjectData extends Partial<CreateProjectData> {}


// --- Task Types ---
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus; // Enum for task status
  priority: TaskPriority; // Enum for task priority
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  project: Project; // The project this task belongs to
  creator: User; // The user who created the task
  assignee?: User; // The user assigned to the task (optional)
  comments?: Comment[]; // Optionally include comments
}

// These enums should ideally match backend enums
export enum TaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
  CLOSED = 'CLOSED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface CreateTaskData extends Pick<Task, 'title' | 'description' | 'dueDate' | 'priority'> {
  assigneeId?: string | null; // UUID of the assignee
}
export interface UpdateTaskData extends Partial<CreateTaskData & Pick<Task, 'status'>> {
  assigneeId?: string | null; // Allow null to unassign
}

// --- Comment Types ---
export interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  task: Task; // The task this comment belongs to
  author: User; // The user who authored the comment
}

export interface CreateCommentData extends Pick<Comment, 'content'> {}
export interface UpdateCommentData extends Partial<CreateCommentData> {}


// --- Notification Types ---
export interface Notification {
  id: string;
  user: User;
  message: string;
  isRead: boolean;
  entityType?: string; // e.g., 'task', 'project'
  entityId?: string; // UUID of the related entity
  createdAt: Date;
}

export interface CreateNotificationData extends Pick<Notification, 'userId' | 'message' | 'entityType' | 'entityId'> {}

// You might also need a combined enums.ts for frontend
```