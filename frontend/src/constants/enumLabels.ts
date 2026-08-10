export interface EnumMeta {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  bgClass?: string;
  textClass?: string;
}

// 📦 Order Status Map
export const ORDER_STATUS_MAP: Record<string, EnumMeta> = {
  CREATED: { label: 'Mới tạo', color: 'info' },
  READY_FOR_PICKUP: { label: 'Chờ lấy hàng', color: 'warning' },
  PICKUP_ASSIGNED: { label: 'Đã gán shipper lấy', color: 'primary' },
  PICKED_UP: { label: 'Đã lấy hàng', color: 'primary' },
  ARRIVED_ORIGIN_FACILITY: { label: 'Cập bưu cục nhận', color: 'info' },
  SORTED: { label: 'Đã phân loại', color: 'info' },
  IN_TRANSIT: { label: 'Đang trung chuyển', color: 'secondary' },
  ARRIVED_DEST_FACILITY: { label: 'Cập bưu cục phát', color: 'info' },
  OUT_FOR_DELIVERY: { label: 'Đang giao hàng', color: 'warning' },
  DELIVERED: { label: 'Đã giao thành công', color: 'success' },
  FAILED: { label: 'Giao thất bại', color: 'danger' },
  RETURNING: { label: 'Đang chuyển hoàn', color: 'warning' },
  RETURNED: { label: 'Đã trả hàng', color: 'danger' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
};

// 🚚 Shipment Status Map
export const SHIPMENT_STATUS_MAP: Record<string, EnumMeta> = {
  CREATED: { label: 'Khởi tạo', color: 'info' },
  ASSIGNED: { label: 'Đã phân ca', color: 'primary' },
  IN_TRANSIT: { label: 'Đang trung chuyển', color: 'secondary' },
  AT_HUB: { label: 'Tại kho bưu cục', color: 'info' },
  OUT_FOR_DELIVERY: { label: 'Đang giao hàng', color: 'warning' },
  DELIVERED: { label: 'Giao thành công', color: 'success' },
  DELIVERY_FAILED: { label: 'Giao thất bại', color: 'danger' },
  RETURNING: { label: 'Chuyển hoàn', color: 'warning' },
  RETURNED: { label: 'Đã hoàn trả', color: 'danger' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
};

// 🗺️ Tracking Event Type Map
export const TRACKING_EVENT_MAP: Record<string, EnumMeta> = {
  CREATED: { label: 'Khởi tạo vận đơn', color: 'info' },
  DRIVER_ASSIGNED: { label: 'Đã phân công tài xế', color: 'primary' },
  PICKED_UP: { label: 'Đã lấy hàng', color: 'primary' },
  ARRIVED_FACILITY: { label: 'Cập bưu cục', color: 'info' },
  DEPARTED_FACILITY: { label: 'Xuất bưu cục', color: 'secondary' },
  ARRIVED_HUB: { label: 'Cập Kho tổng', color: 'info' },
  DEPARTED_HUB: { label: 'Xuất Kho tổng', color: 'secondary' },
  OUT_FOR_DELIVERY: { label: 'Đang giao hàng', color: 'warning' },
  DELIVERY_SUCCESS: { label: 'Giao thành công', color: 'success' },
  DELIVERY_FAIL: { label: 'Giao thất bại', color: 'danger' },
  RETURN_STARTED: { label: 'Chuyển hoàn', color: 'warning' },
  EXCEPTION_OCCURRED: { label: 'Sự cố vận hành', color: 'danger' },
  RETURNED: { label: 'Đã hoàn trả', color: 'danger' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
};

// 🚗 Vehicle Operating Status Map
export const VEHICLE_STATUS_MAP: Record<string, EnumMeta> = {
  ACTIVE: { label: 'Đang hoạt động', color: 'success' },
  MAINTENANCE: { label: 'Bảo dưỡng', color: 'warning' },
  RETIRED: { label: 'Thanh lý', color: 'danger' },
};

// 👤 Staff Employment Status Map
export const STAFF_STATUS_MAP: Record<string, EnumMeta> = {
  ACTIVE: { label: 'Hoạt động', color: 'success' },
  OFFLINE: { label: 'Nghỉ ca', color: 'default' },
  SUSPENDED: { label: 'Tạm đình chỉ', color: 'danger' },
  DISABLED: { label: 'Tạm khóa', color: 'danger' },
};

// 🛑 Route Stop Type Map
export const STOP_TYPE_MAP: Record<string, EnumMeta> = {
  PICKUP: { label: 'LẤY HÀNG', color: 'info' },
  HUB: { label: 'TRUNG CHUYỂN', color: 'warning' },
  DELIVERY: { label: 'GIAO HÀNG', color: 'primary' },
};

// 🚦 Route Stop Status Map
export const ROUTE_STOP_STATUS_MAP: Record<string, EnumMeta> = {
  PENDING: { label: 'CHỜ', color: 'default' },
  ARRIVED: { label: 'ĐANG ĐẾN', color: 'warning' },
  DEPARTED: { label: 'ĐÃ XONG', color: 'success' },
  SKIPPED: { label: 'BỎ QUA', color: 'default' },
  FAILED: { label: 'THẤT BẠI', color: 'danger' },
};

// 🏢 Facility Zone Type Map (Domain-Driven Zone Types)
export const FACILITY_ZONE_TYPE_MAP: Record<string, EnumMeta & { defaultCode: string; description: string }> = {
  SORTING: {
    label: 'Khu Giao Hàng Nội Phường (Giao Tại Chỗ)',
    color: 'success',
    defaultCode: 'ZONE-W-LOCAL',
    description: 'Bưu kiện giao cùng bưu cục! Giữ tại bưu cục và phân khu Khu A.',
  },
  SHIPPING: {
    label: 'Khu Xuất Hàng Đi Kho Tỉnh / TP & Mega Sorter',
    color: 'warning',
    defaultCode: 'ZONE-W-PROVINCE-DISPATCH',
    description: 'Bưu kiện giao đi xa / liên tỉnh! Ném vào Khu Xuất Hàng Trung Chuyển.',
  },
  RECEIVING: {
    label: 'Khu Tiếp Nhận & Bàn Giao Hàng',
    color: 'info',
    defaultCode: 'ZONE-W-REC',
    description: 'Bưu kiện vừa nhập bưu cục.',
  },
  RETURN: {
    label: 'Khu Lưu Kho & Hàng Cho Chuyển Hoàn',
    color: 'danger',
    defaultCode: 'ZONE-W-RETURN',
    description: 'Hàng trả về hoặc cần lưu trữ.',
  },
};

export interface ZoneClassificationResult {
  targetZoneType: 'SORTING' | 'SHIPPING' | 'RETURN';
  suggestedZoneName: string;
  instructionText: string;
}

export function resolveZoneClassification(
  isIntraWard: boolean,
  isIntraProvince: boolean,
  destFacilityName: string = 'Bưu cục đích',
  destProvinceName: string = 'Tỉnh / TP đích'
): ZoneClassificationResult {
  if (isIntraWard) {
    return {
      targetZoneType: 'SORTING',
      suggestedZoneName: 'Khu A: Khu Giao Hàng Nội Phường (Giao Tại Chỗ)',
      instructionText: `🟢 Bưu kiện giao cùng bưu cục! Giữ tại bưu cục và ném vào Khu A (Xe máy giao ${destFacilityName}).`,
    };
  } else if (isIntraProvince) {
    return {
      targetZoneType: 'SHIPPING',
      suggestedZoneName: `Khu B: Khu Xuất Hàng Đi Kho Tỉnh / TP (${destProvinceName})`,
      instructionText: `🟡 Bưu kiện giao cùng tỉnh/TP! Ném vào Khu B (Xe Tải 3.5 Tấn đi ${destFacilityName}).`,
    };
  } else {
    return {
      targetZoneType: 'SHIPPING',
      suggestedZoneName: `Khu C: Khu Xuất Hàng Mega Sorter (Liên Miền - ${destProvinceName})`,
      instructionText: `🔴 Bưu kiện giao liên tỉnh! Ném vào Khu C (Container 15 Tấn đi ${destProvinceName}).`,
    };
  }
}

// 🏭 Facility Type Map (3 Cấp Kho)
export const FACILITY_TYPE_MAP: Record<string, EnumMeta> = {
  SORTING_CENTER: { label: 'Cấp 1 - Kho Tổng Miền', color: 'danger', bgClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  PROVINCIAL_HUB: { label: 'Cấp 2 - Kho Tổng Tỉnh', color: 'warning', bgClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  WARD_STATION: { label: 'Cấp 3 - Bưu Cục Phường/Xã', color: 'info', bgClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  LAST_MILE_STATION: { label: 'Cấp 3 - Bưu Cục Phường/Xã', color: 'info', bgClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  MICRO_HUB: { label: 'Cấp 3 - Bưu Cục Phường/Xã', color: 'info', bgClass: 'bg-blue-50 text-blue-700 border-blue-200' },
};


