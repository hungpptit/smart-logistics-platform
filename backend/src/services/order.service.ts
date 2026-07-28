import { prisma } from '../config/prisma';
import { GeocodingService } from './geocoding.service';
import { PricingService } from './pricing/pricing.service';
import { CreateOrderDto, UpdateOrderStatusDto } from '../dtos/order.dto';
import { BadRequestException, NotFoundException, ForbiddenException } from '../middlewares/error.middleware';
import { OrderStatus, OrderChangeSource } from '@prisma/client';
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
    });
    if (!customer || customer.isHidden) {
      throw new BadRequestException('Không tìm thấy thông tin hồ sơ khách hàng liên kết với tài khoản này');
    }
    if (customer.status === 'BLOCKED') {
      throw new BadRequestException('Hồ sơ khách hàng của bạn đang bị khóa');
    }
    if (customer.status === 'INACTIVE') {
      throw new BadRequestException('Hồ sơ khách hàng của bạn đã ngưng hoạt động');
    }
    if (customer.status !== 'ACTIVE') {
      throw new BadRequestException('Hồ sơ khách hàng của bạn đang không hoạt động');
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
      where: { id: customerId, isHidden: false },
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
      pickupAddrSnapshot = addr.formattedAddress;
      resolvedPickupAddressId = addr.id;
    } else if (dto.pickupAddress) {
      // Resolve address details using administrative unit database
      const resolved = await resolveAddressDetails(dto.pickupAddress);

      // Geocode address
      const rawAddr = `${dto.pickupAddress.addressLine1}, ${resolved.ward}, ${resolved.province}`;
      const geocoded = await this.geocodingService.geocode(rawAddr);
      pickupLat = dto.pickupAddress.latitude ?? geocoded.latitude;
      pickupLon = dto.pickupAddress.longitude ?? geocoded.longitude;
      pickupAddrSnapshot = geocoded.formattedAddress;

      // Save new address
      const newAddr = await prisma.address.create({
        data: {
          addressLine1: dto.pickupAddress.addressLine1,
          ward: resolved.ward,
          province: resolved.province,
          country: dto.pickupAddress.country || 'Vietnam',
          latitude: pickupLat,
          longitude: pickupLon,
          formattedAddress: geocoded.formattedAddress,
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
      deliveryAddrSnapshot = addr.formattedAddress;
      resolvedDeliveryAddressId = addr.id;
    } else if (dto.deliveryAddress) {
      // Resolve address details using administrative unit database
      const resolved = await resolveAddressDetails(dto.deliveryAddress);

      // Geocode address
      const rawAddr = `${dto.deliveryAddress.addressLine1}, ${resolved.ward}, ${resolved.province}`;
      const geocoded = await this.geocodingService.geocode(rawAddr);
      deliveryLat = dto.deliveryAddress.latitude ?? geocoded.latitude;
      deliveryLon = dto.deliveryAddress.longitude ?? geocoded.longitude;
      deliveryAddrSnapshot = geocoded.formattedAddress;

      // Save new address
      const newAddr = await prisma.address.create({
        data: {
          addressLine1: dto.deliveryAddress.addressLine1,
          ward: resolved.ward,
          province: resolved.province,
          country: dto.deliveryAddress.country || 'Vietnam',
          latitude: deliveryLat,
          longitude: deliveryLon,
          formattedAddress: geocoded.formattedAddress,
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

    // 6. Calculate Pricing
    const pricing = await this.pricingService.calculatePrice(
      dto.serviceCode,
      distanceKm,
      totalChargeableWeight,
      isFragile,
      dto.codAmount || 0
    );

    // 7. Generate order code
    const count = await prisma.order.count();
    const orderCode = `ORD-${Date.now().toString().slice(-4)}${String(count + 1).padStart(6, '0')}`;

    // Estimated delivery date based on service hours
    const service = await prisma.service.findUnique({ where: { serviceCode: dto.serviceCode } });
    const estDeliveryDate = new Date();
    estDeliveryDate.setHours(estDeliveryDate.getHours() + (service?.estimatedDeliveryHours || 24));

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
          status: 'CREATED',
          pickupType: dto.pickupType || 'PICKUP',
          originFacilityId,
          destinationFacilityId,

          // Address Snapshots
          pickupAddressText: pickupAddrSnapshot,
          pickupLatitude: pickupLat,
          pickupLongitude: pickupLon,
          senderName: resolvedSenderName,
          senderPhone: resolvedSenderPhone,

          deliveryAddressText: deliveryAddrSnapshot,
          deliveryLatitude: deliveryLat,
          deliveryLongitude: deliveryLon,
          receiverName: resolvedReceiverName,
          receiverPhone: resolvedReceiverPhone,

          estimatedShippingFee: pricing.shippingFee,
          estimatedInsuranceFee: pricing.insuranceFee,
          estimatedCodAmount: dto.codAmount || 0,
          estimatedTotalAmount: pricing.totalAmount,
          estimatedDistance: distanceKm,
          estimatedDuration: durationMin,
          pricingVersion: pricing.pricingVersion,
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
          status: 'CREATED',
          changedByUserId: creatorId,
          changeSource: userRoles.includes('CUSTOMER') ? 'CUSTOMER' : 'ADMIN',
          reason: 'Đơn hàng được khởi tạo thành công trên hệ thống',
        },
      });

      // Fetch newly created order details to return
      return await tx.order.findUnique({
        where: { id: order.id },
        include: {
          packages: true,
          payment: true,
          statusHistory: true,
        },
      });
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

    const where: any = { deletedAt: null };
    const andConditions: any[] = [];

    // If customer, only show their own orders
    if (userRoles.includes('CUSTOMER') && !userRoles.includes('ADMIN') && !userRoles.includes('STAFF')) {
      const customerId = await this.getCustomerIdByUserId(userId);
      andConditions.push({ customerId });
    }

    // Determine targetFacilityId for filtering
    let targetFacilityId: string | undefined = undefined;

    if (userRoles.includes('ADMIN')) {
      if (query.facilityId) {
        targetFacilityId = query.facilityId;
      }
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

    // Apply facilityId filter if specified/determined
    if (targetFacilityId) {
      const facilityOrConditions: any[] = [
        { originFacilityId: targetFacilityId },
        { destinationFacilityId: targetFacilityId },
        {
          packages: {
            some: {
              barcodeScans: {
                some: {
                  facilityId: targetFacilityId,
                },
              },
            },
          },
        },
        {
          packages: {
            some: {
              shipmentPackages: {
                some: {
                  shipment: {
                    routeStops: {
                      some: {
                        facilityId: targetFacilityId,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ];

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
          packages: true,
          payment: true,
          originFacility: true,
          destinationFacility: true,
        },
      }),
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get order detail by ID
   */
  public async getOrderById(id: string, userId: string, userRoles: string[]) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        service: true,
        packages: true,
        payment: true,
        originFacility: true,
        destinationFacility: true,
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

    if (!order || order.deletedAt) {
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

        const hasScan = await prisma.barcodeScan.findFirst({
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

    return order;
  }

  /**
   * Update order status (Admin/Staff only)
   */
  public async updateStatus(id: string, dto: UpdateOrderStatusDto, userId: string, userRoles: string[], changeSource: OrderChangeSource) {
    const order = await prisma.order.findUnique({
      where: { id, deletedAt: null },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
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

        const hasScan = await prisma.barcodeScan.findFirst({
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
      const updateData: any = { status: dto.status };
      if (staffFacilityId && (order.pickupType === 'DROP_OFF' || dto.status === 'ARRIVED_ORIGIN_FACILITY')) {
        updateData.originFacilityId = staffFacilityId;
      }

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id },
        data: updateData,
      });

      // Write status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: dto.status,
          changedByUserId: userId,
          changeSource,
          reason: dto.reason || `Cập nhật trạng thái đơn hàng sang ${dto.status}`,
        },
      });

      return updatedOrder;
    });
  }

  /**
   * Cancel order (Soft-delete or state update)
   */
  public async cancelOrder(id: string, userId: string, userRoles: string[]) {
    const order = await prisma.order.findUnique({
      where: { id, deletedAt: null },
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

        const hasScan = await prisma.barcodeScan.findFirst({
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
    const allowedCancelStates: OrderStatus[] = ['CREATED', 'READY_FOR_PICKUP'];
    if (!allowedCancelStates.includes(order.status)) {
      throw new BadRequestException(`Không thể hủy đơn hàng đang ở trạng thái: ${order.status}`);
    }

    return await prisma.$transaction(async (tx) => {
      // Mark as deleted/cancelled
      const cancelledOrder = await tx.order.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // Update payment to REFUNDED or leave as is
      await tx.orderPayment.update({
        where: { orderId: id },
        data: { paymentStatus: 'REFUNDED' },
      });

      // Log status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: order.status, // Keep original status but write history
          changedByUserId: userId,
          changeSource: userRoles.includes('CUSTOMER') ? 'CUSTOMER' : 'ADMIN',
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
        deletedAt: null,
      },
      include: {
        facilityAddresses: {
          where: { isPrimary: true },
          include: { address: true }
        }
      }
    });

    if (facilities.length === 0) return null;

    let nearestFacilityId: string | null = null;
    let minDistance = Infinity;

    for (const fac of facilities) {
      const primaryAddr = fac.facilityAddresses[0]?.address;
      if (primaryAddr) {
        const dist = this.geocodingService.calculateDistance(
          lat,
          lon,
          primaryAddr.latitude,
          primaryAddr.longitude
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

    if (!order || order.deletedAt) {
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
}
