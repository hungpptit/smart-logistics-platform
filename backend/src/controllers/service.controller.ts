import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export class ServiceController {
  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const services = await prisma.service.findMany({
        where: { isActive: true },
        orderBy: { basePrice: 'asc' },
      });
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách gói dịch vụ thành công',
        data: services,
      });
    } catch (error) {
      next(error);
    }
  };
}
