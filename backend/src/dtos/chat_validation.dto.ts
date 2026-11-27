import { z } from 'zod';

/**
 * 1. Schema kiểm tra dữ liệu đầu vào cho Route Chat (Khách hàng & Tài xế)
 * Đảm bảo: message <= 2000 ký tự, strip ký tự điều khiển,
 * ảnh định dạng JPEG/PNG thật qua magic bytes, dung lượng tối đa 5MB, conversationId UUID chuẩn.
 */
export const ChatMessageInputSchema = z
  .object({
    message: z
      .string()
      .max(2000, 'Nội dung tin nhắn không được vượt quá 2000 ký tự.')
      .transform((val) => val.replace(/[\x00-\x1F\x7F]/g, ' ').trim())
      .optional(),
    image: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          // Loại bỏ prefix data:image/...;base64, nếu có
          const base64Data = val.includes(',') ? val.split(',')[1] : val;
          // Giới hạn 5MB (kích thước base64 tương đương khoảng 6.7MB)
          const byteLength = Buffer.byteLength(base64Data, 'base64');
          if (byteLength > 5 * 1024 * 1024) return false;

          // Kiểm tra magic bytes đầu file ảnh thật
          // JPEG: FF D8 FF -> base64 bắt đầu bằng /9j/
          // PNG: 89 50 4E 47 -> base64 bắt đầu bằng iVBORw0KGgo
          const cleanStart = base64Data.trim().substring(0, 15);
          const isJpeg = cleanStart.startsWith('/9j/');
          const isPng = cleanStart.startsWith('iVBORw0KGgo');
          return isJpeg || isPng;
        },
        {
          message: 'Hình ảnh không hợp lệ hoặc vượt quá 5MB. Chỉ chấp nhận định dạng ảnh JPEG hoặc PNG thật.',
        }
      ),
    conversationId: z
      .string()
      .uuid('Mã cuộc hội thoại (conversationId) phải là định dạng UUID chuẩn.')
      .optional(),
    conversationHistory: z.array(z.record(z.any())).optional(),
  })
  .strict('Dữ liệu gửi lên chứa trường không hợp lệ.')
  .refine(
    (data) => {
      const hasMessage = data.message && data.message.length > 0;
      const hasImage = Boolean(data.image);
      return hasMessage || hasImage;
    },
    {
      message: 'Vui lòng cung cấp nội dung tin nhắn hoặc đính kèm hình ảnh.',
      path: ['message'],
    }
  );

export type ChatMessageInputDto = z.infer<typeof ChatMessageInputSchema>;

/**
 * 2. Schemas kiểm tra tham số cho từng Tool của Tài xế (Chế độ .strict() chống Parameter Tampering)
 */

// Tool 1: get_my_orders
export const GetMyOrdersParamsSchema = z
  .object({
    group: z.enum(['ACTIVE', 'PENDING', 'DELIVERED', 'FAILED']).default('ACTIVE'),
    limit: z.number().int('Limit phải là số nguyên').min(1).max(10).default(10),
  })
  .strict('Tool get_my_orders không chấp nhận tham số lạ.');

export type GetMyOrdersParams = z.infer<typeof GetMyOrdersParamsSchema>;

// Tool 2: get_next_stop
export const GetNextStopParamsSchema = z
  .object({})
  .strict('Tool get_next_stop không nhận bất kỳ tham số nào.');

export type GetNextStopParams = z.infer<typeof GetNextStopParamsSchema>;

// Tool 3: get_order_delivery_info
export const GetOrderDeliveryInfoParamsSchema = z
  .object({
    orderCode: z
      .string({ required_error: 'Vui lòng cung cấp mã đơn hàng cần tra cứu.' })
      .trim()
      .toUpperCase()
      .regex(
        /^ORD-[A-Z0-9_-]{3,30}$/,
        'Mã đơn hàng không đúng định dạng chuẩn (ví dụ: ORD-TD-012, ORD-CASE1-0001).'
      ),
  })
  .strict('Tool get_order_delivery_info không chấp nhận tham số lạ.');

export type GetOrderDeliveryInfoParams = z.infer<typeof GetOrderDeliveryInfoParamsSchema>;

// Tool 4: get_cod_summary
export const GetCodSummaryParamsSchema = z
  .object({
    includeOrders: z.boolean().default(false),
  })
  .strict('Tool get_cod_summary không chấp nhận tham số lạ.');

export type GetCodSummaryParams = z.infer<typeof GetCodSummaryParamsSchema>;

// Tool 5: find_nearest_facility
export const FindNearestFacilityParamsSchema = z
  .object({
    limit: z.number().int('Limit phải là số nguyên').min(1).max(3).default(1),
  })
  .strict('Tool find_nearest_facility không chấp nhận tham số lạ (không nhận tọa độ từ client).');

export type FindNearestFacilityParams = z.infer<typeof FindNearestFacilityParamsSchema>;

export const ReplyStaffInputSchema = z
  .object({
    message: z.string().trim().min(1, 'Nội dung tin nhắn không được để trống').max(2000, 'Tin nhắn quá dài').optional(),
    image: z.string().max(15_000_000, 'Ảnh đính kèm vượt quá dung lượng cho phép').optional(),
    conversationId: z.string().uuid('conversationId không hợp lệ').optional(),
  })
  .strict()
  .refine((data) => Boolean(data.message?.trim() || data.image), {
    message: 'Vui lòng nhập nội dung tin nhắn hoặc đính kèm hình ảnh.',
  });

export type ReplyStaffInput = z.infer<typeof ReplyStaffInputSchema>;

export const SendStaffDriverMessageSchema = z
  .object({
    driverUserId: z.string().uuid('driverUserId không hợp lệ'),
    message: z
      .string()
      .trim()
      .min(1, 'Nội dung tin nhắn không được để trống')
      .max(2000, 'Tin nhắn quá dài (tối đa 2000 ký tự)'),
  })
  .strict();

export type SendStaffDriverMessageInput = z.infer<typeof SendStaffDriverMessageSchema>;

