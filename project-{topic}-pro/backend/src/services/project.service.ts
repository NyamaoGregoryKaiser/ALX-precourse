```typescript
import { getRepository } from 'typeorm';
import { Project, ProjectStatus } from '@models/Project';
import { User } from '@models/User';
import AppError, { ErrorType } from '@utils/AppError';
import logger from '@config/logger';
import { clearCache } from '@middleware/cache.middleware';

interface CreateProjectData {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: ProjectStatus;
  ownerId: string;
}

interface UpdateProjectData {
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: ProjectStatus;
}

class ProjectService {
  private projectRepository = getRepository(Project);
  private userRepository = getRepository(User);

  async createProject(projectData: CreateProjectData): Promise<Project> {
    const owner = await this.userRepository.findOne({ where: { id: projectData.ownerId } });
    if (!owner) {
      logger.warn(`Project creation failed: Owner with ID ${projectData.ownerId} not found.`);
      throw new AppError('Project owner not found.', ErrorType.BAD_REQUEST);
    }

    const project = this.projectRepository.create({ ...projectData, owner });
    await this.projectRepository.save(project);
    logger.info(`Project created: ${project.id} by user ${projectData.ownerId}`);
    await clearCache('projects');
    return project;
  }

  async getAllProjects(userId?: string): Promise<Project[]> {
    logger.debug(`Fetching all projects for user ${userId || 'all'}...`);
    const findOptions: any = { relations: ['owner'] };
    if (userId) {
      findOptions.where = { owner: { id: userId } };
    }
    return this.projectRepository.find(findOptions);
  }

  async getProjectById(id: string): Promise<Project> {
    logger.debug(`Fetching project by ID: ${id}`);
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['owner', 'tasks', 'tasks.assignedTo'],
    });
    if (!project) {
      logger.warn(`Project with ID ${id} not found.`);
      throw new AppError('Project not found.', ErrorType.NOT_FOUND);
    }
    return project;
  }

  async updateProject(id: string, updateData: UpdateProjectData, userId: string, userRole: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id }, relations: ['owner'] });
    if (!project) {
      logger.warn(`Project update failed: Project with ID ${id} not found.`);
      throw new AppError('Project not found.', ErrorType.NOT_FOUND);
    }

    // Authorization check: Only owner, manager, or admin can update
    if (project.owner.id !== userId && userRole !== UserRole.MANAGER && userRole !== UserRole.ADMIN) {
      logger.warn(`User ${userId} attempted to update project ${id} without permission.`);
      throw new AppError('Forbidden: You do not have permission to update this project.', ErrorType.FORBIDDEN);
    }

    Object.assign(project, updateData);
    await this.projectRepository.save(project);
    logger.info(`Project ${id} updated by user ${userId}`);
    await clearCache('projects');
    return project;
  }

  async deleteProject(id: string, userId: string, userRole: string): Promise<void> {
    const project = await this.projectRepository.findOne({ where: { id }, relations: ['owner'] });
    if (!project) {
      logger.warn(`Project deletion failed: Project with ID ${id} not found.`);
      throw new AppError('Project not found.', ErrorType.NOT_FOUND);
    }

    // Authorization check: Only owner or admin can delete
    if (project.owner.id !== userId && userRole !== UserRole.ADMIN) {
      logger.warn(`User ${userId} attempted to delete project ${id} without permission.`);
      throw new AppError('Forbidden: You do not have permission to delete this project.', ErrorType.FORBIDDEN);
    }

    await this.projectRepository.remove(project);
    logger.info(`Project ${id} deleted by user ${userId}`);
    await clearCache('projects');
  }
}

export default new ProjectService();
```