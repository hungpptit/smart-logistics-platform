import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import { BadRequestException, NotFoundException } from '../middlewares/error.middleware';
import { rabbitMQService } from './rabbitmq.service';

export interface CreateStaffDto {
  fullName: string;
  email: string;
  phone?: string;
  citizenId?: string;
  assignedFacilityId?: string | null;
}

export interface UpdateStaffDto {
  email?: string;
  password?: string;
  phone?: string;
  citizenId?: string;
  status?: 'ACTIVE' | 'LOCKED' | 'DISABLED';
  assignedFacilityId?: string | null;
}

export class StaffService {
  public async getStaffs(query: any) {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      role: {
        roleCode: 'STAFF',
      },
    };

    if (query.search) {
      where.OR = [
        { username: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.facilityId) {
      if (query.facilityId === 'none') {
        where.staffProfile = {
          assignedFacilityId: null,
        };
      } else {
        where.staffProfile = {
          assignedFacilityId: query.facilityId,
        };
      }
    }

    const [total, staffs] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          staffProfile: {
            select: {
              citizenId: true,
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

    const mappedStaffs = staffs.map((s) => ({
      id: s.id,
      username: s.username,
      email: s.email,
      phone: s.phone,
      status: s.status,
      createdAt: s.createdAt,
      citizenId: s.staffProfile?.citizenId || null,
      assignedFacilityId: s.staffProfile?.assignedFacilityId || null,
      assignedFacility: s.staffProfile?.assignedFacility || null,
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
    const staff = await prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
        role: {
          roleCode: 'STAFF',
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        staffProfile: {
          select: {
            citizenId: true,
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

    if (!staff) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    return {
      id: staff.id,
      username: staff.username,
      email: staff.email,
      phone: staff.phone,
      status: staff.status,
      createdAt: staff.createdAt,
      citizenId: staff.staffProfile?.citizenId || null,
      assignedFacilityId: staff.staffProfile?.assignedFacilityId || null,
      assignedFacility: staff.staffProfile?.assignedFacility || null,
    };
  }

  public async createStaff(dto: CreateStaffDto) {
    // Check if email already exists
    const existing = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        email: dto.email,
      },
    });

    if (existing) {
      throw new BadRequestException('Email đã tồn tại trên hệ thống');
    }

    // Check if citizenId already exists if provided
    if (dto.citizenId) {
      const existingCitizen = await prisma.staffProfile.findFirst({
        where: {
          citizenId: dto.citizenId,
          deletedAt: null,
        },
      });
      if (existingCitizen) {
        throw new BadRequestException('Số CCCD đã tồn tại trên hệ thống');
      }
    }

    // Verify facility exists if provided
    if (dto.assignedFacilityId) {
      const facility = await prisma.facility.findFirst({
        where: { id: dto.assignedFacilityId, deletedAt: null },
      });
      if (!facility) {
        throw new NotFoundException('Không tìm thấy kho hàng được chỉ định');
      }
    }

    // Generate unique username from Full Name (lower case, remove accents/diacritics/spaces, append random number)
    let slug = dto.fullName.toLowerCase();
    slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    slug = slug.replace(/[đĐ]/g, "d");
    slug = slug.replace(/\s+/g, "");
    slug = slug.replace(/[^a-z0-9_]/g, "");
    const usernamePrefix = slug.substring(0, 20) || 'staff';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const username = `${usernamePrefix}_${randomSuffix}`;

    // Generate secure random password: Staff@ + 6 random digits
    const rawPassword = `Staff@${Math.floor(100000 + Math.random() * 900000)}`;
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const staffRole = await prisma.role.findUnique({
      where: { roleCode: 'STAFF' },
    });

    if (!staffRole) {
      throw new BadRequestException('Hệ thống chưa cấu hình vai trò Nhân viên (STAFF)');
    }

    const newStaff = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email: dto.email,
          passwordHash,
          phone: dto.phone || null,
          status: 'ACTIVE',
          roleId: staffRole.id,
        },
      });

      const profile = await tx.staffProfile.create({
        data: {
          userId: user.id,
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

    // Fetch facility info if assigned to send in the email
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
      email: newStaff.user.email,
      phone: newStaff.user.phone,
      status: newStaff.user.status,
      citizenId: newStaff.profile.citizenId,
      assignedFacilityId: newStaff.profile.assignedFacilityId,
      assignedFacility: newStaff.profile.assignedFacility,
    };
  }

  public async updateStaff(id: string, dto: UpdateStaffDto) {
    const staff = await prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
        role: {
          roleCode: 'STAFF',
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    // Check unique email if updating email
    if (dto.email && dto.email !== staff.email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: dto.email,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (existingEmail) {
        throw new BadRequestException('Email đã được sử dụng bởi người dùng khác');
      }
    }

    // Check unique citizenId if provided
    if (dto.citizenId) {
      const existingCitizen = await prisma.staffProfile.findFirst({
        where: {
          citizenId: dto.citizenId,
          deletedAt: null,
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
        where: { id: dto.assignedFacilityId, deletedAt: null },
      });
      if (!facility) {
        throw new NotFoundException('Không tìm thấy kho hàng được chỉ định');
      }
    }

    const data: any = {
      phone: dto.phone !== undefined ? dto.phone : undefined,
      status: dto.status !== undefined ? dto.status : undefined,
    };

    if (dto.email) {
      data.email = dto.email;
    }

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data,
      });

      const profile = await tx.staffProfile.upsert({
        where: { userId: id },
        update: {
          citizenId: dto.citizenId !== undefined ? dto.citizenId : undefined,
          assignedFacilityId: dto.assignedFacilityId !== undefined ? dto.assignedFacilityId : undefined,
        },
        create: {
          userId: id,
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

    return {
      id: updated.user.id,
      username: updated.user.username,
      email: updated.user.email,
      phone: updated.user.phone,
      status: updated.user.status,
      citizenId: updated.profile.citizenId,
      assignedFacilityId: updated.profile.assignedFacilityId,
      assignedFacility: updated.profile.assignedFacility,
    };
  }

  public async deleteStaff(id: string) {
    const staff = await prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
        role: {
          roleCode: 'STAFF',
        },
      },
      include: {
        staffProfile: true,
      },
    });

    if (!staff) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    const timestamp = Date.now();
    const deletedEmail = `del_${timestamp}_${staff.email.slice(0, 50)}@deleted.com`;
    const deletedUsername = `del_${timestamp.toString().slice(-6)}_${staff.username.slice(0, 30)}`;
    const deletedPhone = staff.phone
      ? `del_${staff.phone.substring(0, 10)}_${timestamp.toString().slice(-4)}`
      : null;

    // Soft delete by updating deletedAt in transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: 'DISABLED',
          email: deletedEmail.slice(0, 255),
          username: deletedUsername.slice(0, 50),
          phone: deletedPhone,
        },
      });

      if (staff.staffProfile) {
        const deletedCitizenId = staff.staffProfile.citizenId
          ? `del_${timestamp.toString().slice(-4)}_${staff.staffProfile.citizenId.substring(0, 11)}`
          : null;

        await tx.staffProfile.update({
          where: { userId: id },
          data: {
            deletedAt: new Date(),
            citizenId: deletedCitizenId,
          },
        });
      }
    });

    return { id };
  }
}
