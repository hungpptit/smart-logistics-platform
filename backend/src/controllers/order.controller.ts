import { Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { PricingService } from '../services/pricing/pricing.service';
import { RequestWithUser } from '../middlewares/auth.middleware';
import { OrderChangeSource } from '@prisma/client';
import { prisma } from '../config/prisma';
import { UnauthorizedException, NotFoundException } from '../middlewares/error.middleware';

export class OrderController {
  private orderService = new OrderService();
  private pricingService = new PricingService();

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

  public getByCode = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedException('Yêu cầu xác thực tài khoản');
      }
      const { code } = req.params;
      const order = await prisma.order.findUnique({
        where: { orderCode: code },
        select: { id: true },
      });
      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng tương ứng');
      }
      const result = await this.orderService.getOrderById(order.id, req.user.id, req.user.roles);
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

  public pay = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id!;
      const roles = req.user?.roles || [];
      const { paymentMethod } = req.body;
      if (!paymentMethod) {
        res.status(400).json({ success: false, message: 'Vui lòng chọn phương thức thanh toán.' });
        return;
      }
      const result = await this.orderService.payOrder(req.params.id, paymentMethod, userId, roles);
      res.status(200).json({
        success: true,
        message: 'Thanh toán đơn hàng thành công!',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public calculatePricing = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { serviceCode, distanceKm, totalWeightKg, isFragile, codAmount } = req.body;
      if (!serviceCode) {
        res.status(400).json({ success: false, message: 'Thiếu mã dịch vụ vận chuyển (serviceCode).' });
        return;
      }
      const result = await this.pricingService.calculatePrice(
        serviceCode,
        Number(distanceKm || 0),
        Number(totalWeightKg || 0),
        !!isFragile,
        Number(codAmount || 0)
      );
      res.status(200).json({
        success: true,
        message: 'Tính cước phí thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
