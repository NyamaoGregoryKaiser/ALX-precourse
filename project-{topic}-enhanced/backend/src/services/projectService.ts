import { ProjectRepository } from '../repositories/ProjectRepository';
import { Project } from '../entities/Project';
import { User } from '../entities/User';
import { ApiError } from '../utils/ApiError';
import httpStatus from 'http-status';
import { clearCache } from '../middleware/cache';
import { TaskRepository } from '../repositories/TaskRepository';

const createProject = async (name: string, description: string | undefined, owner: User): Promise<Project> => {
  const project = ProjectRepository.create({ name, description, owner, ownerId: owner.id });
  await ProjectRepository.save(project);
  await clearCache(['projects', `user-projects:${owner.id}`]); // Invalidate relevant caches
  return project;
};

const getProjectById = async (projectId: string, userId: string): Promise<Project | null> => {
  const project = await ProjectRepository.findByIdWithOwner(projectId);
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found');
  }
  // Ensure the user owns the project or is an admin
  if (project.ownerId !== userId && project.owner.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this project');
  }
  return project;
};

const getAllProjects = async (userId: string, userRole: string): Promise<Project[]> => {
  if (userRole === 'admin') {
    // Admins can see all projects
    return ProjectRepository.find({ relations: ['owner'], order: { createdAt: 'DESC' } });
  } else {
    // Regular users only see their own projects
    return ProjectRepository.findAllByOwner(userId);
  }
};

const updateProject = async (projectId: string, updateBody: Partial<Project>, userId: string, userRole: string): Promise<Project> => {
  const project = await ProjectRepository.findByIdWithOwner(projectId);
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found');
  }
  if (project.ownerId !== userId && userRole !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this project');
  }

  Object.assign(project, updateBody);
  await ProjectRepository.save(project);
  await clearCache(['projects', `user-projects:${userId}`, `project:${projectId}`]); // Invalidate relevant caches
  return project;
};

const deleteProject = async (projectId: string, userId: string, userRole: string): Promise<void> => {
  const project = await ProjectRepository.findByIdWithOwner(projectId);
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found');
  }
  if (project.ownerId !== userId && userRole !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to delete this project');
  }

  // Before deleting project, optionally delete related tasks or ensure cascade works.
  // TypeORM's onDelete: 'CASCADE' on relations handles this at DB level.
  await ProjectRepository.remove(project);
  await clearCache(['projects', `user-projects:${userId}`, `project:${projectId}`, `project-tasks:${projectId}`]); // Invalidate relevant caches
};

const getProjectTasks = async (projectId: string, userId: string, userRole: string) => {
  const project = await getProjectById(projectId, userId); // This already checks access
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found');
  }
  return TaskRepository.findByProjectWithRelations(projectId);
};


export const projectService = {
  createProject,
  getProjectById,
  getAllProjects,
  updateProject,
  deleteProject,
  getProjectTasks,
};
```

#### `backend/src/services/taskService.ts`
```typescript