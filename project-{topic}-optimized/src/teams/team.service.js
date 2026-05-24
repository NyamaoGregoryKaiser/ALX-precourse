import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';
import { Role } from '@prisma/client';

/**
 * Creates a new team.
 * @param {object} teamData - Data for the new team (name, description).
 * @param {string} creatorId - ID of the user creating the team.
 * @returns {Promise<object>} Created team object.
 * @throws {AppError} If team name already exists.
 */
const createTeam = async (teamData, creatorId) => {
  const { name, description } = teamData;

  const existingTeam = await prisma.team.findUnique({ where: { name } });
  if (existingTeam) {
    throw new AppError('Team with this name already exists.', 409);
  }

  const newTeam = await prisma.team.create({
    data: {
      name,
      description,
      members: {
        create: {
          userId: creatorId,
          role: Role.MANAGER, // Creator becomes a manager of the team
        },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, email: true } } },
      },
    },
  });
  logger.info(`Team created: ${newTeam.name} by user ${creatorId}`);
  return newTeam;
};

/**
 * Retrieves all teams.
 * @param {object} queryOptions - Options for filtering, sorting, pagination.
 * @returns {Promise<Array>} List of teams.
 */
const getAllTeams = async (queryOptions) => {
  const teams = await prisma.team.findMany({
    ...queryOptions,
    include: {
      _count: {
        select: { members: true, projects: true },
      },
    },
  });
  return teams;
};

/**
 * Retrieves a single team by ID.
 * @param {string} teamId - ID of the team.
 * @returns {Promise<object>} Team object.
 * @throws {AppError} If team not found.
 */
const getTeamById = async (teamId) => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        select: {
          user: { select: { id: true, username: true, email: true, firstName: true, lastName: true } },
          role: true,
        },
      },
      projects: {
        select: { id: true, name: true, description: true, status: true },
      },
    },
  });

  if (!team) {
    throw new AppError('Team not found.', 404);
  }
  return team;
};

/**
 * Updates a team.
 * @param {string} teamId - ID of the team to update.
 * @param {object} updateData - Data to update.
 * @returns {Promise<object>} Updated team object.
 * @throws {AppError} If team not found or name already exists.
 */
const updateTeam = async (teamId, updateData) => {
  const team = await prisma.team.findUnique({ where: { id: teamId } });

  if (!team) {
    throw new AppError('Team not found.', 404);
  }

  if (updateData.name && updateData.name !== team.name) {
    const existingTeam = await prisma.team.findUnique({ where: { name: updateData.name } });
    if (existingTeam) {
      throw new AppError('Team name already taken.', 409);
    }
  }

  const updatedTeam = await prisma.team.update({
    where: { id: teamId },
    data: updateData,
  });
  logger.info(`Team updated: ${updatedTeam.name}`);
  return updatedTeam;
};

/**
 * Deletes a team.
 * @param {string} teamId - ID of the team to delete.
 * @returns {Promise<void>}
 * @throws {AppError} If team not found.
 */
const deleteTeam = async (teamId) => {
  const team = await prisma.team.findUnique({ where: { id: teamId } });

  if (!team) {
    throw new AppError('Team not found.', 404);
  }

  // Prisma will automatically handle cascading deletes for TeamMembers and Projects
  // if onDelete: Cascade is set in the schema.
  await prisma.team.delete({ where: { id: teamId } });
  logger.info(`Team deleted: ${teamId}`);
};

/**
 * Adds a member to a team.
 * @param {string} teamId - ID of the team.
 * @param {string} userId - ID of the user to add.
 * @param {Role} memberRole - Role of the member within the team (default: USER).
 * @returns {Promise<object>} The new team member record.
 * @throws {AppError} If team or user not found, or user is already a member.
 */
const addTeamMember = async (teamId, userId, memberRole = Role.USER) => {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    throw new AppError('Team not found.', 404);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const existingMember = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  if (existingMember) {
    throw new AppError('User is already a member of this team.', 409);
  }

  const newMember = await prisma.teamMember.create({
    data: {
      teamId,
      userId,
      role: memberRole,
    },
    include: {
      user: { select: { id: true, username: true, email: true } },
    },
  });
  logger.info(`User ${user.username} added to team ${team.name} as ${memberRole}`);
  return newMember;
};

/**
 * Removes a member from a team.
 * @param {string} teamId - ID of the team.
 * @param {string} userId - ID of the user to remove.
 * @returns {Promise<void>}
 * @throws {AppError} If team or member not found.
 */
const removeTeamMember = async (teamId, userId) => {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    throw new AppError('Team not found.', 404);
  }

  const existingMember = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  if (!existingMember) {
    throw new AppError('User is not a member of this team.', 404);
  }

  await prisma.teamMember.delete({
    where: { userId_teamId: { userId, teamId } },
  });
  logger.info(`User ${userId} removed from team ${team.name}`);
};

/**
 * Updates a member's role within a team.
 * @param {string} teamId - ID of the team.
 * @param {string} userId - ID of the user whose role to update.
 * @param {Role} newRole - The new role for the member.
 * @returns {Promise<object>} The updated team member record.
 * @throws {AppError} If team or member not found, or new role is invalid.
 */
const updateTeamMemberRole = async (teamId, userId, newRole) => {
  if (!Object.values(Role).includes(newRole)) {
    throw new AppError('Invalid role specified.', 400);
  }

  const existingMember = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  if (!existingMember) {
    throw new AppError('User is not a member of this team.', 404);
  }

  const updatedMember = await prisma.teamMember.update({
    where: { id: existingMember.id },
    data: { role: newRole },
    include: {
      user: { select: { id: true, username: true, email: true } },
    },
  });
  logger.info(`User ${userId} role updated to ${newRole} in team ${teamId}`);
  return updatedMember;
};


export default {
  createTeam,
  getAllTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
};
```

```javascript