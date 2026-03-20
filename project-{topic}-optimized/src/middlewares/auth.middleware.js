const jwt = require('jsonwebtoken');
const config = require('../config');
const { USER_ROLES } = require('../config/constants');
const logger = require('../utils/logger');
const prisma = require('../../prisma/client');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required: No token provided or malformed token.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    // Attach user information to the request
    req.user = {
      id: decoded.sub,
      role: decoded.role
    };

    // Optional: Fetch full user from DB to ensure they still exist and token isn't revoked
    // For this example, we trust the JWT payload for simplicity, assuming no token revocation mechanism is implemented.
    // If you need more robust security, verify against a user session or token blacklist.
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      return res.status(401).json({ message: 'Authentication failed: User not found.' });
    }
    req.user.details = user; // Attach full user details for more granular authorization if needed

    next();
  } catch (error) {
    logger.error('Authentication error:', error.message);
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Authentication failed: Token expired.' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Authentication failed: Invalid token.' });
    }
    next(error); // Pass other errors to the error handling middleware
  }
};

const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      // This should ideally not happen if authenticate runs first
      return res.status(403).json({ message: 'Authorization required: User role not found.' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Authorization failed: You do not have permission to perform this action.' });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize
};