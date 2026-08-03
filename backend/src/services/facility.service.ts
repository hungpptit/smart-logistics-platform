import { prisma } from '../config/prisma';
import { CreateFacilityDto, UpdateFacilityDto, CreateFacilityZoneDto, UpdateFacilityZoneDto } from '../dtos/facility.dto';
import { BadRequestException, NotFoundException } from '../middlewares/error.middleware';
import { resolveAddressDetails } from '../utils/address-resolver';

export class FacilityService {
  /**
   * Create a new facility with address
   */
  public async createFacility(dto: CreateFacilityDto) {
    // Check if facility type exists
    const typeExists = await prisma.facilityType.findUnique({
      where: { id: dto.facilityTypeId },
    });
    if (!typeExists) {
      throw new BadRequestException('Mã loại kho bãi không tồn tại');
    }

    // Check parent facility if provided
    if (dto.parentFacilityId) {
      const parentExists = await prisma.facility.findUnique({
        where: { id: dto.parentFacilityId, operatingStatus: { not: 'CLOSED' } },
      });
      if (!parentExists) {
        throw new BadRequestException('Kho bãi cha không tồn tại hoặc đã bị xóa');
      }
    }

    // Check manager user if provided
    if (dto.managerUserId) {
      const managerExists = await prisma.user.findFirst({
        where: { id: dto.managerUserId },
      });
      if (!managerExists) {
        throw new BadRequestException('Tài khoản người quản lý không tồn tại');
      }
    }

    // Generate unique facility code
    const count = await prisma.facility.count();
    const facilityCode = `FAC-${String(count + 1).padStart(6, '0')}`;

    const resolved = await resolveAddressDetails(dto.address);
    const formattedAddress = `${dto.address.addressLine1}, ${resolved.ward}, ${resolved.province}, ${dto.address.country || 'Vietnam'}`;

    return await prisma.$transaction(async (tx) => {
      // 1. Create Address
      const address = await tx.address.create({
        data: {
          addressLine1: dto.address.addressLine1,
          country: dto.address.country || 'Vietnam',
          latitude: dto.address.latitude,
          longitude: dto.address.longitude,
          formattedAddress,
          wardCode: resolved.wardCode,
        },
      });

      // 2. Create Facility with addressId
      const facility = await tx.facility.create({
        data: {
          facilityCode,
          facilityName: dto.facilityName,
          facilityTypeId: dto.facilityTypeId,
          parentFacilityId: dto.parentFacilityId || null,
          managerUserId: dto.managerUserId || null,
          addressId: address.id,
          operatingStatus: dto.operatingStatus || 'ACTIVE',
          openedAt: new Date(dto.openedAt),
        },
      });

      return {
        ...facility,
        address,
      };
    });
  }

  /**
   * Get all facilities with pagination and filters
   */
  public async getFacilities(query: { page?: string; limit?: string; search?: string; typeId?: string; status?: string }) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = { operatingStatus: { not: 'CLOSED' } };

