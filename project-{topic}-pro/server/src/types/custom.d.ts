import { User } from '../database/entities/User'; // Adjust path if needed

declare global {
  namespace Express {
    interface Request {
      user?: User; // Represents the authenticated user
    }
  }
}

// Add this to ensure the file is treated as a module.
export {};