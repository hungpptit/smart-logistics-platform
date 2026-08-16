import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { RegisterDto, LoginDto, RefreshTokenDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto, VerifyForgotOtpDto } from '../dtos/auth.dto';
import { BadRequestException, NotFoundException, UnauthorizedException } from '../middlewares/error.middleware';
import { rabbitMQService } from './rabbitmq.service';

export class AuthService {
  /**
   * Register a new Customer user
   */
  public async register(dto: RegisterDto) {
    let username = dto.username?.trim();

    // 1. Check if explicit username is already taken by an active/locked user, or by another email
    if (username) {
      const existingUser = await prisma.user.findUnique({
        where: { username },
        include: { customer: true },
      });

      if (existingUser) {
        if (existingUser.status !== 'DISABLED' || existingUser.customer?.email !== dto.email) {
          throw new BadRequestException('Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác.');
        }
      }
    }

    // 2. Check if email or phone already exists in Customer
    const existingCustomers = await prisma.customer.findMany({
      where: {
        OR: [
          { email: dto.email },
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
      include: { user: true },
    });

    const activeCustomer = existingCustomers.find(
      (c) => c.user && (c.user.status === 'ACTIVE' || c.user.status === 'LOCKED')
    );

    if (activeCustomer) {
      throw new BadRequestException('Email hoặc số điện thoại đã được đăng ký tài khoản');
    }

    // 3. Clean up stale unverified (DISABLED) user/customer records for this email/phone or username
    const unverifiedUserIds = existingCustomers
      .filter((c) => c.user && c.user.status === 'DISABLED')
      .map((c) => c.userId);

    if (username) {
      const unverifiedUserByUsername = await prisma.user.findFirst({
        where: { username, status: 'DISABLED' },
      });
      if (unverifiedUserByUsername && !unverifiedUserIds.includes(unverifiedUserByUsername.id)) {
        unverifiedUserIds.push(unverifiedUserByUsername.id);
      }
    }

    if (unverifiedUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: unverifiedUserIds } },
      });
    }

    // 4. Generate unique username if not provided
    if (!username) {
      let slug = (dto.fullName || dto.email.split('@')[0]).toLowerCase();
      slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      slug = slug.replace(/[đĐ]/g, 'd');
      slug = slug.replace(/\s+/g, '');
      slug = slug.replace(/[^a-z0-9_]/g, '');
      const usernamePrefix = slug.substring(0, 20) || 'cust';

      let attempts = 0;
      do {
        const randomSuffix = Math.floor(100000 + Math.random() * 900000);
        const candidate = `${usernamePrefix}_${randomSuffix}`;
        const existing = await prisma.user.findUnique({ where: { username: candidate } });
        if (!existing) {
          username = candidate;
          break;
        }
        attempts++;
      } while (attempts < 10);

      if (!username) {
        username = `${usernamePrefix}_${Date.now()}`;
      }
    }

    // 5. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    // 6. Find default CUSTOMER role
    const customerRole = await prisma.role.findUnique({
      where: { roleCode: 'CUSTOMER' },
    });

    if (!customerRole) {
      throw new BadRequestException("Hệ thống chưa cấu hình vai trò 'CUSTOMER'");
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 7. Generate guaranteed unique customer code
    let customerCode = '';
    let isCodeUnique = false;
    let codeCounter = (await prisma.customer.count()) + 1;
    while (!isCodeUnique) {
      customerCode = `CUST-${String(codeCounter).padStart(6, '0')}`;
      const existingCust = await prisma.customer.findUnique({ where: { customerCode } });
      if (!existingCust) {
        isCodeUnique = true;
      } else {
        codeCounter++;
      }
    }

    // 8. Create User and Customer in a transaction with Prisma error catching
    let user;
    try {
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            username,
            passwordHash,
            status: 'DISABLED',
            roleId: customerRole.id,
          },
        });

        await tx.customer.create({
          data: {
            userId: newUser.id,
            customerCode,
            fullName: dto.fullName || dto.username || 'Khách hàng',
            phone: dto.phone || '',
            email: dto.email,
            customerType: 'INDIVIDUAL',
          },
        });

        return newUser;
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (Array.isArray(target) && target.includes('username')) {
          throw new BadRequestException('Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác.');
        }
        if (Array.isArray(target) && target.includes('customer_code')) {
          throw new BadRequestException('Mã khách hàng đã tồn tại. Vui lòng thử lại.');
        }
        throw new BadRequestException('Thông tin đăng ký đã được sử dụng trong hệ thống.');
      }
      throw error;
    }

    // 9. Save OTP in Redis (Expires in 10 minutes)
    await redis.setEx(`otp:email:${dto.email}`, 600, otp);

    // 10. Publish to RabbitMQ mail_queue
    await rabbitMQService.publishToQueue('mail_queue', {
      type: 'REGISTER_OTP',
      email: dto.email,
      fullName: dto.fullName,
      otp,
    });

    return {
      userId: user.id,
      email: dto.email,
      message: 'Đăng ký tài khoản thành công! Mã OTP xác thực đã được gửi tới email của bạn.',
    };
  }

  /**
   * Verify email OTP after registration
   */
  public async verifyOtp(email: string, otp: string) {
    return this.verifyRegistrationOtp(email, otp);
  }

  public async verifyRegistrationOtp(email: string, otp: string) {
    const cachedOtp = await redis.get(`otp:email:${email}`);
    if (!cachedOtp) {
      throw new BadRequestException('Mã OTP đã hết hạn hoặc không tồn tại');
    }

    if (cachedOtp !== otp) {
      throw new BadRequestException('Mã OTP không chính xác');
    }

    // Find and activate user
    const customer = await prisma.customer.findFirst({
      where: { email },
      include: {
        user: {
          include: {
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
        },
      },
    });

    if (!customer || !customer.user) {
      throw new NotFoundException('Không tìm thấy tài khoản tương ứng ở trạng thái chờ kích hoạt');
    }

    const user = customer.user;

    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE' },
    });

    await redis.del(`otp:email:${email}`);

    const jwtSecret = process.env.JWT_SECRET || 'super_secret_key_slp_2026';
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'super_refresh_secret_key_slp_2026';

    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: customer.email || '',
        fullName: customer.fullName,
      },
      jwtSecret,
      { expiresIn: '30d' }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
      },
      jwtRefreshSecret,
      { expiresIn: '90d' }
    );

    await redis.setEx(`refresh_token:${user.id}`, 90 * 24 * 60 * 60, refreshToken);

    const { passwordHash: _, ...userWithoutPassword } = user;
    const roles = [user.role.roleCode];
    const permissions = Array.from(
      new Set(
        user.role.rolePermissions.map((rp: any) => rp.permission.permissionCode)
      )
    );

    return {
      accessToken,
      refreshToken,
      user: {
        ...userWithoutPassword,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        roles,
        permissions,
      },
    };
  }

  /**
   * Login user and issue JWT
   */
  public async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({
      where: {
        username: dto.username,
      },
      include: {
        managedFacilities: true,
        staff: {
          include: {
            assignedFacility: true,
            driverTypes: true,
          },
        },
        customer: {
          include: {
            addresses: {
              include: {
                address: {
                  include: {
                    wardRelation: {
                      include: {
                        province: true,
                      },
                    },
                  },
                },
              },
            },
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

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(`Trạng thái tài khoản đang là ${user.status.toLowerCase()}`);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác');
    }

    const jwtSecret = process.env.JWT_SECRET || 'super_secret_key_slp_2026';
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'super_refresh_secret_key_slp_2026';

    const profileEmail = user.staff?.email || user.customer?.email || '';
    const profileFullName = user.staff?.fullName || user.customer?.fullName || user.username;
    const profilePhone = user.staff?.phone || user.customer?.phone || '';

    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: profileEmail,
        fullName: profileFullName,
      },
      jwtSecret,
      { expiresIn: '30d' }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
      },
      jwtRefreshSecret,
      { expiresIn: '90d' }
    );

    await redis.setEx(`refresh_token:${user.id}`, 90 * 24 * 60 * 60, refreshToken);

    const { passwordHash: _, ...userWithoutPassword } = user;
    const roles = [user.role.roleCode];
    const permissions = Array.from(
      new Set(
        user.role.rolePermissions.map((rp: any) => rp.permission.permissionCode)
      )
    );

    return {
      accessToken,
      refreshToken,
      user: {
        ...userWithoutPassword,
        staffProfile: user.staff,
        customerProfile: user.customer,
        fullName: profileFullName,
        email: profileEmail,
        phone: profilePhone,
        roles,
        permissions,
      },
    };
  }

  /**
   * Refresh JWT
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

    const savedToken = await redis.get(`refresh_token:${userId}`);
    if (!savedToken || savedToken !== dto.refreshToken) {
      throw new UnauthorizedException('Refresh token đã bị vô hiệu hóa hoặc không tồn tại');
    }

    const user = await prisma.user.findFirst({
      where: { id: userId },
      include: {
        role: true,
        staff: true,
        customer: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản người dùng không hợp lệ hoặc đã bị khóa');
    }

    const profileEmail = user.staff?.email || user.customer?.email || '';
    const profileFullName = user.staff?.fullName || user.customer?.fullName || user.username;

    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: profileEmail,
        fullName: profileFullName,
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
    const user = await prisma.user.findFirst({
      where: { id: userId },
      include: {
        managedFacilities: true,
        staff: {
          include: {
            assignedFacility: true,
            driverTypes: true,
          },
        },
        customer: {
          include: {
            addresses: {
              include: {
                address: {
                  include: {
                    wardRelation: {
                      include: {
                        province: true,
                      },
                    },
                  },
                },
              },
            },
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

    const profileEmail = user.staff?.email || user.customer?.email || '';
    const profileFullName = user.staff?.fullName || user.customer?.fullName || user.username;
    const profilePhone = user.staff?.phone || user.customer?.phone || '';

    const { passwordHash: _, ...userWithoutPassword } = user;
    const roles = [user.role.roleCode];
    const permissions = Array.from(
      new Set(
        user.role.rolePermissions.map((rp: any) => rp.permission.permissionCode)
      )
    );

    return {
      ...userWithoutPassword,
      staffProfile: user.staff,
      customerProfile: user.customer,
      fullName: profileFullName,
      email: profileEmail,
      phone: profilePhone,
      roles,
      permissions,
    };
  }

  /**
   * Change current user password
   */
  public async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin tài khoản người dùng');
    }

    const isPasswordValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Mật khẩu cũ không chính xác');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);

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
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.email },
          { staff: { email: dto.email } },
          { customer: { email: dto.email } },
        ],
      },
      include: {
        staff: true,
        customer: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng tương ứng với email này');
    }

    if (user.status !== 'ACTIVE') {
      throw new BadRequestException(`Tài khoản của bạn đang ở trạng thái ${user.status.toLowerCase()} và không thể khôi phục mật khẩu`);
    }

    const targetEmail = user.staff?.email || user.customer?.email || dto.email;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await redis.setEx(`otp:forgot-password:${targetEmail}`, 300, otp);

    await rabbitMQService.publishToQueue('mail_queue', {
      type: 'FORGOT_PASSWORD_OTP',
      email: targetEmail,
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
    const cachedOtp = await redis.get(`otp:forgot-password:${dto.email}`);
    if (!cachedOtp) {
      throw new BadRequestException('Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng gửi lại yêu cầu.');
    }

    if (cachedOtp !== dto.otp) {
      throw new BadRequestException('Mã OTP không chính xác. Vui lòng kiểm tra lại.');
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.email },
          { staff: { email: dto.email } },
          { customer: { email: dto.email } },
        ],
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng tương ứng');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await redis.del(`otp:forgot-password:${dto.email}`);
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
