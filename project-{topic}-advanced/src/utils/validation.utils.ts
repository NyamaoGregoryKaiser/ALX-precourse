```typescript
import Joi from 'joi';
import { UserRole } from '../database/entities/User';
import { DataSourceType } from '../database/entities/DataSource';
import { ChartType } from '../database/entities/Visualization';
import { CustomError } from '../interfaces/error.interface';
import { NextFunction, Request, Response } from 'express';

// Reusable Joi schema options
const joiOptions = {
  abortEarly: false, // include all errors
  allowUnknown: true, // allow unknown keys that will be stripped
  stripUnknown: true // remove unknown keys
};

// --- Auth Schemas ---
export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
  }),
  role: Joi.string().valid(...Object.values(UserRole)).optional().default(UserRole.USER),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// --- Data Source Schemas ---
export const createDataSourceSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  type: Joi.string().valid(...Object.values(DataSourceType)).required(),
  connectionConfig: Joi.object().required().messages({
    'object.base': 'Connection configuration is required',
    'any.required': 'Connection configuration is required',
  }), // Detailed validation for config could be added based on type
  description: Joi.string().max(1000).optional().allow(''),
});

export const updateDataSourceSchema = Joi.object({
  name: Joi.string().min(3).max(255).optional(),
  type: Joi.string().valid(...Object.values(DataSourceType)).optional(),
  connectionConfig: Joi.object().optional(),
  description: Joi.string().max(1000).optional().allow(''),
});

// --- Dataset Schemas ---
export const createDatasetSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  query: Joi.string().min(1).required(),
  schema: Joi.object().optional(),
  description: Joi.string().max(1000).optional().allow(''),
  dataSourceId: Joi.string().uuid().required(),
});

export const updateDatasetSchema = Joi.object({
  name: Joi.string().min(3).max(255).optional(),
  query: Joi.string().min(1).optional(),
  schema: Joi.object().optional(),
  description: Joi.string().max(1000).optional().allow(''),
  dataSourceId: Joi.string().uuid().optional(),
});

// --- Visualization Schemas ---
export const createVisualizationSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  chartType: Joi.string().valid(...Object.values(ChartType)).required(),
  configuration: Joi.object().required(),
  dataMapping: Joi.object().optional(),
  description: Joi.string().max(1000).optional().allow(''),
  datasetId: Joi.string().uuid().required(),
  dashboardId: Joi.string().uuid().optional().allow(null),
});

export const updateVisualizationSchema = Joi.object({
  name: Joi.string().min(3).max(255).optional(),
  chartType: Joi.string().valid(...Object.values(ChartType)).optional(),
  configuration: Joi.object().optional(),
  dataMapping: Joi.object().optional(),
  description: Joi.string().max(1000).optional().allow(''),
  datasetId: Joi.string().uuid().optional(),
  dashboardId: Joi.string().uuid().optional().allow(null),
});

// --- Dashboard Schemas ---
export const createDashboardSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  description: Joi.string().max(1000).optional().allow(''),
  layout: Joi.object().optional(),
});

export const updateDashboardSchema = Joi.object({
  name: Joi.string().min(3).max(255).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  layout: Joi.object().optional(),
});


// --- Generic Validation Middleware ---
export const validate = (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = schema.validate(req.body, joiOptions);

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new CustomError(400, errorMessage));
  }
  // Attach the validated and sanitized body to the request
  req.body = value;
  next();
};
```