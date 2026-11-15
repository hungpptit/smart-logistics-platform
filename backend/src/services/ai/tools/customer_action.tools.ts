import { prisma } from '../../../config/prisma';
import { PricingService } from '../../pricing/pricing.service';
import { OrderService } from '../../order.service';
import { GeocodingService } from '../../geocoding.service';
import { actionTokenService, ActionType } from '../action_token.service';
import { ToolContext } from './customer_read.tools';

const pricingService = new PricingService();
const orderService = new OrderService();
const geocodingService = new GeocodingService();

/**
 * Helper: Phân tích chuỗi địa chỉ tự do thành các thành phần địa chỉ chuẩn
 */
async function parseAddressToDto(rawAddress: string): Promise<{
  addressLine1: string;
  ward: string;
  province: string;
  wardCode?: string;
}> {
  const parts = (rawAddress || '').split(',').map((s) => s.trim()).filter(Boolean);
  let addressLine1 = rawAddress || 'Địa chỉ nhận hàng';
  let ward = 'Phường Thủ Đức';
  let province = 'Hồ Chí Minh';
  let wardCode: string | undefined = undefined;

  if (parts.length >= 3) {
    province = parts[parts.length - 1];
    ward = parts[parts.length - 2];
    addressLine1 = parts.slice(0, parts.length - 2).join(', ');
  } else if (parts.length === 2) {
    province = parts[1];
    addressLine1 = parts[0];
  }

  // Cố gắng tìm ward chuẩn trong cơ sở dữ liệu
  const cleanWard = ward.replace(/^(phường|xã|thị trấn|p\.|x\.)\s+/i, '').trim();
  const wardRecord = await prisma.ward.findFirst({
    where: {
      OR: [
        { fullName: { contains: cleanWard, mode: 'insensitive' } },
        { name: { contains: cleanWard, mode: 'insensitive' } },
      ],
    },
    include: { province: true },
  });

  if (wardRecord) {
    ward = wardRecord.fullName || wardRecord.name;
    if (wardRecord.province) {
      province = wardRecord.province.fullName || wardRecord.province.name;
    }
    wardCode = wardRecord.code;
  }

  return { addressLine1, ward, province, wardCode };
}

/**
 * 1. Action Tool: cancel_order
 * Yêu cầu hủy đơn hàng (Chỉ cho phép khi ở CREATED hoặc READY_FOR_PICKUP)
 */
export async function requestCancelOrder(
  args: { orderCode: string; reason?: string },
  ctx: ToolContext
): Promise<Record<string, any>> {
  try {
    if (!ctx.customerId) {
      return {
        success: false,
        message: 'Quý khách vui lòng đăng nhập để thực hiện hủy đơn hàng.',
      };
    }

    const rawCode = args?.orderCode;
    if (!rawCode) {
      return { success: false, message: 'Vui lòng cung cấp mã đơn hàng cần hủy.' };
    }

    const orderCode = rawCode.trim().toUpperCase();

    const order = await prisma.order.findFirst({
      where: {
        orderCode,
        customerId: ctx.customerId,
      },
    });

    if (!order) {
      return {
        success: false,
        message: `Không tìm thấy đơn hàng ${orderCode} trong danh sách đơn của quý khách.`,
      };
    }

    // KHÓA NGHIỆP VỤ: Chỉ cho phép hủy khi CREATED hoặc READY_FOR_PICKUP
    const cancellableStatuses = ['CREATED', 'READY_FOR_PICKUP'];
    if (!cancellableStatuses.includes(order.status)) {
      return {
        success: false,
        allowed: false,
        currentStatus: order.status,
        message: `Đơn hàng ${order.orderCode} hiện đang ở trạng thái "${order.status}". Hàng đã được tài xế tiếp nhận hoặc đang luân chuyển trong mạng lưới, nên hệ thống không thể hủy trực tiếp qua chat. Quý khách có thể từ chối nhận hàng khi shipper liên hệ hoặc gọi Hotline 1900-6868 để được hỗ trợ chuyên sâu.`,
      };
    }

    const reason = args.reason?.trim() || 'Khách hàng yêu cầu hủy qua Trợ lý ảo AI';

    // Sinh confirmation token có hạn 5 phút (300s)
    const token = await actionTokenService.createToken(
      {
        actionType: 'CANCEL_ORDER',
        orderId: order.id,
        orderCode: order.orderCode,
        customerId: ctx.customerId,
        summary: `Hủy đơn hàng ${order.orderCode}`,
        details: { reason },
      },
      300
    );

    return {
      success: true,
      requiresConfirmation: true,
      actionType: 'CANCEL_ORDER',
      orderCode: order.orderCode,
      currentStatus: order.status,
      reason,
      confirmationToken: token,
      expiresInSeconds: 300,
      message: `Em đã tiếp nhận yêu cầu hủy đơn hàng ${order.orderCode} (Lý do: ${reason}). Quý khách vui lòng kiểm tra lại và bấm nút [Xác nhận hủy đơn hàng] trên màn hình trong vòng 5 phút để hoàn tất thủ tục nhé.`,
    };
  } catch (error: any) {
    console.error('[Tool: cancel_order] Lỗi:', error);
    return {
      success: false,
      message: 'Không thể xử lý yêu cầu hủy đơn lúc này.',
      error: error.message,
    };
  }
}

