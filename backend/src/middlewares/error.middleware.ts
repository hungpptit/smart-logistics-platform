import { Request, Response, NextFunction } from 'express';

export class HttpException extends Error {
  public status: number;
  public errors?: any[];

  constructor(status: number, message: string, errors?: any[]) {
    super(message);
    this.status = status;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestException extends HttpException {
  constructor(message: string = 'Bad Request', errors?: any[]) {
    super(400, message, errors);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string = 'Not Found') {
    super(404, message);
  }
}

export const errorMiddleware = (
  error: HttpException,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = error.status || 500;
  const message = error.message || 'Something went wrong';
  const errors = error.errors || [];

  console.error(`[Error] ${req.method} ${req.url} - Status: ${status} - Message: ${message}`);
  if (errors.length > 0) {
    console.error('[Validation Errors]', JSON.stringify(errors, null, 2));
  }

  res.status(status).json({
    success: false,
    message,
    data: null,
    errors,
  });
};
