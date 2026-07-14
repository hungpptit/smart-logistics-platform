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
  constructor(message: string = 'Yêu cầu không hợp lệ', errors?: any[]) {
    super(400, message, errors);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string = 'Không có quyền truy cập (Chưa đăng nhập hoặc phiên làm việc hết hạn)') {
    super(401, message);
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string = 'Bạn không có quyền truy cập tài nguyên này') {
    super(403, message);
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string = 'Không tìm thấy tài nguyên yêu cầu') {
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
  const message = error.message || 'Có lỗi xảy ra trên hệ thống';
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
