import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service';
import { RequestWithUser } from '../middlewares/auth.middleware';
import { ForbiddenException, UnauthorizedException } from '../middlewares/error.middleware';
import { prisma } from '../config/prisma';

export class CustomerController {
  private customerService = new CustomerService();

  private async checkOwnership(req: RequestWithUser, customerId: string): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException('Yêu cầu xác thực tài khoản');
    }
    if (req.user.roles.includes('ADMIN') || req.user.roles.includes('STAFF')) {
      return;
    }
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });
    if (!customer || customer.userId !== req.user.id) {
      throw new ForbiddenException('Bạn không có quyền truy cập dữ liệu của khách hàng này');
    }
  }

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.customerService.createCustomer(req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo thông tin khách hàng thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.customerService.getCustomers(req.query);
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách khách hàng thành công',
        data: result.customers,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.checkOwnership(req, req.params.id);
      const result = await this.customerService.getCustomerById(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Lấy chi tiết khách hàng thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.checkOwnership(req, req.params.id);
      const result = await this.customerService.updateCustomer(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật khách hàng thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.customerService.deleteCustomer(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Xóa khách hàng thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // --- Address Book Controller Methods ---

  public addAddress = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.checkOwnership(req, req.params.id);
      const result = await this.customerService.addAddress(req.params.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Thêm địa chỉ vào sổ thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getAddresses = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.checkOwnership(req, req.params.id);
      const result = await this.customerService.getAddresses(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Lấy sổ địa chỉ thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateAddress = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: customerId, addressId } = req.params;
      await this.checkOwnership(req, customerId);
      const result = await this.customerService.updateAddress(customerId, addressId, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật địa chỉ thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteAddress = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: customerId, addressId } = req.params;
      await this.checkOwnership(req, customerId);
      const result = await this.customerService.deleteAddress(customerId, addressId);
      res.status(200).json({
        success: true,
        message: 'Xóa địa chỉ thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
