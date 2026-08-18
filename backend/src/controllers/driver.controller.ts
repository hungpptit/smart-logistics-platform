import { Request, Response, NextFunction } from 'express';
import { DriverService } from '../services/driver.service';
import { getTrackingGateway } from '../gateways/tracking.gateway';
import { prisma } from '../config/prisma';

export class DriverController {
  private driverService = new DriverService();

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      const isAdmin = user?.roles?.includes('ADMIN');
      const isStaff = user?.roles?.includes('STAFF') && !isAdmin;

      if (isStaff && user?.id) {
        const staffProfile = await prisma.staff.findUnique({
          where: { userId: user.id },
        });
        if (!staffProfile?.assignedFacilityId) {
          res.status(403).json({
            success: false,
            message: 'Tài khoản nhân viên chưa được gán bưu cục làm việc, không thể tạo hồ sơ tài xế.',
          });
          return;
        }
        // Force driver to be created only in staff's own assigned facility
        req.body.homeFacilityId = staffProfile.assignedFacilityId;
      }

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
      const user = (req as any).user;
      const isAdmin = user?.roles?.includes('ADMIN');
      const isStaff = user?.roles?.includes('STAFF') && !isAdmin;

      if (isStaff && user?.id) {
        const staffProfile = await prisma.staff.findUnique({
          where: { userId: user.id },
        });
        const driver = await prisma.staff.findUnique({
          where: { id: req.params.id },
        });
        if (!staffProfile?.assignedFacilityId || driver?.assignedFacilityId !== staffProfile.assignedFacilityId) {
          res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền quản lý tài xế thuộc bưu cục/kho được phân công.',
          });
          return;
        }
        // Staff cannot re-assign driver to another facility
        req.body.homeFacilityId = staffProfile.assignedFacilityId;
      }

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

  public updateDutyStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const { status } = req.body;

      if (!status || !['ACTIVE', 'OFFLINE'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Trạng thái ca làm việc phải là ACTIVE hoặc OFFLINE',
        });
        return;
      }

      const updated = await this.driverService.updateDutyStatus(userId, status);

      getTrackingGateway()?.broadcastDutyStatusChanged(updated?.id || '', userId, status);

      res.status(200).json({
        success: true,
        message: status === 'ACTIVE' ? 'Đã bật ca làm việc (Trực tuyến)' : 'Đã kết thúc ca làm việc (Ngoại tuyến)',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };
}
