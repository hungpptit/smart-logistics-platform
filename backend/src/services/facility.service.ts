import { prisma } from '../config/prisma';
import { CreateFacilityDto, UpdateFacilityDto, CreateFacilityZoneDto, UpdateFacilityZoneDto } from '../dtos/facility.dto';
import { BadRequestException, NotFoundException } from '../middlewares/error.middleware';
import { resolveAddressDetails } from '../utils/address-resolver';

export class FacilityService {
  /**
   * Create a new facility with address
   */
  /**
   * Validate 3-Tier Facility Hierarchy & Geographic Constraints
   */
  private async validateFacilityHierarchy(facilityTypeId: string, parentFacilityId?: string | null, provinceCode?: string | null) {
    const currentType = await prisma.facilityType.findUnique({ where: { id: facilityTypeId } });
    if (!currentType) {
      throw new BadRequestException('Mã loại kho bãi không tồn tại');
    }

    const typeCode = currentType.typeCode.toUpperCase();

    // 1. SORTING_CENTER must NOT have a parent facility (must be null)
    if (typeCode === 'SORTING_CENTER') {
      if (parentFacilityId && parentFacilityId.trim().length > 0) {
        throw new BadRequestException('Kho Tổng Miền (SORTING_CENTER) là cấp cao nhất, không được có kho cấp trên!');
      }
    }
    // 2. PROVINCIAL_HUB must have parent facility pointing to a SORTING_CENTER
    else if (typeCode === 'PROVINCIAL_HUB') {
      if (!parentFacilityId || !parentFacilityId.trim()) {
        throw new BadRequestException('Kho Tổng Tỉnh (PROVINCIAL_HUB) bắt buộc phải chọn Kho cấp trên là Kho Tổng Miền (SORTING_CENTER)!');
      }
      const parent = await prisma.facility.findUnique({
        where: { id: parentFacilityId },
        include: { facilityType: true },
      });
      if (!parent || parent.facilityType.typeCode.toUpperCase() !== 'SORTING_CENTER') {
        throw new BadRequestException('Kho cấp trên của Kho Tổng Tỉnh (PROVINCIAL_HUB) phải là Kho Tổng Miền (SORTING_CENTER)!');
      }
    }
    // 3. WARD_STATION (or LAST_MILE_STATION / MICRO_HUB) must have parent facility pointing to a PROVINCIAL_HUB
    else if (typeCode === 'WARD_STATION' || typeCode === 'LAST_MILE_STATION' || typeCode === 'MICRO_HUB') {
      if (!parentFacilityId || !parentFacilityId.trim()) {
        throw new BadRequestException('Trạm Bưu cục Phường/Xã (WARD_STATION) bắt buộc phải chọn Kho cấp trên là Kho Tổng Tỉnh (PROVINCIAL_HUB)!');
      }
      const parent = await prisma.facility.findUnique({
        where: { id: parentFacilityId },
        include: { facilityType: true },
      });
      if (!parent || parent.facilityType.typeCode.toUpperCase() !== 'PROVINCIAL_HUB') {
        throw new BadRequestException('Kho cấp trên của Trạm Bưu cục Phường/Xã (WARD_STATION) phải là Kho Tổng Tỉnh (PROVINCIAL_HUB)!');
      }

      // 🛑 GEOGRAPHIC INTEGRITY CHECK: Cross-province assignment prevention!
      if (parent.provinceCode && provinceCode && parent.provinceCode !== provinceCode) {
        const [parentProv, childProv] = await Promise.all([
          prisma.province.findUnique({ where: { code: parent.provinceCode } }),
          prisma.province.findUnique({ where: { code: provinceCode } }),
        ]);
        throw new BadRequestException(
          `Không thể gán Bưu cục Phường/Xã tại ${childProv?.fullName || provinceCode} vào Kho Tổng Tỉnh thuộc ${parentProv?.fullName || parent.provinceCode}. Kho mẹ và trạm con phải thuộc cùng Tỉnh/Thành phố!`
        );
      }
    }
  }