/**
 * 2. Action Tool: update_delivery_info
 * Cập nhật SĐT người nhận, địa chỉ nhận hàng, ghi chú
 * (KHÓA khi đã vào kho trung chuyển AT_HUB hoặc đang đi giao)
 */
export async function requestUpdateDeliveryInfo(
  args: {
    orderCode: string;
    receiverPhone?: string;
    deliveryAddressText?: string;
    note?: string;
  },
  ctx: ToolContext
): Promise<Record<string, any>> {
  try {
    if (!ctx.customerId) {
      return {
        success: false,
        message: 'Quý khách vui lòng đăng nhập để cập nhật thông tin giao nhận.',
      };
    }

    const rawCode = args?.orderCode;
    if (!rawCode) {
      return { success: false, message: 'Vui lòng cung cấp mã đơn hàng cần cập nhật.' };
    }

    const orderCode = rawCode.trim().toUpperCase();

    const order = await prisma.order.findFirst({
      where: {
        orderCode,
        customerId: ctx.customerId,
      },
    });

    if (!order) {
      return {
        success: false,
        message: `Không tìm thấy đơn hàng ${orderCode} trong danh sách đơn của quý khách.`,
      };
    }

    // KHÓA NGHIỆP VỤ: Đã vào kho AT_HUB hoặc đang đi giao thì KHÓA SỬA
    const editableStatuses = ['CREATED', 'READY_FOR_PICKUP'];
    if (!editableStatuses.includes(order.status)) {
      return {
        success: false,
        allowed: false,
        currentStatus: order.status,
        message: `Đơn hàng ${order.orderCode} hiện đang ở trạng thái "${order.status}" (hàng đã vào kho trung chuyển phân loại tự động hoặc đang xuất tuyến đi giao). Để tránh thất lạc và sai lệch mã barcode luồng phân tuyến, hệ thống đã khóa việc sửa đổi địa chỉ. Quý khách vui lòng liên hệ Tổng đài 1900-6868 nếu cần hỗ trợ đổi tuyến khẩn cấp.`,
      };
    }

    const newPhone = args.receiverPhone?.trim();
    const newAddress = args.deliveryAddressText?.trim();
    const note = args.note?.trim();

    if (!newPhone && !newAddress && !note) {
      return {
        success: false,
        message: 'Vui lòng cung cấp ít nhất một thông tin cần thay đổi (Số điện thoại mới hoặc Địa chỉ mới).',
      };
    }

    const token = await actionTokenService.createToken(
      {
        actionType: 'UPDATE_DELIVERY_INFO',
        orderId: order.id,
        orderCode: order.orderCode,
        customerId: ctx.customerId,
        summary: `Cập nhật thông tin nhận hàng đơn ${order.orderCode}`,
        details: {
          receiverPhone: newPhone || order.receiverPhone,
          deliveryAddressText: newAddress || order.deliveryAddressText,
          note,
        },
      },
      300
    );

    return {
      success: true,
      requiresConfirmation: true,
      actionType: 'UPDATE_DELIVERY_INFO',
      orderCode: order.orderCode,
      newPhone: newPhone || 'Giữ nguyên',
      newAddress: newAddress || 'Giữ nguyên',
      note: note || 'Không có',
      confirmationToken: token,
      expiresInSeconds: 300,
      message: `Em đã chuẩn bị thông tin cập nhật cho đơn ${order.orderCode}:${newPhone ? `\n- SĐT mới: ${newPhone}` : ''}${newAddress ? `\n- Địa chỉ mới: ${newAddress}` : ''}\nQuý khách vui lòng bấm nút [Xác nhận cập nhật] bên dưới trong vòng 5 phút để hệ thống áp dụng nhé.`,
    };
  } catch (error: any) {
    console.error('[Tool: update_delivery_info] Lỗi:', error);
    return {
      success: false,
      message: 'Không thể xử lý yêu cầu đổi thông tin giao hàng lúc này.',
      error: error.message,
    };
  }
}

