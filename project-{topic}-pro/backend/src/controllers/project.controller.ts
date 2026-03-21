```typescript
import { Request, Response, NextFunction } from 'express';
import projectService from '@services/project.service';
import logger from '@config/logger';

class ProjectController {
  async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const projectData = req.body;
      const ownerId = req.user!.id; // Authenticated user is the owner
      const project = await projectService.createProject({ ...projectData, ownerId });
      res.status(201).json(project);
    } catch (error) {
      logger.error(`Create project controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }

  async getAllProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const projects = await projectService.getAllProjects(); // Admin can see all
      res.status(200).json(projects);
    } catch (error) {
      logger.error(`Get all projects controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }

  async getProjectById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const project = await projectService.getProjectById(id);
      res.status(200).json(project);
    } catch (error) {
      logger.error(`Get project by ID controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }

  async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const updatedProject = await projectService.updateProject(id, updateData, userId, userRole);
      res.status(200).json(updatedProject);
    } catch (error) {
      logger.error(`Update project controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }

  async deleteProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      await projectService.deleteProject(id, userId, userRole);
      res.status(204).send();
    } catch (error) {
      logger.error(`Delete project controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }
}

export default new ProjectController();
```