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
    orderStatus: OrderStatus.PICKED_UP,
    getReason: (code) => `Đơn hàng đã được lấy và đang trong quá trình luân chuyển qua vận đơn ${code}`,
  },
  [ShipmentStatus.AT_HUB]: {
    orderStatus: OrderStatus.ARRIVED_ORIGIN_FACILITY,
    getReason: () => `Hàng đã cập kho trung chuyển trung tâm`,
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
  [OrderStatus.IN_TRANSIT]: { label: 'ĐANG TRUNG CHUYỂN GIỮA KHO', chipClass: 'in_transit' },
  [OrderStatus.AT_HUB]: { label: 'TẠI KHO TRUNG CHUYỂN', chipClass: 'in_facility' },
  [OrderStatus.OUT_FOR_DELIVERY]: { label: 'SHIPPER ĐANG GIAO HÀNG (XE MÁY 🏍️)', chipClass: 'out_for_delivery' },
  [OrderStatus.DELIVERED]: { label: 'GIAO HÀNG THÀNH CÔNG', chipClass: 'delivered' },
  [OrderStatus.DELIVERY_FAILED]: { label: 'GIAO HÀNG THẤT BẠI', chipClass: 'failed' },
  [OrderStatus.RETURNING]: { label: 'ĐANG CHUYỂN HOÀN', chipClass: 'returning' },
  [OrderStatus.RETURNED]: { label: 'ĐÃ HOÀN TRẢ', chipClass: 'returned' },
  [OrderStatus.COMPLETED]: { label: 'HOÀN TẤT ĐƠN HÀNG', chipClass: 'delivered' },
  [OrderStatus.CANCELLED]: { label: 'ĐÃ HỦY ĐƠN HÀNG', chipClass: 'cancelled' },
};

export function getOrderStatusSubtitle(
  status: string,
  context: { senderName?: string; facilityName?: string; driverName?: string; vehiclePlate?: string; receiverName?: string; defaultReason?: string }
): string {
  if (context.defaultReason && context.defaultReason.trim().length > 0) {
    return context.defaultReason;
  }
  switch (status) {
    case OrderStatus.CREATED:
      return `Đơn hàng đã được tạo thành công bởi ${context.senderName || 'Người gửi'}`;
    case OrderStatus.ARRIVED_ORIGIN_FACILITY:
    case OrderStatus.READY_FOR_DISPATCH:
    case OrderStatus.AT_HUB:
      return `Hàng hóa đã phân loại và lưu kho tại ${context.facilityName || 'Bưu cục phân phối'}`;
    case OrderStatus.IN_TRANSIT:
      return `Đơn hàng đang trên xe tải trung chuyển đến kho trung tâm`;
    case OrderStatus.OUT_FOR_DELIVERY:
      return `Shipper ${context.driverName || 'Tài xế'} (${context.vehiclePlate || 'Xe máy'}) đang chở sọt hàng đi giao`;
    case OrderStatus.DELIVERED:
    case OrderStatus.COMPLETED:
      return `Đã giao thành công cho người nhận ${context.receiverName || ''}`;
    default:
      return 'Trạng thái được cập nhật trên hệ thống SLP';
  }
}
