import { Request, Response, NextFunction } from 'express';

// Higher-order function to wrap async route handlers
// This avoids repetitive try-catch blocks in controllers
type AsyncFunction = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const catchAsync = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};