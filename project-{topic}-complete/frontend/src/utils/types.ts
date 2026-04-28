export enum Role {
  User = 'user',
  Admin = 'admin',
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  access_token: string;
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  createdById: string;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  version: string;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  deployed: boolean;
  deploymentUrl?: string;
  createdById: string;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface PredictionLog {
  id: string;
  modelId: string;
  model: Model;
  inputData: Record<string, any>;
  outputData: Record<string, any>;
  requestedById: string | null;
  requestedBy: User | null;
  requestedAt: string;
}

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  method: string;
}