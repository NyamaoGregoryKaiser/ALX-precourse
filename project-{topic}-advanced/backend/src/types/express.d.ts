import { UserRole } from '../db/entities/User'; // Adjust path if necessary

// Extend the Express Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        role: UserRole;
      };
    }
  }
}