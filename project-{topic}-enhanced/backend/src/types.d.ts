import { Request } from 'express';
import { UserRole } from './entities/User';

// Extend the Express Request type to include the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export type CacheConfig = {
  store: 'memory' | 'redis';
  ttl: number; // Time to live in seconds
  max?: number; // Max items for memory store
  host?: string; // For redis
  port?: number; // For redis
};

export type APIResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  statusCode?: number;
};