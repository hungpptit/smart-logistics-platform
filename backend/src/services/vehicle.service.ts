import { prisma } from '../config/prisma';
import { CreateVehicleDto, UpdateVehicleDto } from '../dtos/vehicle.dto';
import { BadRequestException, NotFoundException } from '../middlewares/error.middleware';

export class VehicleService {
  /**
   * Create a new vehicle
   */
  public async createVehicle(dto: CreateVehicleDto) {
    // Check if vehicleCode already exists
    const codeExists = await prisma.vehicle.findUnique({
      where: { vehicleCode: dto.vehicleCode },
    });
    if (codeExists) {
      throw new BadRequestException('Mã phương tiện đã tồn tại trên hệ thống');
    }

    // Check if plateNumber already exists
    const plateExists = await prisma.vehicle.findUnique({
      where: { plateNumber: dto.plateNumber },
    });
    if (plateExists) {
      throw new BadRequestException('Biển số xe đã tồn tại trên hệ thống');
    }

    // Check if vehicleType exists
    const typeExists = await prisma.vehicleType.findUnique({
      where: { id: dto.vehicleTypeId },
    });
    if (!typeExists) {
      throw new BadRequestException('Loại phương tiện không tồn tại');
    }

    // Check assigned facility if provided
    if (dto.assignedFacilityId) {
      const facilityExists = await prisma.facility.findUnique({
        where: { id: dto.assignedFacilityId, operatingStatus: { not: 'CLOSED' } },
      });
      if (!facilityExists) {
        throw new BadRequestException('Kho bãi hoạt động không tồn tại hoặc đã bị xóa');
      }
    }

    return await prisma.vehicle.create({
      data: {
        vehicleCode: dto.vehicleCode,
        plateNumber: dto.plateNumber,
        vehicleTypeId: dto.vehicleTypeId,
        assignedFacilityId: dto.assignedFacilityId || null,
        maxWeight: dto.maxWeight,
        maxVolume: dto.maxVolume,
        maxLength: dto.maxLength || null,
        isRefrigerated: dto.isRefrigerated || false,
        operatingStatus: dto.operatingStatus || 'ACTIVE',
      },
      include: {
        vehicleType: true,
        assignedFacility: {
          select: {
            id: true,
            facilityCode: true,
            facilityName: true,
          },
        },
      },
    });
  }

  /**
   * Get list of vehicles with filters and pagination
   */
  public async getVehicles(query: {
    page?: string;
    limit?: string;
    search?: string;
    facilityId?: string;
    status?: string;
    typeId?: string;
  }) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { vehicleCode: { contains: query.search, mode: 'insensitive' } },
        { plateNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.facilityId) {
      where.assignedFacilityId = query.facilityId;
    }

    if (query.status) {
      where.operatingStatus = query.status;
    }

    if (query.typeId) {
      where.vehicleTypeId = query.typeId;
    }

    const [total, vehicles] = await prisma.$transaction([
      prisma.vehicle.count({ where }),
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicleType: true,
          assignedFacility: {
            select: {
              id: true,
              facilityCode: true,
              facilityName: true,
            },
          },
        },
      }),
    ]);

    return {
      vehicles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get vehicle by ID
   */
  public async getVehicleById(id: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        vehicleType: true,
        assignedFacility: true,
        assignments: {
          where: { isActive: true },
          include: {
            driver: true,
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Không tìm thấy thông tin phương tiện');
    }

    return vehicle;
  }

  /**
   * Update vehicle information
   */
  public async updateVehicle(id: string, dto: UpdateVehicleDto) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundException('Không tìm thấy thông tin phương tiện');
    }

    // Check unique vehicleCode if changed
    if (dto.vehicleCode && dto.vehicleCode !== vehicle.vehicleCode) {
      const codeExists = await prisma.vehicle.findUnique({
        where: { vehicleCode: dto.vehicleCode },
      });
      if (codeExists) {
        throw new BadRequestException('Mã phương tiện đã tồn tại trong hệ thống');
      }
    }

    // Check unique plateNumber if changed
    if (dto.plateNumber && dto.plateNumber !== vehicle.plateNumber) {
      const plateExists = await prisma.vehicle.findUnique({
        where: { plateNumber: dto.plateNumber },
      });
      if (plateExists) {
        throw new BadRequestException('Biển số xe đã tồn tại trong hệ thống');
      }
    }

    // Check vehicleTypeId if changed
    if (dto.vehicleTypeId && dto.vehicleTypeId !== vehicle.vehicleTypeId) {
      const typeExists = await prisma.vehicleType.findUnique({
        where: { id: dto.vehicleTypeId },
      });
      if (!typeExists) {
        throw new BadRequestException('Loại phương tiện mới không tồn tại');
      }
    }

    // Check assignedFacilityId if changed
    if (dto.assignedFacilityId && dto.assignedFacilityId !== vehicle.assignedFacilityId) {
      const facilityExists = await prisma.facility.findUnique({
        where: { id: dto.assignedFacilityId, operatingStatus: { not: 'CLOSED' } },
      });
      if (!facilityExists) {
        throw new BadRequestException('Kho bãi hoạt động mới không tồn tại hoặc đã bị xóa');
      }
    }

    return await prisma.vehicle.update({
      where: { id },
      data: {
        vehicleCode: dto.vehicleCode ?? vehicle.vehicleCode,
        plateNumber: dto.plateNumber ?? vehicle.plateNumber,
        vehicleTypeId: dto.vehicleTypeId ?? vehicle.vehicleTypeId,
        assignedFacilityId: dto.assignedFacilityId !== undefined ? dto.assignedFacilityId : vehicle.assignedFacilityId,
        maxWeight: dto.maxWeight ?? vehicle.maxWeight,
        maxVolume: dto.maxVolume ?? vehicle.maxVolume,
        maxLength: dto.maxLength !== undefined ? dto.maxLength : vehicle.maxLength,
        isRefrigerated: dto.isRefrigerated ?? vehicle.isRefrigerated,
        operatingStatus: dto.operatingStatus ?? vehicle.operatingStatus,
      },
      include: {
        vehicleType: true,
        assignedFacility: {
          select: {
            id: true,
            facilityCode: true,
            facilityName: true,
          },
        },
      },
    });
  }

  /**
   * Delete vehicle
   */
  public async deleteVehicle(id: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        assignments: {
          where: { isActive: true },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Không tìm thấy phương tiện để xóa');
    }

    // Reject if vehicle currently has an active driver assignment
    if (vehicle.assignments.length > 0) {
      throw new BadRequestException('Không thể xóa phương tiện đang được phân công cho tài xế');
    }

    await prisma.vehicle.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Get all vehicle types
   */
  public async getVehicleTypes() {
    return await prisma.vehicleType.findMany({
      orderBy: { typeCode: 'asc' },
    });
  }
}
