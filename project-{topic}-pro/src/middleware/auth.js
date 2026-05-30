const jwt = require('jsonwebtoken');
const config = require('../config');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User'); // Assuming you have a User model
const logger = require('../utils/logger');

const auth = (roles = []) => async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided, authorization denied.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Attach user to request
    req.user = await User.query().findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({ message: 'User not found, authorization denied.' });
    }

    // Role-based authorization
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions.' });
    }

    next();
  } catch (error) {
    logger.error('Authentication Error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token. Please log in again.' });
    }
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

module.exports = auth;