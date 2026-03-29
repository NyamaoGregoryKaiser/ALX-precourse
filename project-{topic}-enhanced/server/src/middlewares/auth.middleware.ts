import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '@/config/database';
import { User } from '@/entities/User';
import { Role } from '@/entities/Role';
import { Permission } from '@/entities/Permission';
import { UserRole } from '@/entities/UserRole';
import { RolePermission } from '@/entities/RolePermission';
import { IJwtPayload } from '@/interfaces/auth.interface';
import { config } from '@/config';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import logger from '@/utils/logger';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'No token provided or invalid format.'));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication token missing.'));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as IJwtPayload;

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: decoded.userId },
      relations: [
        'userRoles',
        'userRoles.role',
        'userRoles.role.rolePermissions',
        'userRoles.role.rolePermissions.permission',
      ],
    });

    if (!user) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'User not found.'));
    }

    // Assign user, roles, and permissions to request object
    req.user = user;
    req.userId = user.id;

    // Build roles and permissions for granular access control
    const roles: Set<string> = new Set();
    const permissions: Set<string> = new Set();

    user.userRoles.forEach(userRole => {
      if (userRole.role) {
        roles.add(userRole.role.name);
        userRole.role.rolePermissions.forEach(rp => {
          if (rp.permission) {
            permissions.add(rp.permission.name);
          }
        });
      }
    });

    req.roles = Array.from(roles);
    req.permissions = Array.from(permissions);

    next();
  } catch (error: any) {
    logger.error(`Authentication error: ${error.message}`);
    if (error instanceof jwt.TokenExpiredError) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Access token expired.'));
    }
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token.'));
  }
};

export const authorize = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.permissions) {
      return next(new ApiError(httpStatus.FORBIDDEN, 'User not authenticated or permissions not loaded.'));
    }

    const hasPermission = requiredPermissions.some(permission => req.permissions!.includes(permission));

    if (!hasPermission) {
      logger.warn(`User ${req.user.username} (ID: ${req.userId}) attempted to access forbidden resource. Missing permissions: ${requiredPermissions.join(', ')}`);
      return next(new ApiError(httpStatus.FORBIDDEN, 'You do not have the necessary permissions to access this resource.'));
    }
    next();
  };
};

export const authorizeRoles = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.roles) {
      return next(new ApiError(httpStatus.FORBIDDEN, 'User not authenticated or roles not loaded.'));
    }

    const hasRole = requiredRoles.some(role => req.roles!.includes(role));

    if (!hasRole) {
      logger.warn(`User ${req.user.username} (ID: ${req.userId}) attempted to access forbidden resource. Missing roles: ${requiredRoles.join(', ')}`);
      return next(new ApiError(httpStatus.FORBIDDEN, 'You do not have the necessary role(s) to access this resource.'));
    }
    next();
  };
};