/**
 * 3. Action Tool: reschedule_delivery
 * Hẹn lại ngày giao hàng khi khách bận (1 đến 3 ngày tới)
 */
export async function requestRescheduleDelivery(
  args: { orderCode: string; newDeliveryDate: string; note?: string },
  ctx: ToolContext
): Promise<Record<string, any>> {
  try {
    if (!ctx.customerId) {
      return {
        success: false,
        message: 'Quý khách vui lòng đăng nhập để hẹn lại ngày giao hàng.',
      };
    }

    const rawCode = args?.orderCode;
    const rawDate = args?.newDeliveryDate;
    if (!rawCode || !rawDate) {
      return {
        success: false,
        message: 'Vui lòng cung cấp mã đơn hàng và ngày giao mới (ví dụ: ngày 12/11/2026).',
      };
    }

    const orderCode = rawCode.trim().toUpperCase();

    const order = await prisma.order.findFirst({
      where: {
        orderCode,
        customerId: ctx.customerId,
      },
    });

    if (!order) {
      return {
        success: false,
        message: `Không tìm thấy đơn hàng ${orderCode} trong tài khoản của quý khách.`,
      };
    }

    const targetDate = new Date(rawDate);
    if (isNaN(targetDate.getTime())) {
      return {
        success: false,
        message: 'Ngày hẹn lại không hợp lệ. Quý khách vui lòng cung cấp định dạng ngày rõ ràng (ví dụ: 2026-11-12 hoặc ngày mai).',
      };
    }

    const token = await actionTokenService.createToken(
      {
        actionType: 'RESCHEDULE_DELIVERY',
        orderId: order.id,
        orderCode: order.orderCode,
        customerId: ctx.customerId,
        summary: `Hẹn lại ngày giao đơn ${order.orderCode} sang ${targetDate.toLocaleDateString('vi-VN')}`,
        details: {
          newDeliveryDate: targetDate.toISOString(),
          note: args.note?.trim() || 'Khách hẹn lại ngày giao qua AI',
        },
      },
      300
    );

    return {
      success: true,
      requiresConfirmation: true,
      actionType: 'RESCHEDULE_DELIVERY',
      orderCode: order.orderCode,
      newDeliveryDate: targetDate.toLocaleDateString('vi-VN'),
      confirmationToken: token,
      expiresInSeconds: 300,
      message: `Em đã ghi nhận lịch hẹn lại ngày giao cho đơn ${order.orderCode} vào ngày **${targetDate.toLocaleDateString('vi-VN')}**. Quý khách vui lòng bấm nút [Xác nhận đổi lịch giao] bên dưới để lưu vào hệ thống nhé.`,
    };
  } catch (error: any) {
    console.error('[Tool: reschedule_delivery] Lỗi:', error);
    return {
      success: false,
      message: 'Không thể xử lý yêu cầu hẹn ngày giao lúc này.',
      error: error.message,
    };
  }
}

