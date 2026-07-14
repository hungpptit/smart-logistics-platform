import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export class SettingController {
  /**
   * Fetches the dynamic GPS tracking interval configured in the system settings.
   */
  public getGPSInterval = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { settingKey: 'GPS_INTERVAL_SECONDS' },
      });

      const intervalSeconds = setting && setting.isActive ? parseInt(setting.settingValue, 10) : 10;

      res.status(200).json({
        success: true,
        gpsIntervalSeconds: isNaN(intervalSeconds) ? 10 : intervalSeconds,
      });
    } catch (error) {
      console.error('[SettingController] Error fetching GPS interval settings:', error);
      res.status(200).json({
        success: true,
        gpsIntervalSeconds: 10, // Default fallback
      });
    }
  };

  /**
   * Fetches all active system configurations.
   */
  public getAllSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const settings = await prisma.systemSetting.findMany({
        where: { isActive: true },
      });
      res.status(200).json({
        success: true,
        settings,
      });
    } catch (error) {
      next(error);
    }
  };
}
