import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { RegisterDto, LoginDto, RefreshTokenDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto, VerifyForgotOtpDto } from '../dtos/auth.dto';
import { BadRequestException, UnauthorizedException, NotFoundException } from '../middlewares/error.middleware';
import { rabbitMQService } from './rabbitmq.service';

export class AuthService {
  /**
   * Register a new user
   */
  public async register(dto: RegisterDto) {
    // 1. Check if user already exists (by username, email or phone) and is ACTIVE
    const orConditions: any[] = [
      { username: dto.username },
      { email: dto.email }
    ];
    if (dto.phone) {
      orConditions.push({ phone: dto.phone });
    }

    const existingActiveUser = await prisma.user.findFirst({
      where: {
        OR: orConditions,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    if (existingActiveUser) {
      if (existingActiveUser.username === dto.username) {
        throw new BadRequestException('Tên tài khoản đã tồn tại trên hệ thống');
      }
      if (existingActiveUser.email === dto.email) {
        throw new BadRequestException('Địa chỉ email đã được đăng ký tài khoản');
      }
      if (dto.phone && existingActiveUser.phone === dto.phone) {
        throw new BadRequestException('Số điện thoại đã được đăng ký tài khoản');
      }
    }

    // 2. Validate role
    const roleCode = dto.roleCode || 'CUSTOMER';
    const role = await prisma.role.findUnique({
      where: { roleCode },
    });

    if (!role) {
      throw new BadRequestException(`Vai trò với mã '${roleCode}' không tồn tại`);
    }

    // 3. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    // 4. Create user and assign role in a transaction (with DISABLED status initially for OTP verification)
    // Clean up any unverified (DISABLED) accounts matching the criteria first to avoid key conflicts
    const newUser = await prisma.$transaction(async (tx) => {
      const duplicateDisabledUsers = await tx.user.findMany({
        where: {
          OR: orConditions,
          status: 'DISABLED',
          deletedAt: null,
        },
      });

      for (const du of duplicateDisabledUsers) {
        await tx.user.delete({
          where: { id: du.id },
        });
      }

      const user = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          passwordHash,
          phone: dto.phone,
          avatarUrl: dto.avatarUrl,
          status: 'DISABLED',
          roleId: role.id,
        },
      });

      return user;
    });

    // 5. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 6. Save OTP in Redis (Expires in 5 minutes)
    await redis.setEx(`otp:email:${dto.email}`, 300, otp);

    // 7. Publish to RabbitMQ mail_queue
    await rabbitMQService.publishToQueue('mail_queue', {
      type: 'SEND_OTP',
      email: dto.email,
      username: dto.username,
      otp,
    });

    return {
      status: 'PENDING_VERIFICATION',
      email: dto.email,
      message: 'Mã OTP xác thực đã được gửi tới email của bạn. Vui lòng xác minh để hoàn tất đăng ký.',
    };

  }

