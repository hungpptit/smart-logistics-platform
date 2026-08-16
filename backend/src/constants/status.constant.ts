import { ShipmentStatus, TrackingEventType, OrderStatus } from '@prisma/client';

export const SHIPMENT_TO_TRACKING_EVENT_MAP: Record<string, TrackingEventType> = {
  [ShipmentStatus.CREATED]: 'CREATED' as TrackingEventType,
  [ShipmentStatus.ASSIGNED]: 'DRIVER_ASSIGNED' as TrackingEventType,
  [ShipmentStatus.IN_TRANSIT]: 'DEPARTED_FACILITY' as TrackingEventType,
  [ShipmentStatus.AT_HUB]: 'ARRIVED_HUB' as TrackingEventType,
  [ShipmentStatus.OUT_FOR_DELIVERY]: 'OUT_FOR_DELIVERY' as TrackingEventType,
  [ShipmentStatus.DELIVERED]: 'DELIVERY_SUCCESS' as TrackingEventType,
  [ShipmentStatus.DELIVERY_FAILED]: 'DELIVERY_FAIL' as TrackingEventType,
  [ShipmentStatus.RETURNING]: 'RETURN_STARTED' as TrackingEventType,
  [ShipmentStatus.RETURNED]: 'RETURNED' as TrackingEventType,
  [ShipmentStatus.CANCELLED]: 'CANCELLED' as TrackingEventType,
};

export interface OrderSyncMeta {
  orderStatus: OrderStatus;
  getReason: (shipmentCode: string, notes?: string) => string;
}

export const SHIPMENT_TO_ORDER_SYNC_MAP: Partial<Record<ShipmentStatus, OrderSyncMeta>> = {
  [ShipmentStatus.IN_TRANSIT]: {
    orderStatus: OrderStatus.IN_TRANSIT,
    getReason: (code) => `Đơn hàng đang xuất kho và trong quá trình luân chuyển qua vận đơn ${code}`,
  },
  [ShipmentStatus.AT_HUB]: {
    orderStatus: OrderStatus.AT_HUB,
    getReason: () => `Đơn hàng đã nhập kho trung chuyển trung tâm`,
  },
  [ShipmentStatus.OUT_FOR_DELIVERY]: {
    orderStatus: OrderStatus.OUT_FOR_DELIVERY,
    getReason: () => `Đơn hàng đang được shipper đi giao`,
  },
  [ShipmentStatus.DELIVERED]: {
    orderStatus: OrderStatus.DELIVERED,
    getReason: () => `Đơn giao hàng thành công`,
  },
  [ShipmentStatus.DELIVERY_FAILED]: {
    orderStatus: OrderStatus.DELIVERY_FAILED,
    getReason: (_, notes) => `Giao hàng thất bại: ${notes || 'Không liên lạc được khách hàng'}`,
  },
};

export interface PublicStatusInfo {
  label: string;
  chipClass: string;
}

export const PUBLIC_ORDER_STATUS_MAP: Record<string, PublicStatusInfo> = {
  [OrderStatus.CREATED]: { label: 'ĐÃ TẠO ĐƠN HÀNG', chipClass: 'created' },
  [OrderStatus.READY_FOR_PICKUP]: { label: 'CHỜ LẤY HÀNG', chipClass: 'ready' },
  [OrderStatus.PICKUP_ASSIGNED]: { label: 'ĐÃ PHÂN CÔNG SHIPPER LẤY', chipClass: 'assigned' },
  [OrderStatus.PICKING]: { label: 'SHIPPER ĐANG ĐẾN LẤY HÀNG', chipClass: 'picking_up' },
  [OrderStatus.PICKED_UP]: { label: 'ĐÃ LẤY HÀNG THÀNH CÔNG', chipClass: 'picked_up' },
  [OrderStatus.ARRIVED_ORIGIN_FACILITY]: { label: 'ĐÃ LƯU KHO BƯU CỤC', chipClass: 'in_facility' },
  [OrderStatus.READY_FOR_DISPATCH]: { label: 'ĐÃ NHẬP KHO - SẴN SÀNG GIAO HÀNG', chipClass: 'ready' },
  [OrderStatus.IN_TRANSIT]: { label: 'ĐANG TRUNG CHUYỂN LIÊN KHO', chipClass: 'in_transit' },
  [OrderStatus.AT_HUB]: { label: 'TẠI KHO BƯU CỤC', chipClass: 'in_facility' },
  [OrderStatus.OUT_FOR_DELIVERY]: { label: 'ĐANG GIAO HÀNG ĐẾN BẠN', chipClass: 'out_for_delivery' },
  [OrderStatus.DELIVERED]: { label: 'GIAO HÀNG THÀNH CÔNG', chipClass: 'delivered' },
  [OrderStatus.DELIVERY_FAILED]: { label: 'GIAO HÀNG THẤT BẠI', chipClass: 'failed' },
  [OrderStatus.RETURNING]: { label: 'ĐANG CHUYỂN HOÀN', chipClass: 'returning' },
  [OrderStatus.RETURNED]: { label: 'ĐÃ HOÀN TRẢ', chipClass: 'returned' },
  [OrderStatus.COMPLETED]: { label: 'HOÀN TẤT ĐƠN HÀNG', chipClass: 'delivered' },
  [OrderStatus.CANCELLED]: { label: 'ĐÃ HỦY ĐƠN HÀNG', chipClass: 'cancelled' },
};

