import type { TrackingData } from '../types';

export const TRACKING_DATABASE: Record<string, TrackingData> = {
  'TRK-10029381': {
    code: 'TRK-10029381',
    status: 'IN_TRANSIT',
    statusLabel: 'ĐANG VẬN CHUYỂN',
    eta: '02 tháng 07, 2026 - 17:00',
    type: 'Giao hàng Hỏa tốc',
    destination: 'Quận 1, TP. HCM',
    route: [
      [10.8479, 106.7868], // Hub 1 (Quận 9)
      [10.7989, 106.7523], // Hub 2 (Quận 2)
      [10.7765, 106.7009], // Current Truck Position (Quận 1)
      [10.762622, 106.660172] // Destination (Quận 3)
    ],
    currentPos: [10.7765, 106.7009],
    timestamps: {
      created: '01 tháng 07, 2026 - 08:30',
      hub: '01 tháng 07, 2026 - 13:15',
      transit: '01 tháng 07, 2026 - 16:45',
      out: '-',
      delivered: '-'
    }
  },
  'TRK-20938472': {
    code: 'TRK-20938472',
    status: 'DELIVERED',
    statusLabel: 'ĐÃ GIAO HÀNG',
    eta: 'Hoàn thành',
    type: 'Giao hàng Tiêu chuẩn',
    destination: 'Thủ Đức, TP. HCM',
    route: [
      [10.8231, 106.6300], // Hub Tân Bình
      [10.8502, 106.7212], // Hub Bình Thạnh
      [10.8713, 106.7900]  // Delivered Destination (Thủ Đức)
    ],
    currentPos: [10.8713, 106.7900],
    timestamps: {
      created: '30 tháng 06, 2026 - 09:00',
      hub: '30 tháng 06, 2026 - 14:00',
      transit: '30 tháng 06, 2026 - 18:30',
      out: '01 tháng 07, 2026 - 08:00',
      delivered: '01 tháng 07, 2026 - 10:45'
    }
  }
};

export const formatMockTimeline = (timestamps: any) => {
  if (Array.isArray(timestamps)) return timestamps;
  if (!timestamps) return [];
  return [
    { status: 'CREATED', title: 'ĐÃ TẠO ĐƠN HÀNG', subtitle: 'Khách hàng tạo đơn trên hệ thống', timestamp: timestamps.created || '-', isCompleted: true },
    { status: 'IN_FACILITY', title: 'ĐÃ NHẬP KHO GOM', subtitle: 'Đã lưu kho bưu cục xuất phát', timestamp: timestamps.hub || '-', isCompleted: timestamps.hub !== '-' },
    { status: 'IN_TRANSIT', title: 'ĐANG TRUNG CHUYỂN GIỮA KHO', subtitle: 'Đơn hàng trên đường di chuyển đến bưu cục giao', timestamp: timestamps.transit || '-', isCompleted: timestamps.transit !== '-' },
    { status: 'OUT_FOR_DELIVERY', title: 'SHIPPER ĐANG GIAO HÀNG (XE MÁY)', subtitle: 'Shipper đang chở sọt hàng đi giao', timestamp: timestamps.out || '-', isCompleted: timestamps.out !== '-' },
    { status: 'DELIVERED', title: 'GIAO HÀNG THÀNH CÔNG', subtitle: 'Đã bàn giao cho người nhận', timestamp: timestamps.delivered || '-', isCompleted: timestamps.delivered !== '-' },
  ];
};
