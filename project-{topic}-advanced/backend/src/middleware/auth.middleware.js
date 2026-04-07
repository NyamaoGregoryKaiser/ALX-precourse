const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const catchAsync = require('../utils/catchAsync');
const { User } = require('../db/models');

const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

const auth = (...requiredRoles) => catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication token missing');
  }

  const payload = verifyToken(token);
  const user = await User.findByPk(payload.sub);

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not found or token invalid');
  }

  // Set user on request object
  req.user = user;

  // Check for required roles
  if (requiredRoles.length && !requiredRoles.includes(user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access forbidden: Insufficient permissions');
  }

  next();
});

module.exports = auth;