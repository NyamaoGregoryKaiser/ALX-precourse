export enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export enum ProjectStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  ownerId: string;
  owner: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  createdAt: string;
  updatedAt: string;
  tasks?: Task[]; // Optionally include tasks when fetching details
  _count?: { tasks: number }; // For card/list views
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string; // ISO date string
  projectId: string;
  assigneeId?: string;
  reporterId: string;
  createdAt: string;
  updatedAt: string;
  project: Pick<Project, 'id' | 'name' | 'owner'>; // Project owner for task auth checks
  assignee?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  reporter: Pick<User, 'id' | 'firstName' | 'lastName'>;
}