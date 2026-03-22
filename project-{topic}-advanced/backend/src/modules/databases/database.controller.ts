```typescript
import { Request, Response, NextFunction } from 'express';
import * as databaseService from './database.service';
import { CustomError } from '../../utils/error';
import { DatabaseType } from '../../entities/Database';

/**
 * Create a new database entry to monitor.
 * @route POST /api/v1/databases
 */
export const createDatabase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type, connectionString, description } = req.body;
    if (!req.user) {
        throw new CustomError('User not authenticated.', 401);
    }
    const database = await databaseService.createDatabase(req.user, { name, type, connectionString, description });
    res.status(201).json({ success: true, message: 'Database registered successfully.', data: database });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all databases owned by the authenticated user (or all if admin).
 * @route GET /api/v1/databases
 */
export const getAllDatabases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new CustomError('User not authenticated.', 401);
    }
    const databases = await databaseService.getDatabases(req.user);
    res.status(200).json({ success: true, data: databases });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single database by ID.
 * @route GET /api/v1/databases/:id
 */
export const getDatabaseById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!req.user) {
      throw new CustomError('User not authenticated.', 401);
    }
    const database = await databaseService.getDatabaseById(id, req.user);
    if (!database) {
      throw new CustomError('Database not found or you do not have permission to view it.', 404);
    }
    res.status(200).json({ success: true, data: database });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a database entry.
 * @route PUT /api/v1/databases/:id
 */
export const updateDatabase = async (req: Request, res: NextFunction, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, type, connectionString, description } = req.body;
    if (!req.user) {
      throw new CustomError('User not authenticated.', 401);
    }
    const updatedDatabase = await databaseService.updateDatabase(id, req.user, { name, type, connectionString, description });
    res.status(200).json({ success: true, message: 'Database updated successfully.', data: updatedDatabase });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a database entry.
 * @route DELETE /api/v1/databases/:id
 */
export const deleteDatabase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!req.user) {
      throw new CustomError('User not authenticated.', 401);
    }
    await databaseService.deleteDatabase(id, req.user);
    res.status(200).json({ success: true, message: 'Database deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
```

#### `backend/src/modules/databases/database.service.ts`