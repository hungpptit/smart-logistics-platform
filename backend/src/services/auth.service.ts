import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { RegisterDto, LoginDto, RefreshTokenDto } from '../dtos/auth.dto';
import { BadRequestException, UnauthorizedException, NotFoundException } from '../middlewares/error.middleware';

export class AuthService {
  /**
   * Register a new user
   */
  public async register(dto: RegisterDto) {
    // 1. Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.username },
          { email: dto.email },
        ],
        deletedAt: null,
      },
    });

    if (existingUser) {
      if (existingUser.username === dto.username) {
        throw new BadRequestException('Tên tài khoản đã tồn tại trên hệ thống');
      }
      throw new BadRequestException('Địa chỉ email đã được đăng ký tài khoản');
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

    // 4. Create user and assign role in a transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          passwordHash,
          phone: dto.phone,
          avatarUrl: dto.avatarUrl,
          status: 'ACTIVE',
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });

      return user;
    });

    // 5. Exclude passwordHash from response
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return {
      user: userWithoutPassword,
      assignedRole: roleCode,
    };
  }

  /**
   * Login user and issue JWT
   */
  public async login(dto: LoginDto) {
    // 1. Find user by email
    const user = await prisma.user.findFirst({
      where: {
        email: dto.email,
        deletedAt: null,
      },
      include: {
        managedFacilities: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // 2. Validate status
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(`Trạng thái tài khoản đang là ${user.status.toLowerCase()}`);
    }

    // 3. Compare password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
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
    const roles = user.userRoles.map((ur) => ur.role.roleCode);

    return {
      accessToken,
      refreshToken,
      user: {
        ...userWithoutPassword,
        roles,
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
        userRoles: {
          include: {
            role: true,
          },
        },
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
        userRoles: {
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

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin tài khoản người dùng');
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    const roles = user.userRoles.map((ur) => ur.role.roleCode);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.permissionCode)
        )
      )
    );

    return {
      ...userWithoutPassword,
      roles,
      permissions,
    };
  }
}
