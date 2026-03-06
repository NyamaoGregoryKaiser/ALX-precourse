```javascript
import jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import config from '../config/index.js';
import { PrismaClient } from '@prisma/client';
import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';

const prisma = new PrismaClient();

/**
 * Express middleware for authenticating JWT tokens.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next middleware function.
 */
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Expecting "Bearer TOKEN"

    if (!token) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const payload = jwt.verify(token, config.jwt.secret);

    // Attach user to request
    req.user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!req.user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User not found or token invalid');
    }

    next();
  } catch (error) {
    logger.error('Authentication error:', error.message);
    if (error instanceof jwt.TokenExpiredError) {
      next(new ApiError(httpStatus.UNAUTHORIZED, 'Token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token'));
    } else if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication failed'));
    }
  }
};

export default auth;
```