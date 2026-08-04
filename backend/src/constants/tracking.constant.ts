import { TrackingEventType } from '@prisma/client';

export interface TrackingEventMeta {
  label: string;
  defaultDesc: string;
}

export const TRACKING_EVENT_CONFIG: Record<string, TrackingEventMeta> = {
  CREATED: {
    label: 'Khởi tạo',
    defaultDesc: 'Vận đơn mới đã được khởi tạo thành công trên hệ thống',
  },
  DRIVER_ASSIGNED: {
    label: 'Gán tài xế',
    defaultDesc: 'Vận đơn đã được phân công cho chuyến xe / tài xế đảm nhận',
  },
  PICKED_UP: {
    label: 'Đã lấy hàng',
    defaultDesc: 'Tài xế đã hoàn thành lấy hàng thành công từ người gửi',
  },
  ARRIVED_FACILITY: {
    label: 'Cập bưu cục',
    defaultDesc: 'Hàng đã cập bưu cục nhận',
  },
  DEPARTED_FACILITY: {
    label: 'Rời bưu cục',
    defaultDesc: 'Hàng đã được xuất khỏi bưu cục để luân chuyển',
  },
  ARRIVED_HUB: {
    label: 'Cập Kho tổng',
    defaultDesc: 'Đơn hàng đã nhập Kho tổng trung chuyển phân loại',
  },
  DEPARTED_HUB: {
    label: 'Rời Kho tổng',
    defaultDesc: 'Đơn hàng đã xuất Kho tổng trung chuyển',
  },
  OUT_FOR_DELIVERY: {
    label: 'Đang giao hàng',
    defaultDesc: 'Tài xế đang trên đường đi giao hàng cho bạn',
  },
  DELIVERY_SUCCESS: {
    label: 'Giao thành công',
    defaultDesc: 'Đơn hàng đã giao thành công cho người nhận',
  },
  DELIVERY_FAIL: {
    label: 'Giao thất bại',
    defaultDesc: 'Giao hàng không thành công',
  },
  RETURN_STARTED: {
    label: 'Bắt đầu chuyển hoàn',
    defaultDesc: 'Đơn hàng đang trong quá trình chuyển hoàn trả cho người gửi',
  },
  EXCEPTION_OCCURRED: {
    label: 'Sự cố phát sinh',
    defaultDesc: 'Có sự cố kỹ thuật / vận hành phát sinh trên đơn hàng',
  },
  RETURNED: {
    label: 'Đã trả hàng',
    defaultDesc: 'Đơn hàng đã được chuyển hoàn trả lại cho người gửi',
  },
  CANCELLED: {
    label: 'Đã hủy',
    defaultDesc: 'Vận đơn đã bị hủy',
  },
};
