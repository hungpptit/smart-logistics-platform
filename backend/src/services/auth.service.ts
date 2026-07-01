import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';
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
        throw new BadRequestException('Username is already taken');
      }
      throw new BadRequestException('Email is already registered');
    }

    // 2. Validate role
    const roleCode = dto.roleCode || 'CUSTOMER';
    const role = await prisma.role.findUnique({
      where: { roleCode },
    });

    if (!role) {
      throw new BadRequestException(`Role with code '${roleCode}' does not exist`);
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
    // 1. Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.usernameOrEmail },
          { email: dto.usernameOrEmail },
        ],
        deletedAt: null,
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid username/email or password');
    }

    // 2. Validate status
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(`Account status is ${user.status.toLowerCase()}`);
    }

    // 3. Compare password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username/email or password');
    }

    // 4. Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 5. Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'super_secret_key_slp_2026';
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn as any }
    );

    // 6. Exclude passwordHash from response
    const { passwordHash: _, ...userWithoutPassword } = user;
    const roles = user.userRoles.map((ur) => ur.role.roleCode);

    return {
      token,
      user: {
        ...userWithoutPassword,
        roles,
      },
    };
  }

  /**
   * Get user profile details
   */
  public async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: {
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
      throw new NotFoundException('User profile not found');
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
