```typescript
import { Repository } from 'typeorm';
import { Project } from '../entities/Project';
import { User } from '../entities/User';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { CacheService } from './CacheService';

/**
 * @file Project service.
 *
 * Handles business logic for managing scraping projects, including CRUD operations,
 * authorization checks, and interaction with the database and cache.
 */

interface CreateProjectData {
  name: string;
  description?: string;
}

interface UpdateProjectData {
  name?: string;
  description?: string;
}

export class ProjectService {
  constructor(
    private projectRepository: Repository<Project>,
    private userRepository: Repository<User>,
    private cacheService: CacheService
  ) {}

  /**
   * Creates a new scraping project for a user.
   * @param {string} userId - The ID of the user creating the project.
   * @param {CreateProjectData} projectData - Data for the new project.
   * @returns {Promise<Project>} The newly created project.
   * @throws {AppError} If user not found or project name already exists for the user.
   */
  async createProject(userId: string, projectData: CreateProjectData): Promise<Project> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      logger.error(`Attempted to create project for non-existent user: ${userId}`);
      throw new AppError('User not found', 404);
    }

    // Check if a project with the same name already exists for this user
    const existingProject = await this.projectRepository.findOne({
      where: { name: projectData.name, user: { id: userId } },
    });
    if (existingProject) {
      throw new AppError(`Project with name "${projectData.name}" already exists for this user.`, 409);
    }

    const newProject = this.projectRepository.create({
      ...projectData,
      user: user,
    });
    const savedProject = await this.projectRepository.save(newProject);

    // Invalidate relevant caches
    this.cacheService.del(`user:${userId}:projects`);
    this.cacheService.del('allProjects'); // For admin users
    logger.info(`Project ${savedProject.id} created by user ${userId}.`);
    return savedProject;
  }

  /**
   * Retrieves all projects for a given user, or all projects if admin.
   * @param {string} userId - The ID of the authenticated user.
   * @param {boolean} isAdmin - True if the user is an admin.
   * @returns {Promise<Project[]>} A list of projects.
   */
  async findAllProjects(userId: string, isAdmin: boolean): Promise<Project[]> {
    const cacheKey = isAdmin ? 'allProjects' : `user:${userId}:projects`;
    const cachedProjects = this.cacheService.get<Project[]>(cacheKey);
    if (cachedProjects) {
      logger.debug(`Fetching projects from cache for user ${userId} (isAdmin: ${isAdmin}).`);
      return cachedProjects;
    }

    const queryOptions: any = {
      relations: ['user'],
      order: { createdAt: 'DESC' },
      select: {
        id: true, name: true, description: true, createdAt: true, updatedAt: true,
        user: { id: true, username: true, email: true }
      }
    };
    if (!isAdmin) {
      queryOptions.where = { user: { id: userId } };
    }

    const projects = await this.projectRepository.find(queryOptions);
    this.cacheService.set(cacheKey, projects);
    logger.debug(`Fetched projects from DB and cached for user ${userId} (isAdmin: ${isAdmin}).`);
    return projects;
  }

  /**
   * Finds a specific project by its ID, with authorization check.
   * @param {string} projectId - The ID of the project to find.
   * @param {string} userId - The ID of the authenticated user.
   * @param {boolean} isAdmin - True if the user is an admin.
   * @returns {Promise<Project | null>} The project or null if not found/unauthorized.
   */
  async findProjectById(projectId: string, userId: string, isAdmin: boolean): Promise<Project | null> {
    const cacheKey = `project:${projectId}`;
    const cachedProject = this.cacheService.get<Project>(cacheKey);
    if (cachedProject) {
      // Check authorization for cached project
      if (isAdmin || cachedProject.user.id === userId) {
        logger.debug(`Fetching project ${projectId} from cache (authorized).`);
        return cachedProject;
      }
      logger.warn(`Unauthorized access attempt to cached project ${projectId} by user ${userId}.`);
      return null; // Unauthorized
    }

    const project = await this.projectRepository.findOne({
      where: isAdmin ? { id: projectId } : { id: projectId, user: { id: userId } },
      relations: ['user'],
      select: {
        id: true, name: true, description: true, createdAt: true, updatedAt: true,
        user: { id: true, username: true, email: true }
      }
    });

    if (project) {
      this.cacheService.set(cacheKey, project);
      logger.debug(`Fetched project ${projectId} from DB and cached.`);
    } else {
      logger.warn(`Project ${projectId} not found or unauthorized for user ${userId}.`);
    }
    return project;
  }

  /**
   * Updates an existing project, with authorization check.
   * @param {string} projectId - The ID of the project to update.
   * @param {string} userId - The ID of the authenticated user.
   * @param {boolean} isAdmin - True if the user is an admin.
   * @param {UpdateProjectData} updateData - Data to update the project with.
   * @returns {Promise<Project | null>} The updated project or null if not found/unauthorized.
   * @throws {AppError} If project name already exists for the user.
   */
  async updateProject(
    projectId: string,
    userId: string,
    isAdmin: boolean,
    updateData: UpdateProjectData
  ): Promise<Project | null> {
    const project = await this.projectRepository.findOne({
      where: isAdmin ? { id: projectId } : { id: projectId, user: { id: userId } },
      relations: ['user'], // Need to load user for owner check
    });

    if (!project) {
      logger.warn(`Project ${projectId} not found or unauthorized for update by user ${userId}.`);
      return null; // Not found or not authorized
    }

    // Check if the updated name would cause a conflict for the project owner
    if (updateData.name && updateData.name !== project.name) {
      const existingProject = await this.projectRepository.findOne({
        where: { name: updateData.name, user: { id: project.user.id } },
      });
      if (existingProject && existingProject.id !== projectId) {
        throw new AppError(`Project with name "${updateData.name}" already exists for this user.`, 409);
      }
    }

    Object.assign(project, updateData);
    const updatedProject = await this.projectRepository.save(project);

    // Invalidate relevant caches
    this.cacheService.del(`project:${projectId}`);
    this.cacheService.del(`user:${userId}:projects`);
    this.cacheService.del('allProjects'); // For admin users
    logger.info(`Project ${projectId} updated by user ${userId}. Caches invalidated.`);
    return updatedProject;
  }

  /**
   * Deletes a project, with authorization check.
   * @param {string} projectId - The ID of the project to delete.
   * @param {string} userId - The ID of the authenticated user.
   * @param {boolean} isAdmin - True if the user is an admin.
   * @returns {Promise<boolean>} True if the project was deleted, false otherwise.
   */
  async deleteProject(projectId: string, userId: string, isAdmin: boolean): Promise<boolean> {
    const project = await this.projectRepository.findOne({
      where: isAdmin ? { id: projectId } : { id: projectId, user: { id: userId } },
      relations: ['user'],
    });

    if (!project) {
      logger.warn(`Project ${projectId} not found or unauthorized for deletion by user ${userId}.`);
      return false; // Not found or not authorized
    }

    const result = await this.projectRepository.delete(projectId);
    if (result.affected && result.affected > 0) {
      // Invalidate relevant caches
      this.cacheService.del(`project:${projectId}`);
      this.cacheService.del(`user:${userId}:projects`);
      this.cacheService.del('allProjects'); // For admin users
      logger.info(`Project ${projectId} deleted by user ${userId}. Caches invalidated.`);
      return true;
    }
    return false;
  }
}
```