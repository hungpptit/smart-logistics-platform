import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';

export class AnalyticsController {
  /**
   * Get overview statistics for Analytics Dashboard
   * GET /api/v1/analytics/overview
   */
  public getOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { timeRange, facilityId } = req.query;
      const data = await analyticsService.getOverview({
        timeRange: timeRange as string,
        facilityId: facilityId as string,
      });

      res.status(200).json({
        success: true,
        message: 'Lấy dữ liệu thống kê báo cáo thành công',
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const analyticsController = new AnalyticsController();
