import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { BadRequestException } from './error.middleware';

export const validationMiddleware = (type: any, skipMissingProperties = false) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const dtoInstance = plainToInstance(type, req.body);
    const errors: ValidationError[] = await validate(dtoInstance, { skipMissingProperties });

    if (errors.length > 0) {
      const formattedErrors = errors.map((error: ValidationError) => ({
        field: error.property,
        constraints: Object.values(error.constraints || {}),
      }));
      next(new BadRequestException('Validation failed', formattedErrors));
    } else {
      req.body = dtoInstance;
      next();
    }
  };
};
