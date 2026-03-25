import { Request, Response, NextFunction } from 'express';

// Utility function to wrap async controller methods and catch errors
export function catchAsync(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}