/**
 * 4. Action Tool: create_draft_order
 * Thu thập thông tin giao nhận để tạo đơn hàng nháp và tạo yêu cầu xác nhận 2 bước để đặt đơn
 */
export async function createDraftOrder(
  args: {
    receiverName: string;
    receiverPhone: string;
    deliveryAddress: string;
    weightKg: number;
    serviceCode?: string;
    pickupType?: 'PICKUP' | 'DROP_OFF';
    codAmount?: number;
    description?: string;
    isFragile?: boolean;
    feePayer?: 'SENDER' | 'RECEIVER';
    pickupAddressText?: string;
    senderName?: string;
    senderPhone?: string;
  },
  ctx: ToolContext
): Promise<Record<string, any>> {
  try {
    if (!ctx.customerId) {
      return {
        success: false,
        message: 'Quý khách vui lòng đăng nhập để thực hiện đặt đơn hàng.',
      };
    }

    const receiverName = args?.receiverName?.trim();
    const receiverPhone = args?.receiverPhone?.trim();
    const deliveryAddress = args?.deliveryAddress?.trim();
    const weightKg = Number(args?.weightKg) || 1.0;

    // Chuẩn hóa Gói dịch vụ (mặc định: STANDARD - Giao hàng Tiêu chuẩn)
    const rawService = (args?.serviceCode || '').toUpperCase();
    const serviceCode = ['STANDARD', 'EXPRESS', 'SAVING', 'COLD_CHAIN'].includes(rawService)
      ? rawService
      : 'STANDARD';
    const serviceNameMap: Record<string, string> = {
      STANDARD: 'Giao hàng Tiêu chuẩn',
      EXPRESS: 'Giao hàng Hỏa tốc 2h',
      SAVING: 'Giao hàng Tiết kiệm',
      COLD_CHAIN: 'Vận chuyển Đông lạnh',
    };
    const serviceName = serviceNameMap[serviceCode] || 'Giao hàng Tiêu chuẩn';

    // Chuẩn hóa Hình thức gửi hàng (mặc định: PICKUP - Lấy tận nơi)
    const rawPickup = (args?.pickupType || '').toUpperCase();
    const pickupType: 'PICKUP' | 'DROP_OFF' = rawPickup === 'DROP_OFF' ? 'DROP_OFF' : 'PICKUP';
    const pickupTypeText = pickupType === 'DROP_OFF' ? 'Gửi tại bưu cục' : 'Lấy tận nơi';

    const codAmount = Number(args?.codAmount) || 0;
    const description = args?.description?.trim() || 'Hàng hóa thông thường';
    const isFragile = Boolean(args?.isFragile);
    const feePayer = args?.feePayer === 'RECEIVER' ? 'RECEIVER' : 'SENDER';
    const feePayerText = feePayer === 'RECEIVER' ? 'Người nhận trả cước' : 'Người gửi trả cước';

    if (!receiverName || !receiverPhone || !deliveryAddress) {
      return {
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: Tên người nhận, Số điện thoại và Địa chỉ giao hàng.',
      };
    }

    // Lấy thông tin khách hàng và địa chỉ mặc định trong hồ sơ
    const customer = await prisma.customer.findUnique({
      where: { id: ctx.customerId },
      include: {
        user: true,
        addresses: {
          include: {
            address: {
              include: {
                wardRelation: {
                  include: {
                    province: true,
                  },
                },
              },
            },
          },
          orderBy: { isDefault: 'desc' },
          take: 1,
        },
      },
    });

    const defaultCustAddr = customer?.addresses?.[0]?.address;
    const defaultAddressText = defaultCustAddr
      ? `${defaultCustAddr.addressLine1}, ${defaultCustAddr.wardRelation?.fullName || ''}, ${defaultCustAddr.wardRelation?.province?.fullName || ''}`
      : 'Bưu cục Thủ Đức (mặc định)';

    const senderName = args?.senderName?.trim() || customer?.fullName || customer?.user?.username || 'Khách hàng Velocity';
    const senderPhone = args?.senderPhone?.trim() || customer?.phone || '0900000000';
    const pickupAddressText = args?.pickupAddressText?.trim() || defaultAddressText;
    const pickupAddressId = defaultCustAddr?.id;

    // Geocode địa chỉ giao hàng để có tọa độ GPS ban đầu phục vụ bản đồ
    let deliveryLatitude = 10.8231;
    let deliveryLongitude = 106.6297;
    try {
      const geocoded = await geocodingService.geocode(deliveryAddress);
      if (geocoded && geocoded.latitude && geocoded.longitude) {
        deliveryLatitude = parseFloat(geocoded.latitude.toFixed(6));
        deliveryLongitude = parseFloat(geocoded.longitude.toFixed(6));
      }
    } catch (geoErr) {
      console.warn('[createDraftOrder] Lỗi Geocoding deliveryAddress:', geoErr);
    }

    // Tính cước dự kiến với khoảng cách mặc định 10km nội thành
    const priceResult = await pricingService.calculatePrice(serviceCode, 10, weightKg, isFragile, codAmount);

    const shippingFee = priceResult.shippingFee;
    const insuranceFee = priceResult.insuranceFee;
    const totalShippingFee = priceResult.totalAmount;
    const totalOrderAmount = totalShippingFee + codAmount;

    // Tạo mã xác nhận đặt đơn hàng 2 bước (5 phút = 300 giây)
    const token = await actionTokenService.createToken({
      actionType: 'CONFIRM_CREATE_ORDER',
      customerId: ctx.customerId,
      summary: `Tạo đơn gửi đến ${receiverName} (${receiverPhone}), địa chỉ: ${deliveryAddress}`,
      details: {
        receiverName,
        receiverPhone,
        deliveryAddress,
        deliveryLatitude,
        deliveryLongitude,
        weightKg,
        serviceCode,
        serviceName,
        pickupType,
        pickupTypeText,
        codAmount,
        feePayer,
        feePayerText,
        description,
        isFragile,
        senderName,
        senderPhone,
        pickupAddressText,
        pickupAddressId,
        shippingFee,
        insuranceFee,
        totalShippingFee,
        totalOrderAmount,
        formattedEta: priceResult.formattedDeliveryEta,
      },
    });

    const codText = codAmount > 0 ? `\n- Tiền thu hộ COD: **${codAmount.toLocaleString('vi-VN')} ₫**` : '';
    const feeText = `\n- Cước phí vận chuyển dự kiến: **${totalShippingFee.toLocaleString('vi-VN')} ₫** (${priceResult.formattedDeliveryEta})`;
    const totalText = codAmount > 0
      ? `\n- **Tổng số tiền thu khi giao hàng (Tổng chi phí đơn)**: **${totalOrderAmount.toLocaleString('vi-VN')} ₫** (gồm tiền COD và cước vận chuyển)`
      : `\n- **Tổng chi phí đơn**: **${totalShippingFee.toLocaleString('vi-VN')} ₫**`;

    return {
      success: true,
      requiresConfirmation: true,
      isDraft: true,
      isDraftOrder: true,
      actionType: 'CONFIRM_CREATE_ORDER',
      confirmationToken: token,
      expiresInSeconds: 300,
      details: {
        receiverName,
        receiverPhone,
        deliveryAddress,
        deliveryLatitude,
        deliveryLongitude,
        weightKg,
        serviceCode,
        serviceName,
        pickupType,
        pickupTypeText,
        codAmount,
        feePayer,
        feePayerText,
        description,
        isFragile,
        senderName,
        senderPhone,
        pickupAddressText,
        shippingFee,
        insuranceFee,
        totalShippingFee,
        totalOrderAmount,
        formattedEta: priceResult.formattedDeliveryEta,
      },
      draftData: {
        receiverName,
        receiverPhone,
        deliveryAddress,
        deliveryLatitude,
        deliveryLongitude,
        weightKg,
        serviceCode,
        serviceName,
        pickupType,
        pickupTypeText,
        codAmount,
        feePayer,
        feePayerText,
        description,
        isFragile,
        senderName,
        senderPhone,
        pickupAddressText,
        shippingFee,
        insuranceFee,
        totalShippingFee,
        totalOrderAmount,
        estimatedShippingFee: totalShippingFee,
        estimatedTotalFee: totalShippingFee,
        formattedEta: priceResult.formattedDeliveryEta,
      },
      message: `Em đã tạo đơn hàng nháp và chuẩn bị thẻ xác nhận đặt đơn với thông tin sau:\n- Người gửi: **${senderName}** (${senderPhone})\n- Điểm lấy hàng: **${pickupAddressText}**\n- Hình thức gửi: **${pickupTypeText}**\n- Người nhận: **${receiverName}** (${receiverPhone})\n- Địa chỉ giao: **${deliveryAddress}**\n- Kiện hàng: **${description}** (${weightKg} kg, ${isFragile ? 'Dễ vỡ' : 'Tiêu chuẩn'})\n- Gói dịch vụ: **${serviceName}** (${feePayerText})${codText}${feeText}${totalText}\n\nQuý khách vui lòng kiểm tra lại thông tin và bấm nút **[Xác nhận đặt đơn hàng]** bên dưới trong vòng 5 phút để hệ thống tạo đơn ngay nhé!`,
    };
  } catch (error: any) {
    console.error('[Tool: create_draft_order] Lỗi:', error);
    return {
      success: false,
      message: 'Lỗi khi tạo đơn hàng nháp.',
      error: error.message,
    };
  }
}

