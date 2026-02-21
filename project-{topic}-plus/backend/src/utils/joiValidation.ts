```typescript
import Joi from 'joi';

// User Schemas
export const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(), // Add strong password requirements in production
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Data Source Schemas (simplified for CSV)
export const createDataSourceSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  type: Joi.string().valid('csv', 'database').required(), // Add other types later
  configuration: Joi.object().optional(), // For DB connection strings etc.
  description: Joi.string().max(255).optional().allow(''),
});

export const updateDataSourceSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  type: Joi.string().valid('csv', 'database').optional(),
  configuration: Joi.object().optional(),
  description: Joi.string().max(255).optional().allow(''),
});

// Dashboard Schemas
export const createDashboardSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(255).optional().allow(''),
});

export const updateDashboardSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(255).optional().allow(''),
});

// Chart Schemas
export const createChartSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  type: Joi.string().valid('bar', 'line', 'pie', 'scatterplot').required(),
  dashboardId: Joi.string().uuid().required(),
  dataSourceId: Joi.string().uuid().required(),
  configuration: Joi.object().required(), // e.g., { xAxis: 'columnA', yAxis: 'columnB' }
  description: Joi.string().max(255).optional().allow(''),
});

export const updateChartSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  type: Joi.string().valid('bar', 'line', 'pie', 'scatterplot').optional(),
  dashboardId: Joi.string().uuid().optional(),
  dataSourceId: Joi.string().uuid().optional(),
  configuration: Joi.object().optional(),
  description: Joi.string().max(255).optional().allow(''),
});

// Middleware for Joi validation
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[property]);
    if (error) {
      const { details } = error;
      const message = details.map((i) => i.message).join(',');
      throw new AppError(message, 400); // Bad Request
    }
    next();
  };
};
```