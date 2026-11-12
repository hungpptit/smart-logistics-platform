import { ChatTool } from './nvidia.service';
import {
  ToolContext,
  trackOrder,
  getCustomerOrders,
  getOrderDetails,
  getAssignedShipper,
  estimateShippingFee,
  findNearestStation,
} from './tools/customer_read.tools';
import {
  requestCancelOrder,
  requestUpdateDeliveryInfo,
  requestRescheduleDelivery,
  createDraftOrder,
  escalateToHuman,
} from './tools/customer_action.tools';

/**
 * Danh sách định nghĩa Tools cho Khách hàng chuẩn OpenAI Specification
 * Tương thích 100% với NVIDIA NIM Nemotron-3.5-Super-VL-120B
 */
export const CUSTOMER_TOOLS: ChatTool[] = [
  // --- NHÓM 1: READ TOOLS (TRA CỨU) ---
  {
    type: 'function',
    function: {
      name: 'track_order',
      description:
        'Tra cứu trạng thái đơn hàng, vị trí kho bãi hiện tại, tiến độ các chặng vận chuyển và ngày dự kiến giao (ETA) theo mã vận đơn.',
      parameters: {
        type: 'object',
        properties: {
          orderCode: {
            type: 'string',
            description: 'Mã vận đơn cần tra cứu (ví dụ: "ORD-TD-011", "ORD-TD-036", "ORD-SG-HN-001")',
          },
        },
        required: ['orderCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_customer_orders',
      description:
        'Xem danh sách các đơn hàng gần đây của khách hàng đang đăng nhập (kèm trạng thái, cước phí, người nhận).',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description:
              'Bộ lọc trạng thái đơn (tùy chọn), ví dụ: "CREATED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"',
          },
          limit: {
            type: 'number',
            description: 'Số lượng đơn tối đa cần lấy (mặc định: 5, tối đa: 10)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order_details',
      description:
        'Tra cứu chi tiết tài chính và thông tin hàng hóa của một đơn hàng (phí ship, tiền COD cần thu, kích thước, khối lượng, phương thức thanh toán).',
      parameters: {
        type: 'object',
        properties: {
          orderCode: {
            type: 'string',
            description: 'Mã vận đơn cần xem chi tiết (ví dụ: "ORD-TD-011")',
          },
        },
        required: ['orderCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_assigned_shipper',
      description:
        'Tra cứu thông tin tài xế shipper đang phụ trách giao hàng (họ tên, số điện thoại, biển số xe) khi đơn đang ở trạng thái đi giao.',
      parameters: {
        type: 'object',
        properties: {
          orderCode: {
            type: 'string',
            description: 'Mã vận đơn cần kiểm tra tài xế giao (ví dụ: "ORD-TD-011")',
          },
        },
        required: ['orderCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'estimate_shipping_fee',
      description:
        'Ước tính cước phí vận chuyển và thời gian giao hàng dự kiến theo khoảng cách (km), khối lượng hàng (kg) và gói dịch vụ.',
      parameters: {
        type: 'object',
        properties: {
          distanceKm: {
            type: 'number',
            description: 'Khoảng cách giao hàng tính bằng kilômét (ví dụ: 10.5)',
          },
          weightKg: {
            type: 'number',
            description: 'Tổng khối lượng kiện hàng tính bằng kilôgam (ví dụ: 2.0)',
          },
          serviceCode: {
            type: 'string',
            description:
              'Mã gói cước dịch vụ (tùy chọn): "STANDARD" (Tiêu chuẩn), "EXPRESS" (Hỏa tốc 2h), "SAVING" (Tiết kiệm), "COLD_CHAIN" (Đông lạnh)',
          },
          isFragile: {
            type: 'boolean',
            description: 'Hàng hóa có dễ vỡ cần đóng gói đặc biệt không (mặc định: false)',
          },
          codAmount: {
            type: 'number',
            description: 'Số tiền thu hộ COD nếu có (mặc định: 0)',
          },
        },
        required: ['distanceKm', 'weightKg'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_nearest_station',
      description:
        'Tìm kiếm bưu cục, bưu điện hoặc trạm trung chuyển hàng hóa của Velocity gần nhất theo tỉnh/thành phố hoặc địa chỉ.',
      parameters: {
        type: 'object',
        properties: {
          province: {
            type: 'string',
            description: 'Tên tỉnh hoặc thành phố cần tìm (ví dụ: "Hồ Chí Minh", "Hà Nội", "Đồng Nai")',
          },
          query: {
            type: 'string',
            description: 'Từ khóa tìm kiếm địa chỉ hoặc quận/huyện (ví dụ: "Thủ Đức", "Tân Bình", "Quận 1")',
          },
        },
      },
    },
  },

  // --- NHÓM 2: ACTION TOOLS (CẦN XÁC NHẬN 2 BƯỚC) ---
  {
    type: 'function',
    function: {
      name: 'cancel_order',
      description:
        'Yêu cầu hủy đơn hàng. CHỈ ÁP DỤNG khi đơn còn ở CREATED hoặc READY_FOR_PICKUP (tài xế chưa đến lấy). Tool sẽ tạo yêu cầu xác nhận 2 bước cho khách.',
      parameters: {
        type: 'object',
        properties: {
          orderCode: {
            type: 'string',
            description: 'Mã vận đơn muốn hủy (ví dụ: "ORD-TD-011")',
          },
          reason: {
            type: 'string',
            description: 'Lý do hủy đơn hàng (ví dụ: "Đặt nhầm", "Đổi ý không gửi nữa")',
          },
        },
        required: ['orderCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_delivery_info',
      description:
        'Yêu cầu cập nhật SĐT người nhận hoặc địa chỉ giao hàng. CHỈ ÁP DỤNG khi đơn chưa vào kho trung chuyển AT_HUB. Tool sẽ tạo yêu cầu xác nhận 2 bước cho khách.',
      parameters: {
        type: 'object',
        properties: {
          orderCode: {
            type: 'string',
            description: 'Mã vận đơn cần sửa thông tin (ví dụ: "ORD-TD-011")',
          },
          receiverPhone: {
            type: 'string',
            description: 'Số điện thoại người nhận mới nếu muốn đổi (ví dụ: "0912345678")',
          },
          deliveryAddressText: {
            type: 'string',
            description: 'Địa chỉ nhận hàng mới chi tiết nếu muốn đổi',
          },
          note: {
            type: 'string',
            description: 'Ghi chú thêm cho tài xế giao hàng',
          },
        },
        required: ['orderCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reschedule_delivery',
      description:
        'Yêu cầu hẹn lại ngày giao hàng khi khách bận hoặc vắng nhà (hẹn trong vòng 1-3 ngày tới). Tool sẽ tạo yêu cầu xác nhận 2 bước cho khách.',
      parameters: {
        type: 'object',
        properties: {
          orderCode: {
            type: 'string',
            description: 'Mã vận đơn cần hẹn lại ngày (ví dụ: "ORD-TD-011")',
          },
          newDeliveryDate: {
            type: 'string',
            description: 'Ngày hẹn giao hàng mới (định dạng YYYY-MM-DD hoặc ngày cụ thể, ví dụ: "2026-11-12")',
          },
          note: {
            type: 'string',
            description: 'Ghi chú lý do hẹn lại ngày giao',
          },
        },
        required: ['orderCode', 'newDeliveryDate'],
      },
    },
  },

  // --- NHÓM 3: ĐẶT ĐƠN & CSKH ---
  {
    type: 'function',
    function: {
      name: 'create_draft_order',
      description:
        'Tạo đơn hàng nháp và tính trước giá cước khi người dùng muốn đặt đơn gửi hàng qua trò chuyện chat.',
      parameters: {
        type: 'object',
        properties: {
          receiverName: {
            type: 'string',
            description: 'Họ và tên người nhận hàng',
          },
          receiverPhone: {
            type: 'string',
            description: 'Số điện thoại người nhận hàng',
          },
          deliveryAddress: {
            type: 'string',
            description: 'Địa chỉ nhận hàng đầy đủ',
          },
          weightKg: {
            type: 'number',
            description: 'Khối lượng kiện hàng tính bằng kg (mặc định: 1.0)',
          },
          serviceCode: {
            type: 'string',
            description: 'Mã gói cước dịch vụ: STANDARD (Tiêu chuẩn), EXPRESS (Hỏa tốc 2h), SAVING (Tiết kiệm)',
          },
          codAmount: {
            type: 'number',
            description: 'Số tiền thu hộ COD nếu có (mặc định: 0)',
          },
          description: {
            type: 'string',
            description: 'Mô tả loại hàng hóa gửi (ví dụ: "Quần áo thời trang", "Tài liệu văn phòng", "Mỹ phẩm")',
          },
          isFragile: {
            type: 'boolean',
            description: 'Hàng hóa có dễ vỡ không (mặc định: false)',
          },
          feePayer: {
            type: 'string',
            description: 'Người thanh toán cước phí: "SENDER" (Người gửi trả) hoặc "RECEIVER" (Người nhận trả cước, mặc định: "SENDER")',
          },
          pickupAddressText: {
            type: 'string',
            description: 'Địa chỉ lấy hàng nếu khách muốn đổi điểm lấy khác địa chỉ mặc định',
          },
        },
        required: ['receiverName', 'receiverPhone', 'deliveryAddress'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_human',
      description:
        'Chuyển tiếp yêu cầu sang chuyên viên hỗ trợ tổng đài CSKH hoặc kênh Zalo OA khi người dùng yêu cầu gặp người thật hoặc sự cố vượt thẩm quyền.',
      parameters: {
        type: 'object',
        properties: {
          issueType: {
            type: 'string',
            description: 'Loại sự cố cần hỗ trợ',
          },
          summary: {
            type: 'string',
            description: 'Tóm tắt nội dung thắc mắc của khách',
          },
        },
      },
    },
  },
];

export class ToolRegistry {
  /**
   * Bộ điều phối thực thi Tool an toàn (Dispatcher)
   * Luôn truyền ngữ cảnh bảo mật ctx (customerId) từ JWT token
   */
  public async execute(
    name: string,
    args: Record<string, any>,
    ctx: ToolContext
  ): Promise<Record<string, any>> {
    console.log(`[ToolRegistry] Đang thực thi tool: ${name} với args:`, JSON.stringify(args));

    switch (name) {
      // Read Tools
      case 'track_order':
        return await trackOrder(args as any, ctx);

      case 'get_customer_orders':
        return await getCustomerOrders(args as any, ctx);

      case 'get_order_details':
        return await getOrderDetails(args as any, ctx);

      case 'get_assigned_shipper':
        return await getAssignedShipper(args as any, ctx);

      case 'estimate_shipping_fee':
        return await estimateShippingFee(args as any, ctx);

      case 'find_nearest_station':
        return await findNearestStation(args as any, ctx);

      // Action Tools (Write with confirmation)
      case 'cancel_order':
        return await requestCancelOrder(args as any, ctx);

      case 'update_delivery_info':
        return await requestUpdateDeliveryInfo(args as any, ctx);

      case 'reschedule_delivery':
        return await requestRescheduleDelivery(args as any, ctx);

      // Draft & Escalation
      case 'create_draft_order':
        return await createDraftOrder(args as any, ctx);

      case 'escalate_to_human':
        return await escalateToHuman(args as any, ctx);

      default:
        console.warn(`[ToolRegistry] Tool không được hỗ trợ: ${name}`);
        return {
          success: false,
          message: `Công cụ "${name}" không tồn tại hoặc chưa được hỗ trợ.`,
        };
    }
  }

  /**
   * Lấy danh sách công cụ theo đối tượng người dùng
   */
  public getToolsForRole(role: 'CUSTOMER' | 'DRIVER' = 'CUSTOMER'): ChatTool[] {
    if (role === 'CUSTOMER') {
      return CUSTOMER_TOOLS;
    }
    return [];
  }
}

export const toolRegistry = new ToolRegistry();
