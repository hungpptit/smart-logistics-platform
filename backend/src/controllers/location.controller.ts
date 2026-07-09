import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { GeocodingService } from '../services/geocoding.service';

const geocodingService = new GeocodingService();

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

  public geocodeAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { address } = req.query;
      if (!address || typeof address !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Address parameter is required and must be a string',
        });
        return;
      }

      const result = await geocodingService.geocode(address);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