export function getOrderStatusSubtitle(
  status: string,
  context: { senderName?: string; facilityName?: string; originFacilityName?: string; driverName?: string; driverPhone?: string; vehiclePlate?: string; receiverName?: string; defaultReason?: string }
): string {
  if (context.defaultReason && context.defaultReason.trim().length > 0) {
    return context.defaultReason;
  }
  const driverPhoneStr = context.driverPhone ? ` (${context.driverPhone})` : '';
  const vehicleStr = context.vehiclePlate ? ` [${context.vehiclePlate}]` : '';

  switch (status) {
    case OrderStatus.CREATED:
      return `Đơn hàng đã được tạo thành công bởi ${context.senderName || 'Người gửi'}`;
    case OrderStatus.PICKUP_ASSIGNED:
      return `Đã phân công Shipper ${context.driverName || 'Tài xế'}${driverPhoneStr}${vehicleStr} chuẩn bị đến lấy hàng`;
    case OrderStatus.PICKING:
      return `Shipper ${context.driverName || 'Tài xế'}${driverPhoneStr}${vehicleStr} đang di chuyển đến địa chỉ người gửi để lấy hàng. Vui lòng chú ý điện thoại!`;
    case OrderStatus.PICKED_UP:
      return `Shipper ${context.driverName || 'Tài xế'} đã lấy hàng thành công từ người gửi và đang chuyển về bưu cục`;
    case OrderStatus.ARRIVED_ORIGIN_FACILITY:
      return `Hàng hóa đã được tiếp nhận và nhập kho tại ${context.facilityName || 'Bưu cục gửi'}`;
    case OrderStatus.READY_FOR_DISPATCH:
      return `Đơn hàng đã được chia chọn vào sọt giao hàng tại ${context.facilityName || 'Bưu cục phát'}`;
    case OrderStatus.AT_HUB:
      return `Hàng hóa đã đến và nhập kho an toàn tại ${context.facilityName || 'Kho trung chuyển'}`;
    case OrderStatus.IN_TRANSIT:
      return `Xe tải${vehicleStr} do Tài xế ${context.driverName || 'trung chuyển'}${driverPhoneStr} điều khiển đang vận chuyển từ ${context.originFacilityName || 'Bưu cục gửi'} đến ${context.facilityName || 'Kho trung tâm'}`;
    case OrderStatus.OUT_FOR_DELIVERY:
      return `Shipper ${context.driverName || 'giao hàng'}${driverPhoneStr}${vehicleStr} đang trên đường giao hàng đến bạn. Vui lòng chú ý điện thoại để nhận hàng!`;
    case OrderStatus.DELIVERED:
    case OrderStatus.COMPLETED:
      return `Shipper đã hoàn thành giao hàng cho người nhận ${context.receiverName || ''}`;
    default:
      return 'Trạng thái được cập nhật trên hệ thống SLP';
  }
}

export const IGNORED_PUBLIC_TRACKING_EVENTS = [
  'ARRIVED_HUB',
  'DEPARTED_HUB',
  'ARRIVED_FACILITY',
  'DEPARTED_FACILITY',
  'CREATED',
  'IN_FACILITY',
  'DRIVER_ASSIGNED',
];

