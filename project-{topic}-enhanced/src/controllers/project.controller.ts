```typescript
import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/ProjectService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { z } from 'zod';

/**
 * @file Project controller.
 *
 * This controller handles requests related to scraping projects,
 * interacting with the `ProjectService` for CRUD operations.
 */

// Zod schemas for validation
const createProjectSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(1000).optional(),
});

export class ProjectController {
  constructor(private projectService: ProjectService) {}

  /**
   * Creates a new project.
   * @route POST /api/projects
   * @param {Request} req - The Express request object with project data in body.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectData = createProjectSchema.parse(req.body);
      const userId = req.user!.id; // Authenticated user ID
      const newProject = await this.projectService.createProject(userId, projectData);
      logger.info(`Project created: ${newProject.name} by user ${userId}`);
      res.status(201).json({ status: 'success', message: 'Project created successfully', data: newProject });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return next(new AppError('Validation error: ' + error.errors.map(e => e.message).join(', '), 400));
      }
      logger.error(`Error creating project for user ${req.user!.id}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Gets all projects for the authenticated user (or all for admin).
   * @route GET /api/projects
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async getAllProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';
      const projects = await this.projectService.findAllProjects(userId, isAdmin);
      logger.info(`Fetched ${projects.length} projects for user ${userId} (isAdmin: ${isAdmin}).`);
      res.status(200).json({ status: 'success', data: projects });
    } catch (error: any) {
      logger.error(`Error fetching all projects for user ${req.user!.id}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Gets a project by ID.
   * @route GET /api/projects/:id
   * @param {Request} req - The Express request object with project ID in params.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async getProjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';

      const project = await this.projectService.findProjectById(id, userId, isAdmin);
      if (!project) {
        return next(new AppError('Project not found or you do not have permission to view it', 404));
      }
      logger.info(`Fetched project ${id} for user ${userId}.`);
      res.status(200).json({ status: 'success', data: project });
    } catch (error: any) {
      logger.error(`Error fetching project by ID ${req.params.id}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Updates a project by ID.
   * @route PUT /api/projects/:id
   * @param {Request} req - The Express request object with project ID in params and update data in body.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = updateProjectSchema.parse(req.body);
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';

      const updatedProject = await this.projectService.updateProject(id, userId, isAdmin, updateData);
      if (!updatedProject) {
        return next(new AppError('Project not found or you do not have permission to update it', 404));
      }
      logger.info(`Project ${id} updated by user ${userId}.`);
      res.status(200).json({ status: 'success', message: 'Project updated successfully', data: updatedProject });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return next(new AppError('Validation error: ' + error.errors.map(e => e.message).join(', '), 400));
      }
      logger.error(`Error updating project by ID ${req.params.id}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Deletes a project by ID.
   * @route DELETE /api/projects/:id
   * @param {Request} req - The Express request object with project ID in params.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';

      const deleted = await this.projectService.deleteProject(id, userId, isAdmin);
      if (!deleted) {
        return next(new AppError('Project not found or you do not have permission to delete it', 404));
      }
      logger.info(`Project ${id} deleted by user ${userId}.`);
      res.status(204).send(); // 204 No Content for successful deletion
    } catch (error: any) {
      logger.error(`Error deleting project by ID ${req.params.id}: ${error.message}`);
      next(error);
    }
  }
}
```