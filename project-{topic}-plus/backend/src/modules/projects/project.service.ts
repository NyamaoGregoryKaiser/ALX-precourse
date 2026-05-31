import prisma from '../../config/prisma';
import { AppError } from '../../utils/appError';
import { StatusCodes } from 'http-status-codes';
import { Project, Role } from '@prisma/client';
import { clearCache } from '../../middleware/cacheMiddleware';

const PROJECT_CACHE_PATTERN = '/api/v1/projects';

/**
 * Creates a new project.
 * Ensures the managerId belongs to a PROJECT_MANAGER or ADMIN.
 * @param projectData Project data.
 * @returns The created project.
 */
export async function createProject(
  projectData: {
    name: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
    managerId: string;
  }
): Promise<Project> {
  // Verify that the manager exists and has PROJECT_MANAGER or ADMIN role
  const manager = await prisma.user.findUnique({
    where: { id: projectData.managerId },
    select: { id: true, role: true },
  });

  if (!manager || (manager.role !== Role.PROJECT_MANAGER && manager.role !== Role.ADMIN)) {
    throw new AppError('Manager not found or does not have sufficient privileges.', StatusCodes.BAD_REQUEST);
  }

  const newProject = await prisma.project.create({
    data: {
      ...projectData,
      startDate: projectData.startDate ? new Date(projectData.startDate) : undefined,
      endDate: projectData.endDate ? new Date(projectData.endDate) : undefined,
    },
  });

  clearCache(PROJECT_CACHE_PATTERN);
  return newProject;
}

/**
 * Retrieves all projects.
 * @param userId Optional: if provided, filters projects for MEMBER role (assigned tasks) or PROJECT_MANAGER (managed projects + view others).
 * @param userRole User's role for authorization logic.
 * @returns An array of projects.
 */
export async function getAllProjects(userId: string, userRole: Role): Promise<Project[]> {
  if (userRole === Role.ADMIN) {
    return await prisma.project.findMany({ include: { manager: true } });
  }

  if (userRole === Role.PROJECT_MANAGER) {
    // Project Managers can see all projects, but their own are prioritized implicitly or explicitly.
    // For simplicity, we return all projects, but in a real app, you might distinguish.
    // They can modify projects they manage.
    return await prisma.project.findMany({ include: { manager: true } });
  }

  if (userRole === Role.MEMBER) {
    // Members can only see projects they are involved in (via assigned tasks)
    const projects = await prisma.project.findMany({
      where: {
        tasks: {
          some: {
            assignedToId: userId,
          },
        },
      },
      include: { manager: true },
    });
    return projects;
  }

  return []; // Should not reach here
}

/**
 * Retrieves a single project by ID.
 * @param id Project ID.
 * @returns The project or null if not found.
 */
export async function getProjectById(id: string): Promise<Project | null> {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { manager: true, tasks: { include: { assignedTo: true } } },
  });
  if (!project) {
    throw new AppError('Project not found', StatusCodes.NOT_FOUND);
  }
  return project;
}

/**
 * Updates an existing project.
 * @param id Project ID.
 * @param updateData Data to update.
 * @returns The updated project.
 */
export async function updateProject(id: string, updateData: Partial<Project>): Promise<Project> {
  // Check if managerId is being updated and validate it
  if (updateData.managerId) {
    const newManager = await prisma.user.findUnique({
      where: { id: updateData.managerId },
      select: { id: true, role: true },
    });

    if (!newManager || (newManager.role !== Role.PROJECT_MANAGER && newManager.role !== Role.ADMIN)) {
      throw new AppError('New manager not found or does not have sufficient privileges.', StatusCodes.BAD_REQUEST);
    }
  }

  const updatedProject = await prisma.project.update({
    where: { id },
    data: {
      ...updateData,
      startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
      endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
    },
  });

  clearCache(PROJECT_CACHE_PATTERN);
  clearCache(`/api/v1/projects/${id}`);
  return updatedProject;
}

/**
 * Deletes a project by ID.
 * @param id Project ID.
 */
export async function deleteProject(id: string): Promise<void> {
  const existingProject = await prisma.project.findUnique({ where: { id } });
  if (!existingProject) {
    throw new AppError('Project not found', StatusCodes.NOT_FOUND);
  }

  // Prisma's onDelete: Cascade handles deletion of associated tasks automatically.
  await prisma.project.delete({
    where: { id },
  });
  clearCache(PROJECT_CACHE_PATTERN);
  clearCache(`/api/v1/projects/${id}`);
}
```