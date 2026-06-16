import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '../utils/jwt';
import { AppDataSource } from '../database/data-source';
import { User } from '../entities/User';
import { HttpException } from '../utils/errorHandler';
import { logger } from '../utils/logger';

// Extend the Request object to include user information
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new HttpException(401, 'Unauthorized: Invalid or missing token');
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyAuthToken(token);

        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOneBy({ id: decoded.userId });

        if (!user) {
            throw new HttpException(401, 'Unauthorized: User not found');
        }

        req.user = user;
        next();
    } catch (error: any) {
        logger.error('Authentication error:', error.message);
        // If it's a JWT error (expired, malformed), specifically handle as 401
        if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
            return next(new HttpException(401, 'Unauthorized: Invalid or expired token'));
        }
        next(error); // Pass other errors to the general error handler
    }
};

export const authorize = (roles: string[] = []) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new HttpException(401, 'Unauthorized: User not authenticated'));
        }

        // Role-based authorization
        if (roles.length > 0 && !roles.includes(req.user.role)) {
            return next(new HttpException(403, 'Forbidden: You do not have permission to perform this action'));
        }

        next();
    };
};

// Ownership authorization example
export const isOwner = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return next(new HttpException(401, 'Unauthorized: User not authenticated'));
        }

        const projectId = req.params.projectId;
        if (!projectId) {
            return next(new HttpException(400, 'Bad Request: Project ID is required'));
        }

        const projectRepository = AppDataSource.getRepository('Project'); // Use string literal for entity
        const project = await projectRepository.findOne({
            where: { id: projectId },
            relations: ['owner']
        });

        if (!project) {
            return next(new HttpException(404, 'Project not found'));
        }

        if (project.owner.id !== req.user.id && req.user.role !== 'admin') {
            return next(new HttpException(403, 'Forbidden: You do not own this project'));
        }

        next();
    } catch (error) {
        logger.error('Ownership authorization error:', error);
        next(error);
    }
};

export const isTaskOwnerOrAssignee = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return next(new HttpException(401, 'Unauthorized: User not authenticated'));
        }

        const taskId = req.params.taskId;
        const projectId = req.params.projectId;

        if (!taskId || !projectId) {
            return next(new HttpException(400, 'Bad Request: Task ID and Project ID are required'));
        }

        const taskRepository = AppDataSource.getRepository('Task');
        const task = await taskRepository.findOne({
            where: { id: taskId, projectId: projectId },
            relations: ['project', 'project.owner', 'assignee']
        });

        if (!task) {
            return next(new HttpException(404, 'Task not found within this project'));
        }

        // Check if user is project owner OR task assignee OR admin
        const isOwner = task.project.owner.id === req.user.id;
        const isAssignee = task.assignee && task.assignee.id === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAssignee && !isAdmin) {
            return next(new HttpException(403, 'Forbidden: You are not authorized to access this task'));
        }

        next();
    } catch (error) {
        logger.error('Task authorization error:', error);
        next(error);
    }
};