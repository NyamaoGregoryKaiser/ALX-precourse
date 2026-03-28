export class CustomError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    // This is important for ensuring the prototype chain is correct
    // when extending built-in classes like Error.
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}