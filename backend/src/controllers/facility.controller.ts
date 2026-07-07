import { Request, Response, NextFunction } from 'express';
import { FacilityService } from '../services/facility.service';

export class FacilityController {
  private facilityService = new FacilityService();

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.facilityService.createFacility(req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo thông tin kho bãi thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.facilityService.getFacilities(req.query);
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách kho bãi thành công',
        data: result.facilities,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.facilityService.getFacilityById(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Lấy chi tiết kho bãi thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.facilityService.updateFacility(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật kho bãi thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.facilityService.deleteFacility(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Xóa kho bãi thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // --- Cargo Zone Controllers ---

  public createZone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.facilityService.createZone(req.params.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo phân khu hàng hóa thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getZones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.facilityService.getZones(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách phân khu thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateZone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: facilityId, zoneId } = req.params;
      const result = await this.facilityService.updateZone(facilityId, zoneId, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật phân khu thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteZone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: facilityId, zoneId } = req.params;
      const result = await this.facilityService.deleteZone(facilityId, zoneId);
      res.status(200).json({
        success: true,
        message: 'Xóa phân khu thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.facilityService.getFacilityTypes();
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách loại kho bãi thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
