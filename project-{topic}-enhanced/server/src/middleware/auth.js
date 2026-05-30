const passport = require('passport');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { roles } = require('../config/roles');
const { verifyToken } = require('../services/token.service');
const { User } = require('../models');
const config = require('../config/config');
const { tokenTypes } = require('../config/tokens');
const redisClient = require('../utils/redis');
const logger = require('../utils/logger');

const verifyCallback = (req, resolve, reject, requiredRights) => async (err, user, info) => {
  if (err || info || !user) {
    logger.warn(`Authentication failed: ${info?.message || 'No user found'}`);
    return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }

  req.user = user;

  // Check if token is blacklisted (for refresh tokens upon logout)
  if (req.token) { // req.token is set by jwtStrategy from passport
    const isBlacklisted = await redisClient.get(`bl:${req.token}`);
    if (isBlacklisted) {
      logger.warn(`Blacklisted token used: ${req.token}`);
      return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Token blacklisted. Please login again.'));
    }
  }


  if (requiredRights.length) {
    const userRights = roles.roleRights.get(user.role);
    const hasRequiredRights = requiredRights.every((requiredRight) => userRights.includes(requiredRight));
    if (!hasRequiredRights && req.params.userId !== user.id) {
      logger.warn(`User ${user.id} (${user.role}) attempted unauthorized access to resource requiring rights: ${requiredRights.join(', ')}`);
      return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    }
  }

  resolve();
};

const auth = (...requiredRights) => async (req, res, next) => {
  return new Promise((resolve, reject) => {
    // Custom JWT strategy to extract token from bearer header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return reject(new ApiError(httpStatus.UNAUTHORIZED, 'No token provided. Please authenticate.'));
    }

    verifyToken(token, tokenTypes.ACCESS)
      .then(async (payload) => {
        const user = await User.findByPk(payload.sub);
        if (!user) {
          logger.warn(`User with ID ${payload.sub} not found for token.`);
          return reject(new ApiError(httpStatus.UNAUTHORIZED, 'User not found for token.'));
        }
        req.user = user;
        req.token = token; // Store token in request for blacklist check

        // Check for required rights
        if (requiredRights.length) {
          const userRights = roles.roleRights.get(user.role);
          const hasRequiredRights = requiredRights.every((requiredRight) => userRights.includes(requiredRight));
          const isOwner = req.params.userId === user.id; // Allow user to access their own resources
          const isProjectOwnerOfResource = req.params.projectId && await user.getOwnedProjects({ where: { id: req.params.projectId } }).then(p => p.length > 0);
          const isTaskOwnerOfResource = req.params.taskId && await User.findOne({
            include: [{
              model: Task, as: 'assignedTasks', where: { id: req.params.taskId }
            }]
          }).then(u => u && u.id === user.id); // Example, actual implementation may vary

          if (!hasRequiredRights && !isOwner && !isProjectOwnerOfResource && !isTaskOwnerOfResource) {
            logger.warn(`User ${user.id} (${user.role}) attempted unauthorized access to resource requiring rights: ${requiredRights.join(', ')}`);
            return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden: Insufficient rights or not resource owner.'));
          }
        }
        resolve();
      })
      .catch((error) => {
        logger.error(`Token verification failed: ${error.message}`);
        reject(new ApiError(httpStatus.UNAUTHORIZED, `Authentication failed: ${error.message}`));
      });
  })
    .then(() => next())
    .catch((err) => next(err));
};

module.exports = auth;