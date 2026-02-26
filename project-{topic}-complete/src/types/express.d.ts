import { UserRole } from '../database/entities/User.entity';

// To extend the Request interface provided by Express
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