/**
 * Custom error class for API-specific errors.
 * Extends Error to include a status code and an optional error name.
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean; // Indicates if the error is operational (e.g., API error) vs. programming (e.g., bug)

  constructor(message: string, statusCode: number, name?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Mark as operational error
    this.name = name || 'AppError'; // Set custom name if provided

    // Capture the stack trace for better debugging
    Error.captureStackTrace(this, this.constructor);
  }
}