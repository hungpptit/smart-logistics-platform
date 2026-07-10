import { Request, Response, NextFunction } from 'express';
import { RoutingService } from '../services/routing/routing.service';

export class RoutingController {
  private routingService = new RoutingService();

  public optimize = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { facilityId } = req.body;
      const creatorId = (req as any).user?.id;

      if (!facilityId) {
        return res.status(400).json({
          success: false,
          message: 'Trường facilityId là bắt buộc',
        });
      }

      const routes = await this.routingService.optimizeRoutesForFacility(facilityId, creatorId);

      return res.status(200).json({
        success: true,
        message: 'Tối ưu lộ trình và điều phối tài xế thành công',
        data: routes,
      });
    } catch (error) {
      next(error);
    }
  };
}
