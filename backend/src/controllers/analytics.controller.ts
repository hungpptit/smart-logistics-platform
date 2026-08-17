import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { prisma } from '../config/prisma';

export class AnalyticsController {
  /**
   * Get overview statistics for Analytics Dashboard
   * GET /api/v1/analytics/overview
   */
  public getOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { timeRange, facilityId } = req.query;
      const user = (req as any).user;

      let filterFacilityId = facilityId as string;

      const isAdmin = user?.roles?.includes('ADMIN');
      const isStaff = user?.roles?.includes('STAFF') && !isAdmin;

      if (isStaff && user?.id) {
        const staffProfile = await prisma.staff.findUnique({
          where: { userId: user.id },
        });
        if (staffProfile?.assignedFacilityId) {
          filterFacilityId = staffProfile.assignedFacilityId;
        }
      }

      const data = await analyticsService.getOverview({
        timeRange: timeRange as string,
        facilityId: filterFacilityId,
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
