import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const apiKey = process.env.NVIDIA_API_KEY;
const baseUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';

async function testQuestion(title: string, userQuery: string) {
  console.log(`\n======================================================`);
  console.log(`📌 ${title}`);
  console.log(`❓ Câu hỏi: ${userQuery}`);
  console.log(`------------------------------------------------------`);

  try {
    const res = await axios.post(
      baseUrl,
      {
        model: 'nvidia/nemotron-3.5-super-vl-120b-a12b',
        messages: [
          {
            role: 'system',
            content: 'Bạn là chuyên viên AI thông minh của Smart Logistics. Hãy trả lời ngắn gọn, chính xác từng câu hỏi của người dùng.',
          },
          { role: 'user', content: userQuery },
        ],
        max_tokens: 2048,
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const message = res.data.choices[0]?.message;
    console.log(`🧠 SUY LUẬN (Reasoning):\n${message?.reasoning_content || '(Không có)'}\n`);
    console.log(`💬 CÂU TRẢ LỜI CHO NGƯỜI DÙNG:\n${message?.content || '(Chưa có text trong content)'}`);
  } catch (err: any) {
    console.error('❌ Lỗi:', err.response?.data || err.message);
  }
}

async function main() {
  await testQuestion(
    'Khách hàng: Tính cước thể tích quy đổi & Bồi thường',
    'Tôi có kiện hàng kích thước: Dài 40cm, Rộng 30cm, Cao 25cm, cân nặng thực tế 3kg.\n1. Theo công thức tính cước (D x R x C / 5000), khối lượng tính cước là bao nhiêu kg?\n2. Kiện hàng này tính cước theo cân nặng thực tế (3kg) hay theo khối lượng quy đổi?'
  );

  await testQuestion(
    'Tài xế: Khách không nghe máy & Hạn chót nộp tiền COD',
    'Tôi là tài xế đang giao đơn thu hộ COD 850.000đ. Tôi gọi khách 1 cuộc lúc 14:00 nhưng khách không nghe máy.\n1. Tôi có được bấm Hủy / Thất bại ngay để đi giao đơn khác không? Quy trình chuẩn là gì?\n2. Số tiền COD thu trong ngày hạn chót nộp về bưu cục/hub là mấy giờ?'
  );
}

main();

