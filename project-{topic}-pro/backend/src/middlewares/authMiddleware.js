const jwt = require('jsonwebtoken');
const config = require('../config');
const { ApiError } = require('./errorMiddleware');
const httpStatus = require('http-status');
const User = require('../database/models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication failed - user not found');
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired token'));
    }
    next(error);
  }
};

module.exports = auth;