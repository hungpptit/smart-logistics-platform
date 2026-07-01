import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { RequestWithUser } from '../middlewares/auth.middleware';

export class AuthController {
  private authService = new AuthService();

  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.login(req.body);
      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getProfile = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id!;
      const result = await this.authService.getProfile(userId);
      res.status(200).json({
        success: true,
        message: 'Lấy thông tin tài khoản thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
