import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as projectService from './project.service';
import { AppError } from '../../utils/appError';
import { Role } from '@prisma/client';

/**
 * Handles creation of a new project.
 * Only accessible by ADMIN or PROJECT_MANAGER.
 * If PROJECT_MANAGER creates, they are automatically assigned as manager.
 */
export const createProjectHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectData = req.body;
    // If a Project Manager creates a project, ensure they are the manager
    if (req.user?.role === Role.PROJECT_MANAGER) {
      projectData.managerId = req.user.id;
    }

    const newProject = await projectService.createProject(projectData);
    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: { project: newProject },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles retrieval of all projects.
 * Access depends on user role (ADMIN sees all, PM sees all, MEMBER sees assigned).
 */
export const getAllProjectsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      // This case should be caught by `protect` middleware
      return next(new AppError('Authentication required to access projects.', StatusCodes.UNAUTHORIZED));
    }
    const projects = await projectService.getAllProjects(req.user.id, req.user.role);
    res.status(StatusCodes.OK).json({
      status: 'success',
      results: projects.length,
      data: { projects },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles retrieval of a single project by ID.
 * Access depends on user role (ADMIN/PM can view all, MEMBER can view assigned).
 */
export const getProjectByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const project = await projectService.getProjectById(id);

    if (!project) {
      return next(new AppError('Project not found', StatusCodes.NOT_FOUND));
    }

    // Authorization check
    if (!req.user) {
      return next(new AppError('Authentication required to view project.', StatusCodes.UNAUTHORIZED));
    }

    // ADMIN or PROJECT_MANAGER can view any project
    if (req.user.role === Role.ADMIN || req.user.role === Role.PROJECT_MANAGER) {
      return res.status(StatusCodes.OK).json({
        status: 'success',
        data: { project },
      });
    }

    // MEMBER can only view projects they are associated with (via tasks)
    const isMemberOfProject = project.tasks.some(task => task.assignedToId === req.user?.id);
    if (req.user.role === Role.MEMBER && !isMemberOfProject) {
      return next(new AppError('You do not have permission to view this project.', StatusCodes.FORBIDDEN));
    }

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles updating an existing project.
 * Only accessible by ADMIN or the assigned PROJECT_MANAGER.
 */
export const updateProjectHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!req.user) {
      return next(new AppError('Authentication required to update project.', StatusCodes.UNAUTHORIZED));
    }

    // Only ADMIN or the project's manager can update
    const existingProject = await projectService.getProjectById(id);
    if (!existingProject) {
        return next(new AppError('Project not found', StatusCodes.NOT_FOUND));
    }

    if (req.user.role !== Role.ADMIN && req.user.id !== existingProject.managerId) {
      return next(new AppError('You do not have permission to update this project.', StatusCodes.FORBIDDEN));
    }

    const updatedProject = await projectService.updateProject(id, updateData);
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: { project: updatedProject },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles deleting a project.
 * Only accessible by ADMIN or the assigned PROJECT_MANAGER.
 */
export const deleteProjectHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return next(new AppError('Authentication required to delete project.', StatusCodes.UNAUTHORIZED));
    }

    // Only ADMIN or the project's manager can delete
    const existingProject = await projectService.getProjectById(id);
    if (!existingProject) {
        return next(new AppError('Project not found', StatusCodes.NOT_FOUND));
    }

    if (req.user.role !== Role.ADMIN && req.user.id !== existingProject.managerId) {
      return next(new AppError('You do not have permission to delete this project.', StatusCodes.FORBIDDEN));
    }

    await projectService.deleteProject(id);
    res.status(StatusCodes.NO_CONTENT).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
```