import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Project } from './entities/project.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * ProjectsController handles all API endpoints for managing projects.
 * All endpoints require authentication and are protected by JWT.
 * Specific endpoints might further restrict access based on user roles (e.g., ADMIN, MANAGER).
 */
@ApiTags('Projects')
@ApiBearerAuth('JWT-auth') // All endpoints in this controller require JWT authentication
@UseGuards(JwtAuthGuard, ThrottlerGuard) // Apply JWT Auth and Rate Limiting globally for this controller
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * Creates a new project. The authenticated user is automatically set as the project owner.
   * Accessible by all authenticated users with at least the 'USER' role.
   * @param createProjectDto The DTO containing the new project's data.
   * @param req The request object, containing the authenticated user's details.
   * @returns {Promise<Project>} The created project.
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER) // Any of these roles can create a project
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Create a new project',
    description: 'Creates a new project owned by the authenticated user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully.',
    type: Project,
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient role.' })
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @Request() req: any,
  ): Promise<Project> {
    return this.projectsService.create(createProjectDto, req.user);
  }

  /**
   * Retrieves a list of projects.
   * ADMINs can see all projects. Other users can only see projects they own.
   * @param req The request object, containing the authenticated user's details.
   * @returns {Promise<Project[]>} A list of projects accessible by the user.
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.ANALYST) // All authenticated users can list projects
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get all projects accessible by the user',
    description:
      'Admins see all projects. Other roles see projects they own/manage.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of projects retrieved successfully.',
    type: [Project],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(@Request() req: any): Promise<Project[]> {
    return this.projectsService.findAll(req.user);
  }

  /**
   * Retrieves a single project by its ID.
   * Access is restricted to the project owner or ADMINs.
   * @param id The ID of the project to retrieve.
   * @param req The request object, containing the authenticated user's details.
   * @returns {Promise<Project>} The project details.
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.ANALYST) // All authenticated users can view, but service applies ownership check
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get a project by ID',
    description: 'Retrieves details of a specific project by its ID. Requires ownership or Admin role.',
  })
  @ApiParam({ name: 'id', description: 'The ID of the project', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved successfully.',
    type: Project,
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: You do not own this project or are not an Admin.' })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<Project> {
    return this.projectsService.findOne(id, req.user);
  }

  /**
   * Updates an existing project's details.
   * Only the project owner or ADMINs can update a project.
   * @param id The ID of the project to update.
   * @param updateProjectDto The DTO containing the updated project data.
   * @param req The request object, containing the authenticated user's details.
   * @returns {Promise<Project>} The updated project.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER) // These roles can update, service checks ownership
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Update a project',
    description: 'Updates details of an existing project by its ID. Requires ownership or Admin role.',
  })
  @ApiParam({ name: 'id', description: 'The ID of the project', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully.',
    type: Project,
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: You do not own this project or are not an Admin.' })
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req: any,
  ): Promise<Project> {
    return this.projectsService.update(id, updateProjectDto, req.user);
  }

  /**
   * Deletes a project.
   * Only the project owner or ADMINs can delete a project.
   * @param id The ID of the project to delete.
   * @param req The request object, containing the authenticated user's details.
   * @returns {Promise<void>}
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER) // These roles can delete, service checks ownership
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Delete a project',
    description: 'Deletes a project by its ID. Requires ownership or Admin role.',
  })
  @ApiParam({ name: 'id', description: 'The ID of the project', type: 'string' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: You do not own this project or are not an Admin.' })
  async remove(@Param('id') id: string, @Request() req: any): Promise<void> {
    await this.projectsService.remove(id, req.user);
  }
}