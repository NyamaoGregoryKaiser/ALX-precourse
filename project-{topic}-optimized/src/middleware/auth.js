const jwt = require('jsonwebtoken');
const config = require('../config');
const { ApiError } = require('./errorHandler');
const knex = require('knex');
const knexConfig = require('../db/knexfile');
const db = knex(knexConfig[config.env]);

const authenticate = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(401, 'Not authorized, no token provided.'));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await db('users').where({ id: decoded.id }).first();

    if (!user) {
      return next(new ApiError(401, 'Not authorized, user not found.'));
    }

    // Attach user to the request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Authorization token expired.'));
    }
    return next(new ApiError(401, 'Not authorized, token failed.'));
  }
};

const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required for authorization check.'));
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden, you do not have permission to access this resource.'));
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};