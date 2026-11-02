import dotenv from 'dotenv';
import path from 'path';

// Load môi trường từ backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { nvidiaAIService } from '../services/ai/nvidia.service';

async function testNvidiaAI() {
  console.log('====================================================');
  console.log('🤖 Kiểm tra Cấu hình NVIDIA NIM AI Service');
  console.log('====================================================');

  const apiKey = process.env.NVIDIA_API_KEY;
  const baseUrl = process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  const model = process.env.NVIDIA_CHAT_MODEL || 'deepseek-ai/deepseek-v4.1-flash';

  console.log(`- Base URL: ${baseUrl}`);
  console.log(`- Model:    ${model}`);
  console.log(`- API Key:  ${apiKey ? apiKey.substring(0, 10) + '...' : '(Chưa có key trong .env)'}`);

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_nvidia_api_key_here') {
    console.log('\n⚠️  Service đã được cài đặt và type-check thành công!');
    console.log('💡 Để gửi thử request thật tới NVIDIA, vui lòng điền key của bạn vào:');
    console.log('   backend/.env -> NVIDIA_API_KEY="nvapi-..."');
    return;
  }

  console.log('\n⏳ Đang gửi request kiểm tra tới NVIDIA NIM...');
  try {
    const reply = await nvidiaAIService.quickChat(
      'Bạn là trợ lý ảo hỗ trợ thông minh cho hệ thống Smart Logistics.',
      'Xin chào! Giới thiệu ngắn trong 1 câu xem bạn là ai?'
    );

    console.log('\n✅ Kết nối thành công! Phản hồi từ model:');
    console.log(`👉 "${reply.trim()}"`);
  } catch (error: any) {
    console.error('\n❌ Kết nối thất bại:', error.message);
  }
}

testNvidiaAI();

