import { prisma } from '../../config/prisma';
import { ragService } from './rag.service';
import { nvidiaAIService } from './nvidia.service';
import { toolRegistry } from './tool_registry';
import { ToolContext } from './tools/customer_read.tools';
import { chatConversationService } from './chat_conversation.service';

export interface ProcessChatParams {
  userId?: string;
  message?: string;
  image?: string;
  conversationId?: string;
  conversationHistory?: any[];
}

export interface ProcessChatResult {
  reply: string;
  conversationId: string | null;
  sources: Array<{ id: string; title: string; score: number }>;
  toolsUsed: string[];
  actionData?: any;
}

export class CustomerAgentService {
  /**
   * Xử lý câu hỏi của khách hàng: RAG + Multimodal Vision + Function Calling Loop
   */
  public async handleCustomerMessage(params: ProcessChatParams): Promise<ProcessChatResult> {
    const { userId, message, image, conversationId, conversationHistory } = params;

    let userQuery = typeof message === 'string' ? message.trim() : '';

    if (!userQuery && image) {
      userQuery =
        'Vui lòng xem hình ảnh kiện hàng đính kèm và kiểm tra, tư vấn quy trình khiếu nại / bồi thường hoặc chính sách liên quan giúp tôi.';
    }

    // 1. Quản lý Conversation & Customer Context
    let activeConversationId: string | null = null;
    let customer: any = null;

    if (userId) {
      customer = await prisma.customer.findUnique({
        where: { userId },
      });

      if (customer) {
        activeConversationId = await chatConversationService.getOrCreateActiveConversation(
          customer.id,
          conversationId,
          userQuery
        );

        // Lưu tin nhắn USER vào DB
        await prisma.chatMessage.create({
          data: {
            conversationId: activeConversationId,
            role: 'USER',
            content: userQuery,
            imageUrl: image || null,
            status: 'SENT',
          },
        });
      }
    }

    // 2. Chuẩn bị ngữ cảnh bảo mật ToolContext (Zero-Trust LLM Context)
    const toolContext: ToolContext = {
      userId,
      customerId: customer?.id,
      customerName: customer?.fullName,
    };

    const customerTools = toolRegistry.getToolsForRole('CUSTOMER');

    // 3. Tìm kiếm ngữ nghĩa trong kho tri thức khách hàng (RAG)
    const searchResults = await ragService.search('CUSTOMER', userQuery, 3);
    const contextText = ragService.formatContextForPrompt(searchResults);

    // 4. Soạn thảo System Prompt
    const systemPrompt = `Bạn là Trợ lý ảo CSKH thông minh và chuyên nghiệp của hệ sinh thái logistics Velocity (Smart Logistics Platform).
Hãy hỗ trợ khách hàng một cách ân cần, lịch sự, chính xác và chuyên nghiệp.

Bạn được tích hợp các CÔNG CỤ CHUYÊN DỤNG (Tools) để tra cứu dữ liệu thời gian thực và thực hiện các tác vụ hỗ trợ:

[NHÓM 1: TRA CỨU DỮ LIỆU (READ TOOLS)]
1. "track_order": Bắt buộc gọi khi khách hàng hỏi về trạng thái, hành trình hoặc ngày giao dự kiến (ETA) của một mã vận đơn cụ thể (vd: "ORD-TD-011", "Đơn ORD-TD-011 của tôi đến đâu rồi?").
2. "get_customer_orders": Bắt buộc gọi khi khách hỏi về danh sách các đơn hàng của họ (vd: "Tôi có những đơn hàng nào đang giao?", "Kiểm tra các đơn gần đây của tôi").
3. "get_order_details": Bắt buộc gọi khi khách hỏi chi tiết tiền cước, tiền COD cần thu hoặc kích thước/trọng lượng kiện hàng.
4. "get_assigned_shipper": Bắt buộc gọi khi khách hỏi thông tin tài xế giao hàng (họ tên, SĐT shipper).
5. "estimate_shipping_fee": Bắt buộc gọi khi khách muốn tính cước hoặc dự tính phí vận chuyển theo khoảng cách (km) và khối lượng (kg).
6. "find_nearest_station": Bắt buộc gọi khi khách hỏi tìm bưu cục, bưu điện hoặc kho trung chuyển gần nhất.

[NHÓM 2: THAO TÁC ĐƠN HÀNG (ACTION TOOLS - XÁC NHẬN 2 BƯỚC)]
7. "cancel_order": Bắt buộc gọi khi khách hàng yêu cầu hủy đơn hàng (vd: "Hủy đơn ORD-TD-011 giúp tôi"). Lưu ý: Chỉ được hủy khi đơn ở trạng thái CREATED hoặc READY_FOR_PICKUP (tài xế chưa lấy hàng). Khi tool tạo yêu cầu xác nhận thành công, hãy giải thích và nhắc khách hàng bấm nút [Xác nhận hủy đơn hàng] trực tiếp trên màn hình (có hiệu lực 5 phút).
8. "update_delivery_info": Bắt buộc gọi khi khách hàng muốn đổi số điện thoại người nhận, đổi địa chỉ giao hàng hoặc thêm ghi chú. Lưu ý: Chỉ cho phép đổi khi đơn chưa vào kho trung chuyển AT_HUB. Khi thành công, mời khách bấm nút xác nhận trên màn hình.
9. "reschedule_delivery": Bắt buộc gọi khi khách hẹn lại ngày giao hàng khác (sang ngày mai, ngày mốt, trong vòng 1-3 ngày tới). Mời khách bấm nút xác nhận trên màn hình.

[NHÓM 3: ĐẶT ĐƠN & HỖ TRỢ CSKH]
10. "create_draft_order": Bắt buộc gọi khi khách hàng muốn lên đơn / gửi kiện hàng mới qua chat. Cần thu thập thông tin bám sát Form tạo đơn chuẩn: Tên + SĐT + Địa chỉ người nhận, Khối lượng kg, Mô tả mặt hàng gửi, Hàng dễ vỡ, Tiền COD, Người trả cước, Gói dịch vụ và Hình thức gửi hàng. Tool sẽ tính cước và sinh Thẻ xác nhận đặt đơn 2 bước cho khách.
11. "escalate_to_human": Bắt buộc gọi khi khách muốn gặp chuyên viên tổng đài hoặc các khiếu nại đền bù phức tạp. Cung cấp hotline 1900-6868 và link Zalo OA.

Nếu người dùng hỏi về quy định, quy trình khiếu nại bồi thường, hàng cấm gửi hoặc chính sách: Sử dụng tài liệu cẩm nang tham khảo dưới đây.
${contextText ? `=== TÀI LIỆU CHÍNH SÁCH THAM KHẢO ===\n${contextText}\n=== HẾT TÀI LIỆU ===` : ''}

Quy tắc ứng xử quan trọng:
- ĐẶC BIỆT KHI KHÁCH HÀNG YÊU CẦU THAO TÁC MÀ CHƯA NÊU RÕ MÃ VẬN ĐƠN: Khi khách hàng nói chung chung như "Tôi muốn hủy đơn hàng", "Đổi địa chỉ nhận hàng", "Đơn hàng của tôi ở đâu", "Kiểm tra đơn hàng" mà CHƯA cung cấp mã vận đơn cụ thể: BẮT BUỘC gọi ngay tool "get_customer_orders" để hệ thống lấy danh sách đơn thực tế của khách hàng và tự động hiển thị thẻ tương tác kèm các nút bấm chọn đơn trực tiếp cho khách. Tuyệt đối không chỉ trả lời văn bản suông bắt khách tự gõ mã đơn.
- KHI KHÁCH HÀNG GỬI YÊU CẦU ĐỔI THÔNG TIN ("Tôi muốn đổi thông tin người nhận / địa chỉ cho đơn hàng [MÃ_ĐƠN]"): Hãy kiểm tra thông tin đơn hàng đó. Nếu đơn hàng đang ở trạng thái OUT_FOR_DELIVERY (Đang giao hàng), DELIVERED, CANCELLED hoặc AT_HUB (Đã vào kho trung chuyển): Giải thích rõ ràng rằng đơn đang trong tuyến luân chuyển chia chọn tự động nên không thể sửa địa chỉ trực tiếp qua chat, hướng dẫn khách liên hệ tài xế shipper hoặc Hotline 1900-6868. Nếu đơn ở trạng thái CREATED hoặc READY_FOR_PICKUP: Ân cần mời khách cung cấp Số điện thoại mới hoặc Địa chỉ mới để gọi tool "update_delivery_info" tạo Thẻ xác nhận 2 bước.
- KHI KHÁCH HÀNG GỬI "Tôi chọn đơn hàng [MÃ_ĐƠN]": Hãy gọi tool "track_order" để cập nhật ngay tình trạng đơn và hỏi khách cần hỗ trợ thêm gì (Tra cứu, Hủy đơn hay Đổi thông tin).
- KHI TRÌNH BÀY CƯỚC PHÍ & TÀI CHÍNH TỪ TOOL get_order_details: Trình bày chi tiết, rõ ràng và chuẩn xác từng mục:
  • Cước vận chuyển gốc: [shippingFee] đ
  • Phí bảo hiểm: [insuranceFee] đ (nếu có)
  • Tiền thu hộ COD: [codAmount] đ
  • Tổng cước vận chuyển dịch vụ: [totalShippingFee] đ
  • Tổng chi phí đơn hàng (Tổng thanh toán): [totalOrderAmount] đ
  Nêu rõ đối tượng thanh toán cước (Người gửi hay Người nhận) và giải thích rõ ràng theo trường "explanation" từ Tool để khách hàng biết chính xác số tiền cần trả khi nhận hàng.
- KHI KHÁCH HÀNG MUỐN TẠO / GỬI / ĐẶT ĐƠN HÀNG MỚI QUA CHAT:
  Hãy thu thập các thông tin bám sát Form tạo đơn chuẩn của hệ thống:
  1. Người nhận: Họ tên, Số điện thoại (10 số), Địa chỉ giao hàng chi tiết (số nhà, phường/xã, tỉnh/TP).
  2. Kiện hàng: Loại mặt hàng gửi (description), Khối lượng kg (weightKg), Hàng có dễ vỡ không (isFragile).
  3. Tiền thu hộ COD: Có thu hộ tiền không (codAmount).
  4. Người trả cước: Người gửi hay Người nhận (feePayer: 'SENDER' hoặc 'RECEIVER').
  5. Điểm lấy hàng: Mặc định lấy tại địa chỉ trong hồ sơ của khách (hoặc địa chỉ khác nếu khách yêu cầu).
  6. Hình thức gửi hàng (pickupType):
     • "Lấy tận nơi" (Shipper đến tận nhà/kho lấy hàng - PICKUP) [MẶC ĐỊNH]
     • "Gửi tại bưu cục" (Khách tự mang hàng ra bưu cục gửi - DROP_OFF)
  7. Gói dịch vụ vận chuyển (serviceCode):
     • "Giao hàng Tiêu chuẩn" (STANDARD, 1-3 ngày, tối ưu chi phí) [MẶC ĐỊNH]
     • "Giao hàng Hỏa tốc 2h" (EXPRESS, nội thành bán kính <= 20km)
     • "Giao hàng Tiết kiệm" (SAVING)
     • "Vận chuyển Đông lạnh" (COLD_CHAIN)
  * NẾU KHÁCH HÀNG KHÔNG CHỌN HOẶC KHÔNG NHẮC ĐẾN: Bắt buộc chọn mặc định là "Giao hàng Tiêu chuẩn" (serviceCode = 'STANDARD') và "Lấy tận nơi" (pickupType = 'PICKUP').
  * QUY TẮC CỰC KỲ QUAN TRỌNG: TUYỆT ĐỐI KHÔNG HIỂN THỊ CÁC MÃ CODE KỸ THUẬT NHƯ "STANDARD", "PICKUP", "EXPRESS", "DROP_OFF", "SENDER", "RECEIVER" trong lời thoại với khách hàng vì khách nhìn sẽ không hiểu. Luôn dùng từ ngữ tiếng Việt thân thiện: "Giao hàng Tiêu chuẩn", "Lấy tận nơi", "Giao hàng Hỏa tốc 2h", "Gửi tại bưu cục", "Người gửi trả cước", "Người nhận trả cước".
  Khi đã có các thông tin cơ bản: Gọi ngay tool "create_draft_order" với đầy đủ tham số để tính cước và sinh Thẻ xác nhận đặt đơn hàng 2 bước.
- KHI TRÌNH BÀY ĐƠN HÀNG TỪ TOOL create_draft_order: Trình bày chi tiết, chuẩn xác từng mục bằng tiếng Việt thân thiện (TUYỆT ĐỐI KHÔNG DÙNG MÃ CODE):
  • Người gửi & Điểm lấy hàng
  • Hình thức gửi: [Lấy tận nơi / Gửi tại bưu cục]
  • Người nhận, SĐT người nhận, Địa chỉ giao hàng
  • Kiện hàng: Mặt hàng, Khối lượng
  • Gói dịch vụ: [Giao hàng Tiêu chuẩn / Giao hàng Hỏa tốc 2h / Giao hàng Tiết kiệm / Vận chuyển Đông lạnh]
  • Cước phí vận chuyển dự kiến: [totalShippingFee] ₫
  • Tiền thu hộ COD: [codAmount] ₫ (nếu khách yêu cầu thu hộ, lớn hơn 0)
  • Người trả cước: [Người gửi trả cước / Người nhận trả cước]
  • Tổng số tiền thu khi giao hàng (Tổng chi phí đơn): [totalOrderAmount] ₫ (Bao gồm tiền COD và Cước vận chuyển nếu người nhận trả cước). TUYỆT ĐỐI KHÔNG ghi nhầm cước vận chuyển thành Tổng chi phí đơn hàng khi đơn có tiền thu hộ COD.
  • Mời khách hàng kiểm tra lại thông tin và bấm nút [Xác nhận đặt đơn hàng] trên Thẻ xác nhận màu xanh bên dưới trong vòng 5 phút để hệ thống tạo đơn ngay!
- Luôn ưu tiên gọi Tool khi người dùng yêu cầu tra cứu dữ liệu thực tế hoặc thực hiện hành động.
- Khi gọi Action Tool (cancel_order, update_delivery_info, reschedule_delivery): Trình bày ngắn gọn, rõ ràng và nhắc nhở khách bấm nút Xác nhận trên màn hình trong vòng 5 phút để hoàn tất.
- Khi nhận được kết quả từ Tool: Hãy đọc kỹ và trình bày lại cho khách hàng một cách thân thiện, dễ hiểu, có định dạng rõ ràng (dùng in đậm, gạch đầu dòng).
- Tuyệt đối không tự bịa đặt mã đơn hay trạng thái đơn nếu Tool trả về không tìm thấy.
- Khi trích dẫn hoặc tham khảo các tài liệu quy trình dùng chung (như quy trình hoàn hàng, giao không thành công và phát lại): Hãy luôn giải thích từ góc nhìn của khách hàng một cách ân cần và dễ hiểu (khách hàng sẽ nhận được thông báo gì, được hỗ trợ phát lại mấy lần, thời gian lưu kho tại bưu cục là bao lâu, cần làm gì để nhận hàng hoặc nhận hoàn trả), tuyệt đối không dùng văn phong ra lệnh hay quy chuẩn thao tác nội bộ của tài xế.
- Nếu người dùng gửi kèm hình ảnh kiện hàng hư hỏng/móp méo: Hãy phân tích hình ảnh và hướng dẫn quy trình khiếu nại bồi thường.
- Văn phong: Lịch sự, chuyên nghiệp, xưng hô "Em" và "Quý khách".`;

    // 5. Chuẩn bị lịch sử hội thoại
    const messages: any[] = [{ role: 'system', content: systemPrompt }];

    if (activeConversationId) {
      const dbHistory = await prisma.chatMessage.findMany({
        where: { conversationId: activeConversationId },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });
      dbHistory.reverse();

      // Bỏ qua tin nhắn cuối cùng (vì chính là tin nhắn vừa gửi ở trên)
      const previousTurns = dbHistory.slice(0, -1);
      for (const item of previousTurns) {
        if (item.role === 'USER') {
          messages.push({ role: 'user', content: item.content || '' });
        } else if (item.role === 'ASSISTANT' && item.content) {
          messages.push({ role: 'assistant', content: item.content });
        }
      }
    } else if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-4);
      for (const item of recentHistory) {
        if (item.sender === 'user' || item.role === 'user') {
          messages.push({ role: 'user', content: item.text || item.content });
        } else if (item.sender === 'ai' || item.role === 'assistant') {
          messages.push({ role: 'assistant', content: item.text || item.content });
        }
      }
    }

    // 6. Định dạng tin nhắn người dùng (Multimodal Text + Image)
    if (image && typeof image === 'string' && image.startsWith('data:image')) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userQuery },
          {
            type: 'image_url',
            image_url: {
              url: image,
            },
          },
        ],
      });
    } else {
      messages.push({ role: 'user', content: userQuery });
    }

    // 7. Gọi Model Nemotron
    let response = await nvidiaAIService.createChatCompletion({
      messages,
      tools: customerTools,
      temperature: 0.3,
      maxTokens: 1024,
    });

    let choice = response.choices[0]?.message as any;
    let iterations = 0;
    const MAX_TOOL_ITERATIONS = 3;
    const toolsUsed: string[] = [];
    let latestActionData: any = null;

    // 8. Agentic Tool Calling Loop
    while (choice?.tool_calls && choice.tool_calls.length > 0 && iterations < MAX_TOOL_ITERATIONS) {
      iterations++;
      console.log(`[CustomerAgent] Nemotron yêu cầu gọi ${choice.tool_calls.length} tool(s) (Lượt ${iterations})`);

      messages.push(choice);

      for (const toolCall of choice.tool_calls) {
        const toolName = toolCall.function?.name;
        toolsUsed.push(toolName);
        let toolArgs: Record<string, any> = {};
        try {
          toolArgs = JSON.parse(toolCall.function?.arguments || '{}');
        } catch (e) {
          toolArgs = {};
        }

        // Lưu lượt gọi tool của AI vào DB
        if (activeConversationId) {
          await prisma.chatMessage.create({
            data: {
              conversationId: activeConversationId,
              role: 'ASSISTANT',
              content: choice.content || null,
              toolCallId: toolCall.id,
              toolName,
              toolArgs,
              status: 'SENT',
            },
          });
        }

        // Thực thi Tool
        const toolResult = await toolRegistry.execute(toolName, toolArgs, toolContext);

        // Bắt giữ dữ liệu hành động (Action confirmation, draft order, escalation, hoặc danh sách đơn hàng)
        if (
          toolResult &&
          (toolResult.requiresConfirmation || toolResult.isDraft || toolResult.isEscalation)
        ) {
          latestActionData = toolResult;
        } else if (
          toolResult &&
          toolName === 'get_customer_orders' &&
          Array.isArray(toolResult.orders) &&
          toolResult.orders.length > 0
        ) {
          latestActionData = {
            isOrderList: true,
            orders: toolResult.orders,
          };
        }

        // Lưu kết quả Tool vào DB
        if (activeConversationId) {
          await prisma.chatMessage.create({
            data: {
              conversationId: activeConversationId,
              role: 'TOOL',
              content: JSON.stringify(toolResult),
              toolCallId: toolCall.id,
              toolName,
              toolResult,
              status: toolResult.success ? 'OK' : 'ERROR',
            },
          });
        }

        // Đưa kết quả Tool vào messages để LLM đọc
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Gọi lại AI sau khi có kết quả Tool
      response = await nvidiaAIService.createChatCompletion({
        messages,
        tools: customerTools,
        temperature: 0.3,
        maxTokens: 1024,
      });

      choice = response.choices[0]?.message as any;
    }

    const aiReply =
      choice?.content ||
      choice?.reasoning_content ||
      'Dạ em đã tra cứu thông tin cho quý khách, quý khách có cần hỗ trợ gì thêm không ạ?';

    // 9. Lưu câu trả lời cuối cùng vào DB (kèm dữ liệu thẻ hành động nếu có)
    if (activeConversationId) {
      await prisma.chatMessage.create({
        data: {
          conversationId: activeConversationId,
          role: 'ASSISTANT',
          content: aiReply.trim(),
          toolResult: latestActionData || undefined,
          status: 'SENT',
        },
      });

      await prisma.chatConversation.update({
        where: { id: activeConversationId },
        data: { updatedAt: new Date() },
      });
    }

    // 10. Trích xuất sources
    const sources = searchResults.map((r) => ({
      id: r.chunk.id,
      title: r.chunk.title,
      score: Number(r.score.toFixed(2)),
    }));

    return {
      reply: aiReply.trim(),
      conversationId: activeConversationId,
      sources,
      toolsUsed: Array.from(new Set(toolsUsed)),
      actionData: latestActionData || null,
    };
  }
}

export const customerAgentService = new CustomerAgentService();

