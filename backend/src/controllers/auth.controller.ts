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

  public verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, otp } = req.body;
      const result = await this.authService.verifyOtp(email, otp);
      
      const { refreshToken, ...rest } = result;
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        success: true,
        message: 'Kích hoạt tài khoản thành công',
        data: rest,
      });
    } catch (error) {
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.login(req.body);
      
      const { refreshToken, ...rest } = result;
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: rest,
      });
    } catch (error) {
      next(error);
    }
  };

  public refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cookieHeader = req.headers.cookie;
      const cookies: { [key: string]: string } = {};
      if (cookieHeader) {
        cookieHeader.split(';').forEach((cookie) => {
          const parts = cookie.split('=');
          cookies[parts.shift()?.trim() || ''] = decodeURI(parts.join('='));
        });
      }

      const refreshToken = cookies['refreshToken'];
      if (!refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Refresh token không hợp lệ hoặc đã hết hạn',
        });
        return;
      }

      const result = await this.authService.refresh({ refreshToken });
      res.status(200).json({
        success: true,
        message: 'Làm mới token thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public logout = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id!;
      const result = await this.authService.logout(userId);
      
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      res.status(200).json({
        success: true,
        message: 'Đăng xuất thành công',
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

  public changePassword = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id!;
      const result = await this.authService.changePassword(userId, req.body);
      res.status(200).json({
        success: true,
        message: 'Đổi mật khẩu thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp địa chỉ email.',
        });
        return;
      }
      const result = await this.authService.forgotPassword(email);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ email, mã xác thực và mật khẩu mới.',
        });
        return;
      }
      if (newPassword.length < 6) {
        res.status(400).json({
          success: false,
          message: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
        });
        return;
      }
      const result = await this.authService.resetPassword(email, otp, newPassword);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

