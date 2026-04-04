```typescript
import { Response } from 'express';
import httpStatus from 'http-status';

// This is a utility for consistent API response formatting
// In this project, we primarily use direct res.status().json() in controllers for simplicity,
// but this utility can be integrated for more complex response structures.

interface ApiResponseOptions<T> {
  statusCode?: number;
  message?: string;
  data?: T;
  token?: string;
}

class ApiResponse<T> {
  public statusCode: number;
  public message: string;
  public data: T | null;
  public token?: string;
  public success: boolean;

  constructor({ statusCode = httpStatus.OK, message = 'Success', data = null as T | null, token }: ApiResponseOptions<T>) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.token = token;
    this.success = statusCode < 400; // Indicate success for 2xx responses
  }

  send(res: Response): Response {
    return res.status(this.statusCode).json({
      message: this.message,
      data: this.data,
      token: this.token,
      success: this.success,
    });
  }
}

// Factory functions for common responses
export const successResponse = <T>(res: Response, data: T, message = 'Success', statusCode = httpStatus.OK): Response => {
  return new ApiResponse({ statusCode, message, data }).send(res);
};

export const createdResponse = <T>(res: Response, data: T, message = 'Created successfully', statusCode = httpStatus.CREATED): Response => {
  return new ApiResponse({ statusCode, message, data }).send(res);
};

export const authSuccessResponse = <T>(res: Response, data: T, token: string, message = 'Authentication successful', statusCode = httpStatus.OK): Response => {
  return new ApiResponse({ statusCode, message, data, token }).send(res);
};
```