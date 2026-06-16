import { User } from '../entities/User';

// Extend the Express Request type to include our custom properties
declare global {
    namespace Express {
        interface Request {
            user?: User; // Authenticated user object
            // Add other custom properties if needed, e.g.,
            // requestId?: string;
        }
    }
}