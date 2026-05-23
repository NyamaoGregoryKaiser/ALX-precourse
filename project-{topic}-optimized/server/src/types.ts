import { Request } from 'express';
import { User } from './modules/auth/entities/User';

// Extend the Express Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: User; // Optional user object added by auth middleware
      file?: Multer.File; // For file uploads
      files?: Multer.File[]; // For multiple file uploads
    }
  }
}

// Define DTO interfaces (Data Transfer Objects) for better type safety and validation clarity
export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface CreateDatasetDto {
  name: string;
  description?: string;
}

export interface UpdateDatasetDto {
  name?: string;
  description?: string;
  version?: string;
  schemaJson?: object;
  fileUrl?: string;
}

export interface CreateModelDto {
  name: string;
  version?: string;
  framework?: string;
  type?: string;
  description?: string;
  datasetId?: string;
  metricsJson?: object;
  hyperparametersJson?: object;
}

export interface UpdateModelDto extends Partial<CreateModelDto> {}

export interface CreateExperimentDto {
  name: string;
  description?: string;
  modelId?: string;
  datasetId?: string;
  parametersJson?: object;
  metricsJson?: object;
  artifactsUrl?: string;
}

export interface UpdateExperimentDto extends Partial<CreateExperimentDto> {}

export type TransformationType = 'normalize' | 'standardize' | 'oneHotEncode';

export interface PreprocessingTransformDto {
  transformationType: TransformationType;
  columnName?: string; // Required for single-column transformations
  outputFormat?: 'csv' | 'json';
  // Add other transformation-specific parameters here as needed
}

export interface AuthTokenPayload {
  id: string;
  username: string;
  email: string;
  role: string;
}
```