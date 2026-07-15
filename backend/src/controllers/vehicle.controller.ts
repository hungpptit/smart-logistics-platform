import { Request, Response, NextFunction } from 'express';
import { VehicleService } from '../services/vehicle.service';

export class VehicleController {
  private vehicleService = new VehicleService();

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.vehicleService.createVehicle(req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo phương tiện thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.vehicleService.getVehicles(req.query);
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách phương tiện thành công',
        data: result.vehicles,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.vehicleService.getVehicleById(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Lấy thông tin chi tiết phương tiện thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.vehicleService.updateVehicle(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin phương tiện thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.vehicleService.deleteVehicle(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Xóa phương tiện thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.vehicleService.getVehicleTypes();
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách loại phương tiện thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
