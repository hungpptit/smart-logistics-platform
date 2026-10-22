import { Request, Response, NextFunction } from 'express';
import { cameraService } from '../services/camera.service';
import { RequestWithUser } from '../middlewares/auth.middleware';

export class CameraController {
  /**
   * GET /api/v1/cameras
   * Lấy danh sách camera giao thông phục vụ cảnh báo phạt nguội
   * Quyền truy cập: Chỉ ADMIN và SHIPPER
   */
  public getCameras = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const city = req.query.city as string | undefined;
      const district = req.query.district as string | undefined;

      const result = await cameraService.getActiveCameras({ city, district });

      res.status(200).json({
        success: true,
        message: 'Lấy danh sách camera phạt nguội thành công',
        data: result.cameras,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/cameras/:idOrCode
   * Lấy chi tiết camera
   */
  public getCameraDetail = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { idOrCode } = req.params;
      const camera = await cameraService.getCameraByIdOrCode(idOrCode);

      if (!camera) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy camera tương ứng',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: camera,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const cameraController = new CameraController();
