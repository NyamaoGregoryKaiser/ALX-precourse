const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');
const { prisma } = require('../config/db');
const { logger } = require('../config/logger');

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, jwtSecret);

      // Attach user to the request
      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, username: true, role: true } // Exclude password hash
      });

      if (!req.user) {
        logger.warn('User associated with token not found.');
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      logger.error('Token verification failed:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn(`User ${req.user ? req.user.username : 'unknown'} attempted unauthorized access to role-restricted route. Required roles: ${roles.join(', ')}`);
      return res.status(403).json({ message: `User role ${req.user ? req.user.role : 'unknown'} is not authorized to access this route.` });
    }
    next();
  };
};