const { Project, User } = require('../db/sequelize');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

exports.getAllProjects = async (userId) => {
  const projects = await Project.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });
  return projects;
};

exports.getProjectById = async (id, userId) => {
  const project = await Project.findOne({
    where: { id, userId },
  });
  return project;
};

exports.createProject = async (name, description, userId) => {
  const userExists = await User.findByPk(userId);
  if (!userExists) {
    throw new AppError('User not found.', 404);
  }

  const newProject = await Project.create({
    name,
    description,
    userId,
  });
  logger.info(`Project '${name}' created by user ${userId}`);
  return newProject;
};

exports.updateProject = async (id, userId, updateData) => {
  const project = await Project.findOne({ where: { id, userId } });
  if (!project) {
    return null; // Not found or not owned by user
  }

  // Only allow updating name and description
  project.name = updateData.name || project.name;
  project.description = updateData.description !== undefined ? updateData.description : project.description;

  await project.save();
  logger.info(`Project '${project.name}' (${id}) updated by user ${userId}`);
  return project;
};

exports.deleteProject = async (id, userId) => {
  const deletedCount = await Project.destroy({
    where: { id, userId },
  });
  logger.info(`Project ${id} deleted by user ${userId} (count: ${deletedCount})`);
  return deletedCount > 0;
};