  /**
   * Create a new facility with address
   */
  public async createFacility(dto: CreateFacilityDto) {
    const resolved = await resolveAddressDetails(dto.address);

    // Auto-detect provinceCode from address ward if not explicitly passed
    let effectiveProvinceCode = dto.provinceCode;
    if (!effectiveProvinceCode && resolved.wardCode) {
      const wardObj = await prisma.ward.findUnique({ where: { code: resolved.wardCode } });
      if (wardObj?.provinceCode) {
        effectiveProvinceCode = wardObj.provinceCode;
      }
    }

    const currentType = await prisma.facilityType.findUnique({ where: { id: dto.facilityTypeId } });
    if (!currentType) {
      throw new BadRequestException('Mã loại kho bãi không tồn tại');
    }

    const typeCode = currentType.typeCode.toUpperCase();

    // 🤖 100% AUTOMATIC PARENT HUB ASSIGNMENT ENGINE
    if (typeCode === 'SORTING_CENTER') {
      // Level 1: Always NULL parent
      dto.parentFacilityId = undefined;
    } else if (typeCode === 'PROVINCIAL_HUB') {
      // Level 2: Auto-assign SORTING_CENTER based on Province's Economic Region
      if (!dto.parentFacilityId && effectiveProvinceCode) {
        const prov = await prisma.province.findUnique({ where: { code: effectiveProvinceCode } });
        if (prov?.administrativeRegionId) {
          const matchingSC = await prisma.facility.findFirst({
            where: {
              facilityType: { typeCode: 'SORTING_CENTER' },
              province: { administrativeRegionId: prov.administrativeRegionId },
              operatingStatus: { not: 'CLOSED' },
            },
          });
          if (matchingSC) {
            dto.parentFacilityId = matchingSC.id;
          }
        }
      }
    } else if (['WARD_STATION', 'LAST_MILE_STATION', 'MICRO_HUB'].includes(typeCode)) {
      // Level 3: Auto-assign PROVINCIAL_HUB based on Province
      if (!dto.parentFacilityId && effectiveProvinceCode) {
        const matchingHub = await prisma.facility.findFirst({
          where: {
            provinceCode: effectiveProvinceCode,
            facilityType: { typeCode: 'PROVINCIAL_HUB' },
            operatingStatus: { not: 'CLOSED' },
          },
        });
        if (matchingHub) {
          dto.parentFacilityId = matchingHub.id;
        }
      }
    }

    // Validate 3-Tier Hierarchy & Geographic Consistency
    await this.validateFacilityHierarchy(dto.facilityTypeId, dto.parentFacilityId, effectiveProvinceCode);

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

    return await prisma.$transaction(async (tx) => {
      // 1. Create Address
      const address = await tx.address.create({
        data: {
          addressLine1: dto.address.addressLine1,
          country: dto.address.country || 'Vietnam',
          latitude: dto.address.latitude,
          longitude: dto.address.longitude,
          wardCode: resolved.wardCode,
        },
      });

      // 2. Create Facility with addressId & provinceCode
      const facility = await tx.facility.create({
        data: {
          facilityCode,
          facilityName: dto.facilityName,
          facilityTypeId: dto.facilityTypeId,
          parentFacilityId: dto.parentFacilityId || null,
          provinceCode: effectiveProvinceCode || null,
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
          parentFacility: true,
          province: true,
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

    const targetTypeId = dto.facilityTypeId || facility.facilityTypeId;
    const targetParentId = dto.parentFacilityId !== undefined ? dto.parentFacilityId : facility.parentFacilityId;
    const targetProvinceCode = dto.provinceCode !== undefined ? dto.provinceCode : facility.provinceCode;

    if (dto.parentFacilityId && dto.parentFacilityId === id) {
      throw new BadRequestException('Một kho bãi không thể làm cha của chính nó');
    }

    await this.validateFacilityHierarchy(targetTypeId, targetParentId, targetProvinceCode);

    return await prisma.facility.update({
      where: { id },
      data: {
        facilityName: dto.facilityName ?? facility.facilityName,
        facilityTypeId: dto.facilityTypeId ?? facility.facilityTypeId,
        parentFacilityId: dto.parentFacilityId !== undefined ? dto.parentFacilityId : facility.parentFacilityId,
        provinceCode: dto.provinceCode !== undefined ? dto.provinceCode : facility.provinceCode,
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
