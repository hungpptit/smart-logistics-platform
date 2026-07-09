import { Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { RequestWithUser } from '../middlewares/auth.middleware';
import { OrderChangeSource } from '@prisma/client';

export class OrderController {
  private orderService = new OrderService();

  public create = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id!;
      const roles = req.user?.roles || [];
      const result = await this.orderService.createOrder(userId, roles, req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo đơn hàng vận chuyển thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getAll = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id!;
      const roles = req.user?.roles || [];
      const result = await this.orderService.getOrders(userId, roles, req.query);
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách đơn hàng thành công',
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id!;
      const roles = req.user?.roles || [];
      const result = await this.orderService.getOrderById(req.params.id, userId, roles);
      res.status(200).json({
        success: true,
        message: 'Lấy thông tin chi tiết đơn hàng thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateStatus = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id!;
      const roles = req.user?.roles || [];
      const changeSource = OrderChangeSource.ADMIN;
      const result = await this.orderService.updateStatus(req.params.id, req.body, userId, roles, changeSource);
      res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái đơn hàng thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public cancel = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id!;
      const roles = req.user?.roles || [];
      const result = await this.orderService.cancelOrder(req.params.id, userId, roles);
      res.status(200).json({
        success: true,
        message: 'Hủy đơn hàng thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
