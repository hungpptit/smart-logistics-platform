import { prisma } from '../../../config/prisma';
import { PricingService } from '../../pricing/pricing.service';

export interface ToolContext {
  userId?: string;
  customerId?: string;
  customerName?: string;
}

const pricingService = new PricingService();

/**
 * Che số điện thoại để bảo vệ quyền riêng tư (vd: 090****567)
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return 'Chưa cập nhật';
  const cleaned = phone.trim();
  if (cleaned.length >= 9) {
    return `${cleaned.slice(0, 3)}****${cleaned.slice(-3)}`;
  }
  if (cleaned.length > 4) {
    return `${cleaned.slice(0, 2)}***${cleaned.slice(-2)}`;
  }
  return '***';
}

/**
 * Che bớt số nhà / ngõ hẻm chi tiết ở địa chỉ người nhận
 */
export function maskAddress(address?: string | null): string {
  if (!address) return 'Chưa cập nhật';
  const parts = address.split(',').map((p) => p.trim());
  if (parts.length > 2) {
    return `***, ${parts.slice(1).join(', ')}`;
  }
  return address;
}

/**
 * 1. Tool: track_order
 * Tra cứu trạng thái, lộ trình di chuyển, tiến độ và thời gian giao dự kiến (ETA)
 */
export async function trackOrder(
  args: { orderCode: string },
  ctx: ToolContext
): Promise<Record<string, any>> {
  try {
    const rawCode = args?.orderCode;
    if (!rawCode || typeof rawCode !== 'string') {
      return {
        success: false,
        message: 'Vui lòng cung cấp mã đơn hàng cần tra cứu (ví dụ: ORD-TD-011).',
      };
    }

    const orderCode = rawCode.trim().toUpperCase();

    // BẢO MẬT ZERO-TRUST: Bắt buộc phiên đăng nhập và chỉ cho phép tra cứu đơn thuộc chính tài khoản
    if (!ctx.customerId) {
      return {
        success: false,
        message: 'Quý khách vui lòng đăng nhập để tra cứu thông tin đơn hàng.',
      };
    }

    const order = await prisma.order.findFirst({
      where: {
        orderCode,
        customerId: ctx.customerId,
      },
      include: {
        service: true,
        destinationFacility: true,
        originFacility: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 6,
        },
        routeStops: {
          orderBy: { sequence: 'asc' },
          include: {
            facility: true,
          },
        },
      },
    });

    if (!order) {
      return {
        success: false,
        message: `Không tìm thấy đơn hàng ${orderCode} trong danh sách đơn của bạn. Vui lòng kiểm tra lại mã vận đơn.`,
      };
    }

    // Xác định vị trí/trạm hiện tại của đơn
    let currentLocation = 'Đang xử lý tại bưu cục nguồn';
    if (order.destinationFacility && (order.status === 'AT_HUB' || order.status === 'OUT_FOR_DELIVERY')) {
      currentLocation = `Kho giao hàng đích: ${order.destinationFacility.facilityName}`;
    } else if (order.originFacility) {
      currentLocation = `Bưu cục gửi: ${order.originFacility.facilityName}`;
    }

    const timeline = order.statusHistory.map((h) => ({
      status: h.status,
      reason: h.reason || undefined,
      time: new Date(h.createdAt).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    }));

    return {
      success: true,
      orderCode: order.orderCode,
      status: order.status,
      serviceName: order.service?.serviceName || 'Giao hàng tiêu chuẩn',
      receiverName: order.receiverName,
      receiverPhone: maskPhone(order.receiverPhone),
      deliveryAddress: maskAddress(order.deliveryAddressText),
      currentLocation,
      estimatedDeliveryDate: order.estimatedDeliveryDate
        ? new Date(order.estimatedDeliveryDate).toLocaleDateString('vi-VN')
        : 'Đang cập nhật',
      recentEvents: timeline,
    };
  } catch (error: any) {
    console.error('[Tool: track_order] Lỗi:', error);
    return {
      success: false,
      message: 'Không thể tra cứu thông tin đơn hàng vào lúc này. Vui lòng thử lại sau.',
      error: error.message,
    };
  }
}

/**
 * 2. Tool: get_customer_orders
 * Xem danh sách các đơn hàng gần đây của khách hàng đăng nhập
 */
