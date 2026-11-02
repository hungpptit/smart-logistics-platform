import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { ragService } from '../services/ai/rag.service';

async function main() {
  console.log('====================================================');
  console.log('       KIỂM TRA HỆ THỐNG RAG KNOWLEDGE BASE         ');
  console.log('====================================================');

  console.log('[1/3] Đang nạp tài liệu cẩm nang (Driver & Customer)...');
  await ragService.initialize();

  console.log('\n[2/3] Kiểm tra truy vấn kiến thức cho TÀI XẾ (SHIPPER):');
  const driverQueries = [
    'Khách không nghe máy thì phải xử lý thế nào?',
    'Quy định thu và nộp tiền COD?',
  ];

  for (const q of driverQueries) {
    console.log(`\n🔍 Câu hỏi: "${q}"`);
    const results = await ragService.search('SHIPPER', q, 1);
    if (results.length > 0) {
      console.log(`   👉 Tiêu đề khớp nhất: [${results[0].chunk.title}] (Score: ${results[0].score.toFixed(2)})`);
      console.log(`   📄 Trích đoạn: ${results[0].chunk.content.slice(0, 150)}...`);
    } else {
      console.log('   ❌ Không tìm thấy kết quả phù hợp.');
    }
  }

  console.log('\n----------------------------------------------------');
  console.log('[3/3] Kiểm tra truy vấn kiến thức cho KHÁCH HÀNG (CUSTOMER):');
  const customerQueries = [
    'Hàng bị hư hỏng thì mức bồi thường là bao nhiêu?',
    'Cách tính cước theo khối lượng quy đổi thế nào?',
  ];

  for (const q of customerQueries) {
    console.log(`\n🔍 Câu hỏi: "${q}"`);
    const results = await ragService.search('CUSTOMER', q, 1);
    if (results.length > 0) {
      console.log(`   👉 Tiêu đề khớp nhất: [${results[0].chunk.title}] (Score: ${results[0].score.toFixed(2)})`);
      console.log(`   📄 Trích đoạn: ${results[0].chunk.content.slice(0, 150)}...`);
    } else {
      console.log('   ❌ Không tìm thấy kết quả phù hợp.');
    }
  }

  console.log('\n====================================================');
  console.log('🎉 PIPELINE RAG KNOWLEDGE BASE HOẠT ĐỘNG HOÀN HẢO!');
  console.log('====================================================');
}

main().catch(console.error);

