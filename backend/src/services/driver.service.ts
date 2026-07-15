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
    // Check if phone already exists in drivers table
    const phoneExists = await prisma.driver.findUnique({
      where: { phone: dto.phone },
    });
    if (phoneExists) {
      throw new BadRequestException('Số điện thoại tài xế đã tồn tại trên hệ thống');
    }

    // Check if citizenId already exists in drivers table if provided
    if (dto.citizenId) {
      const citizenExists = await prisma.driver.findUnique({
        where: { citizenId: dto.citizenId },
      });
      if (citizenExists) {
        throw new BadRequestException('Số CCCD tài xế đã tồn tại trên hệ thống');
      }
    }

    // Check home facility if provided
    if (dto.homeFacilityId) {
      const facilityExists = await prisma.facility.findUnique({
        where: { id: dto.homeFacilityId, deletedAt: null },
      });
      if (!facilityExists) {
        throw new BadRequestException('Kho bãi hoạt động không tồn tại hoặc đã bị xóa');
      }
    }

    // Generate unique employee code by finding the highest current code
    const latestDriver = await prisma.driver.findFirst({
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

    // Always check if email already exists
    const emailExists = await prisma.user.findFirst({
      where: {
        email: dto.email,
        deletedAt: null,
      },
    });

    if (emailExists) {
      throw new BadRequestException('Địa chỉ email tài khoản đã được đăng ký');
    }

    // Generate unique username from Full Name (lower case, remove accents/diacritics/spaces, append random number)
    let slug = dto.fullName.toLowerCase();
    slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    slug = slug.replace(/[đĐ]/g, "d");
    slug = slug.replace(/\s+/g, "");
    slug = slug.replace(/[^a-z0-9_]/g, "");
    const usernamePrefix = slug.substring(0, 20);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const username = `${usernamePrefix}_${randomSuffix}`;

    const role = await prisma.role.findUnique({
      where: { roleCode: 'SHIPPER' },
    });

    if (!role) {
      throw new BadRequestException("Vai trò 'SHIPPER' không tồn tại trên hệ thống");
    }

    // Generate a secure random password: Drv@ + 6 random digits
    const rawPassword = `Drv@${Math.floor(100000 + Math.random() * 900000)}`;
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // Create User and Driver in a transaction
    const driver = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email: dto.email,
          passwordHash,
          phone: dto.phone,
          status: 'ACTIVE',
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });

      return await tx.driver.create({
        data: {
          employeeCode,
          fullName: dto.fullName,
          phone: dto.phone,
          citizenId: dto.citizenId || null,
          driverLicenseNumber: dto.driverLicenseNumber,
          driverLicenseClass: dto.driverLicenseClass,
          hireDate: new Date(dto.hireDate),
          employmentStatus: dto.employmentStatus || 'ACTIVE',
          userId: user.id,
          homeFacilityId: dto.homeFacilityId || null,
          note: dto.note || null,
          preferredLatitude: dto.preferredLatitude !== undefined ? dto.preferredLatitude : null,
          preferredLongitude: dto.preferredLongitude !== undefined ? dto.preferredLongitude : null,
          driverType: dto.driverType || 'HUB_DELIVERY',
        },
        include: {
          homeFacility: true,
          user: {
            select: {
              username: true,
              email: true,
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
   * Get list of drivers with pagination, search, and filters (including home facility classification)
   */
  public async getDrivers(query: { page?: string; limit?: string; search?: string; facilityId?: string; status?: string }) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { employeeCode: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.facilityId) {
      where.homeFacilityId = query.facilityId;
    }

    if (query.status) {
      where.employmentStatus = query.status;
    }

    const [total, drivers] = await prisma.$transaction([
      prisma.driver.count({ where }),
      prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          homeFacility: {
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
              email: true,
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
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        homeFacility: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
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

    if (!driver || driver.deletedAt) {
      throw new NotFoundException('Không tìm thấy thông tin tài xế');
    }

    return driver;
  }

  /**
   * Update driver details
   */
  public async updateDriver(id: string, dto: UpdateDriverDto) {
    const driver = await prisma.driver.findUnique({
      where: { id, deletedAt: null },
    });

    if (!driver) {
      throw new NotFoundException('Không tìm thấy thông tin tài xế để cập nhật');
    }

    // Check unique phone if it changed
    if (dto.phone && dto.phone !== driver.phone) {
      const phoneExists = await prisma.driver.findUnique({
        where: { phone: dto.phone },
      });
      if (phoneExists) {
        throw new BadRequestException('Số điện thoại mới đã tồn tại trên hệ thống');
      }
    }

    // Check unique citizenId if it changed
    if (dto.citizenId && dto.citizenId !== driver.citizenId) {
      const citizenExists = await prisma.driver.findUnique({
        where: { citizenId: dto.citizenId },
      });
      if (citizenExists) {
        throw new BadRequestException('Số CCCD mới đã tồn tại trên hệ thống');
      }
    }

    // Check user linkage if it changed
    if (dto.userId && dto.userId !== driver.userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: dto.userId, deletedAt: null },
      });
      if (!userExists) {
        throw new BadRequestException('Tài khoản người dùng liên kết mới không tồn tại');
      }

      const driverUserLinked = await prisma.driver.findUnique({
        where: { userId: dto.userId },
      });
      if (driverUserLinked) {
        throw new BadRequestException('Tài khoản người dùng này đã liên kết với tài xế khác');
      }
    }

    // Check home facility if it changed
    if (dto.homeFacilityId && dto.homeFacilityId !== driver.homeFacilityId) {
      const facilityExists = await prisma.facility.findUnique({
        where: { id: dto.homeFacilityId, deletedAt: null },
      });
      if (!facilityExists) {
        throw new BadRequestException('Kho bãi hoạt động mới không tồn tại hoặc đã bị xóa');
      }
    }

    return await prisma.driver.update({
      where: { id },
      data: {
        fullName: dto.fullName ?? driver.fullName,
        phone: dto.phone ?? driver.phone,
        citizenId: dto.citizenId !== undefined ? dto.citizenId : driver.citizenId,
        driverLicenseNumber: dto.driverLicenseNumber ?? driver.driverLicenseNumber,
        driverLicenseClass: dto.driverLicenseClass ?? driver.driverLicenseClass,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : driver.hireDate,
        employmentStatus: dto.employmentStatus ?? driver.employmentStatus,
        userId: dto.userId !== undefined ? dto.userId : driver.userId,
        homeFacilityId: dto.homeFacilityId !== undefined ? dto.homeFacilityId : driver.homeFacilityId,
        note: dto.note !== undefined ? dto.note : driver.note,
        preferredLatitude: dto.preferredLatitude !== undefined ? dto.preferredLatitude : driver.preferredLatitude,
        preferredLongitude: dto.preferredLongitude !== undefined ? dto.preferredLongitude : driver.preferredLongitude,
        driverType: dto.driverType ?? driver.driverType,
      },
      include: {
        homeFacility: true,
        user: {
          select: {
            username: true,
            email: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Soft delete driver profile
   */
  public async deleteDriver(id: string) {
    const driver = await prisma.driver.findUnique({
      where: { id, deletedAt: null },
      include: { user: true },
    });

    if (!driver) {
      throw new NotFoundException('Không tìm thấy tài xế để xóa');
    }

    // Optional business rules: Can check if they have active dispatch tasks or in-progress routes
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

    const timestamp = Date.now();
    const deletedPhone = `del_${driver.phone.substring(0, 10)}_${timestamp.toString().slice(-4)}`;
    const deletedCitizenId = driver.citizenId
      ? `del_${timestamp.toString().slice(-4)}_${driver.citizenId.substring(0, 11)}`
      : null;

    await prisma.$transaction(async (tx) => {
      // 1. Soft delete the driver, release the unique phone number and citizen_id
      await tx.driver.update({
        where: { id },
        data: { 
          deletedAt: new Date(),
          phone: deletedPhone,
          citizenId: deletedCitizenId,
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

      // 3. Soft delete the associated User and release username/email/phone
      if (driver.userId && driver.user) {
        const deletedEmail = `del_${timestamp}_${driver.user.email.slice(0, 50)}@deleted.com`;
        const deletedUsername = `del_${timestamp.toString().slice(-6)}_${driver.user.username.slice(0, 30)}`;
        const deletedUserPhone = driver.user.phone
          ? `del_${driver.user.phone.substring(0, 10)}_${timestamp.toString().slice(-4)}`
          : null;

        await tx.user.update({
          where: { id: driver.userId },
          data: {
            deletedAt: new Date(),
            status: 'LOCKED',
            email: deletedEmail.slice(0, 255),
            username: deletedUsername.slice(0, 50),
            phone: deletedUserPhone,
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
        deletedAt: null,
        driver: null,
        userRoles: {
          some: {
            role: {
              roleCode: 'SHIPPER',
            },
          },
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
      },
    });
  }

  /**
   * Assign a vehicle to a driver
   */
  public async assignVehicle(dto: { driverId: string; vehicleId: string }) {
    // 1. Fetch driver and vehicle
    const driver = await prisma.driver.findUnique({
      where: { id: dto.driverId, deletedAt: null },
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

    // 2. Validate License compatibility
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

    const driverRank = licenseHierarchy[driver.driverLicenseClass.toUpperCase()] || 0;
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
        `Tài xế có bằng hạng ${driver.driverLicenseClass} không đủ điều kiện điều khiển phương tiện loại ${vehicle.vehicleType.typeName} (Yêu cầu tối thiểu ${
          vehicleTypeCode === 'CONTAINER' ? 'FC' : (vehicleTypeCode === 'REFRIGERATED_TRUCK' ? 'C' : 'B2')
        })`
      );
    }

    // 3. Perform 1:1 assignment inside a Transaction
    return await prisma.$transaction(async (tx) => {
      // A. Deactivate any active assignments of this driver
      await tx.driverVehicleAssignment.updateMany({
        where: { driverId: dto.driverId, isActive: true },
        data: { isActive: false, assignedTo: new Date() },
      });

      // B. Deactivate any active assignments of this vehicle
      await tx.driverVehicleAssignment.updateMany({
        where: { vehicleId: dto.vehicleId, isActive: true },
        data: { isActive: false, assignedTo: new Date() },
      });

      // C. Create new assignment
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
            homeFacility: {
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
}
