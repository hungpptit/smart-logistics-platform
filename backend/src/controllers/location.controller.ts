import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export class LocationController {
  public getProvinces = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const provinces = await prisma.province.findMany({
        orderBy: { name: 'asc' },
      });
      res.status(200).json({
        success: true,
        data: provinces,
      });
    } catch (error) {
      next(error);
    }
  };

  public getWardsByProvince = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { provinceCode } = req.params;
      const wards = await prisma.ward.findMany({
        where: { provinceCode },
        orderBy: { name: 'asc' },
      });
      res.status(200).json({
        success: true,
        data: wards,
      });
    } catch (error) {
      next(error);
    }
  };
}
