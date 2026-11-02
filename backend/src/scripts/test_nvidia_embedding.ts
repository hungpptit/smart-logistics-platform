import dotenv from 'dotenv';
import path from 'path';

// Load biến môi trường từ backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { nvidiaEmbeddingService } from '../services/ai/embedding.service';

async function main() {
  console.log('====================================================');
  console.log('   KIỂM TRA KẾT NỐI NVIDIA NIM EMBEDDING ENDPOINT   ');
  console.log('====================================================');
  console.log(`Base URL:     ${process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1'}`);
  console.log(`Embed Model:  ${process.env.NVIDIA_EMBED_MODEL || 'nvidia/nemotron-3.5-embed-8b'}`);
  const hasKey = !!process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.trim() !== '' && process.env.NVIDIA_API_KEY !== 'your_nvidia_api_key_here';
  console.log(`API Key:      ${hasKey ? 'ĐÃ CẤU HÌNH (sẵn sàng gọi thật)' : 'CHƯA CẤU HÌNH (chế độ kiểm tra kết nối mạng/endpoint)'}`);
  console.log('----------------------------------------------------');

  console.log('[1/2] Đang ping probe tới NVIDIA NIM Endpoint (/embeddings)...');
  const probeResult = await nvidiaEmbeddingService.probeEndpoint();
  console.log(`Kết quả Probe:`);
  console.log(`- Reachable: ${probeResult.reachable}`);
  console.log(`- HTTP Status: ${probeResult.status}`);
  console.log(`- Thông điệp: ${probeResult.message}`);
  console.log('----------------------------------------------------');

  if (hasKey) {
    console.log('[2/2] Thử tạo vector embedding thực tế...');
    try {
      const sampleText = 'Quy trình giao hàng và thu hộ tiền COD của tài xế Smart Logistics.';
      const vector = await nvidiaEmbeddingService.createEmbedding(sampleText, 'passage');
      console.log(`✅ Thành công! Vector dimension: ${vector.length}`);
      console.log(`5 giá trị đầu tiên của vector: [${vector.slice(0, 5).join(', ')}, ...]`);
    } catch (err: any) {
      console.error('❌ Lỗi khi tạo embedding:', err.message);
    }
  } else {
    console.log('[2/2] Bỏ qua bước gọi tạo vector thật vì chưa có API Key.');
    console.log('👉 Endpoint https://integrate.api.nvidia.com/v1/embeddings đã sẵn sàng nhận kết nối!');
  }

  console.log('====================================================');
}

main().catch(console.error);

