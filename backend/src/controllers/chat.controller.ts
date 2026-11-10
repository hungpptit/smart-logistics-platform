import { Request, Response } from 'express';
import { ragService } from '../services/ai/rag.service';
import { nvidiaAIService } from '../services/ai/nvidia.service';

export class ChatController {
  /**
   * Chat hỗ trợ Khách hàng (Hỏi đáp dựa trên tài liệu cẩm nang Markdown)
   * POST /api/v1/chat/customer
   */
  public async chatCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { message, image, conversationHistory } = req.body;

      let userQuery = typeof message === 'string' ? message.trim() : '';

      if (!userQuery && (!image || typeof image !== 'string')) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp nội dung tin nhắn hoặc đính kèm hình ảnh.',
        });
        return;
      }

      if (!userQuery && image) {
        userQuery = 'Vui lòng xem hình ảnh kiện hàng đính kèm và kiểm tra, tư vấn quy trình khiếu nại / bồi thường hoặc chính sách liên quan giúp tôi.';
      }

      // 1. Tìm kiếm ngữ nghĩa trong kho tri thức khách hàng (RAG)
      const searchResults = await ragService.search('CUSTOMER', userQuery, 3);
      const contextText = ragService.formatContextForPrompt(searchResults);

      // 2. Soạn thảo System Prompt dẫn dắt AI trả lời theo tài liệu
      const systemPrompt = `Bạn là Trợ lý ảo CSKH thông minh và chuyên nghiệp của hệ thống logistics Velocity (Smart Logistics).
Hãy trả lời câu hỏi của khách hàng một cách ân cần, lịch sự, ngắn gọn và chính xác tuyệt đối dựa trên các tài liệu chính sách được cung cấp dưới đây.

${contextText ? `=== TÀI LIỆU CHÍNH SÁCH THAM KHẢO ===\n${contextText}\n=== HẾT TÀI LIỆU ===` : 'Hiện chưa có tài liệu cụ thể cho chủ đề này, hãy hướng dẫn khách hàng liên hệ Tổng đài CSKH để được hỗ trợ tốt nhất.'}

Quy tắc trả lời:
- Luôn ưu tiên trả lời dựa theo đúng số liệu, điều khoản và quy trình nêu trong tài liệu tham khảo.
- Nếu người dùng đính kèm hình ảnh (kiện hàng hư hỏng, tem vận đơn, bao bì rách, hàng móp méo...): Hãy quan sát kỹ hình ảnh, nhận xét hiện trạng thấy được và tư vấn quyền lợi/quy trình khiếu nại bồi thường cho khách hàng.
- Nếu tài liệu không đề cập hoặc thông tin vượt quá thẩm quyền, hãy hướng dẫn khách hàng liên hệ Hotline Tổng đài hỗ trợ 1900-6868 hoặc mục Hỗ trợ trên ứng dụng.
- Văn phong: Thân thiện, tôn trọng khách hàng, định dạng rõ ràng (có thể dùng gạch đầu dòng ngắn gọn nếu cần).`;

      // 3. Chuẩn bị lịch sử hội thoại nếu có
      const messages: any[] = [{ role: 'system', content: systemPrompt }];

      if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        // Chỉ lấy tối đa 4 tin nhắn gần nhất để giữ ngữ cảnh gọn gàng
        const recentHistory = conversationHistory.slice(-4);
        for (const item of recentHistory) {
          if (item.sender === 'user' || item.role === 'user') {
            messages.push({ role: 'user', content: item.text || item.content });
          } else if (item.sender === 'ai' || item.role === 'assistant') {
            messages.push({ role: 'assistant', content: item.text || item.content });
          }
        }
      }

      // 4. Định dạng tin nhắn người dùng (Hỗ trợ Multimodal Text + Ảnh)
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

      // 5. Sinh phản hồi từ Model Nemotron Super VL 120B (Multimodal)
      const response = await nvidiaAIService.createChatCompletion({
        messages,
        temperature: 0.3,
        maxTokens: 1024,
      });

      const choice = response.choices[0]?.message as any;
      const aiReply = choice?.content || choice?.reasoning_content || 'Xin lỗi quý khách, em chưa hiểu rõ yêu cầu. Quý khách vui lòng thử lại hoặc liên hệ tổng đài 1900-6868 ạ.';

      // 5. Trích xuất danh sách nguồn tham khảo gửi kèm cho giao diện
      const sources = searchResults.map((r) => ({
        id: r.chunk.id,
        title: r.chunk.title,
        score: Number(r.score.toFixed(2)),
      }));

      res.status(200).json({
        success: true,
        data: {
          reply: aiReply.trim(),
          sources,
        },
      });
    } catch (error: any) {
      console.error('[ChatController] Lỗi khi xử lý chat khách hàng:', error);
      res.status(500).json({
        success: false,
        message: 'Đã có lỗi xảy ra trong quá trình xử lý câu trả lời từ AI.',
        error: error.message,
      });
    }
  }
}

export const chatController = new ChatController();

