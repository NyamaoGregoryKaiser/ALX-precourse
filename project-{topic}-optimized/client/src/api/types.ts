// Common API response structure
export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

// User data
export interface User {
    id: string;
    username: string;
    email: string;
    role?: string;
}

// Auth API types
export interface RegisterPayload {
    username: string;
    email: string;
    password: string;
}

export interface RegisterResponseData {
    id: string;
    username: string;
    email: string;
}

export interface LoginPayload {
    username: string;
    password: string;
}

export interface LoginResponseData {
    id: string;
    username: string;
    email: string;
    token: string;
}

// Dataset API types
export interface ColumnSchema {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'unknown';
}

export interface Dataset {
    id: string;
    name: string;
    description?: string;
    version: string;
    uploadedAt: string;
    schemaJson?: ColumnSchema[];
    fileUrl?: string;
    createdBy?: User;
}

export interface CreateDatasetPayload {
    name: string;
    description?: string;
    file: File; // For file upload
}

export interface UpdateDatasetPayload {
    name?: string;
    description?: string;
    version?: string;
}

// Model API types
export interface MLModel {
    id: string;
    name: string;
    version: string;
    framework?: string;
    type?: string;
    description?: string;
    datasetId?: string;
    metricsJson?: object;
    hyperparametersJson?: object;
    trainedAt: string;
    createdBy?: User;
    dataset?: Dataset;
}

export interface CreateModelPayload {
    name: string;
    version?: string;
    framework?: string;
    type?: string;
    description?: string;
    datasetId?: string;
    metricsJson?: object;
    hyperparametersJson?: object;
}

export interface UpdateModelPayload extends Partial<CreateModelPayload> {}

// Experiment API types
export interface ExperimentRun {
    id: string;
    name: string;
    description?: string;
    modelId?: string;
    datasetId?: string;
    runAt: string;
    parametersJson?: object;
    metricsJson?: object;
    artifactsUrl?: string;
    createdBy?: User;
    model?: MLModel;
    dataset?: Dataset;
}

export interface CreateExperimentPayload {
    name: string;
    description?: string;
    modelId?: string;
    datasetId?: string;
    parametersJson?: object;
    metricsJson?: object;
    artifactsUrl?: string;
}

export interface UpdateExperimentPayload extends Partial<CreateExperimentPayload> {}


// Preprocessing API types
export type TransformationType = 'normalize' | 'standardize' | 'oneHotEncode';
export type OutputFormat = 'csv' | 'json';

export interface PreprocessingPayload {
    file: File;
    transformationType: TransformationType;
    columnName?: string;
    outputFormat: OutputFormat;
}
```