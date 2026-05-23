import { Request, Response, NextFunction } from 'express';

// A utility to wrap async route handlers to catch errors and pass them to the error handling middleware
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default asyncHandler;
```