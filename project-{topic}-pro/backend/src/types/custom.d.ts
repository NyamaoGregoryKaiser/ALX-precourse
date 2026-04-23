import { JwtPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      // Add other custom properties to Request object if needed
      cacheKey?: string;
    }
  }
}