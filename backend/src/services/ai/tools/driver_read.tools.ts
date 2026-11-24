import { prisma } from '../../../config/prisma';
import { ToolContext } from './customer_read.tools';
import {
  GetMyOrdersParamsSchema,
  GetNextStopParamsSchema,
  GetOrderDeliveryInfoParamsSchema,
  GetCodSummaryParamsSchema,
  FindNearestFacilityParamsSchema,
} from '../../../dtos/chat_validation.dto';
import { securityAuditService } from '../security_audit.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id?: string | null): boolean {
  return Boolean(id && UUID_REGEX.test(id));
}

function formatZodError(error: any): string {
  const first = error?.issues?.[0];
  if (first?.code === 'unrecognized_keys') {
    return `Công cụ không chấp nhận tham số lạ: ${first.keys?.join(', ')}`;
  }
  return first?.message || 'Tham số không hợp lệ.';
}

/**
 * Timeout Wrapper: Đảm bảo mọi truy vấn DB không vượt quá 5000ms
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs = 5000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('QUERY_TIMEOUT'));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

/**
 * Lọc ký tự điều khiển và rút gọn ghi chú hàng hóa để phòng chống Indirect Prompt Injection
 */
export function sanitizeNoteText(text?: string | null, maxLen = 150): string {
  if (!text) return 'Không có ghi chú';
  return text
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/**
 * Che 4 số giữa của số điện thoại (ví dụ: 0981000014 -> 098****014)
 */
export function maskPhoneMiddle(phone?: string | null): string {
  if (!phone) return 'Chưa cập nhật';
  const cleaned = phone.trim();
  if (cleaned.length >= 9) {
    const start = cleaned.slice(0, 3);
    const end = cleaned.slice(-3);
    return `${start}****${end}`;
  }
  return '***';
}

/**
 * Tính khoảng cách đường chim bay giữa hai tọa độ (Haversine Formula) theo kilomet
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 1. Tool: get_my_orders
 * Liệt kê đơn trong ca/lộ trình đang hoạt động của tài xế theo từng nhóm trạng thái
 */
export async function getMyOrders(
  rawArgs: Record<string, any>,
  ctx: ToolContext
): Promise<Record<string, any>> {
  try {
    if (!isValidUuid(ctx.staffId)) {
      return {
        success: false,
        message: 'Không thể xác thực thông tin tài xế từ phiên đăng nhập.',
      };
    }

    const validation = GetMyOrdersParamsSchema.safeParse(rawArgs || {});
    if (!validation.success) {
      return {
        success: false,
        message: formatZodError(validation.error),
      };
    }

    const { group, limit } = validation.data;

    const statusMap: Record<string, string[]> = {
      ACTIVE: ['OUT_FOR_DELIVERY', 'PICKING'],
      PENDING: ['READY_FOR_PICKUP', 'PICKUP_ASSIGNED', 'READY_FOR_DISPATCH'],
      DELIVERED: ['DELIVERED', 'COMPLETED'],
      FAILED: ['DELIVERY_FAILED', 'PICK_FAILED', 'RETURNING', 'RETURNED'],
    };

    const targetStatuses = statusMap[group] || statusMap.ACTIVE;

    const query = prisma.route.findFirst({
      where: {
        driverVehicleAssignment: {
          driverId: ctx.staffId,
          isActive: true,
        },
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        completedAt: null,
      },
      include: {
        stops: {
          where: {
            stopType: 'DELIVERY',
            orderId: { not: null },
          },
          orderBy: { sequence: 'asc' },
          include: {
            deliveryProof: true,
            order: {
              include: {
                payment: true,
                statusHistory: {
                  orderBy: { createdAt: 'desc' },
                  take: 3,
                },
              },
            },
          },
        },
      },
    });

    const activeRoute = await withTimeout(query);

    if (!activeRoute) {
      return {
        success: true,
        count: 0,
        orders: [],
        message: 'Hiện tại bác tài chưa được phân công lộ trình giao hàng nào đang hoạt động trong ca hôm nay.',
      };
    }

    // Lọc theo nhóm trạng thái
    const matchedStops = activeRoute.stops.filter((s) => {
      const orderStatus = s.order?.status;
      return orderStatus && targetStatuses.includes(orderStatus);
    });

    const slicedStops = matchedStops.slice(0, limit);

    const orders = slicedStops.map((s) => {
      const ord = s.order!;
      // Rút gọn địa chỉ lấy khu vực (phường/quận), không trả số nhà chi tiết
      const addressParts = (ord.deliveryAddressText || '').split(',').map((p) => p.trim());
      const area = addressParts.length > 2 ? addressParts.slice(-2).join(', ') : ord.deliveryAddressText || 'Khu vực giao';

      const codAmount = Number(ord.payment?.finalCodAmount || ord.estimatedCodAmount || 0);

      return {
        orderCode: ord.orderCode,
        status: ord.status,
        sequence: s.sequence,
        stopStatus: s.status,
        area,
        codAmount,
        attemptsCount: s.deliveryProof ? 1 : ord.statusHistory?.length || 0,
      };
    });

    return {
      success: true,
      routeCode: activeRoute.routeCode,
      group,
      totalMatched: matchedStops.length,
      returnedCount: orders.length,
      orders,
      message:
        orders.length > 0
          ? `Tìm thấy ${orders.length} đơn hàng thuộc nhóm ${group} trên lộ trình ${activeRoute.routeCode}.`
          : `Hiện tại bác tài không có đơn hàng nào thuộc nhóm ${group} trên lộ trình hiện tại.`,
    };
  } catch (error: any) {
    console.error('[Tool: get_my_orders] Lỗi:', error);
    return {
      success: false,
      message: 'Hệ thống đang bận hoặc quá thời gian xử lý, bác tài vui lòng thử lại sau ít phút.',
    };
  }
}

/**
 * 2. Tool: get_next_stop
 * Tra cứu điểm dừng kế tiếp cần thực hiện theo đúng thứ tự lộ trình
 * Xử lý an toàn khi điểm dừng là Bưu cục (HUB), Điểm lấy hàng (PICKUP) hoặc Giao hàng (DELIVERY)
 */
export async function getNextStop(
  rawArgs: Record<string, any>,
  ctx: ToolContext
): Promise<Record<string, any>> {
  try {
    if (!isValidUuid(ctx.staffId)) {
      return {
        success: false,
        message: 'Không thể xác thực thông tin tài xế từ phiên đăng nhập.',
      };
    }

    const validation = GetNextStopParamsSchema.safeParse(rawArgs || {});
    if (!validation.success) {
      return {
        success: false,
        message: formatZodError(validation.error),
      };
    }

    const query = prisma.route.findFirst({
      where: {
        driverVehicleAssignment: {
          driverId: ctx.staffId,
          isActive: true,
        },
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        completedAt: null,
      },
      include: {
        stops: {
          where: {
            status: { in: ['PENDING', 'ARRIVED'] },
          },
          orderBy: { sequence: 'asc' },
          take: 1,
          include: {
            facility: {
              include: {
                address: true,
              },
            },
            deliveryProof: true,
            order: {
              include: {
                customer: true,
                payment: true,
                package: true,
              },
            },
          },
        },
      },
    });

    const activeRoute = await withTimeout(query);

    if (!activeRoute) {
      return {
        success: true,
        isCompleted: false,
        message: 'Hiện tại bác tài chưa được phân công lộ trình giao hàng nào đang hoạt động.',
      };
    }

    if (!activeRoute.stops || activeRoute.stops.length === 0) {
      return {
        success: true,
        isCompleted: true,
        routeCode: activeRoute.routeCode,
        message: `Bác tài đã hoàn tất tất cả các điểm dừng trên lộ trình ${activeRoute.routeCode}. Bác tài có thể quay về bưu cục để bàn giao cuối ca.`,
      };
    }

    const nextStop = activeRoute.stops[0];

    // Trường hợp 1: Điểm dừng là Bưu cục / Trạm điều phối (HUB)
    if (nextStop.stopType === 'HUB' || !nextStop.orderId) {
      const facilityName = nextStop.facility?.facilityName || 'Bưu cục Velocity';
      const facilityAddress = nextStop.facility?.address?.addressLine1 || nextStop.addressSnapshot || 'Trạm bưu cục điều phối';

      return {
        success: true,
        isCompleted: false,
        routeCode: activeRoute.routeCode,
        sequence: nextStop.sequence,
        stopType: 'HUB',
        stopStatus: nextStop.status,
        facilityName,
        address: facilityAddress,
        message: `Điểm dừng kế tiếp (chặng #${nextStop.sequence}) là quay về ${facilityName} tại ${facilityAddress} để tiếp nhận hoặc bàn giao hàng hóa.`,
      };
    }

    const ord = nextStop.order;

    // Trường hợp 2: Điểm dừng là Điểm lấy hàng tại nhà (PICKUP)
    if (nextStop.stopType === 'PICKUP') {
      return {
        success: true,
        isCompleted: false,
        routeCode: activeRoute.routeCode,
        sequence: nextStop.sequence,
        stopType: 'PICKUP',
        stopStatus: nextStop.status,
        orderCode: ord?.orderCode || 'N/A',
        senderName: ord?.customer?.fullName || 'Người gửi',
        senderPhone: ord?.customer?.phone || 'Chưa cập nhật',
        pickupAddress: nextStop.addressSnapshot || ord?.pickupAddressText || 'Địa chỉ lấy hàng',
        note: sanitizeNoteText(ord?.package?.description),
        message: `Điểm dừng kế tiếp (chặng #${nextStop.sequence}) là điểm lấy hàng của đơn ${ord?.orderCode} tại ${nextStop.addressSnapshot}.`,
      };
    }

    // Trường hợp 3: Điểm dừng Giao hàng tiêu chuẩn (DELIVERY)
    const codAmount = Number(ord?.payment?.finalCodAmount || ord?.estimatedCodAmount || 0);

    return {
      success: true,
      isCompleted: false,
      routeCode: activeRoute.routeCode,
      sequence: nextStop.sequence,
      stopType: 'DELIVERY',
      stopStatus: nextStop.status,
      orderCode: ord?.orderCode || 'N/A',
      receiverName: ord?.receiverName || 'Khách nhận',
      receiverPhone: ord?.receiverPhone || 'Chưa cập nhật', // Đầy đủ để tài xế gọi liên hệ
      deliveryAddress: nextStop.addressSnapshot || ord?.deliveryAddressText || 'Địa chỉ giao hàng',
      codAmount,
      attemptsCount: nextStop.deliveryProof ? 1 : 0,
      note: sanitizeNoteText(ord?.package?.description),
      message: `Điểm dừng kế tiếp (chặng #${nextStop.sequence}) là giao đơn ${ord?.orderCode} cho ${ord?.receiverName} tại ${nextStop.addressSnapshot}. Tiền COD cần thu: ${codAmount.toLocaleString('vi-VN')} đ.`,
    };
  } catch (error: any) {
    console.error('[Tool: get_next_stop] Lỗi:', error);
    return {
      success: false,
      message: 'Hệ thống đang bận hoặc quá thời gian xử lý, bác tài vui lòng thử lại sau ít phút.',
    };
  }
}

/**
 * 3. Tool: get_order_delivery_info
 * Xem chi tiết thông tin giao hàng của một đơn cụ thể thuộc lộ trình hiện tại của tài xế
 */
export async function getOrderDeliveryInfo(
  rawArgs: Record<string, any>,
  ctx: ToolContext
): Promise<Record<string, any>> {
  try {
    if (!isValidUuid(ctx.staffId)) {
      return {
        success: false,
        message: 'Không thể xác thực thông tin tài xế từ phiên đăng nhập.',
      };
    }

    // 1. Kiểm tra khóa tạm thời do dò quét đơn hàng trái phép
    const lockout = securityAuditService.isDriverLockedOut(ctx.staffId);
    if (lockout.locked) {
      return {
        success: false,
        message: `Phát hiện hành vi tra cứu bất thường. Chức năng tra cứu đơn tạm thời bị khóa trong ${lockout.remainingSec} giây để bảo vệ an toàn hệ thống.`,
      };
    }

    // 2. Validate tham số bằng schema chặt chẽ
    const validation = GetOrderDeliveryInfoParamsSchema.safeParse(rawArgs || {});
    if (!validation.success) {
      return {
        success: false,
        message: formatZodError(validation.error),
      };
    }

    const { orderCode } = validation.data;

    // 3. Truy vấn đơn hàng: BẮT BUỘC nằm trong lộ trình hiện tại của chính tài xế này
    const query = prisma.route.findFirst({
      where: {
        driverVehicleAssignment: {
          driverId: ctx.staffId,
          isActive: true,
        },
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        completedAt: null,
      },
      include: {
        stops: {
          where: {
            order: {
              orderCode,
            },
          },
          include: {
            deliveryProof: true,
            order: {
              include: {
                package: true,
                payment: true,
                statusHistory: {
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                },
              },
            },
          },
        },
      },
    });

    const activeRoute = await withTimeout(query);
    const stop = activeRoute?.stops?.[0];
    const order = stop?.order;

    // 4. Nếu không tìm thấy hoặc đơn thuộc tài xế khác -> Trả cùng một thông báo và ghi nhận cảnh báo
    if (!activeRoute || !stop || !order) {
      securityAuditService.recordFailedOrderLookup(ctx.staffId, orderCode);
      return {
        success: false,
        message: 'Không tìm thấy đơn hàng này trong danh sách của bác.',
      };
    }

    // 5. Xác định quy tắc che số điện thoại:
    // Đầy đủ nếu đơn này đang là chặng hiện tại hoặc kế tiếp; các đơn khác che 4 số giữa
    const currentPendingStop = await prisma.routeStop.findFirst({
      where: {
        routeId: activeRoute.id,
        status: { in: ['PENDING', 'ARRIVED'] },
      },
      orderBy: { sequence: 'asc' },
      select: { sequence: true },
    });

    const currentSeq = currentPendingStop?.sequence || 0;
    const isCurrentOrNext = stop.sequence === currentSeq || stop.sequence === currentSeq + 1;

    const safePhone = isCurrentOrNext
      ? order.receiverPhone
      : maskPhoneMiddle(order.receiverPhone);

    const codAmount = Number(order.payment?.finalCodAmount || order.estimatedCodAmount || 0);

    const history = (order.statusHistory || []).map((h) => ({
      status: h.status,
      reason: h.reason || undefined,
      time: new Date(h.createdAt).toLocaleString('vi-VN'),
    }));

    return {
      success: true,
      orderCode: order.orderCode,
      status: order.status,
      sequence: stop.sequence,
      receiverName: order.receiverName,
      receiverPhone: safePhone,
      isPhoneMasked: !isCurrentOrNext,
      deliveryAddress: order.deliveryAddressText,
      packageDescription: sanitizeNoteText(order.package?.description),
      weightKg: Number(order.package?.weight || 0),
      codAmount,
      codStatus: order.payment?.codCollectionStatus || 'PENDING_COLLECTION',
      deliveryHistory: history,
    };
  } catch (error: any) {
    console.error('[Tool: get_order_delivery_info] Lỗi:', error);
    return {
      success: false,
      message: 'Hệ thống đang bận hoặc quá thời gian xử lý, bác tài vui lòng thử lại sau ít phút.',
    };
  }
}

/**
 * 4. Tool: get_cod_summary
 * Tổng hợp toàn bộ số liệu tiền COD trong ca hôm nay trực tiếp bằng truy vấn Database
 */
export async function getCodSummary(
  rawArgs: Record<string, any>,
  ctx: ToolContext
): Promise<Record<string, any>> {
  try {
    if (!isValidUuid(ctx.staffId)) {
      return {
        success: false,
        message: 'Không thể xác thực thông tin tài xế từ phiên đăng nhập.',
      };
    }

    const validation = GetCodSummaryParamsSchema.safeParse(rawArgs || {});
    if (!validation.success) {
      return {
        success: false,
        message: formatZodError(validation.error),
      };
    }

    const { includeOrders } = validation.data;

    // Lấy lộ trình đang hoạt động
    const queryRoute = prisma.route.findFirst({
      where: {
        driverVehicleAssignment: {
          driverId: ctx.staffId,
          isActive: true,
        },
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        completedAt: null,
      },
      select: { id: true, routeCode: true },
    });

    const activeRoute = await withTimeout(queryRoute);

    if (!activeRoute) {
      return {
        success: true,
        totalReceivable: 0,
        collectedAmount: 0,
        remainingToRemit: 0,
        codOrdersCount: 0,
        deadline: '18:30',
        message: 'Bác tài hiện chưa có lộ trình hoạt động nên chưa phát sinh dữ liệu tiền COD trong ca hôm nay.',
      };
    }

    // Truy vấn các điểm dừng giao hàng có đơn trong lộ trình
    const queryStops = prisma.routeStop.findMany({
      where: {
        routeId: activeRoute.id,
        stopType: 'DELIVERY',
        orderId: { not: null },
      },
      include: {
        order: {
          include: {
            payment: true,
          },
        },
      },
    });

    const stops = await withTimeout(queryStops);

    // Tính toán tổng hợp trong CSDL
    let totalReceivable = 0;
    let collectedAmount = 0;
    let remainingToRemit = 0;
    const codOrdersList: any[] = [];

    for (const stop of stops) {
      const ord = stop.order;
      if (!ord) continue;

      const cod = Number(ord.payment?.finalCodAmount || ord.estimatedCodAmount || 0);
      if (cod > 0) {
        totalReceivable += cod;
        const codStatus = ord.payment?.codCollectionStatus;

        if (codStatus === 'COLLECTED') {
          collectedAmount += cod;
        } else if (codStatus === 'PENDING_COLLECTION' || !codStatus) {
          remainingToRemit += cod;
        }

        if (includeOrders) {
          codOrdersList.push({
            orderCode: ord.orderCode,
            sequence: stop.sequence,
            codAmount: cod,
            status: codStatus || 'PENDING_COLLECTION',
          });
        }
      }
    }

    return {
      success: true,
      routeCode: activeRoute.routeCode,
      totalReceivable,
      collectedAmount,
      remainingToRemit,
      codOrdersCount: codOrdersList.length || stops.filter((s) => Number(s.order?.payment?.finalCodAmount || s.order?.estimatedCodAmount || 0) > 0).length,
      deadline: '18:30 (trước giờ đóng quầy thủ quỹ bưu cục)',
      orders: includeOrders ? codOrdersList.slice(0, 10) : undefined,
      message: `Tổng COD cần thu trong ca là ${totalReceivable.toLocaleString('vi-VN')} đ (Đã thu: ${collectedAmount.toLocaleString('vi-VN')} đ, Còn lại: ${remainingToRemit.toLocaleString('vi-VN')} đ). Hạn nộp tiền về quầy thủ quỹ trước 18:30 hàng ngày.`,
    };
  } catch (error: any) {
    console.error('[Tool: get_cod_summary] Lỗi:', error);
    return {
      success: false,
      message: 'Hệ thống đang bận hoặc quá thời gian xử lý, bác tài vui lòng thử lại sau ít phút.',
    };
  }
}

/**
 * 5. Tool: find_nearest_facility
 * Tìm bưu cục/hub gần vị trí tài xế nhất (lấy GPS mới nhất từ CSDL, kiểm tra độ tươi 10 phút)
 * Tuyệt đối không nhận tọa độ từ client, dùng hotline bưu cục chuẩn 1900-6868
 */
export async function findNearestFacility(
  rawArgs: Record<string, any>,
  ctx: ToolContext
): Promise<Record<string, any>> {
  try {
    if (!isValidUuid(ctx.staffId)) {
      return {
        success: false,
        message: 'Không thể xác thực thông tin tài xế từ phiên đăng nhập.',
      };
    }

    const validation = FindNearestFacilityParamsSchema.safeParse(rawArgs || {});
    if (!validation.success) {
      return {
        success: false,
        message: formatZodError(validation.error),
      };
    }

    const { limit } = validation.data;

    // 1. Lấy vị trí GPS mới nhất từ bảng driver_locations
    const queryGps = prisma.driverLocation.findUnique({
      where: { driverId: ctx.staffId },
    });

    const driverLoc = await withTimeout(queryGps);

    const now = Date.now();
    const isStale =
      !driverLoc ||
      now - new Date(driverLoc.recordedAt).getTime() > 10 * 60 * 1000; // quá 10 phút

    // 2. Nếu không có GPS hoặc GPS đã cũ -> Phương án dự phòng bưu cục xuất phát của tuyến
    if (!driverLoc || isStale) {
      const activeRouteQuery = prisma.route.findFirst({
        where: {
          driverVehicleAssignment: {
            driverId: ctx.staffId,
            isActive: true,
          },
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
          completedAt: null,
        },
        include: {
          startFacility: {
            include: {
              address: true,
            },
          },
        },
      });

      const activeRoute = await withTimeout(activeRouteQuery);
      const startFac = activeRoute?.startFacility;

      if (startFac) {
        const warning = !driverLoc
          ? 'Hệ thống chưa ghi nhận vị trí GPS hiện tại của bác tài trên ứng dụng.'
          : 'Vị trí GPS của bác tài đã cũ (ghi nhận cách đây hơn 10 phút). Bác tài vui lòng mở ứng dụng hoặc bật định vị để cập nhật tọa độ mới nhất.';

        return {
          success: true,
          hasFreshGps: false,
          reason: !driverLoc ? 'NO_GPS' : 'STALE_GPS',
          facility: {
            facilityCode: startFac.facilityCode,
            facilityName: startFac.facilityName,
            address: startFac.address?.addressLine1 || 'Chưa cập nhật địa chỉ',
            hotline: '1900-6868 (Phím 1)',
            operatingHours: '07:30 - 21:00 (Thứ 2 - Chủ Nhật, kể cả ngày lễ)',
            note: 'Lưu ý: Đây là bưu cục xuất phát của ca chạy hiện tại, không phải bưu cục gần vị trí thực tế của bác tài lúc này.',
          },
          message: `${warning} Bác tài có thể đến bưu cục xuất phát của ca giao: ${startFac.facilityName} tại ${startFac.address?.addressLine1 || 'bưu cục điều phối'}.`,
        };
      }

      return {
        success: true,
        hasFreshGps: false,
        reason: !driverLoc ? 'NO_GPS' : 'STALE_GPS',
        message: !driverLoc
          ? 'Hệ thống chưa ghi nhận vị trí GPS hiện tại của bác tài. Bác tài vui lòng bật định vị trên ứng dụng và thử lại.'
          : 'Vị trí GPS của bác tài đã cũ (hơn 10 phút trước). Bác tài vui lòng mở ứng dụng để cập nhật tọa độ mới nhất.',
      };
    }

    // 3. Có GPS tươi (< 10 phút) -> Tính khoảng cách đến các bưu cục đang hoạt động (ACTIVE)
    const queryFacilities = prisma.facility.findMany({
      where: {
        operatingStatus: 'ACTIVE',
      },
      include: {
        address: true,
      },
    });

    const facilities = await withTimeout(queryFacilities);

    if (!facilities || facilities.length === 0) {
      return {
        success: true,
        hasFreshGps: true,
        count: 0,
        facilities: [],
        message: 'Hiện không tìm thấy bưu cục nào đang hoạt động trong hệ thống.',
      };
    }

    // Tính khoảng cách Haversine
    const facilitiesWithDistance = facilities
      .filter((f) => f.address?.latitude && f.address?.longitude)
      .map((f) => {
        const distanceKm = calculateHaversineDistance(
          driverLoc.latitude,
          driverLoc.longitude,
          f.address!.latitude,
          f.address!.longitude
        );
        return {
          facilityCode: f.facilityCode,
          facilityName: f.facilityName,
          address: f.address!.addressLine1,
          distanceKm: Number(distanceKm.toFixed(2)),
          hotline: '1900-6868 (Phím 1)',
          operatingHours: '07:30 - 21:00 (Thứ 2 - Chủ Nhật, kể cả ngày lễ)',
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const nearestList = facilitiesWithDistance.slice(0, limit);

    return {
      success: true,
      hasFreshGps: true,
      driverGpsTime: new Date(driverLoc.recordedAt).toLocaleString('vi-VN'),
      count: nearestList.length,
      facilities: nearestList,
      message:
        nearestList.length > 0
          ? `Bưu cục gần bác tài nhất là ${nearestList[0].facilityName} (cách khoảng ${nearestList[0].distanceKm} km tại ${nearestList[0].address}).`
          : 'Không tìm thấy bưu cục phù hợp gần vị trí của bác tài.',
    };
  } catch (error: any) {
    console.error('[Tool: find_nearest_facility] Lỗi:', error);
    return {
      success: false,
      message: 'Hệ thống đang bận hoặc quá thời gian xử lý, bác tài vui lòng thử lại sau ít phút.',
    };
  }
}
