import { User } from '../database/entities/User';

declare global {
  namespace Express {
    interface Request {
      user?: User; // Add user property to Request object
    }
  }
}