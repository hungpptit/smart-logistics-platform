import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { CreateDriverDto, UpdateDriverDto } from '../dtos/driver.dto';
import { BadRequestException, NotFoundException } from '../middlewares/error.middleware';
import { rabbitMQService } from './rabbitmq.service';

export class DriverService {
  /**
   * Create a new driver profile
   */
  public async createDriver(dto: CreateDriverDto) {
    // Check if phone already exists in staff table
    const phoneExists = await prisma.staff.findFirst({
      where: { phone: dto.phone, user: { status: 'ACTIVE' } },
    });
    if (phoneExists) {
      throw new BadRequestException('Số điện thoại tài xế đã tồn tại trên hệ thống');
    }

    // Check if citizenId already exists in staff table if provided
    if (dto.citizenId) {
      const citizenExists = await prisma.staff.findUnique({
        where: { citizenId: dto.citizenId },
      });
      if (citizenExists) {
        throw new BadRequestException('Số CCCD tài xế đã tồn tại trên hệ thống');
      }
    }

    // Check home facility if provided
    if (dto.homeFacilityId) {
      const facilityExists = await prisma.facility.findUnique({
        where: { id: dto.homeFacilityId },
      });
      if (!facilityExists) {
        throw new BadRequestException('Kho bãi hoạt động không tồn tại hoặc đã bị xóa');
      }
    }

    // Generate unique employee code by finding the highest current code
    const latestDriver = await prisma.staff.findFirst({
      orderBy: { employeeCode: 'desc' },
    });

    let nextNumber = 1;
    if (latestDriver) {
      const match = latestDriver.employeeCode.match(/DRV-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    const employeeCode = `DRV-${String(nextNumber).padStart(6, '0')}`;

    // Always check if email already exists in staff
    const emailExists = await prisma.staff.findFirst({
      where: {
        email: dto.email,
        user: { status: 'ACTIVE' },
      },
    });

    if (emailExists) {
      throw new BadRequestException('Địa chỉ email tài khoản đã được đăng ký');
    }

    // Generate or check unique username
    let username = dto.username?.trim();
    if (username) {
      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser) {
        throw new BadRequestException('Tên đăng nhập đã tồn tại trên hệ thống. Vui lòng chọn tên khác.');
      }
    } else {
      let slug = dto.fullName.toLowerCase();
      slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      slug = slug.replace(/[đĐ]/g, "d");
      slug = slug.replace(/\s+/g, "");
      slug = slug.replace(/[^a-z0-9_]/g, "");
      const usernamePrefix = slug.substring(0, 20) || 'driver';
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      username = `${usernamePrefix}_${randomSuffix}`;
    }

    const role = await prisma.role.findUnique({
      where: { roleCode: 'SHIPPER' },
    });

    if (!role) {
      throw new BadRequestException("Vai trò 'SHIPPER' không tồn tại trên hệ thống");
    }

    // Generate a secure random password: Drv@ + 6 random digits
    const rawPassword = `Drv@${Math.floor(100000 + Math.random() * 900000)}`;
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // Create User and Staff (Driver profile) in a transaction
    const driver = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          passwordHash,
          status: 'ACTIVE',
          roleId: role.id,
        },
      });

      return await tx.staff.create({
        data: {
          employeeCode,
          fullName: dto.fullName,
          phone: dto.phone,
          email: dto.email,
          position: 'DRIVER',
          citizenId: dto.citizenId || null,
          driverLicenseNumber: dto.driverLicenseNumber,
          driverLicenseClass: dto.driverLicenseClass,
          hireDate: new Date(dto.hireDate),
          employmentStatus: dto.employmentStatus || 'ACTIVE',
          userId: user.id,
          assignedFacilityId: dto.homeFacilityId || null,
          driverType: dto.driverType || 'HUB_DELIVERY',
        },
        include: {
          assignedFacility: true,
          user: {
            select: {
              username: true,
              status: true,
            },
          },
        },
      });
    });

    // Publish notification message to RabbitMQ mail_queue
    await rabbitMQService.publishToQueue('mail_queue', {
      type: 'DRIVER_CREATED',
      email: dto.email,
      username,
      fullName: dto.fullName,
      phone: dto.phone || undefined,
      password: rawPassword,
      employeeCode,
    });

    return driver;
  }

  /**
   * Get list of drivers with pagination, search, and filters
   */
  public async getDrivers(query: { page?: string; limit?: string; search?: string; facilityId?: string; status?: string }) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = { user: { status: 'ACTIVE' }, position: 'DRIVER' };

    if (query.search) {
      where.OR = [
        { employeeCode: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.facilityId) {
      where.assignedFacilityId = query.facilityId;
    }

    if (query.status) {
      where.employmentStatus = query.status;
    }

    const [total, drivers] = await prisma.$transaction([
      prisma.staff.count({ where }),
      prisma.staff.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedFacility: {
            select: {
              id: true,
              facilityCode: true,
              facilityName: true,
            },
          },
          user: {
            select: {
              id: true,
              username: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      drivers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get driver details by ID
   */
  public async getDriverById(id: string) {
    const driver = await prisma.staff.findUnique({
      where: { id },
      include: {
        assignedFacility: true,
        user: {
          select: {
            id: true,
            username: true,
            status: true,
          },
        },
        assignments: {
          include: {
            vehicle: true,
          },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Không tìm thấy thông tin tài xế');
    }

    return driver;
  }

  /**
   * Update driver details
   */
  public async updateDriver(id: string, dto: UpdateDriverDto) {
    const driver = await prisma.staff.findUnique({
      where: { id },
    });

    if (!driver) {
      throw new NotFoundException('Không tìm thấy thông tin tài xế để cập nhật');
    }

    // Check unique phone if it changed
    if (dto.phone && dto.phone !== driver.phone) {
      const phoneExists = await prisma.staff.findFirst({
        where: { phone: dto.phone, user: { status: 'ACTIVE' }, NOT: { id } },
      });
      if (phoneExists) {
        throw new BadRequestException('Số điện thoại mới đã tồn tại trên hệ thống');
      }
    }

    // Check unique citizenId if it changed
    if (dto.citizenId && dto.citizenId !== driver.citizenId) {
      const citizenExists = await prisma.staff.findUnique({
        where: { citizenId: dto.citizenId },
      });
      if (citizenExists) {
        throw new BadRequestException('Số CCCD mới đã tồn tại trên hệ thống');
      }
    }

    // Check home facility if it changed
    if (dto.homeFacilityId && dto.homeFacilityId !== driver.assignedFacilityId) {
      const facilityExists = await prisma.facility.findUnique({
        where: { id: dto.homeFacilityId },
      });
      if (!facilityExists) {
        throw new BadRequestException('Kho bãi hoạt động mới không tồn tại hoặc đã bị xóa');
      }
    }

    return await prisma.staff.update({
      where: { id },
      data: {
        fullName: dto.fullName !== undefined ? dto.fullName : driver.fullName,
        phone: dto.phone !== undefined ? dto.phone : driver.phone,
        citizenId: dto.citizenId !== undefined ? dto.citizenId : driver.citizenId,
        driverLicenseNumber: dto.driverLicenseNumber ?? driver.driverLicenseNumber,
        driverLicenseClass: dto.driverLicenseClass ?? driver.driverLicenseClass,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : driver.hireDate,
        employmentStatus: (dto.employmentStatus as any) ?? driver.employmentStatus,
        userId: dto.userId !== undefined ? dto.userId : driver.userId,
        assignedFacilityId: dto.homeFacilityId !== undefined ? dto.homeFacilityId : driver.assignedFacilityId,
        driverType: (dto.driverType as any) ?? driver.driverType,
      },
      include: {
        assignedFacility: true,
        user: {
          select: {
            username: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Soft hide driver profile
   */
  public async deleteDriver(id: string) {
    const driver = await prisma.staff.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!driver) {
      throw new NotFoundException('Không tìm thấy tài xế để xóa');
    }

    // Check active route assignments
    const activeRoute = await prisma.route.findFirst({
      where: {
        driverVehicleAssignment: {
          driverId: id,
        },
        status: { in: ['PLANNED', 'ASSIGNED', 'IN_PROGRESS'] },
      },
    });

    if (activeRoute) {
      throw new BadRequestException('Không thể xóa tài xế đang thực hiện lộ trình giao hàng');
    }

    await prisma.$transaction(async (tx) => {
      // 1. Soft delete driver profile status
      await tx.staff.update({
        where: { id },
        data: {
          employmentStatus: 'DISABLED',
        },
      });

      // 2. Deactivate any active vehicle assignments
      await tx.driverVehicleAssignment.updateMany({
        where: {
          driverId: id,
          isActive: true,
        },
        data: {
          isActive: false,
          assignedTo: new Date(),
        },
      });

      // 3. Disable associated User
      if (driver.userId) {
        await tx.user.update({
          where: { id: driver.userId },
          data: {
            status: 'DISABLED',
          },
        });
      }
    });

    return { success: true };
  }

  /**
   * Get unlinked users with SHIPPER role
   */
  public async getUnlinkedUsers() {
    return await prisma.user.findMany({
      where: {
        staff: null,
        role: {
          roleCode: 'SHIPPER',
        },
      },
      select: {
        id: true,
        username: true,
      },
    });
  }

  /**
   * Assign a vehicle to a driver
   */
  public async assignVehicle(dto: { driverId: string; vehicleId: string }) {
    const driver = await prisma.staff.findUnique({
      where: { id: dto.driverId },
    });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy tài xế hoạt động');
    }

    if (driver.employmentStatus !== 'ACTIVE') {
      throw new BadRequestException('Tài xế đang không ở trạng thái hoạt động (ACTIVE)');
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
      include: { vehicleType: true },
    });
    if (!vehicle) {
      throw new NotFoundException('Không tìm thấy phương tiện');
    }

    if (vehicle.operatingStatus !== 'ACTIVE') {
      throw new BadRequestException('Phương tiện đang không ở trạng thái hoạt động tốt (ACTIVE)');
    }

    // Validate License compatibility
    const licenseHierarchy: Record<string, number> = {
      'A1': 1,
      'A2': 2,
      'B1': 3,
      'B2': 4,
      'C': 5,
      'D': 6,
      'E': 7,
      'FC': 8,
      'FE': 9
    };

    const driverLicenseClass = driver.driverLicenseClass || 'B2';
    const driverRank = licenseHierarchy[driverLicenseClass.toUpperCase()] || 0;
    const vehicleTypeCode = vehicle.vehicleType.typeCode.toUpperCase();

    let isCompatible = true;
    if (vehicleTypeCode === 'VAN' || vehicleTypeCode === 'TRUCK_1T5') {
      isCompatible = driverRank >= licenseHierarchy['B2'];
    } else if (vehicleTypeCode === 'REFRIGERATED_TRUCK') {
      isCompatible = driverRank >= licenseHierarchy['C'];
    } else if (vehicleTypeCode === 'CONTAINER') {
      isCompatible = driverRank >= licenseHierarchy['FC'];
    }

    if (!isCompatible) {
      throw new BadRequestException(
        `Tài xế có bằng hạng ${driverLicenseClass} không đủ điều kiện điều khiển phương tiện loại ${vehicle.vehicleType.typeName}`
      );
    }

    return await prisma.$transaction(async (tx) => {
      await tx.driverVehicleAssignment.updateMany({
        where: { driverId: dto.driverId, isActive: true },
        data: { isActive: false, assignedTo: new Date() },
      });

      await tx.driverVehicleAssignment.updateMany({
        where: { vehicleId: dto.vehicleId, isActive: true },
        data: { isActive: false, assignedTo: new Date() },
      });

      return await tx.driverVehicleAssignment.create({
        data: {
          driverId: dto.driverId,
          vehicleId: dto.vehicleId,
          assignedFrom: new Date(),
          isActive: true,
        },
        include: {
          driver: true,
          vehicle: {
            include: {
              vehicleType: true,
            },
          },
        },
      });
    });
  }

  /**
   * Terminate active vehicle assignment for a driver
   */
  public async terminateAssignment(driverId: string) {
    const activeAssignment = await prisma.driverVehicleAssignment.findFirst({
      where: { driverId, isActive: true },
    });

    if (!activeAssignment) {
      throw new NotFoundException('Tài xế hiện tại không có phương tiện nào đang gán');
    }

    return await prisma.driverVehicleAssignment.update({
      where: { id: activeAssignment.id },
      data: {
        isActive: false,
        assignedTo: new Date(),
      },
    });
  }

  /**
   * Get active vehicle assignments
   */
  public async getActiveAssignments() {
    return await prisma.driverVehicleAssignment.findMany({
      where: { isActive: true },
      include: {
        driver: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            phone: true,
            driverLicenseClass: true,
          },
        },
        vehicle: {
          include: {
            vehicleType: true,
            assignedFacility: {
              select: {
                id: true,
                facilityName: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Update duty status (ACTIVE / OFFLINE) for logged-in driver
   */
  public async updateDutyStatus(userId: string, status: 'ACTIVE' | 'OFFLINE') {
    const driver = await prisma.staff.findFirst({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException('Không tìm thấy thông tin tài xế');
    }

    if (driver.employmentStatus === 'SUSPENDED' || driver.employmentStatus === 'DISABLED') {
      throw new BadRequestException('Tài khoản tài xế của bạn đang ở trạng thái bị đình chỉ hoặc tạm khóa. Không thể đổi ca làm việc.');
    }

    return await prisma.staff.update({
      where: { id: driver.id },
      data: {
        employmentStatus: status as any,
      },
      include: {
        assignedFacility: true,
      },
    });
  }
}
