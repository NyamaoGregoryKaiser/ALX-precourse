import { Request, Response, NextFunction } from 'express';
import * as projectService from './project.service';
import { CustomError } from '../../middlewares/error.middleware';
import { invalidateCache } from '../../middlewares/cache.middleware';

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    const ownerId = req.user?.userId;
    if (!ownerId) {
      throw new CustomError('Unauthorized: Owner ID is missing.', 401);
    }
    if (!name) {
      throw new CustomError('Project name is required.', 400);
    }
    const project = await projectService.createProject({ name, description, ownerId });
    await invalidateCache('projects');
    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Optional query parameters for filtering/pagination
    const { ownerId, status } = req.query;
    const projects = await projectService.getProjects({
      ownerId: ownerId as string,
      status: status as string,
    });
    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const project = await projectService.getProjectById(id);
    if (!project) {
      throw new CustomError('Project not found.', 404);
    }
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      throw new CustomError('Unauthorized: User ID is missing.', 401);
    }

    const updatedProject = await projectService.updateProject(id, updateData, userId);
    if (!updatedProject) {
      throw new CustomError('Project not found or you are not authorized to update it.', 404);
    }
    await invalidateCache('projects');
    await invalidateCache(`project:${id}`); // Invalidate specific project cache
    res.status(200).json({ message: 'Project updated successfully', project: updatedProject });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new CustomError('Unauthorized: User ID is missing.', 401);
    }

    const deletedProject = await projectService.deleteProject(id, userId);
    if (!deletedProject) {
      throw new CustomError('Project not found or you are not authorized to delete it.', 404);
    }
    await invalidateCache('projects');
    await invalidateCache(`project:${id}`);
    await invalidateCache('tasks'); // Projects contain tasks, so tasks cache might need invalidation too.
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};