import { Request, Response, NextFunction } from 'express';
import { ShipmentService } from '../services/shipment.service';
import { RequestWithUser } from '../middlewares/auth.middleware';
import { getTrackingGateway } from '../gateways/tracking.gateway';

export class ShipmentController {
  private shipmentService = new ShipmentService();

  public create = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      // req.user comes from authMiddleware
      const creatorId = req.user?.id!;
      const result = await this.shipmentService.createShipment(creatorId, req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo vận đơn và gom hàng thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.shipmentService.getShipments(req.query);
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách vận đơn thành công',
        data: result.shipments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.shipmentService.getShipmentById(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Lấy thông tin chi tiết vận đơn thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateStatus = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id!;
      const result = await this.shipmentService.updateShipmentStatus(req.params.id, userId, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái vận đơn thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.shipmentService.deleteShipment(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Xóa vận đơn thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public loadTote = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driverUserId = req.user?.id!;
      const { toteCode } = req.body;
      if (!toteCode) {
        res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã Sọt Hàng (toteCode).' });
        return;
      }
      const result = await this.shipmentService.loadToteIntoShipment(driverUserId, toteCode);
      getTrackingGateway()?.broadcastRoutesUpdated();
      res.status(200).json({
        success: true,
        message: 'Tài xế đã tiếp nhận Sọt Hàng và gán vào Chuyến Xe Tải thành công!',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
