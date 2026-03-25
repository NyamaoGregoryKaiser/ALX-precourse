import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { LoggerService } from '../utils/logger';

/**
 * Service responsible for business logic related to Project entities.
 * It handles CRUD operations for projects and applies authorization rules.
 */
@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    private logger: LoggerService,
  ) {}

  /**
   * Creates a new project. The authenticated user is set as the owner.
   * @param createProjectDto The DTO containing data for the new project.
   * @param user The authenticated user creating the project.
   * @returns {Promise<Project>} The newly created project entity.
   */
  async create(createProjectDto: CreateProjectDto, user: User): Promise<Project> {
    this.logger.log(`User ${user.username} (ID: ${user.id}) attempting to create project: ${createProjectDto.name}`);
    const newProject = this.projectsRepository.create({
      ...createProjectDto,
      owner: user,
    });
    return this.projectsRepository.save(newProject);
  }

  /**
   * Retrieves all projects.
   * For ADMINs, all projects are returned.
   * For other roles, only projects they own are returned.
   * @param user The authenticated user.
   * @returns {Promise<Project[]>} A list of projects.
   */
  async findAll(user: User): Promise<Project[]> {
    this.logger.log(`User ${user.username} (ID: ${user.id}) fetching all projects.`);

    if (user.roles.includes(UserRole.ADMIN)) {
      // Admins can see all projects
      return this.projectsRepository.find({ relations: ['owner'] });
    } else {
      // Regular users can only see projects they own
      return this.projectsRepository.find({
        where: { owner: { id: user.id } },
        relations: ['owner'],
      });
    }
  }

  /**
   * Retrieves a single project by its ID.
   * Ensures that only the owner or an ADMIN can access the project.
   * @param id The ID of the project to find.
   * @param user The authenticated user attempting to access.
   * @returns {Promise<Project>} The found project entity.
   * @throws {NotFoundException} If the project is not found.
   * @throws {ForbiddenException} If the user does not have access to the project.
   */
  async findOne(id: string, user: User): Promise<Project> {
    this.logger.log(`User ${user.username} (ID: ${user.id}) fetching project with ID: ${id}`);
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['owner', 'tasks'], // Eager load owner and tasks
    });

    if (!project) {
      this.logger.warn(`Project with ID ${id} not found.`);
      throw new NotFoundException(`Project with ID "${id}" not found.`);
    }

    // Authorization check: Only owner or admin can access
    if (project.owner.id !== user.id && !user.roles.includes(UserRole.ADMIN)) {
      this.logger.warn(`User ${user.username} (ID: ${user.id}) forbidden from accessing project ${id}.`);
      throw new ForbiddenException(
        'You do not have permission to access this project.',
      );
    }
    return project;
  }

  /**
   * Updates an existing project's information.
   * Ensures that only the owner or an ADMIN can update the project.
   * @param id The ID of the project to update.
   * @param updateProjectDto The DTO containing the updated project data.
   * @param user The authenticated user attempting to update.
   * @returns {Promise<Project>} The updated project entity.
   * @throws {NotFoundException} If the project is not found.
   * @throws {ForbiddenException} If the user does not have permission to update.
   */
  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    user: User,
  ): Promise<Project> {
    this.logger.log(`User ${user.username} (ID: ${user.id}) attempting to update project with ID: ${id}`);
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!project) {
      this.logger.warn(`Project with ID ${id} not found for update.`);
      throw new NotFoundException(`Project with ID "${id}" not found.`);
    }

    // Authorization check: Only owner or admin can update
    if (project.owner.id !== user.id && !user.roles.includes(UserRole.ADMIN)) {
      this.logger.warn(`User ${user.username} (ID: ${user.id}) forbidden from updating project ${id}.`);
      throw new ForbiddenException(
        'You do not have permission to update this project.',
      );
    }

    this.projectsRepository.merge(project, updateProjectDto);
    const updatedProject = await this.projectsRepository.save(project);
    this.logger.log(`Project with ID ${id} updated successfully.`);
    return updatedProject;
  }

  /**
   * Deletes a project from the database.
   * Ensures that only the owner or an ADMIN can delete the project.
   * @param id The ID of the project to delete.
   * @param user The authenticated user attempting to delete.
   * @returns {Promise<void>}
   * @throws {NotFoundException} If the project is not found.
   * @throws {ForbiddenException} If the user does not have permission to delete.
   */
  async remove(id: string, user: User): Promise<void> {
    this.logger.log(`User ${user.username} (ID: ${user.id}) attempting to remove project with ID: ${id}`);
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!project) {
      this.logger.warn(`Project with ID ${id} not found for deletion.`);
      throw new NotFoundException(`Project with ID "${id}" not found.`);
    }

    // Authorization check: Only owner or admin can delete
    if (project.owner.id !== user.id && !user.roles.includes(UserRole.ADMIN)) {
      this.logger.warn(`User ${user.username} (ID: ${user.id}) forbidden from deleting project ${id}.`);
      throw new ForbiddenException(
        'You do not have permission to delete this project.',
      );
    }

    await this.projectsRepository.remove(project);
    this.logger.log(`Project with ID ${id} removed successfully.`);
  }
}