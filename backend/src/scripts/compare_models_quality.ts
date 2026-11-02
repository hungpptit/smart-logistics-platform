import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const apiKey = process.env.NVIDIA_API_KEY;
const baseUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';

const models = [
  'nvidia/nemotron-3.5-super-vl-120b-a12b',
  'deepseek-ai/deepseek-v4.1-flash',
];

const testQuestions = [
  {
    title: 'Câu hỏi 1 (Khách hàng - Tính cước quy đổi & Chính sách bồi thường):',
    system: 'Bạn là trợ lý ảo hỗ trợ khách hàng của Smart Logistics. Trả lời chính xác, ngắn gọn, chuyên nghiệp dựa trên chính sách vận chuyển.',
    user: `Tôi có kiện hàng kích thước: Dài 40cm, Rộng 30cm, Cao 25cm, cân nặng thực tế 3kg.
1. Theo công thức tính cước của logistics (D x R x C / 5000), khối lượng tính cước của kiện này là bao nhiêu kg?
2. Nếu kiện hàng bị thất lạc hoặc hư hỏng do vận chuyển, mức bồi thường mặc định tối đa là bao nhiêu?`,
  },
  {
    title: 'Câu hỏi 2 (Tài xế - Xử lý khách không nghe máy & Quy định nộp COD):',
    system: 'Bạn là trợ lý điều phối dành cho Tài xế (Shipper) của Smart Logistics. Hướng dẫn tài xế xử lý đúng quy trình nội bộ.',
    user: `Tôi là tài xế đang giao đơn thu hộ COD 850.000 VNĐ. Tôi gọi khách 1 cuộc lúc 14:00 nhưng khách không nghe máy.
1. Tôi có được bấm Hủy / Thất bại ngay để đi giao đơn khác không? Quy trình gọi chuẩn là gì?
2. Nếu giao thành công thu được 850.000 VNĐ tiền mặt thì hạn chót nộp về bưu cục/hub trong ngày là mấy giờ?`,
  },
];

async function queryModel(model: string, system: string, user: string) {
  const start = Date.now();
  try {
    const res = await axios.post(
      baseUrl,
      {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.2,
        max_tokens: 600,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 180000, // 3 phút để chờ model nếu có queue
      }
    );
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    return {
      success: true,
      duration,
      content: res.data.choices[0]?.message?.content || '',
      usage: res.data.usage,
    };
  } catch (error: any) {
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    return {
      success: false,
      duration,
      error: error.response?.data?.message || error.message,
    };
  }
}

async function main() {
  console.log('================================================================');
  console.log('  SO SÁNH ĐỘ CHÍNH XÁC: NEMOTRON-SUPER-VL-120B vs DEEPSEEK-V4.1 ');
  console.log('================================================================\n');

  for (let qIdx = 0; qIdx < testQuestions.length; qIdx++) {
    const q = testQuestions[qIdx];
    console.log(`\n================================================================`);
    console.log(`📌 ${q.title}`);
    console.log(`Nội dung câu hỏi:\n${q.user}`);
    console.log(`================================================================\n`);

    for (const m of models) {
      console.log(`>>> Đang gửi tới model: [${m}]...`);
      const res = await queryModel(m, q.system, q.user);
      if (res.success) {
        console.log(`\n--- Phản hồi từ [${m}] (Thời gian: ${res.duration}s) ---`);
        console.log(res.content);
        console.log('----------------------------------------------------------------\n');
      } else {
        console.log(`\n❌ [${m}] Lỗi (${res.duration}s): ${res.error}\n`);
      }
    }
  }
}

main().catch(console.error);

