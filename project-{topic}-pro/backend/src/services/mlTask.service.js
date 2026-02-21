const { MLTask, Project } = require('../db/sequelize');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const mlMath = require('../utils/ml-math');

exports.getAllMLTasks = async (projectId, userId) => {
  const project = await Project.findOne({ where: { id: projectId, userId } });
  if (!project) {
    throw new AppError('Project not found or you do not have permission to access it.', 404);
  }

  const mlTasks = await MLTask.findAll({ where: { projectId } });
  return mlTasks;
};

exports.getMLTaskById = async (projectId, taskId, userId) => {
  const mlTask = await MLTask.findOne({
    where: { id: taskId, projectId },
    include: {
      model: Project,
      as: 'project',
      where: { userId },
      attributes: [], // Don't fetch project details, just use for permission check
    },
  });
  return mlTask;
};

exports.createAndExecuteMLTask = async (projectId, userId, type, inputData, parameters) => {
  const project = await Project.findOne({ where: { id: projectId, userId } });
  if (!project) {
    throw new AppError('Project not found or you do not have permission to access it.', 404);
  }

  let outputData = null;
  let status = 'completed';

  try {
    if (!mlMath[type]) {
      throw new AppError(`Unsupported ML task type: ${type}`, 400);
    }
    outputData = mlMath[type](inputData, parameters);
  } catch (error) {
    status = 'failed';
    logger.error(`Error executing ML task type ${type}: ${error.message}`, error.stack);
    // Include error message in output for failed tasks, or a generic message
    outputData = { error: error.message || 'Task execution failed.' };
  }

  const newMLTask = await MLTask.create({
    projectId,
    type,
    inputData,
    parameters,
    outputData,
    status,
  });

  logger.info(`ML Task '${type}' created for project ${projectId} with status: ${status}`);
  return newMLTask;
};

exports.deleteMLTask = async (projectId, taskId, userId) => {
  const deletedCount = await MLTask.destroy({
    where: {
      id: taskId,
      projectId,
    },
    include: [
      {
        model: Project,
        as: 'project',
        where: { userId },
        attributes: [], // Used for permission check
      },
    ],
  });

  return deletedCount > 0;
};