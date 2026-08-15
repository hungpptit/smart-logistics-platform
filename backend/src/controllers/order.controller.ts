import { Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { PricingService } from '../services/pricing/pricing.service';
import { RequestWithUser } from '../middlewares/auth.middleware';
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
      const cleanCode = (code || '').trim();
      const baseCode = cleanCode.includes('-PKG-') ? cleanCode.split('-PKG-')[0] : cleanCode;

      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { orderCode: cleanCode },
            { orderCode: baseCode },
            { package: { packageCode: cleanCode } },
            { package: { packageCode: baseCode } },
          ],
        },
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
      const result = await this.orderService.updateStatus(req.params.id, req.body, userId, roles);
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
      const { serviceCode, distanceKm, totalWeightKg, isFragile, codAmount, pickupWardCode, deliveryWardCode } = req.body;
      if (!serviceCode) {
        res.status(400).json({ success: false, message: 'Thiếu mã dịch vụ vận chuyển (serviceCode).' });
        return;
      }
      const result = await this.pricingService.calculatePrice(
        serviceCode,
        Number(distanceKm || 0),
        Number(totalWeightKg || 0),
        !!isFragile,
        Number(codAmount || 0),
        pickupWardCode,
        deliveryWardCode
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

  public assignZone = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = req.body?.code || req.params?.code;
      const { zoneId, toteCode } = req.body;
      const userId = req.user?.id!;
      if (!code) {
        res.status(400).json({ success: false, message: 'Thiếu mã bưu kiện (code).' });
        return;
      }
      if (!zoneId) {
        res.status(400).json({ success: false, message: 'Thiếu mã Phân Khu Kho (zoneId).' });
        return;
      }
      const result = await this.orderService.assignPackageToZone(code, zoneId, userId, toteCode);
      res.status(200).json({
        success: true,
        message: 'Phân loại bưu kiện vào Phân Khu Kho thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getSortingHistory = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id!;
      let facilityId = req.query.facilityId as string | undefined;
      if (!facilityId) {
        const staff = await prisma.staff.findUnique({ where: { userId } });
        facilityId = staff?.assignedFacilityId || undefined;
      }
      const result = await this.orderService.getSortingHistory(userId, facilityId);
      res.status(200).json({
        success: true,
        message: 'Lấy lịch sử phân loại bưu kiện thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getZoneTotes = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id!;
      let facilityId = req.query.facilityId as string | undefined;
      const includeLoaded = req.query.includeLoaded === 'true' || req.query.includeLoaded === '1';
      if (!facilityId) {
        const staff = await prisma.staff.findUnique({ where: { userId } });
        facilityId = staff?.assignedFacilityId || undefined;
      }
      const result = await this.orderService.getZoneTotes(facilityId, includeLoaded);
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách sọt hàng theo phân khu thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getTotePackages = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { toteCode } = req.params;
      const result = await this.orderService.getTotePackages(toteCode);
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách bưu kiện trong sọt thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public sealTote = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { toteCode } = req.body;
      const result = await this.orderService.sealToteBag(toteCode);
      res.status(200).json({
        success: true,
        message: 'Chốt niêm phong Sọt Hàng thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
