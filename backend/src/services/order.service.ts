import { prisma } from '../config/prisma';
import { GeocodingService } from './geocoding.service';
import { PricingService } from './pricing/pricing.service';
import { CreateOrderDto, UpdateOrderStatusDto } from '../dtos/order.dto';
import { BadRequestException, NotFoundException, ForbiddenException } from '../middlewares/error.middleware';
import { OrderStatus, PaymentStatus, CustomerAddressType, RouteStopStatus, RouteStatus } from '@prisma/client';
import { resolveAddressDetails } from '../utils/address-resolver';

export class OrderService {
  private geocodingService = new GeocodingService();
  private pricingService = new PricingService();

  /**
   * Helper to retrieve customer ID by User ID
   */
  private async getCustomerIdByUserId(userId: string): Promise<string> {
    const customer = await prisma.customer.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!customer) {
      throw new BadRequestException('Không tìm thấy thông tin hồ sơ khách hàng liên kết với tài khoản này');
    }
    if (customer.user?.status === 'LOCKED') {
      throw new BadRequestException('Tài khoản của bạn đang bị khóa');
    }
    if (customer.user?.status === 'DISABLED') {
      throw new BadRequestException('Tài khoản của bạn đã bị vô hiệu hóa');
    }
    if (customer.user?.status !== 'ACTIVE') {
      throw new BadRequestException('Tài khoản của bạn đang không ở trạng thái hoạt động');
    }
    return customer.id;
  }

  /**
   * Create a single order (single-hub booking)
   */
  public async createOrder(creatorId: string, userRoles: string[], dto: CreateOrderDto) {
    let customerId = dto.customerId;

    // If the creator is a customer, enforce using their own customer profile
    if (userRoles.includes('CUSTOMER') && !userRoles.includes('ADMIN') && !userRoles.includes('STAFF')) {
      customerId = await this.getCustomerIdByUserId(creatorId);
    } else if (!customerId) {
      throw new BadRequestException('Trường customerId là bắt buộc đối với Nhân viên/Admin');
    }

    // Check if customer exists
    const customerWithUser = await prisma.customer.findFirst({
      where: { id: customerId, user: { status: 'ACTIVE' } },
    });
    if (!customerWithUser) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }

    // 1. Resolve Pickup Address
    let pickupLat = 0;
    let pickupLon = 0;
    let pickupAddrSnapshot = '';
    let resolvedPickupAddressId: string | null = null;

    if (dto.pickupAddressId) {
      const addr = await prisma.address.findUnique({
        where: { id: dto.pickupAddressId },
      });
      if (!addr) throw new BadRequestException('Địa chỉ lấy hàng không tồn tại');
      pickupLat = addr.latitude;
      pickupLon = addr.longitude;
      pickupAddrSnapshot = addr.addressLine1;
      resolvedPickupAddressId = addr.id;
    } else if (dto.pickupAddress) {
      // Resolve address details using administrative unit database
      const resolved = await resolveAddressDetails(dto.pickupAddress);

      // Geocode address
      const rawAddr = `${dto.pickupAddress.addressLine1}, ${resolved.ward}, ${resolved.province}`;
      const geocoded = await this.geocodingService.geocode(rawAddr);
      pickupLat = dto.pickupAddress.latitude ?? geocoded.latitude;
      pickupLon = dto.pickupAddress.longitude ?? geocoded.longitude;
      pickupAddrSnapshot = geocoded.formattedAddress || dto.pickupAddress.addressLine1;

      // Save new address
      const newAddr = await prisma.address.create({
        data: {
          addressLine1: dto.pickupAddress.addressLine1,
          country: dto.pickupAddress.country || 'Vietnam',
          latitude: pickupLat,
          longitude: pickupLon,
          wardCode: resolved.wardCode,
        },
      });
      resolvedPickupAddressId = newAddr.id;
    } else {
      throw new BadRequestException('Vui lòng chọn hoặc điền địa chỉ lấy hàng');
    }

    // 2. Resolve Delivery Address
    let deliveryLat = 0;
    let deliveryLon = 0;
    let deliveryAddrSnapshot = '';
    let resolvedDeliveryAddressId: string | null = null;

    if (dto.deliveryAddressId) {
      const addr = await prisma.address.findUnique({
        where: { id: dto.deliveryAddressId },
      });
      if (!addr) throw new BadRequestException('Địa chỉ giao hàng không tồn tại');
      deliveryLat = addr.latitude;
      deliveryLon = addr.longitude;
      deliveryAddrSnapshot = addr.addressLine1;
      resolvedDeliveryAddressId = addr.id;
    } else if (dto.deliveryAddress) {
      // Resolve address details using administrative unit database
      const resolved = await resolveAddressDetails(dto.deliveryAddress);

      // Geocode address
      const rawAddr = `${dto.deliveryAddress.addressLine1}, ${resolved.ward}, ${resolved.province}`;
      const geocoded = await this.geocodingService.geocode(rawAddr);
      deliveryLat = dto.deliveryAddress.latitude ?? geocoded.latitude;
      deliveryLon = dto.deliveryAddress.longitude ?? geocoded.longitude;
      deliveryAddrSnapshot = geocoded.formattedAddress || dto.deliveryAddress.addressLine1;

      // Save new address
      const newAddr = await prisma.address.create({
        data: {
          addressLine1: dto.deliveryAddress.addressLine1,
          country: dto.deliveryAddress.country || 'Vietnam',
          latitude: deliveryLat,
          longitude: deliveryLon,
          wardCode: resolved.wardCode,
        },
      });
      resolvedDeliveryAddressId = newAddr.id;
    } else {
      throw new BadRequestException('Vui lòng chọn hoặc điền địa chỉ giao hàng');
    }

    // 3. Calculate distance & duration
    const distanceKm = this.geocodingService.calculateDistance(pickupLat, pickupLon, deliveryLat, deliveryLon);

    // Validate distance for EXPRESS service (maximum 20km limit)
    if (dto.serviceCode === 'EXPRESS' && distanceKm > 20) {
      throw new BadRequestException(
        `Dịch vụ giao hàng Hỏa tốc chỉ hỗ trợ giao hàng trong phạm vi bán kính tối đa 20km. Khoảng cách hiện tại của bạn là ${distanceKm.toFixed(2)} km.`
      );
    }

    // Giả định tốc độ trung bình 30km/h để tính thời gian di chuyển dự kiến (phút)
    const durationMin = Math.ceil((distanceKm / 30) * 60) + 15; // + 15 phút thời gian chuẩn bị/xử lý

    // 4. Snapshot sender and receiver contact names and phones
    let resolvedSenderName = '';
    let resolvedSenderPhone = '';
    if (dto.senderContact) {
      resolvedSenderName = dto.senderContact.fullName;
      resolvedSenderPhone = dto.senderContact.phone;
    }

    // Fallback default sender to user profile if still empty
    if (!resolvedSenderName) {
      resolvedSenderName = customerWithUser.fullName || 'Khách hàng';
      resolvedSenderPhone = customerWithUser.phone || '0000000000';
    }

    let resolvedReceiverName = '';
    let resolvedReceiverPhone = '';
    if (dto.receiverContact) {
      resolvedReceiverName = dto.receiverContact.fullName;
      resolvedReceiverPhone = dto.receiverContact.phone;
    }

    if (!resolvedReceiverName || !resolvedReceiverPhone) {
      throw new BadRequestException('Vui lòng cung cấp thông tin liên hệ của người nhận (tên và số điện thoại)');
    }

    // 5. Calculate total chargeable weight (max of actual weight and volumetric weight = L*W*H/5000)
    let totalChargeableWeight = 0;
    let totalVolume = 0;
    let isFragile = false;

    dto.packages.forEach((pkg) => {
      const volumetricWeight = (pkg.length * pkg.width * pkg.height) / 5000;
      const chargeableWeight = Math.max(pkg.weight, volumetricWeight);
      totalChargeableWeight += chargeableWeight;

      // Thể tích = (dài x rộng x cao) / 1,000,000 để đổi ra m3
      const vol = (pkg.length * pkg.width * pkg.height) / 1000000;
      totalVolume += vol;
      if (pkg.isFragile) isFragile = true;
    });

    // 6. Calculate Pricing and Dynamic ETA
    const pickupAddrObj = resolvedPickupAddressId
      ? await prisma.address.findUnique({ where: { id: resolvedPickupAddressId } })
      : null;
    const deliveryAddrObj = resolvedDeliveryAddressId
      ? await prisma.address.findUnique({ where: { id: resolvedDeliveryAddressId } })
      : null;

    const pricing = await this.pricingService.calculatePrice(
      dto.serviceCode,
      distanceKm,
      totalChargeableWeight,
      isFragile,
      dto.codAmount || 0,
      pickupAddrObj?.wardCode || undefined,
      deliveryAddrObj?.wardCode || undefined
    );

    // 7. Generate order code
    const count = await prisma.order.count();
    const orderCode = `ORD-${Date.now().toString().slice(-4)}${String(count + 1).padStart(6, '0')}`;

    // Estimated delivery date calculated dynamically from pricing service
    const estDeliveryDate = pricing.estimatedDeliveryDate ? new Date(pricing.estimatedDeliveryDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Resolve origin and destination facilities based on distance
    const originFacilityId = await this.findNearestFacility(pickupLat, pickupLon);
    const destinationFacilityId = await this.findNearestFacility(deliveryLat, deliveryLon);

    // 8. Create Order in Transaction
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId,
          serviceId: pricing.serviceId,
          pickupAddressId: resolvedPickupAddressId,
          deliveryAddressId: resolvedDeliveryAddressId,
          orderCode,
          status: OrderStatus.CREATED,
          pickupType: dto.pickupType || 'PICKUP',
          scheduledPickupAt: dto.scheduledPickupAt ? new Date(dto.scheduledPickupAt) : null,
          originFacilityId,
          destinationFacilityId,

          // Address Snapshots
          pickupAddressText: pickupAddrSnapshot,
          pickupLatitude: pickupLat,
          pickupLongitude: pickupLon,

          deliveryAddressText: deliveryAddrSnapshot,
          deliveryLatitude: deliveryLat,
          deliveryLongitude: deliveryLon,
          receiverName: resolvedReceiverName,
          receiverPhone: resolvedReceiverPhone,

          estimatedShippingFee: pricing.shippingFee,
          estimatedInsuranceFee: pricing.insuranceFee,
          estimatedCodAmount: dto.codAmount || 0,
          estimatedDistance: distanceKm,
          estimatedDuration: durationMin,
          estimatedDeliveryDate: estDeliveryDate,
          createdBy: creatorId,
        },
      });

      // Create Package records
      let pkgSeq = 1;
      for (const pkg of dto.packages) {
        const pkgVol = (pkg.length * pkg.width * pkg.height) / 1000000;
        await tx.package.create({
          data: {
            orderId: order.id,
            packageCode: `${orderCode}-PKG-${String(pkgSeq++).padStart(2, '0')}`,
            weight: pkg.weight,
            length: pkg.length,
            width: pkg.width,
            height: pkg.height,
            volume: pkgVol,
            isFragile: pkg.isFragile || false,
            temperatureRequirement: pkg.temperatureRequirement || null,
            requiredVehicleTypeId: pkg.requiredVehicleTypeId || null,
            description: pkg.description || null,
            declaredValue: pkg.declaredValue ? pkg.declaredValue : null,
          },
        });
      }

      // Create Payment info
      await tx.orderPayment.create({
        data: {
          orderId: order.id,
          finalShippingFee: pricing.shippingFee,
          finalInsuranceFee: pricing.insuranceFee,
          finalCodAmount: dto.codAmount || 0,
          feePayer: dto.feePayer,
          paymentMethod: dto.paymentMethod,
          paymentStatus: 'UNPAID',
        },
      });

      // Create History log
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.CREATED,
          changedByUserId: creatorId,
          reason: 'Đơn hàng được khởi tạo thành công trên hệ thống',
        },
      });

      // Ensure customer_addresses table has contactName & contactPhone for (customerId, resolvedPickupAddressId)
      if (customerId && resolvedPickupAddressId && resolvedSenderName) {
        await tx.customerAddress.upsert({
          where: {
            customerId_addressId: {
              customerId,
              addressId: resolvedPickupAddressId,
            },
          },
          create: {
            customerId,
            addressId: resolvedPickupAddressId,
            addressType: CustomerAddressType.WAREHOUSE,
            contactName: resolvedSenderName,
            contactPhone: resolvedSenderPhone,
          },
          update: {
            contactName: resolvedSenderName,
            contactPhone: resolvedSenderPhone,
          },
        });
      }

      // Fetch newly created order details to return
      const createdOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: {
          customer: true,
          service: true,
          package: true,
          payment: true,
          statusHistory: true,
          pickupAddress: {
            include: {
              customerAddresses: true,
            },
          },
        },
      });

      return this.formatOrderWithSenderInfo(createdOrder);
    });
  }

  /**
   * Get list of orders
   */
  public async getOrders(
    userId: string,
    userRoles: string[],
    query: { page?: string; limit?: string; search?: string; status?: OrderStatus; facilityId?: string }
  ) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    const andConditions: any[] = [];

    // If customer, only show their own orders
    if (userRoles.includes('CUSTOMER') && !userRoles.includes('ADMIN') && !userRoles.includes('STAFF')) {
      const customerId = await this.getCustomerIdByUserId(userId);
      andConditions.push({ customerId });
    }

    // Determine targetFacilityId for filtering
    let targetFacilityId: string | undefined = undefined;

    if (query.facilityId) {
      targetFacilityId = query.facilityId;
    } else if (userRoles.includes('STAFF')) {
      const staffProfile = await prisma.staff.findUnique({
        where: { userId },
        select: { assignedFacilityId: true },
      });
      targetFacilityId = staffProfile?.assignedFacilityId || undefined;

      // If staff has no facility assigned, restrict to orders created by them
      if (!staffProfile?.assignedFacilityId) {
        andConditions.push({ createdBy: userId });
      }
    }

    const filterScope = ((query as any).filterScope as string) || (userRoles.includes('STAFF') && !userRoles.includes('ADMIN') ? 'CURRENT' : 'ALL');

    // Apply facilityId filter if specified/determined
    if (targetFacilityId) {
      const facilityOrConditions: any[] = [];

      if (filterScope === 'CURRENT') {
        facilityOrConditions.push({ package: { currentFacilityId: targetFacilityId } });
        facilityOrConditions.push({
          package: {
            warehouseScans: {
              some: { facilityId: targetFacilityId },
            },
          },
          status: OrderStatus.AT_HUB,
        });
        facilityOrConditions.push({
          originFacilityId: targetFacilityId,
          status: { in: [OrderStatus.CREATED, OrderStatus.READY_FOR_PICKUP, OrderStatus.PICKING, OrderStatus.PICKUP_ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.ARRIVED_ORIGIN_FACILITY] },
        });
        facilityOrConditions.push({
          destinationFacilityId: targetFacilityId,
          status: { in: [OrderStatus.AT_HUB, OrderStatus.READY_FOR_DISPATCH, OrderStatus.OUT_FOR_DELIVERY] },
        });
      } else {
        facilityOrConditions.push({ originFacilityId: targetFacilityId });
        facilityOrConditions.push({ destinationFacilityId: targetFacilityId });
        facilityOrConditions.push({ package: { currentFacilityId: targetFacilityId } });
        facilityOrConditions.push({
          package: {
            warehouseScans: {
              some: { facilityId: targetFacilityId },
            },
          },
        });
      }

      // Only show orders created by this user as fallback if they are STAFF
      if (!userRoles.includes('ADMIN')) {
        facilityOrConditions.push({ createdBy: userId });
      }

      andConditions.push({
        OR: facilityOrConditions
      });
    }

    if (query.search) {
      andConditions.push({
        OR: [
          { orderCode: { contains: query.search, mode: 'insensitive' } },
          { pickupAddressText: { contains: query.search, mode: 'insensitive' } },
          { deliveryAddressText: { contains: query.search, mode: 'insensitive' } },
        ]
      });
    }

    if (query.status) {
      andConditions.push({ status: query.status });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [total, orders] = await prisma.$transaction([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          service: true,
          package: true,
          payment: true,
          originFacility: true,
          destinationFacility: true,
          pickupAddress: {
            include: {
              customerAddresses: true,
            },
          },
        },
      }),
    ]);

    const formattedOrders = orders.map((o) => this.formatOrderWithSenderInfo(o));

    return {
      orders: formattedOrders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Helper to format order output by JOINing customer_addresses for senderName & senderPhone
   */
  private formatOrderWithSenderInfo(order: any) {
    if (!order) return order;
    const matchingCustAddr = order.pickupAddress?.customerAddresses?.find(
      (ca: any) => ca.customerId === order.customerId
    );
    const senderName = matchingCustAddr?.contactName || order.customer?.fullName || 'Người gửi';
    const senderPhone = matchingCustAddr?.contactPhone || order.customer?.phone || 'N/A';

    return {
      ...order,
      senderName,
      senderPhone,
    };
  }

  /**
   * Get order detail by ID
   */
  public async getOrderById(idOrCode: string, userId: string, userRoles: string[]) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrCode);

    const order = await prisma.order.findFirst({
      where: isUuid
        ? { OR: [{ id: idOrCode }, { orderCode: idOrCode }, { package: { id: idOrCode } }] }
        : {
          OR: [
            { orderCode: idOrCode },
            { package: { packageCode: idOrCode } },
          ],
        },
      include: {
        customer: true,
        service: true,
        package: {
          include: {
            warehouseScans: {
              orderBy: { scannedAt: 'desc' },
              take: 10,
            },
          },
        },
        payment: true,
        originFacility: true,
        destinationFacility: true,
        pickupAddress: {
          include: {
            customerAddresses: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            changedBy: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Verify ownership
    if (userRoles.includes('CUSTOMER') && !userRoles.includes('ADMIN') && !userRoles.includes('STAFF')) {
      const customerId = await this.getCustomerIdByUserId(userId);
      if (order.customerId !== customerId) {
        throw new ForbiddenException('Bạn không có quyền xem chi tiết đơn hàng này');
      }
    }

    if (userRoles.includes('STAFF') && !userRoles.includes('ADMIN')) {
      if (order.createdBy !== userId) {
        const staffProfile = await prisma.staff.findUnique({
          where: { userId },
          select: { assignedFacilityId: true },
        });
        const facilityId = staffProfile?.assignedFacilityId;

        if (!facilityId) {
          throw new ForbiddenException('Bạn không có quyền xem chi tiết đơn hàng này do chưa được gán kho');
        }

        const hasScan = await prisma.warehouseScan.findFirst({
          where: {
            facilityId,
            package: {
              orderId: order.id,
            },
          },
        });

        const hasRouteStop = await prisma.routeStop.findFirst({
          where: {
            facilityId,
            shipment: {
              shipmentPackages: {
                some: {
                  package: {
                    orderId: order.id,
                  },
                },
              },
            },
          },
        });

        const isAssignedToStaffFacility = order.originFacilityId === facilityId || order.destinationFacilityId === facilityId;

        if (!hasScan && !hasRouteStop && !isAssignedToStaffFacility) {
          throw new ForbiddenException('Bạn không có quyền xem chi tiết đơn hàng không thuộc kho quản lý của bạn');
        }
      }
    }

    return this.formatOrderWithSenderInfo(order);
  }

  /**
   * Update order status (Admin/Staff only)
   */
  public async updateStatus(idOrCode: string, dto: UpdateOrderStatusDto, userId: string, userRoles: string[]) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);
    const order = await prisma.order.findFirst({
      where: isUuid
        ? { id: idOrCode }
        : { orderCode: idOrCode },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (userRoles.includes('CUSTOMER') && !userRoles.includes('ADMIN') && !userRoles.includes('STAFF')) {
      const customerId = await this.getCustomerIdByUserId(userId);
      if (order.customerId !== customerId) {
        throw new ForbiddenException('Bạn không có quyền cập nhật đơn hàng này');
      }
      if (dto.status !== OrderStatus.READY_FOR_PICKUP && dto.status !== OrderStatus.CANCELLED) {
        throw new ForbiddenException('Khách hàng chỉ có quyền cập nhật trạng thái Sẵn sàng lấy hàng hoặc Hủy đơn');
      }
    }

    let staffFacilityId: string | null = null;

    if (userRoles.includes('STAFF') && !userRoles.includes('ADMIN')) {
      const staffProfile = await prisma.staff.findUnique({
        where: { userId },
        select: { assignedFacilityId: true },
      });
      staffFacilityId = staffProfile?.assignedFacilityId || null;

      if (order.createdBy !== userId) {
        if (!staffFacilityId) {
          throw new ForbiddenException('Bạn không có quyền cập nhật đơn hàng này do chưa được gán kho');
        }

        const hasScan = await prisma.warehouseScan.findFirst({
          where: {
            facilityId: staffFacilityId,
            package: {
              orderId: order.id,
            },
          },
        });

        const hasRouteStop = await prisma.routeStop.findFirst({
          where: {
            facilityId: staffFacilityId,
            shipment: {
              shipmentPackages: {
                some: {
                  package: {
                    orderId: order.id,
                  },
                },
              },
            },
          },
        });

        const isAssignedToStaffFacility = order.originFacilityId === staffFacilityId || order.destinationFacilityId === staffFacilityId;

        if (!hasScan && !hasRouteStop && !isAssignedToStaffFacility) {
          throw new ForbiddenException('Bạn không có quyền cập nhật đơn hàng không thuộc kho quản lý của bạn');
        }
      }
    }

    return await prisma.$transaction(async (tx) => {
      const updateData: any = { status: dto.status, updatedBy: userId };
      if (staffFacilityId && (order.pickupType === 'DROP_OFF' || dto.status === 'ARRIVED_ORIGIN_FACILITY')) {
        updateData.originFacilityId = staffFacilityId;
      }

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: updateData,
      });

      // Write status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: dto.status,
          changedByUserId: userId,
          reason: dto.reason || `Cập nhật trạng thái đơn hàng sang ${dto.status}`,
        },
      });

      // If order is completed/picked up/delivered, update linked RouteStops and check if Route is completed
      if (['PICKED_UP', 'DELIVERED', 'COMPLETED', 'ARRIVED_ORIGIN_FACILITY'].includes(dto.status)) {
        const linkedStops = await tx.routeStop.findMany({
          where: {
            OR: [
              { orderId: order.id },
              {
                shipment: {
                  shipmentPackages: {
                    some: { package: { orderId: order.id } },
                  },
                },
              },
            ],
          },
          select: { id: true, routeId: true },
        });

        if (linkedStops.length > 0) {
          const stopIds = linkedStops.map((s) => s.id);
          await tx.routeStop.updateMany({
            where: { id: { in: stopIds } },
            data: {
              status: RouteStopStatus.DEPARTED,
            },
          });

          const routeIds = Array.from(new Set(linkedStops.map((s) => s.routeId).filter(Boolean)));
          // Route status will be explicitly set to COMPLETED when the driver taps 'CHỐT HOÀN THÀNH CHUYẾN ĐI' via routing.service confirmRouteComplete
        }
      } else if (['PICK_FAILED', 'DELIVERY_FAILED'].includes(dto.status)) {
        const linkedStops = await tx.routeStop.findMany({
          where: {
            OR: [
              { orderId: order.id },
              {
                shipment: {
                  shipmentPackages: {
                    some: { package: { orderId: order.id } },
                  },
                },
              },
            ],
          },
          select: { id: true, routeId: true },
        });

        if (linkedStops.length > 0) {
          const stopIds = linkedStops.map((s) => s.id);
          await tx.routeStop.updateMany({
            where: { id: { in: stopIds } },
            data: {
              status: RouteStopStatus.FAILED,
            },
          });
        }
      }

      return updatedOrder;
    });
  }

  /**
   * Cancel order (Soft-delete or state update)
   */
  public async cancelOrder(id: string, userId: string, userRoles: string[]) {
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Enforce ownership for customer
    if (userRoles.includes('CUSTOMER') && !userRoles.includes('ADMIN') && !userRoles.includes('STAFF')) {
      const customerId = await this.getCustomerIdByUserId(userId);
      if (order.customerId !== customerId) {
        throw new ForbiddenException('Bạn không có quyền hủy đơn hàng này');
      }
    }

    if (userRoles.includes('STAFF') && !userRoles.includes('ADMIN')) {
      if (order.createdBy !== userId) {
        const staffProfile = await prisma.staff.findUnique({
          where: { userId },
          select: { assignedFacilityId: true },
        });
        const facilityId = staffProfile?.assignedFacilityId;

        if (!facilityId) {
          throw new ForbiddenException('Bạn không có quyền hủy đơn hàng này do chưa được gán kho');
        }

        const hasScan = await prisma.warehouseScan.findFirst({
          where: {
            facilityId,
            package: {
              orderId: order.id,
            },
          },
        });

        const hasRouteStop = await prisma.routeStop.findFirst({
          where: {
            facilityId,
            shipment: {
              shipmentPackages: {
                some: {
                  package: {
                    orderId: order.id,
                  },
                },
              },
            },
          },
        });

        const isAssignedToStaffFacility = order.originFacilityId === facilityId || order.destinationFacilityId === facilityId;

        if (!hasScan && !hasRouteStop && !isAssignedToStaffFacility) {
          throw new ForbiddenException('Bạn không có quyền hủy đơn hàng không thuộc kho quản lý của bạn');
        }
      }
    }

    // Business rule: Only cancel when status is CREATED or READY_FOR_PICKUP
    const allowedCancelStates: OrderStatus[] = [OrderStatus.CREATED, OrderStatus.READY_FOR_PICKUP];
    if (!allowedCancelStates.includes(order.status)) {
      throw new BadRequestException(`Không thể hủy đơn hàng đang ở trạng thái: ${order.status}`);
    }

    return await prisma.$transaction(async (tx) => {
      // Mark as cancelled
      const cancelledOrder = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          updatedBy: userId,
        },
      });

      // Update payment to REFUNDED or leave as is
      await tx.orderPayment.update({
        where: { orderId: id },
        data: { paymentStatus: PaymentStatus.REFUNDED },
      });

      // Log status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: order.status, // Keep original status but write history
          changedByUserId: userId,
          reason: 'Khách hàng yêu cầu hủy đơn hàng',
        },
      });

      return { success: true };
    });
  }

  private async findNearestFacility(lat: number, lon: number): Promise<string | null> {
    const facilities = await prisma.facility.findMany({
      where: {
        operatingStatus: 'ACTIVE',
      },
      include: {
        address: true,
      },
    });

    if (facilities.length === 0) return null;

    let nearestFacilityId: string | null = null;
    let minDistance = Infinity;

    for (const fac of facilities) {
      if (fac.address && fac.address.latitude !== null && fac.address.longitude !== null) {
        const dist = this.geocodingService.calculateDistance(
          lat,
          lon,
          fac.address.latitude,
          fac.address.longitude
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearestFacilityId = fac.id;
        }
      }
    }

    return nearestFacilityId;
  }

  /**
   * Process payment for an order
   */
  public async payOrder(orderId: string, paymentMethod: string, userId: string, userRoles: string[]) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, customer: { include: { user: true } } },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Verify ownership for customer role
    if (userRoles.includes('CUSTOMER') && !userRoles.includes('ADMIN') && !userRoles.includes('STAFF')) {
      const customerId = await this.getCustomerIdByUserId(userId);
      if (order.customerId !== customerId) {
        throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
      }
    }

    if (!order.payment) {
      throw new BadRequestException('Không tìm thấy thông tin thanh toán của đơn hàng');
    }

    if (order.payment.paymentStatus === 'PAID') {
      throw new BadRequestException('Đơn hàng này đã được thanh toán trước đó');
    }

    // Validate payment method
    const validMethods = ['CASH', 'BANK_TRANSFER', 'E_WALLET', 'COD'];
    if (!validMethods.includes(paymentMethod)) {
      throw new BadRequestException('Phương thức thanh toán không hợp lệ');
    }

    // Update payment status to PAID
    const updatedPayment = await prisma.orderPayment.update({
      where: { id: order.payment.id },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: paymentMethod as any,
      },
    });

    console.log(`💳 [PAYMENT] Order ${order.orderCode} paid via ${paymentMethod} by user ${userId}`);
    return {
      orderId: order.id,
      orderCode: order.orderCode,
      paymentStatus: updatedPayment.paymentStatus,
      paymentMethod: updatedPayment.paymentMethod,
      shippingFee: updatedPayment.finalShippingFee,
      codAmount: updatedPayment.finalCodAmount,
    };
  }

  /**
   * Assign package to a facility zone and record BarcodeScan
   */
  public async assignPackageToZone(orderCode: string, zoneId: string, userId: string, toteCode?: string) {
    const cleanCode = orderCode.trim();
    const baseCode = cleanCode.includes('-PKG-') ? cleanCode.split('-PKG-')[0] : cleanCode;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCode);

    const order = await prisma.order.findFirst({
      where: isUuid
        ? { OR: [{ id: cleanCode }, { orderCode: cleanCode }, { orderCode: baseCode }, { package: { id: cleanCode } }] }
        : {
          OR: [
            { orderCode: cleanCode },
            { orderCode: baseCode },
            { package: { packageCode: cleanCode } },
            { package: { packageCode: baseCode } },
          ],
        },
      include: {
        package: {
          include: {
            shipmentPackages: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã [${orderCode}]`);
    }

    let zone = zoneId
      ? await prisma.facilityZone.findUnique({
        where: { id: zoneId },
        include: { facility: true },
      })
      : null;

    if (!zone) {
      // Smart Auto Routing: Check Intra-Ward vs Outbound Transfer
      const isIntraWard = order.originFacilityId && order.destinationFacilityId && order.originFacilityId === order.destinationFacilityId;
      const targetZoneCode = isIntraWard ? 'ZONE-W-LOCAL-DELIVERY' : 'ZONE-W-PROVINCE-DISPATCH';

      const staff = userId ? await prisma.staff.findUnique({ where: { userId } }) : null;
      const staffFacId = staff?.assignedFacilityId || order.originFacilityId;

      zone = (await prisma.facilityZone.findFirst({
        where: {
          ...(staffFacId ? { facilityId: staffFacId } : {}),
          zoneCode: targetZoneCode,
        },
        include: { facility: true },
      })) || (await prisma.facilityZone.findFirst({ include: { facility: true } }));
    }

    if (!zone) {
      throw new NotFoundException('Không tìm thấy Phân Khu Kho phù hợp');
    }

    const activeToteCode = toteCode || `TOTE-${zone.zoneCode}-001`;

    await prisma.order.update({
      where: { id: order.id },
      data: {
        updatedBy: userId || undefined,
        status: 'ARRIVED_ORIGIN_FACILITY',
        ...(zone.facilityId ? { originFacilityId: zone.facilityId } : {}),
      },
    });

    let pkgId = order.package?.id;
    if (!pkgId) {
      const newPkg = await prisma.package.create({
        data: {
          orderId: order.id,
          packageCode: `PKG-${order.orderCode.replace(/^ORD-/, '')}`,
          weight: 1.0,
          length: 10,
          width: 10,
          height: 10,
          volume: 0.001,
          currentZoneId: zone.id,
          currentFacilityId: zone.facilityId,
        },
      });
      pkgId = newPkg.id;
    } else {
      await prisma.package.update({
        where: { id: pkgId },
        data: {
          currentZoneId: zone.id,
          currentFacilityId: zone.facilityId,
        },
      });
    }

    let targetShipmentId: string | undefined = order.package?.shipmentPackages?.[0]?.shipmentId;
    if (!targetShipmentId) {
      const firstShipment = await prisma.shipment.findFirst();
      if (firstShipment) {
        targetShipmentId = firstShipment.id;
      }
    }

    let activeToteBagId: string | null = null;
    if (activeToteCode) {
      const tote = await prisma.toteBag.upsert({
        where: { toteCode: activeToteCode },
        update: {
          facilityId: zone.facilityId,
          zoneCode: zone.zoneCode,
        },
        create: {
          toteCode: activeToteCode,
          zoneCode: zone.zoneCode,
          facilityId: zone.facilityId,
          status: 'OPEN',
        },
      });
      activeToteBagId = tote.id;
    }

    // Clean up previous tote scans for this package so it is removed from any old tote
    await prisma.warehouseScan.deleteMany({
      where: {
        packageId: pkgId,
        toteBagId: { not: activeToteBagId },
      },
    });

    const existingScan = await prisma.warehouseScan.findFirst({
      where: {
        packageId: pkgId,
        toteBagId: activeToteBagId,
      },
    });

    if (existingScan) {
      await prisma.warehouseScan.update({
        where: { id: existingScan.id },
        data: {
          shipmentId: targetShipmentId,
          facilityId: zone.facilityId,
          scannedBy: userId || order.customerId,
          toteBagId: activeToteBagId,
          scannedAt: new Date(),
        },
      });
    } else {
      await prisma.warehouseScan.create({
        data: {
          packageId: pkgId,
          shipmentId: targetShipmentId,
          facilityId: zone.facilityId,
          scannedBy: userId || order.customerId,
          toteBagId: activeToteBagId,
        },
      });
    }

    const targetStatus = OrderStatus.AT_HUB;

    await prisma.order.update({
      where: { id: order.id },
      data: { status: targetStatus },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: targetStatus,
        changedByUserId: userId,
        reason: `Bưu kiện đã được phân loại vào ${zone.zoneName} (${zone.zoneCode}) tại ${zone.facility?.facilityName || 'Kho trung chuyển'}`,
      },
    });

    return {
      orderCode: order.orderCode,
      zoneCode: zone.zoneCode,
      zoneName: zone.zoneName,
      facilityName: zone.facility.facilityName,
      toteCode: activeToteCode,
    };
  }

  /**
   * Get recent sorting scans for current facility / staff with active toteCode
   */
  public async getSortingHistory(userId: string, facilityId?: string) {
    const whereCondition: any = {
      packageId: { not: null },
    };

    if (facilityId) {
      whereCondition.facilityId = facilityId;
    } else {
      whereCondition.scannedBy = userId;
    }

    const scans = await prisma.warehouseScan.findMany({
      where: whereCondition,
      take: 50,
      orderBy: { scannedAt: 'desc' },
      include: {
        toteBag: true,
        package: {
          include: {
            order: true,
            currentZone: true,
          },
        },
      },
    });

    const uniqueMap = new Map<string, any>();
    for (const s of scans) {
      if (!s.package) continue;
      const orderCode = s.package.order?.orderCode || s.package.packageCode || 'ORD-UNKNOWN';

      if (!uniqueMap.has(s.packageId!)) {
        const zoneCode = s.package.currentZone?.zoneCode || s.toteBag?.zoneCode || 'ZONE-P-INBOUND';
        const zoneName = s.package.currentZone?.zoneName || 'Bãi Nhập Hàng Xe Tải Bưu Cục';
        const toteCode = s.toteBag?.toteCode || `TOTE-${zoneCode}-001`;

        uniqueMap.set(s.packageId!, {
          id: s.id,
          code: orderCode,
          packageCode: orderCode,
          type: 'ORDER',
          status: 'SUCCESS',
          scannedAt: new Date(s.scannedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          message: `Phân loại bưu kiện ${orderCode} thành công`,
          zoneCode,
          zoneName,
          toteCode,
          sortedAt: new Date(s.scannedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        });
      }
    }

    return Array.from(uniqueMap.values()).slice(0, 20);
  }

  /**
   * Seal a tote bag and update DB status to SEALED in tote_bags table, then auto-create next OPEN tote
   */
  public async sealToteBag(toteCode: string) {
    const cleanCode = toteCode.trim();
    const existing = await prisma.toteBag.findUnique({
      where: { toteCode: cleanCode },
    });

    const zoneCode = existing?.zoneCode || (cleanCode.includes('ZONE') ? cleanCode.split('-').slice(1, -1).join('-') : 'ZONE-W-LOCAL');

    const sealedTote = await prisma.toteBag.upsert({
      where: { toteCode: cleanCode },
      update: {
        status: 'SEALED',
        sealedAt: new Date(),
      },
      create: {
        toteCode: cleanCode,
        zoneCode,
        status: 'SEALED',
        sealedAt: new Date(),
      },
    });

    // Auto-create next OPEN tote
    const parts = cleanCode.split('-');
    const currentNum = parseInt(parts[parts.length - 1], 10) || 1;
    const nextNum = currentNum + 1;
    const prefix = parts.slice(0, -1).join('-');
    const nextToteCode = `${prefix}-${String(nextNum).padStart(3, '0')}`;

    await prisma.toteBag.upsert({
      where: { toteCode: nextToteCode },
      update: {},
      create: {
        toteCode: nextToteCode,
        zoneCode,
        facilityId: existing?.facilityId || null,
        status: 'OPEN',
      },
    });

    return { sealedTote, nextToteCode };
  }

  /**
   * Get all active and sealed totes grouped by zoneCode for facility
   */
  public async getZoneTotes(facilityId?: string) {
    let targetFacilityId = facilityId;
    let facilityCodeClean = '';

    if (targetFacilityId) {
      const fac = await prisma.facility.findUnique({
        where: { id: targetFacilityId },
        select: { facilityCode: true },
      });
      if (fac?.facilityCode) {
        facilityCodeClean = fac.facilityCode.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      }
    }

    const dbZones = await prisma.facilityZone.findMany({
      where: targetFacilityId ? { facilityId: targetFacilityId } : {},
      select: { zoneCode: true, zoneName: true },
    });

    const activeZoneCodes = dbZones.map((z) => z.zoneCode);

    const dbTotes = await prisma.toteBag.findMany({
      where: targetFacilityId ? { facilityId: targetFacilityId } : {},
      orderBy: { createdAt: 'desc' },
    });

    for (const zCode of activeZoneCodes) {
      const hasTote = dbTotes.some((t) => t.zoneCode === zCode);
      if (!hasTote) {
        const firstToteCode = facilityCodeClean ? `TOTE-${facilityCodeClean}-${zCode}-001` : `TOTE-${zCode}-001`;
        const newTote = await prisma.toteBag.upsert({
          where: { toteCode: firstToteCode },
          update: targetFacilityId ? { facilityId: targetFacilityId } : {},
          create: {
            toteCode: firstToteCode,
            zoneCode: zCode,
            facilityId: targetFacilityId || null,
            status: 'OPEN',
          },
        });
        dbTotes.push(newTote);
      }
    }

    const scansWhere: any = { toteBagId: { not: null } };
    if (targetFacilityId) {
      scansWhere.facilityId = targetFacilityId;
    }

    const scans = await prisma.warehouseScan.findMany({
      where: scansWhere,
      select: { toteBagId: true, packageId: true },
    });

    const totePackageSetMap = new Map<string, Set<string>>();
    for (const s of scans) {
      if (s.toteBagId && s.packageId) {
        if (!totePackageSetMap.has(s.toteBagId)) {
          totePackageSetMap.set(s.toteBagId, new Set());
        }
        totePackageSetMap.get(s.toteBagId)!.add(s.packageId);
      }
    }

    const zoneTotesMap = new Map<string, any[]>();
    for (const zCode of activeZoneCodes) {
      zoneTotesMap.set(zCode, []);
    }

    for (const tote of dbTotes) {
      const zoneCode = tote.zoneCode;
      if (!zoneTotesMap.has(zoneCode)) {
        zoneTotesMap.set(zoneCode, []);
      }
      zoneTotesMap.get(zoneCode)!.push({
        toteCode: tote.toteCode,
        status: tote.status,
        packageCount: totePackageSetMap.get(tote.id)?.size || 0,
        sealedAt: tote.sealedAt ? new Date(tote.sealedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null,
        createdAt: new Date(tote.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      });
    }

    const result: Array<{ zoneCode: string; totes: any[] }> = [];
    for (const [zoneCode, totes] of zoneTotesMap.entries()) {
      result.push({ zoneCode, totes });
    }

    return result;
  }

  /**
   * Get all packages/orders contained in a specific toteCode
   */
  public async getTotePackages(toteCode: string) {
    const cleanCode = toteCode.trim();
    const toteObj = await prisma.toteBag.findUnique({
      where: { toteCode: cleanCode },
    });

    const scans = await prisma.warehouseScan.findMany({
      where: {
        toteBagId: toteObj?.id || '',
      },
      orderBy: { scannedAt: 'desc' },
      include: {
        package: {
          include: {
            order: {
              include: {
                destinationFacility: true,
                customer: true,
              },
            },
            currentZone: true,
          },
        },
      },
    });

    const uniquePackages = new Map<string, any>();

    for (const s of scans) {
      if (!s.package) continue;
      const pkgCode = s.package.packageCode || s.package.order?.orderCode || 'N/A';
      if (!uniquePackages.has(pkgCode)) {
        uniquePackages.set(pkgCode, {
          id: s.package.id,
          packageCode: s.package.packageCode,
          orderCode: s.package.order?.orderCode || 'N/A',
          receiverName: s.package.order?.receiverName || 'N/A',
          receiverPhone: s.package.order?.receiverPhone || 'N/A',
          destinationFacilityName: s.package.order?.destinationFacility?.facilityName || 'Bưu cục đích',
          weight: s.package.weight,
          scannedAt: new Date(s.scannedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        });
      }
    }

    return {
      toteCode: cleanCode,
      zoneCode: toteObj?.zoneCode || 'ZONE-W-LOCAL',
      status: toteObj?.status || 'OPEN',
      sealedAt: toteObj?.sealedAt ? new Date(toteObj.sealedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null,
      totalPackages: uniquePackages.size,
      packages: Array.from(uniquePackages.values()),
    };
  }
}
