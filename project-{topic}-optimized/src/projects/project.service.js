import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';

/**
 * Creates a new project.
 * @param {object} projectData - Data for the new project.
 * @param {string} ownerId - ID of the user creating/owning the project.
 * @returns {Promise<object>} Created project object.
 * @throws {AppError} If project name already exists for the owner/team.
 */
const createProject = async (projectData, ownerId) => {
  const { name, teamId } = projectData;

  // Check if project name is unique within the scope of the owner or team
  const existingProject = await prisma.project.findFirst({
    where: {
      name,
      ...(teamId ? { teamId } : { ownerId }), // Unique by name within team or for a specific owner
    },
  });

  if (existingProject) {
    throw new AppError('A project with this name already exists for this team/owner.', 409);
  }

  // If teamId is provided, verify the team exists
  if (teamId) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new AppError('Team not found.', 404);
    }
  }

  const newProject = await prisma.project.create({
    data: {
      ...projectData,
      ownerId,
    },
    include: {
      owner: { select: { id: true, username: true } },
      team: { select: { id: true, name: true } },
    },
  });
  logger.info(`Project created: ${newProject.name} by user ${ownerId}`);
  return newProject;
};

/**
 * Retrieves all projects.
 * @param {object} queryOptions - Options for filtering, sorting, pagination.
 * @returns {Promise<Array>} List of projects.
 */
const getAllProjects = async (queryOptions) => {
  const projects = await prisma.project.findMany({
    ...queryOptions,
    include: {
      owner: { select: { id: true, username: true, email: true } },
      team: { select: { id: true, name: true } },
      _count: {
        select: { tasks: true },
      },
    },
  });
  return projects;
};

/**
 * Retrieves a single project by ID.
 * @param {string} projectId - ID of the project.
 * @returns {Promise<object>} Project object.
 * @throws {AppError} If project not found.
 */
const getProjectById = async (projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { id: true, username: true, email: true } },
      team: { select: { id: true, name: true } },
      tasks: { // Include tasks related to the project
        select: { id: true, title: true, status: true, dueDate: true, assignee: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project) {
    throw new AppError('Project not found.', 404);
  }
  return project;
};

/**
 * Updates a project.
 * @param {string} projectId - ID of the project to update.
 * @param {object} updateData - Data to update.
 * @returns {Promise<object>} Updated project object.
 * @throws {AppError} If project not found or name already exists.
 */
const updateProject = async (projectId, updateData) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    throw new AppError('Project not found.', 404);
  }

  // Check for duplicate name within team or for the owner if name or teamId changes
  if (updateData.name && updateData.name !== project.name || (updateData.teamId && updateData.teamId !== project.teamId)) {
    const existingProject = await prisma.project.findFirst({
      where: {
        name: updateData.name || project.name,
        ...(updateData.teamId ? { teamId: updateData.teamId } : { ownerId: project.ownerId }),
      },
    });
    if (existingProject && existingProject.id !== projectId) {
      throw new AppError('Another project with this name already exists for this team/owner.', 409);
    }
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: updateData,
    include: {
      owner: { select: { id: true, username: true } },
      team: { select: { id: true, name: true } },
    },
  });
  logger.info(`Project updated: ${updatedProject.name}`);
  return updatedProject;
};

/**
 * Deletes a project.
 * @param {string} projectId - ID of the project to delete.
 * @returns {Promise<void>}
 * @throws {AppError} If project not found.
 */
const deleteProject = async (projectId) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    throw new AppError('Project not found.', 404);
  }

  // Prisma will automatically handle cascading deletes for tasks if onDelete: Cascade is set.
  await prisma.project.delete({ where: { id: projectId } });
  logger.info(`Project deleted: ${projectId}`);
};


export default {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
```

```javascript