/**
 * 5. Action Tool: escalate_to_human
 * Chuyển giao hỗ trợ sang chuyên viên CSKH
 */
export async function escalateToHuman(
  args: { issueType?: string; summary?: string },
  _ctx: ToolContext
): Promise<Record<string, any>> {
  return {
    success: true,
    isEscalation: true,
    issueType: args.issueType || 'Hỗ trợ nghiệp vụ chuyên sâu',
    summary: args.summary || 'Yêu cầu gặp chuyên viên CSKH',
    hotline: '1900-6868 (Nhánh 1 - Miễn cước cuộc gọi)',
    zaloOA: 'https://zalo.me/velocity_logistics',
    operatingHours: '24/7 (Phục vụ xuyên suốt kể cả lễ tết)',
    message:
      'Dạ em đã ghi nhận yêu cầu của Quý khách. Để giải quyết nhanh nhất các trường hợp đặc biệt, Quý khách vui lòng liên hệ Hotline 1900-6868 (Phím 1) hoặc nhắn tin qua Zalo OA Velocity. Chuyên viên CSKH trực ca sẽ tiếp nhận hồ sơ và xử lý ngay cho Quý khách ạ!',
  };
}

/**
 * Xử lý xác nhận hành động từ người dùng sau khi bấm nút trên giao diện
 */
