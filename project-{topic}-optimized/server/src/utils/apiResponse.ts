import { Response } from 'express';

// Base API Response structure
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export class BaseResponse<T> {
  protected statusCode: number;
  protected response: ApiResponse<T>;

  constructor(res: Response, statusCode: number, message: string, data?: T) {
    this.statusCode = statusCode;
    this.response = {
      success: statusCode >= 200 && statusCode < 300,
      message,
      data,
    };
  }

  public send(res: Response): Response {
    return res.status(this.statusCode).json(this.response);
  }
}

export class SuccessResponse<T> extends BaseResponse<T> {
  constructor(res: Response, message: string = 'Operation successful', data?: T) {
    super(res, 200, message, data);
  }
}

export class CreatedResponse<T> extends BaseResponse<T> {
  constructor(res: Response, message: string = 'Resource created successfully', data?: T) {
    super(res, 201, message, data);
  }
}

export class NoDataResponse extends BaseResponse<undefined> {
  constructor(res: Response, message: string = 'Operation successful, no content') {
    super(res, 204, message);
    this.response.data = undefined; // Ensure data is explicitly undefined for 204
  }

  public send(res: Response): Response {
    // For 204 No Content, the response body should be empty
    return res.status(this.statusCode).send();
  }
}
```