  /**
   * Verify registration OTP and activate user
   */
  public async verifyOtp(email: string, otp: string) {
    // 1. Get OTP from Redis
    const cachedOtp = await redis.get(`otp:email:${email}`);
    if (!cachedOtp) {
      throw new BadRequestException('Mã OTP đã hết hạn hoặc không tồn tại');
    }

    if (cachedOtp !== otp) {
      throw new BadRequestException('Mã OTP không chính xác');
    }

    // 2. Find and activate user
    const user = await prisma.user.findFirst({
      where: {
        email,
        status: 'DISABLED',
        deletedAt: null,
      },
      include: {
        managedFacilities: true,
        staffProfile: {
          include: {
            assignedFacility: true,
          },
        },
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản tương ứng ở trạng thái chờ kích hoạt');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE' },
    });

    // Check if the user has the CUSTOMER role and auto-create a Customer profile if not exists
    const rolesList = [user.role.roleCode];
    if (rolesList.includes('CUSTOMER')) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { userId: user.id },
      });
      if (!existingCustomer) {
        const count = await prisma.customer.count();
        const customerCode = `CUST-${String(count + 1).padStart(6, '0')}`;
        await prisma.customer.create({
          data: {
            userId: user.id,
            customerCode,
            customerType: 'INDIVIDUAL',
            status: 'ACTIVE',
          },
        });
      }
    }

    // Delete OTP from Redis
    await redis.del(`otp:email:${email}`);

    // 3. Generate Access & Refresh tokens
    const jwtSecret = process.env.JWT_SECRET || 'super_secret_key_slp_2026';
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'super_refresh_secret_key_slp_2026';

    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
      },
      jwtRefreshSecret,
      { expiresIn: '7d' }
    );

    // Save refresh token to Redis (Expires in 7 days)
    await redis.setEx(`refresh_token:${user.id}`, 7 * 24 * 60 * 60, refreshToken);

    const { passwordHash: _, ...userWithoutPassword } = user;
    const roles = [user.role.roleCode];
    const permissions = Array.from(
      new Set(
        user.role.rolePermissions.map((rp) => rp.permission.permissionCode)
      )
    );

    return {
      accessToken,
      refreshToken,
      user: {
        ...userWithoutPassword,
        roles,
        permissions,
      },
    };
  }

  /**
   * Login user and issue JWT
   */
  public async login(dto: LoginDto) {
    // 1. Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { phone: dto.email },
        ],
        deletedAt: null,
      },
      include: {
        managedFacilities: true,
        staffProfile: {
          include: {
            assignedFacility: true,
          },
        },
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác');
    }

    // 2. Validate status
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(`Trạng thái tài khoản đang là ${user.status.toLowerCase()}`);
    }

    // 3. Compare password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác');
    }

    // 4. Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 5. Generate Access & Refresh tokens
    const jwtSecret = process.env.JWT_SECRET || 'super_secret_key_slp_2026';
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'super_refresh_secret_key_slp_2026';

    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
      },
      jwtRefreshSecret,
      { expiresIn: '7d' }
    );

    // Save refresh token to Redis (Expires in 7 days)
    await redis.setEx(`refresh_token:${user.id}`, 7 * 24 * 60 * 60, refreshToken);

    // 6. Exclude passwordHash from response
    const { passwordHash: _, ...userWithoutPassword } = user;
    const roles = [user.role.roleCode];
    const permissions = Array.from(
      new Set(
        user.role.rolePermissions.map((rp) => rp.permission.permissionCode)
      )
    );

    return {
      accessToken,
      refreshToken,
      user: {
        ...userWithoutPassword,
        roles,
        permissions,
      },
    };
  }

  /**
   * Refresh access token
   */
  public async refresh(dto: RefreshTokenDto) {
    const jwtSecret = process.env.JWT_SECRET || 'super_secret_key_slp_2026';
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'super_refresh_secret_key_slp_2026';

    let decoded: any;
    try {
      decoded = jwt.verify(dto.refreshToken, jwtRefreshSecret);
    } catch (err) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const userId = decoded.id;

    // Verify token exists in Redis
    const savedToken = await redis.get(`refresh_token:${userId}`);
    if (!savedToken || savedToken !== dto.refreshToken) {
      throw new UnauthorizedException('Refresh token đã bị vô hiệu hóa hoặc không tồn tại');
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: {
        role: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản người dùng không hợp lệ hoặc đã bị khóa');
    }

    // Generate new Access Token
    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      jwtSecret,
      { expiresIn: '15m' }
    );

    return { accessToken };
  }

  /**
   * Revoke refresh token (Logout)
   */
  public async logout(userId: string) {
    await redis.del(`refresh_token:${userId}`);
    return { success: true };
  }

  /**
   * Get user profile details
   */
  public async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: {
        managedFacilities: true,
        staffProfile: {
          include: {
            assignedFacility: true,
          },
        },
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin tài khoản người dùng');
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    const roles = [user.role.roleCode];
    const permissions = Array.from(
      new Set(
        user.role.rolePermissions.map((rp) => rp.permission.permissionCode)
      )
    );

    return {
      ...userWithoutPassword,
      roles,
      permissions,
    };
  }

  /**
   * Change current user password
   */
  public async changePassword(userId: string, dto: ChangePasswordDto) {
    // 1. Get user details including passwordHash
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin tài khoản người dùng');
    }

    // 2. Compare old password
    const isPasswordValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Mật khẩu cũ không chính xác');
    }

    // 3. Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);

    // 4. Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return { success: true, message: 'Đổi mật khẩu thành công!' };
  }

  /**
   * Request forgot password OTP
   */
  public async forgotPassword(dto: ForgotPasswordDto) {
    // 1. Find user by email
    const user = await prisma.user.findFirst({
      where: {
        email: dto.email,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng tương ứng với email này');
    }

    if (user.status !== 'ACTIVE') {
      throw new BadRequestException(`Tài khoản của bạn đang ở trạng thái ${user.status.toLowerCase()} và không thể khôi phục mật khẩu`);
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Save OTP in Redis (Expires in 5 minutes)
    await redis.setEx(`otp:forgot-password:${dto.email}`, 300, otp);

    // 4. Publish to RabbitMQ mail_queue
    await rabbitMQService.publishToQueue('mail_queue', {
      type: 'FORGOT_PASSWORD_OTP',
      email: dto.email,
      username: user.username,
      otp,
    });

    return {
      success: true,
      message: 'Mã OTP khôi phục mật khẩu đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư.',
    };
  }

  /**
   * Reset password using OTP
   */
  public async resetPassword(dto: ResetPasswordDto) {
    // 1. Get OTP from Redis
    const cachedOtp = await redis.get(`otp:forgot-password:${dto.email}`);
    if (!cachedOtp) {
      throw new BadRequestException('Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng gửi lại yêu cầu.');
    }

    if (cachedOtp !== dto.otp) {
      throw new BadRequestException('Mã OTP không chính xác. Vui lòng kiểm tra lại.');
    }

    // 2. Find user
    const user = await prisma.user.findFirst({
      where: {
        email: dto.email,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng tương ứng');
    }

    // 3. Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);

    // 4. Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // 5. Delete OTP from Redis
    await redis.del(`otp:forgot-password:${dto.email}`);

    // 6. Optionally revoke existing refresh tokens to force re-login on all devices
    await redis.del(`refresh_token:${user.id}`);

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.',
    };
  }

  /**
   * Verify forgot password OTP
   */
  public async verifyForgotOtp(dto: VerifyForgotOtpDto) {
    const cachedOtp = await redis.get(`otp:forgot-password:${dto.email}`);
    if (!cachedOtp) {
      throw new BadRequestException('Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng gửi lại yêu cầu.');
    }

    if (cachedOtp !== dto.otp) {
      throw new BadRequestException('Mã OTP không chính xác. Vui lòng kiểm tra lại.');
    }

    return {
      success: true,
      message: 'Xác thực mã OTP thành công.',
    };
  }
}