export async function executeConfirmedAction(
  token: string,
  actionType: ActionType,
  customerId: string,
  userId: string,
  customCoordinates?: { lat: number; lng: number }
): Promise<{ success: boolean; message: string; data?: any }> {
  const payload = await actionTokenService.verifyAndConsumeToken(token, actionType, customerId);

  if (!payload) {
    return {
      success: false,
      message: 'Mã xác nhận không hợp lệ, đã bị hủy hoặc đã hết hạn (quá 5 phút). Quý khách vui lòng thực hiện lại yêu cầu trong khung chat.',
    };
  }

  if (actionType === 'CANCEL_ORDER') {
    if (!payload.orderId) {
      return { success: false, message: 'Không tìm thấy thông tin đơn hàng cần hủy.' };
    }
    // 1. Cập nhật Order sang CANCELLED
    const updatedOrder = await prisma.order.update({
      where: { id: payload.orderId },
      data: {
        status: 'CANCELLED',
        updatedBy: userId,
      },
    });

    // 2. Ghi nhật ký trạng thái
    await prisma.orderStatusHistory.create({
      data: {
        orderId: updatedOrder.id,
        status: 'CANCELLED',
        changedByUserId: userId,
        reason: payload.details.reason || 'Khách hàng xác nhận hủy đơn qua Trợ lý AI CSKH',
      },
    });

    // 3. Hủy RouteStop nếu có
    await prisma.routeStop.updateMany({
      where: { orderId: payload.orderId, status: 'PENDING' },
      data: { status: 'SKIPPED' },
    });

    return {
      success: true,
      message: `Đơn hàng ${updatedOrder.orderCode} đã được hủy thành công trên hệ thống.`,
      data: { orderCode: updatedOrder.orderCode, status: 'CANCELLED' },
    };
  }

  if (actionType === 'UPDATE_DELIVERY_INFO') {
    if (!payload.orderId) {
      return { success: false, message: 'Không tìm thấy thông tin đơn hàng cần cập nhật.' };
    }
    const updatedOrder = await prisma.order.update({
      where: { id: payload.orderId },
      data: {
        deliveryAddressText: payload.details.deliveryAddressText,
        receiverPhone: payload.details.receiverPhone,
        updatedBy: userId,
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        changedByUserId: userId,
        reason: `Cập nhật thông tin giao nhận qua Trợ lý AI: SĐT ${payload.details.receiverPhone}, Địa chỉ: ${payload.details.deliveryAddressText}`,
      },
    });

    return {
      success: true,
      message: `Đã cập nhật thông tin nhận hàng thành công cho đơn ${updatedOrder.orderCode}.`,
      data: {
        orderCode: updatedOrder.orderCode,
        receiverPhone: updatedOrder.receiverPhone,
        deliveryAddressText: updatedOrder.deliveryAddressText,
      },
    };
  }

  if (actionType === 'RESCHEDULE_DELIVERY') {
    if (!payload.orderId) {
      return { success: false, message: 'Không tìm thấy thông tin đơn hàng cần hẹn lại.' };
    }
    const targetDate = new Date(payload.details.newDeliveryDate);
    const updatedOrder = await prisma.order.update({
      where: { id: payload.orderId },
      data: {
        estimatedDeliveryDate: targetDate,
        updatedBy: userId,
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        changedByUserId: userId,
        reason: `Khách hẹn lại ngày giao sang ${targetDate.toLocaleDateString('vi-VN')}: ${payload.details.note || 'Không có ghi chú'}`,
      },
    });

    return {
      success: true,
      message: `Đã cập nhật lịch hẹn giao hàng mới cho đơn ${updatedOrder.orderCode} vào ngày ${targetDate.toLocaleDateString('vi-VN')}.`,
      data: {
        orderCode: updatedOrder.orderCode,
        newDeliveryDate: targetDate.toLocaleDateString('vi-VN'),
      },
    };
  }

  if (actionType === 'CONFIRM_CREATE_ORDER') {
    const details = payload.details;
    const customerId = payload.customerId;

    try {
      // 1. Phân tích địa chỉ nhận hàng
      const parsedDelivery = await parseAddressToDto(details.deliveryAddress);

      // 2. Phân tích địa chỉ lấy hàng
      let pickupAddressPayload: any = undefined;
      let pickupAddressIdPayload: string | undefined = details.pickupAddressId;

      if (!pickupAddressIdPayload && details.pickupAddressText) {
        const parsedPickup = await parseAddressToDto(details.pickupAddressText);
        pickupAddressPayload = {
          addressLine1: parsedPickup.addressLine1,
          ward: parsedPickup.ward,
          province: parsedPickup.province,
          wardCode: parsedPickup.wardCode,
          country: 'Vietnam',
        };
      }

      const finalDeliveryLat = customCoordinates?.lat || details.deliveryLatitude;
      const finalDeliveryLng = customCoordinates?.lng || details.deliveryLongitude;

      // 3. Chuẩn bị DTO tạo đơn hàng
      const createOrderDto: any = {
        customerId,
        serviceCode: details.serviceCode || 'STANDARD',
        feePayer: details.feePayer || 'SENDER',
        paymentMethod: details.codAmount > 0 ? 'COD' : 'CASH',
        codAmount: Number(details.codAmount) || 0,
        pickupType: details.pickupType || 'PICKUP',
        senderContact: {
          fullName: details.senderName || 'Người gửi',
          phone: (details.senderPhone || '0900000000').replace(/[\s\.\-\(\)]/g, ''),
        },
        receiverContact: {
          fullName: details.receiverName,
          phone: (details.receiverPhone || '').replace(/[\s\.\-\(\)]/g, ''),
        },
        deliveryAddress: {
          addressLine1: parsedDelivery.addressLine1,
          ward: parsedDelivery.ward,
          province: parsedDelivery.province,
          wardCode: parsedDelivery.wardCode,
          latitude: finalDeliveryLat ? Number(finalDeliveryLat) : undefined,
          longitude: finalDeliveryLng ? Number(finalDeliveryLng) : undefined,
          country: 'Vietnam',
        },
        packages: [
          {
            weight: Number(details.weightKg) || 1.0,
            length: 20,
            width: 15,
            height: 10,
            isFragile: Boolean(details.isFragile),
            description: details.description || 'Hàng hóa thông thường',
          },
        ],
      };

      if (pickupAddressIdPayload) {
        createOrderDto.pickupAddressId = pickupAddressIdPayload;
      } else if (pickupAddressPayload) {
        createOrderDto.pickupAddress = pickupAddressPayload;
      } else {
        // Fallback: Tìm địa chỉ đầu tiên của khách
        const custWithAddr = await prisma.customer.findUnique({
          where: { id: customerId },
          include: { addresses: { take: 1 } },
        });
        if (custWithAddr?.addresses?.[0]?.addressId) {
          createOrderDto.pickupAddressId = custWithAddr.addresses[0].addressId;
        }
      }

      // 4. Tạo đơn hàng qua OrderService
      const newOrder = await orderService.createOrder(userId, ['CUSTOMER'], createOrderDto);

      return {
        success: true,
        message: `Đơn hàng ${newOrder.orderCode} đã được tạo thành công trên hệ thống Velocity! Tài xế sẽ đến lấy hàng theo lịch trình.`,
        data: {
          orderId: newOrder.id,
          orderCode: newOrder.orderCode,
          status: newOrder.status,
        },
      };
    } catch (orderError: any) {
      console.error('[executeConfirmedAction: CONFIRM_CREATE_ORDER] Lỗi tạo đơn:', orderError);
      return {
        success: false,
        message: `Không thể tạo đơn hàng: ${orderError.message || 'Lỗi không xác định'}`,
      };
    }
  }

  return {
    success: false,
    message: 'Loại hành động không được hỗ trợ.',
  };
}
