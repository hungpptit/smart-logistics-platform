import { Request, Response, NextFunction } from 'express';
import { StaffService } from '../services/staff.service';

export class StaffController {
  private staffService = new StaffService();

  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.staffService.getStaffs(req.query);
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách nhân viên thành công',
        data: result.staffs,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.staffService.getStaffById(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Lấy thông tin chi tiết nhân viên thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.staffService.createStaff(req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo tài khoản nhân viên thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.staffService.updateStaff(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật tài khoản nhân viên thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.staffService.deleteStaff(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Xóa tài khoản nhân viên thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
