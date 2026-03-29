import { User } from '@/entities/User';

export interface IJwtPayload {
  userId: string;
  username: string;
  roles: string[];
  permissions: string[];
}

export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
}

// Extend Request to include user information from authentication middleware
declare global {
  namespace Express {
    interface Request {
      user?: User; // The full user object (excluding password if configured by entity)
      userId?: string; // Just the user ID
      roles?: string[]; // Roles associated with the user
      permissions?: string[]; // Permissions associated with the user
    }
  }
}