    if (query.search) {
      where.OR = [
        { facilityCode: { contains: query.search, mode: 'insensitive' } },
        { facilityName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.typeId) {
      where.facilityTypeId = query.typeId;
    }

    if (query.status) {
      where.operatingStatus = query.status;
    }

    const [total, facilities] = await prisma.$transaction([
      prisma.facility.count({ where }),
      prisma.facility.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          facilityType: true,
          address: true,
          manager: {
            select: {
              username: true,
              staff: {
                select: {
                  fullName: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      facilities,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get facility details by ID
   */
  public async getFacilityById(id: string) {
    const facility = await prisma.facility.findUnique({
      where: { id },
      include: {
        facilityType: true,
        parentFacility: true,
        childFacilities: {
          where: { operatingStatus: { not: 'CLOSED' } },
        },
        address: true,
        facilityZones: true,
        manager: {
          select: {
            id: true,
            username: true,
            staff: {
              select: {
                fullName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!facility || facility.operatingStatus === 'CLOSED') {
      throw new NotFoundException('Không tìm thấy thông tin kho bãi');
    }

    return facility;
  }

  /**
   * Update facility details
   */
  public async updateFacility(id: string, dto: UpdateFacilityDto) {
    const facility = await prisma.facility.findUnique({
      where: { id, operatingStatus: { not: 'CLOSED' } },
    });

    if (!facility) {
      throw new NotFoundException('Không tìm thấy kho bãi để cập nhật');
    }

    // Check parent facility if changing
    if (dto.parentFacilityId && dto.parentFacilityId !== facility.parentFacilityId) {
      if (dto.parentFacilityId === id) {
        throw new BadRequestException('Một kho bãi không thể làm cha của chính nó');
      }
      const parentExists = await prisma.facility.findUnique({
        where: { id: dto.parentFacilityId, operatingStatus: { not: 'CLOSED' } },
      });
      if (!parentExists) {
        throw new BadRequestException('Kho bãi cha mới không tồn tại');
      }
    }

    return await prisma.facility.update({
      where: { id },
      data: {
        facilityName: dto.facilityName ?? facility.facilityName,
        facilityTypeId: dto.facilityTypeId ?? facility.facilityTypeId,
        parentFacilityId: dto.parentFacilityId !== undefined ? dto.parentFacilityId : facility.parentFacilityId,
        managerUserId: dto.managerUserId !== undefined ? dto.managerUserId : facility.managerUserId,
        operatingStatus: dto.operatingStatus ?? facility.operatingStatus,
        closedAt: dto.closedAt ? new Date(dto.closedAt) : facility.closedAt,
      },
    });
  }

  /**
   * Soft delete facility
   */
  public async deleteFacility(id: string) {
    const facility = await prisma.facility.findUnique({
      where: { id, operatingStatus: { not: 'CLOSED' } },
      include: {
        childFacilities: { where: { operatingStatus: { not: 'CLOSED' } } },
      },
    });

    if (!facility) {
      throw new NotFoundException('Không tìm thấy kho bãi để xóa');
    }

    // Business rule: Can't delete if there are active child facilities
    if (facility.childFacilities.length > 0) {
      throw new BadRequestException('Không thể xóa kho bãi đang chứa các kho/bưu cục con trực thuộc');
    }

    // Check if there are active shipments/routes currently associated with it
    const activeRoute = await prisma.route.findFirst({
      where: {
        OR: [
          { startFacilityId: id },
          { endFacilityId: id },
        ],
        status: { in: ['PLANNED', 'ASSIGNED', 'IN_PROGRESS'] },
      },
    });

    if (activeRoute) {
      throw new BadRequestException('Không thể xóa kho bãi đang có tuyến vận chuyển hoạt động đi/đến');
    }

    await prisma.facility.update({
      where: { id },
      data: { operatingStatus: 'CLOSED', closedAt: new Date() },
    });

    return { success: true };
  }

  // --- Cargo Zone Services ---

  /**
   * Create a cargo zone in facility
   */
  public async createZone(facilityId: string, dto: CreateFacilityZoneDto) {
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId, operatingStatus: { not: 'CLOSED' } },
    });

    if (!facility) {
      throw new NotFoundException('Không tìm thấy kho bãi để tạo phân khu');
    }

    // Check if zone code already exists in this facility
    const zoneExists = await prisma.facilityZone.findUnique({
      where: {
        facilityId_zoneCode: {
          facilityId,
          zoneCode: dto.zoneCode,
        },
      },
    });

    if (zoneExists) {
      throw new BadRequestException(`Mã phân khu '${dto.zoneCode}' đã tồn tại trong kho này`);
    }

    return await prisma.facilityZone.create({
      data: {
        facilityId,
        zoneCode: dto.zoneCode,
        zoneName: dto.zoneName,
        zoneType: dto.zoneType,
        capacity: dto.capacity || null,
      },
    });
  }

  /**
   * Get all zones of a facility
   */
  public async getZones(facilityId: string) {
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId, operatingStatus: { not: 'CLOSED' } },
    });

    if (!facility) {
      throw new NotFoundException('Không tìm thấy thông tin kho bãi');
    }

    return await prisma.facilityZone.findMany({
      where: { facilityId },
      orderBy: { zoneCode: 'asc' },
    });
  }

  /**
   * Update zone details
   */
  public async updateZone(facilityId: string, zoneId: string, dto: UpdateFacilityZoneDto) {
    const zone = await prisma.facilityZone.findFirst({
      where: { id: zoneId, facilityId },
    });

    if (!zone) {
      throw new NotFoundException('Không tìm thấy phân khu trong kho bãi này');
    }

    return await prisma.facilityZone.update({
      where: { id: zoneId },
      data: {
        zoneName: dto.zoneName ?? zone.zoneName,
        zoneType: dto.zoneType ?? zone.zoneType,
        capacity: dto.capacity !== undefined ? dto.capacity : zone.capacity,
      },
    });
  }

  /**
   * Delete zone from facility
   */
  public async deleteZone(facilityId: string, zoneId: string) {
    const zone = await prisma.facilityZone.findFirst({
      where: { id: zoneId, facilityId },
    });

    if (!zone) {
      throw new NotFoundException('Không tìm thấy phân khu để xóa');
    }

    // Simple delete as packages are not directly tied to zones in schema relations
    await prisma.facilityZone.delete({
      where: { id: zoneId },
    });

    return { success: true };
  }

  /**
   * Get all facility types
   */
  public async getFacilityTypes() {
    return await prisma.facilityType.findMany({
      orderBy: { typeCode: 'asc' },
    });
  }
}
