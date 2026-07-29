import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import { BadRequestException, NotFoundException } from '../middlewares/error.middleware';
import { rabbitMQService } from './rabbitmq.service';

export interface CreateStaffDto {
  fullName: string;
  email: string;
  phone?: string;
  citizenId?: string;
  position?: string;
  assignedFacilityId?: string | null;
}

export interface UpdateStaffDto {
  email?: string;
  password?: string;
  phone?: string;
  citizenId?: string;
  position?: string;
  status?: 'ACTIVE' | 'LOCKED' | 'DISABLED';
  assignedFacilityId?: string | null;
}

export class StaffService {
  public async getStaffs(query: any) {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      isHidden: false,
      role: {
        roleCode: 'STAFF',
      },
    };

    if (query.search) {
      where.OR = [
        { username: { contains: query.search, mode: 'insensitive' } },
        { staff: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { staff: { email: { contains: query.search, mode: 'insensitive' } } },
        { staff: { phone: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.facilityId) {
      if (query.facilityId === 'none') {
        where.staff = {
          assignedFacilityId: null,
        };
      } else {
        where.staff = {
          assignedFacilityId: query.facilityId,
        };
      }
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          status: true,
          createdAt: true,
          staff: {
            select: {
              fullName: true,
              email: true,
              phone: true,
              citizenId: true,
              position: true,
              assignedFacilityId: true,
              assignedFacility: {
                select: {
                  id: true,
                  facilityCode: true,
                  facilityName: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    const mappedStaffs = users.map((s) => ({
      id: s.id,
      username: s.username,
      fullName: s.staff?.fullName || s.username,
      email: s.staff?.email || null,
      phone: s.staff?.phone || null,
      status: s.status,
      position: s.staff?.position || 'STAFF',
      createdAt: s.createdAt,
      citizenId: s.staff?.citizenId || null,
      assignedFacilityId: s.staff?.assignedFacilityId || null,
      assignedFacility: s.staff?.assignedFacility || null,
    }));

    return {
      staffs: mappedStaffs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public async getStaffById(id: string) {
    const user = await prisma.user.findFirst({
      where: {
        id,
        role: {
          roleCode: 'STAFF',
        },
      },
      select: {
        id: true,
        username: true,
        status: true,
        createdAt: true,
        staff: {
          select: {
            fullName: true,
            email: true,
            phone: true,
            citizenId: true,
            position: true,
            assignedFacilityId: true,
            assignedFacility: {
              select: {
                id: true,
                facilityCode: true,
                facilityName: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    return {
      id: user.id,
      username: user.username,
      fullName: user.staff?.fullName || user.username,
      email: user.staff?.email || null,
      phone: user.staff?.phone || null,
      status: user.status,
      position: user.staff?.position || 'STAFF',
      createdAt: user.createdAt,
      citizenId: user.staff?.citizenId || null,
      assignedFacilityId: user.staff?.assignedFacilityId || null,
      assignedFacility: user.staff?.assignedFacility || null,
    };
  }

  public async createStaff(dto: CreateStaffDto) {
    // Check if email already exists in staff
    const existing = await prisma.staff.findFirst({
      where: {
        email: dto.email,
        isHidden: false,
      },
    });

    if (existing) {
      throw new BadRequestException('Email đã tồn tại trên hệ thống');
    }

    // Check if citizenId already exists if provided
    if (dto.citizenId) {
      const existingCitizen = await prisma.staff.findFirst({
        where: {
          citizenId: dto.citizenId,
          isHidden: false,
        },
      });
      if (existingCitizen) {
        throw new BadRequestException('Số CCCD đã tồn tại trên hệ thống');
      }
    }

    // Verify facility exists if provided
    if (dto.assignedFacilityId) {
      const facility = await prisma.facility.findFirst({
        where: { id: dto.assignedFacilityId },
      });
      if (!facility) {
        throw new NotFoundException('Không tìm thấy kho hàng được chỉ định');
      }
    }

    // Generate unique username from Full Name
    let slug = dto.fullName.toLowerCase();
    slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    slug = slug.replace(/[đĐ]/g, "d");
    slug = slug.replace(/\s+/g, "");
    slug = slug.replace(/[^a-z0-9_]/g, "");
    const usernamePrefix = slug.substring(0, 20) || 'staff';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const username = `${usernamePrefix}_${randomSuffix}`;

    const rawPassword = `Staff@${Math.floor(100000 + Math.random() * 900000)}`;
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const staffRole = await prisma.role.findUnique({
      where: { roleCode: 'STAFF' },
    });

    if (!staffRole) {
      throw new BadRequestException('Hệ thống chưa cấu hình vai trò Nhân viên (STAFF)');
    }

    const latestStaff = await prisma.staff.findFirst({
      orderBy: { employeeCode: 'desc' },
    });
    let nextStaffNum = 1;
    if (latestStaff && latestStaff.employeeCode) {
      const match = latestStaff.employeeCode.match(/STF-(\d+)/);
      if (match) {
        nextStaffNum = parseInt(match[1], 10) + 1;
      }
    }
    const employeeCode = `STF-${String(nextStaffNum).padStart(6, '0')}`;

    const newStaff = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          passwordHash,
          status: 'ACTIVE',
          roleId: staffRole.id,
        },
      });

      const profile = await tx.staff.create({
        data: {
          userId: user.id,
          employeeCode,
          fullName: dto.fullName,
          phone: dto.phone || '',
          email: dto.email,
          position: dto.position || 'STAFF',
          citizenId: dto.citizenId || null,
          assignedFacilityId: dto.assignedFacilityId || null,
        },
        include: {
          assignedFacility: {
            select: {
              id: true,
              facilityCode: true,
              facilityName: true,
            },
          },
        },
      });

      return { user, profile };
    });

    let facilityCode = '';
    let facilityName = '';
    if (newStaff.profile.assignedFacility) {
      facilityCode = newStaff.profile.assignedFacility.facilityCode;
      facilityName = newStaff.profile.assignedFacility.facilityName;
    }

    // Publish notification message to RabbitMQ mail_queue
    await rabbitMQService.publishToQueue('mail_queue', {
      type: 'STAFF_CREATED',
      email: dto.email,
      username,
      fullName: dto.fullName,
      phone: dto.phone || undefined,
      password: rawPassword,
      facilityCode,
      facilityName,
    });

    return {
      id: newStaff.user.id,
      username: newStaff.user.username,
      fullName: newStaff.profile.fullName,
      email: newStaff.profile.email,
      phone: newStaff.profile.phone,
      status: newStaff.user.status,
      position: newStaff.profile.position,
      citizenId: newStaff.profile.citizenId,
      assignedFacilityId: newStaff.profile.assignedFacilityId,
      assignedFacility: newStaff.profile.assignedFacility,
    };
  }

  public async updateStaff(id: string, dto: UpdateStaffDto) {
    const user = await prisma.user.findFirst({
      where: {
        id,
        role: {
          roleCode: 'STAFF',
        },
      },
      include: {
        staff: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    // Check unique email if updating email
    if (dto.email && dto.email !== user.staff?.email) {
      const existingEmail = await prisma.staff.findFirst({
        where: {
          email: dto.email,
          isHidden: false,
          NOT: { userId: id },
        },
      });
      if (existingEmail) {
        throw new BadRequestException('Email đã được sử dụng bởi người dùng khác');
      }
    }

    // Check unique citizenId if provided
    if (dto.citizenId) {
      const existingCitizen = await prisma.staff.findFirst({
        where: {
          citizenId: dto.citizenId,
          isHidden: false,
          NOT: { userId: id },
        },
      });
      if (existingCitizen) {
        throw new BadRequestException('Số CCCD đã được sử dụng bởi nhân viên khác');
      }
    }

    // Verify facility exists if provided
    if (dto.assignedFacilityId) {
      const facility = await prisma.facility.findFirst({
        where: { id: dto.assignedFacilityId },
      });
      if (!facility) {
        throw new NotFoundException('Không tìm thấy kho hàng được chỉ định');
      }
    }

    const userData: any = {};
    if (dto.status) userData.status = dto.status;
    if (dto.password) userData.passwordHash = await bcrypt.hash(dto.password, 10);

    const staffData: any = {};
    if (dto.phone !== undefined) staffData.phone = dto.phone;
    if (dto.email !== undefined) staffData.email = dto.email;
    if (dto.citizenId !== undefined) staffData.citizenId = dto.citizenId;
    if (dto.position !== undefined) staffData.position = dto.position;
    if (dto.assignedFacilityId !== undefined) staffData.assignedFacilityId = dto.assignedFacilityId;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedUser = Object.keys(userData).length > 0
        ? await tx.user.update({ where: { id }, data: userData })
        : user;

      const updatedProfile = await tx.staff.upsert({
        where: { userId: id },
        update: staffData,
        create: {
          userId: id,
          employeeCode: `STF-${Date.now().toString().slice(-6)}`,
          fullName: user.username,
          phone: dto.phone || '',
          email: dto.email || null,
          citizenId: dto.citizenId || null,
          position: dto.position || 'STAFF',
          assignedFacilityId: dto.assignedFacilityId || null,
        },
        include: {
          assignedFacility: {
            select: {
              id: true,
              facilityCode: true,
              facilityName: true,
            },
          },
        },
      });

      return { user: updatedUser, profile: updatedProfile };
    });

    return {
      id: updated.user.id,
      username: updated.user.username,
      fullName: updated.profile.fullName,
      email: updated.profile.email,
      phone: updated.profile.phone,
      status: updated.user.status,
      position: updated.profile.position,
      citizenId: updated.profile.citizenId,
      assignedFacilityId: updated.profile.assignedFacilityId,
      assignedFacility: updated.profile.assignedFacility,
    };
  }

  public async deleteStaff(id: string) {
    const user = await prisma.user.findFirst({
      where: {
        id,
        role: {
          roleCode: 'STAFF',
        },
      },
      include: {
        staff: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    // Update status to DISABLED when soft deleting
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          status: 'DISABLED',
        },
      });

      if (user.staff) {
        await tx.staff.update({
          where: { userId: id },
          data: {
            isHidden: true,
          },
        });
      }
    });

    return { id };
  }
}
