import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/projectService';
import httpStatus from 'http-status';
import { catchAsync } from '../utils/catchAsync';
import { ApiError } from '../utils/ApiError';
import { UserRepository } from '../repositories/UserRepository';

const createProject = catchAsync(async (req: Request, res: Response) => {
  const { name, description } = req.body;
  const owner = await UserRepository.findById(req.user!.id); // Get the full owner object
  if (!owner) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authenticated user not found.');
  }
  const project = await projectService.createProject(name, description, owner);
  res.status(httpStatus.CREATED).send(project);
});

const getProject = catchAsync(async (req: Request, res: Response) => {
  const project = await projectService.getProjectById(req.params.projectId, req.user!.id, );
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found');
  }
  res.send(project);
});

const getAllProjects = catchAsync(async (req: Request, res: Response) => {
  const projects = await projectService.getAllProjects(req.user!.id, req.user!.role);
  res.send(projects);
});

const updateProject = catchAsync(async (req: Request, res: Response) => {
  const project = await projectService.updateProject(req.params.projectId, req.body, req.user!.id, req.user!.role);
  res.send(project);
});

const deleteProject = catchAsync(async (req: Request, res: Response) => {
  await projectService.deleteProject(req.params.projectId, req.user!.id, req.user!.role);
  res.status(httpStatus.NO_CONTENT).send();
});

const getProjectTasks = catchAsync(async (req: Request, res: Response) => {
  const tasks = await projectService.getProjectTasks(req.params.projectId, req.user!.id, req.user!.role);
  res.send(tasks);
});

export const projectController = {
  createProject,
  getProject,
  getAllProjects,
  updateProject,
  deleteProject,
  getProjectTasks,
};
```

#### `backend/src/controllers/taskController.ts`
```typescript