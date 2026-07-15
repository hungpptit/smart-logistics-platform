import { Request, Response, NextFunction } from 'express';
import { DriverService } from '../services/driver.service';

export class DriverController {
  private driverService = new DriverService();

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.driverService.createDriver(req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo hồ sơ tài xế thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.driverService.getDrivers(req.query);
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách tài xế thành công',
        data: result.drivers,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.driverService.getDriverById(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Lấy chi tiết thông tin tài xế thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.driverService.updateDriver(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin tài xế thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.driverService.deleteDriver(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Xóa hồ sơ tài xế thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getUnlinkedUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.driverService.getUnlinkedUsers();
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách tài khoản chưa liên kết thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public assignVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.driverService.assignVehicle(req.body);
      res.status(201).json({
        success: true,
        message: 'Phân công phương tiện cho tài xế thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public terminateAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.driverService.terminateAssignment(req.body.driverId);
      res.status(200).json({
        success: true,
        message: 'Thu hồi phương tiện thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getActiveAssignments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.driverService.getActiveAssignments();
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách phân công đang hoạt động thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
