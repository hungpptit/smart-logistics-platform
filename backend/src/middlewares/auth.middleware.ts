import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { UnauthorizedException, ForbiddenException } from './error.middleware';

export interface UserPayload {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface RequestWithUser extends Request {
  user?: UserPayload;
}

export const authMiddleware = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || 'super_secret_key_slp_2026';

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }

    // Fetch user details with roles and permissions to ensure they are active and valid
    const user = await prisma.user.findUnique({
      where: { id: decoded.id, deletedAt: null },
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
      throw new UnauthorizedException('User not found or deactivated');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('User account is locked or disabled');
    }

    // Extract roles and flat map permissions
    const roles = user.userRoles.map((ur) => ur.role.roleCode);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.permissionCode)
        )
      )
    );

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      roles,
      permissions,
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Check if user has ALL specified permissions
export const requirePermissions = (requiredPermissions: string[]) => {
  return (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedException('User authentication required');
      }

      // Admin has absolute access bypass
      if (req.user.roles.includes('ADMIN')) {
        return next();
      }

      const hasAllPermissions = requiredPermissions.every((perm) =>
        req.user?.permissions.includes(perm)
      );

      if (!hasAllPermissions) {
        throw new ForbiddenException('You do not have the required permissions to perform this action');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Check if user has ANY of the specified roles
export const requireRoles = (allowedRoles: string[]) => {
  return (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedException('User authentication required');
      }

      const hasRole = allowedRoles.some((role) => req.user?.roles.includes(role));

      if (!hasRole) {
        throw new ForbiddenException('You do not have the required role to access this resource');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
