```typescript
import api from '../config/api';
import { Project, CreateProjectData, UpdateProjectData } from '../types';

const getProjects = async (): Promise<Project[]> => {
  const response = await api.get<Project[]>('/projects');
  return response.data;
};

const getProjectById = async (projectId: string): Promise<Project> => {
  const response = await api.get<Project>(`/projects/${projectId}`);
  return response.data;
};

const createProject = async (projectData: CreateProjectData): Promise<Project> => {
  const response = await api.post<Project>('/projects', projectData);
  return response.data;
};

const updateProject = async (projectId: string, projectData: UpdateProjectData): Promise<Project> => {
  const response = await api.patch<Project>(`/projects/${projectId}`, projectData);
  return response.data;
};

const deleteProject = async (projectId: string): Promise<void> => {
  await api.delete(`/projects/${projectId}`);
};

export const projectsService = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
```