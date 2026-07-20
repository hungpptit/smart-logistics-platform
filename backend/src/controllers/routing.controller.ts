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

  public getRoutes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, facilityId, driverId } = req.query;
      const routes = await this.routingService.getAllRoutes({
        status: status as string,
        facilityId: facilityId as string,
        driverId: driverId as string,
      });

      return res.status(200).json({
        success: true,
        data: routes,
      });
    } catch (error) {
      next(error);
    }
  };

  public getRouteById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const routeDetail = await this.routingService.getRouteDetail(id);

      return res.status(200).json({
        success: true,
        data: routeDetail,
      });
    } catch (error) {
      next(error);
    }
  };

  public devReset = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { facilityId } = req.body;
      const result = await this.routingService.resetFacilityAi(facilityId);

      return res.status(200).json({
        success: true,
        message: '🔄 Hoàn tác dữ liệu AI về trạng thái ban đầu thành công!',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