export async function getCustomerOrders(
  args: { status?: string; limit?: number },
  ctx: ToolContext
): Promise<Record<string, any>> {
  try {
    if (!ctx.customerId) {
      return {
        success: false,
        message: 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      };
    }

    // Giới hạn an toàn từ 1 đến 10 đơn
    const safeLimit = Math.min(Math.max(Number(args?.limit) || 5, 1), 10);
    const filterStatus = args?.status?.trim();

    const orders = await prisma.order.findMany({
      where: {
        customerId: ctx.customerId,
        ...(filterStatus ? { status: filterStatus as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      include: {
        service: true,
        package: true,
      },
    });

    if (!orders || orders.length === 0) {
      return {
        success: true,
        count: 0,
        message: filterStatus
          ? `Bạn không có đơn hàng nào ở trạng thái ${filterStatus}.`
          : 'Bạn chưa có đơn hàng nào trong hệ thống.',
        orders: [],
      };
    }

    const formattedList = orders.map((o) => {
      const shippingFee = Number(o.estimatedShippingFee || 0);
      const insuranceFee = Number(o.estimatedInsuranceFee || 0);
      const codAmount = Number(o.estimatedCodAmount || 0);
      const totalShippingFee = shippingFee + insuranceFee;
      const totalOrderAmount = totalShippingFee + codAmount;

      return {
        orderCode: o.orderCode,
        status: o.status,
        serviceName: o.service?.serviceName || 'Tiêu chuẩn',
        receiverName: o.receiverName,
        receiverPhone: maskPhone(o.receiverPhone),
        shippingFee,
        insuranceFee,
        totalShippingFee,
        totalFee: totalShippingFee,
        totalOrderAmount,
        codAmount,
        weightKg: o.package ? Number(o.package.weight) : undefined,
        createdAt: new Date(o.createdAt).toLocaleDateString('vi-VN'),
        estimatedDeliveryDate: o.estimatedDeliveryDate
          ? new Date(o.estimatedDeliveryDate).toLocaleDateString('vi-VN')
          : undefined,
      };
    });

    return {
      success: true,
      count: formattedList.length,
      orders: formattedList,
    };
  } catch (error: any) {
    console.error('[Tool: get_customer_orders] Lỗi:', error);
    return {
      success: false,
      message: 'Lỗi khi tải danh sách đơn hàng.',
      error: error.message,
    };
  }
}

/**
 * 3. Tool: get_order_details
 * Tra cứu chi tiết tài chính, tiền COD, phí ship, thông tin kiện hàng
 */
export async function getOrderDetails(
  args: { orderCode: string },
  ctx: ToolContext
): Promise<Record<string, any>> {
  try {
    const rawCode = args?.orderCode;
    if (!rawCode) {
      return { success: false, message: 'Vui lòng cung cấp mã đơn hàng.' };
    }

    const orderCode = rawCode.trim().toUpperCase();

    // BẢO MẬT ZERO-TRUST: Bắt buộc phiên đăng nhập và chỉ cho phép xem chi tiết đơn thuộc chính tài khoản
    if (!ctx.customerId) {
      return {
        success: false,
        message: 'Quý khách vui lòng đăng nhập để xem thông tin chi tiết đơn hàng.',
      };
    }

    const order = await prisma.order.findFirst({
      where: {
        orderCode,
        customerId: ctx.customerId,
      },
      include: {
        service: true,
        payment: true,
        package: true,
      },
    });

    if (!order) {
      return {
        success: false,
        message: `Không tìm thấy thông tin đơn hàng ${orderCode} trong tài khoản của bạn.`,
      };
    }

    return {
      success: true,
      orderCode: order.orderCode,
      status: order.status,
      service: {
        code: order.service?.serviceCode,
        name: order.service?.serviceName,
      },
      receiver: {
        name: order.receiverName,
        phone: maskPhone(order.receiverPhone),
        address: maskAddress(order.deliveryAddressText),
      },
      packageInfo: {
        description: order.package?.description || 'Hàng hóa thông thường',
        weightKg: order.package ? Number(order.package.weight) : 0,
        dimensionsCm: order.package
          ? `${Number(order.package.length)}x${Number(order.package.width)}x${Number(order.package.height)}`
          : 'Chưa cập nhật',
        isFragile: order.package?.isFragile || false,
      },
      financial: (() => {
        const shippingFee = Number(order.payment?.finalShippingFee || order.estimatedShippingFee || 0);
        const insuranceFee = Number(order.payment?.finalInsuranceFee || order.estimatedInsuranceFee || 0);
        const codAmount = Number(order.payment?.finalCodAmount || order.estimatedCodAmount || 0);
        const totalShippingFee = shippingFee + insuranceFee;
        const totalOrderAmount = totalShippingFee + codAmount;
        const feePayer = order.payment?.feePayer || 'RECEIVER';
        const feePayerText = feePayer === 'SENDER' ? 'Người gửi' : 'Người nhận';

        return {
          shippingFee,
          insuranceFee,
          totalShippingFee,
          codAmount,
          totalOrderAmount,
          totalFee: totalShippingFee,
          feePayer: feePayerText,
          paymentStatus: order.payment?.paymentStatus || 'UNPAID',
          paymentMethod: order.payment?.paymentMethod || 'CASH',
          explanation: feePayer === 'RECEIVER'
            ? `Người nhận thanh toán tổng chi phí đơn là ${totalOrderAmount.toLocaleString('vi-VN')} đ (gồm ${codAmount.toLocaleString('vi-VN')} đ tiền COD và ${totalShippingFee.toLocaleString('vi-VN')} đ cước vận chuyển).`
            : `Người gửi thanh toán cước ${totalShippingFee.toLocaleString('vi-VN')} đ; Người nhận chỉ thanh toán tiền thu hộ COD ${codAmount.toLocaleString('vi-VN')} đ khi nhận hàng.`,
        };
      })(),
      createdAt: new Date(order.createdAt).toLocaleString('vi-VN'),
    };
  } catch (error: any) {
    console.error('[Tool: get_order_details] Lỗi:', error);
    return {
      success: false,
      message: 'Không thể lấy thông tin chi tiết đơn hàng.',
      error: error.message,
    };
  }
}

/**
 * 4. Tool: get_assigned_shipper
 * Tra cứu thông tin shipper đang phụ trách giao hàng (chỉ khi đơn đang đi giao)
 */
export async function getAssignedShipper(
  args: { orderCode: string },
  ctx: ToolContext
): Promise<Record<string, any>> {
  try {
    const rawCode = args?.orderCode;
    if (!rawCode) {
      return { success: false, message: 'Vui lòng cung cấp mã đơn hàng.' };
    }

    const orderCode = rawCode.trim().toUpperCase();

    // BẢO MẬT ZERO-TRUST: Bắt buộc phiên đăng nhập và chỉ cho phép xem thông tin shipper đơn thuộc chính tài khoản
    if (!ctx.customerId) {
      return {
        success: false,
        message: 'Quý khách vui lòng đăng nhập để xem thông tin shipper.',
      };
    }

    const order = await prisma.order.findFirst({
      where: {
        orderCode,
        customerId: ctx.customerId,
      },
      include: {
        routeStops: {
          include: {
            route: {
              include: {
                driverVehicleAssignment: {
                  include: {
                    driver: true,
                    vehicle: {
                      include: {
                        vehicleType: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return {
        success: false,
        message: `Không tìm thấy đơn hàng ${orderCode} trong tài khoản của bạn.`,
      };
    }

    // Chỉ hiển thị thông tin tài xế khi đơn đang ở trạng thái đi giao hoặc đang lấy hàng
    const allowedStatuses: string[] = ['OUT_FOR_DELIVERY', 'PICKING', 'DELIVERING'];
    if (!allowedStatuses.includes(order.status)) {
      return {
        success: false,
        status: order.status,
        message: `Đơn hàng ${orderCode} đang ở trạng thái "${order.status}", chưa được chuyển giao cho tài xế giao chặng cuối. Thông tin tài xế sẽ hiển thị khi đơn bắt đầu được giao.`,
      };
    }

    // Tìm route stop có driver assignment
    let driverInfo: any = null;
    let vehicleInfo: any = null;

    for (const stop of order.routeStops) {
      const assignment = stop.route?.driverVehicleAssignment;
      if (assignment?.driver) {
        driverInfo = assignment.driver;
        vehicleInfo = assignment.vehicle;
        break;
      }
    }

    if (!driverInfo) {
      return {
        success: true,
        orderCode: order.orderCode,
        status: order.status,
        message: 'Đơn hàng đang chuẩn bị đi giao, tài xế sẽ liên hệ với quý khách trong thời gian sớm nhất.',
      };
    }

    return {
      success: true,
      orderCode: order.orderCode,
      status: order.status,
      shipperName: driverInfo.fullName || 'Nhân viên giao nhận Velocity',
      shipperPhone: maskPhone(driverInfo.phone),
      vehicleType: vehicleInfo?.vehicleType?.typeName || 'Xe máy',
      licensePlate: vehicleInfo?.plateNumber ? `${vehicleInfo.plateNumber.slice(0, 4)}***` : 'Đang cập nhật',
      note: 'Tài xế sẽ gọi điện trước khi đến giao hàng khoảng 5-10 phút.',
    };
  } catch (error: any) {
    console.error('[Tool: get_assigned_shipper] Lỗi:', error);
    return {
      success: false,
      message: 'Không thể tra cứu thông tin tài xế giao hàng.',
      error: error.message,
    };
  }
}

/**
 * 5. Tool: estimate_shipping_fee
 * Ước tính cước phí và thời gian giao hàng dự kiến qua PricingService
 */
export async function estimateShippingFee(
  args: {
    distanceKm: number;
    weightKg: number;
    serviceCode?: string;
    isFragile?: boolean;
    codAmount?: number;
  },
  _ctx: ToolContext
): Promise<Record<string, any>> {
  try {
    const distanceKm = Number(args?.distanceKm);
    const weightKg = Number(args?.weightKg);

    if (isNaN(distanceKm) || distanceKm <= 0) {
      return {
        success: false,
        message: 'Khoảng cách giao hàng phải lớn hơn 0 km (ví dụ: 5.5 km).',
      };
    }

    if (isNaN(weightKg) || weightKg <= 0) {
      return {
        success: false,
        message: 'Khối lượng hàng hóa phải lớn hơn 0 kg (ví dụ: 1.5 kg).',
      };
    }

    const serviceCode = (args?.serviceCode || 'STANDARD').toUpperCase();
    const isFragile = Boolean(args?.isFragile);
    const codAmount = Math.max(Number(args?.codAmount) || 0, 0);

    const priceResult = await pricingService.calculatePrice(
      serviceCode,
      distanceKm,
      weightKg,
      isFragile,
      codAmount
    );

    return {
      success: true,
      serviceCode,
      distanceKm,
      weightKg,
      isFragile,
      codAmount,
      basePrice: priceResult.basePrice,
      distanceFee: priceResult.distanceFee,
      weightFee: priceResult.weightFee,
      fragileSurcharge: priceResult.fragileSurcharge,
      shippingFee: priceResult.shippingFee,
      totalAmount: priceResult.totalAmount,
      formattedEta: priceResult.formattedDeliveryEta,
      currency: 'VND',
    };
  } catch (error: any) {
    console.error('[Tool: estimate_shipping_fee] Lỗi:', error);
    return {
      success: false,
      message: error.message || 'Không thể tính cước phí vào thời điểm này.',
    };
  }
}

/**
 * 6. Tool: find_nearest_station
 * Tìm bưu cục hoặc kho trung chuyển gần nhất theo quận/huyện, tỉnh/thành
 */
export async function findNearestStation(
  args: { province?: string; query?: string },
  _ctx: ToolContext
): Promise<Record<string, any>> {
  try {
    const provinceQuery = (args?.province || args?.query || '').trim();

    const facilities = await prisma.facility.findMany({
      where: {
        operatingStatus: 'ACTIVE',
        ...(provinceQuery
          ? {
              OR: [
                { facilityName: { contains: provinceQuery, mode: 'insensitive' } },
                {
                  province: {
                    name: { contains: provinceQuery, mode: 'insensitive' },
                  },
                },
                {
                  address: {
                    addressLine1: { contains: provinceQuery, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      take: 5,
      include: {
        province: true,
        address: {
          include: {
            wardRelation: true,
          },
        },
      },
    });

    if (!facilities || facilities.length === 0) {
      return {
        success: true,
        count: 0,
        message: provinceQuery
          ? `Hiện chưa tìm thấy bưu cục nào tại khu vực "${provinceQuery}". Quý khách có thể liên hệ Tổng đài 1900-6868 để được hướng dẫn bưu cục gần nhất.`
          : 'Không tìm thấy bưu cục phù hợp.',
        stations: [],
      };
    }

    const stations = facilities.map((f) => ({
      stationCode: f.facilityCode,
      stationName: f.facilityName,
      address: f.address?.addressLine1 || 'Chưa cập nhật địa chỉ',
      province: f.province?.name || 'Việt Nam',
      operatingHours: '07:30 - 21:00 (Thứ 2 - Chủ Nhật, kể cả ngày lễ)',
      hotline: '1900-6868 (Phím 1)',
    }));

    return {
      success: true,
      count: stations.length,
      stations,
    };
  } catch (error: any) {
    console.error('[Tool: find_nearest_station] Lỗi:', error);
    return {
      success: false,
      message: 'Lỗi khi tra cứu danh sách bưu cục.',
      error: error.message,
    };
  }
}
