import 'reflect-metadata';
import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../src/config/prisma';
import chatRoutes from '../src/routes/chat.routes';
import { errorMiddleware } from '../src/middlewares/error.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_slp_2026';

function generateToken(payload: { id: string; username: string; email: string; role: string }): string {
  return jwt.sign(
    {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      roles: [payload.role],
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Bật cờ test ngưỡng thời gian nhanh: 2s cho nhắc nhở, 4s cho đóng phiên
process.env.TEST_TIMEOUT_REMIND_SEC = '2';
process.env.TEST_TIMEOUT_CLOSE_SEC = '4';

async function runStep3Tests() {
  console.log('===============================================================');
  console.log('           KIỂM THỬ BƯỚC 3: API TRỢ LÝ TÀI XẾ & TIMEOUT');
  console.log('===============================================================\n');

  const app = express();
  app.use(express.json({ limit: '20mb' }));
  app.use('/api/v1/chat', chatRoutes);
  app.use(errorMiddleware);

  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/chat/driver`;

  try {
    const driverUser = await prisma.user.findFirst({
      where: { role: { roleCode: 'SHIPPER' }, staff: { position: 'DRIVER' }, status: 'ACTIVE' },
      include: { role: true, staff: true },
    });
    if (!driverUser) throw new Error('Không tìm thấy tài khoản tài xế trong DB!');

    const driverToken = generateToken({
      id: driverUser.id,
      username: driverUser.username,
      email: driverUser.staff?.email || driverUser.email || '',
      role: 'SHIPPER',
    });

    // -------------------------------------------------------------
    // CA 1: Tạo phiên mới cho tài xế (POST /chat/driver/new)
    // -------------------------------------------------------------
    console.log('--- [CA 1] Tạo phiên hội thoại mới cho tài xế ---');
    const res1 = await fetch(`${baseUrl}/new`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    const data1 = await res1.json();
    const convId = data1?.data?.conversationId || data1?.data?.id;
    console.log(`HTTP ${res1.status} -> Tạo phiên thành công, conversationId: ${convId}`);
    if (!convId) throw new Error('Không tạo được conversationId!');

    // -------------------------------------------------------------
    // CA 2: Gửi câu hỏi tài xế thật có kèm ảnh Base64
    // -------------------------------------------------------------
    console.log('\n--- [CA 2] Gửi tin nhắn có ảnh Base64 (Multimodal) ---');
    // 1 pixel transparent PNG data URL
    const sampleImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res2 = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        message: 'Tôi bị sự cố kẹt xe tại đường Cộng Hòa, dự kiến chậm 20 phút',
        image: sampleImageBase64,
        conversationId: convId,
      }),
    });
    const data2 = await res2.json();
    console.log(`HTTP ${res2.status} -> AI phản hồi:\n"${data2?.data?.reply}"`);
    const passCa2 = res2.status === 200 && data2?.success === true && data2?.data?.reply?.length > 20;

    // -------------------------------------------------------------
    // CA 3: Lấy tin nhắn phiên hoạt động (GET /chat/driver/messages)
    // -------------------------------------------------------------
    console.log('\n--- [CA 3] Lấy lịch sử tin nhắn của phiên hoạt động ---');
    const res3 = await fetch(`${baseUrl}/messages`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    const data3 = await res3.json();
    const messages = data3?.data?.messages || [];
    console.log(`HTTP ${res3.status} -> Đã tải ${messages.length} tin nhắn từ CSDL`);
    const passCa3 = res3.status === 200 && messages.length >= 2;

    // -------------------------------------------------------------
    // CA 4: Kiểm tra Server Validation cho Timeout
    // -------------------------------------------------------------
    console.log('\n--- [CA 4] Server Validation cho Timeout Check ---');

    // 4.1: Gọi REMINDER_3M ngay lập tức (khi chưa đủ thời gian) -> Phải trả về NOOP
    const res4_1 = await fetch(`${baseUrl}/timeout-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ conversationId: convId, action: 'REMINDER_3M' }),
    });
    const data4_1 = await res4_1.json();
    console.log(`4.1 Gọi nhắc nhở ngay lập tức -> action: '${data4_1?.action}' (Mong đợi: NOOP)`);
    const pass4_1 = data4_1?.action === 'NOOP';

    // 4.2: Chờ 2.5 giây cho đủ ngưỡng test 2s -> Gọi REMINDER_3M -> Phải trả về REMINDED
    console.log('Chờ 2.5s để vượt ngưỡng nhắc nhở test...');
    await new Promise((r) => setTimeout(r, 2500));

    const res4_2 = await fetch(`${baseUrl}/timeout-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ conversationId: convId, action: 'REMINDER_3M' }),
    });
    const data4_2 = await res4_2.json();
    console.log(`4.2 Gọi nhắc nhở sau 2.5s -> action: '${data4_2?.action}' (Mong đợi: REMINDED)`);
    const pass4_2 = data4_2?.action === 'REMINDED';

    // 4.3: Gọi REMINDER_3M thêm lần nữa -> Chống lặp (Idempotent) -> Phải trả về NOOP
    const res4_3 = await fetch(`${baseUrl}/timeout-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ conversationId: convId, action: 'REMINDER_3M' }),
    });
    const data4_3 = await res4_3.json();
    console.log(`4.3 Gọi nhắc nhở lần 2 (chống lặp) -> action: '${data4_3?.action}' (Mong đợi: NOOP)`);
    const pass4_3 = data4_3?.action === 'NOOP';

    // 4.4: Chờ thêm 2 giây để vượt mốc 4s (tính từ tin AI thật) -> Gọi CLOSE_5M -> Phải trả về CLOSED
    console.log('Chờ thêm 2s để vượt mốc tự đóng phiên 4s...');
    await new Promise((r) => setTimeout(r, 2000));

    const res4_4 = await fetch(`${baseUrl}/timeout-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ conversationId: convId, action: 'CLOSE_5M' }),
    });
    const data4_4 = await res4_4.json();
    console.log(`4.4 Gọi đóng phiên sau 4s -> action: '${data4_4?.action}', isClosed: ${data4_4?.isClosed} (Mong đợi: CLOSED)`);
    const pass4_4 = data4_4?.action === 'CLOSED' && data4_4?.isClosed === true;

    // 4.5: Kiểm tra CSDL xem status có thành CLOSED không
    const updatedConv = await prisma.chatConversation.findUnique({ where: { id: convId } });
    console.log(`4.5 Trạng thái CSDL thực tế: status = '${updatedConv?.status}'`);
    const pass4_5 = updatedConv?.status === 'CLOSED';

    console.log('\n===============================================================');
    console.log('                 KẾT QUẢ NGHIỆM THU BƯỚC 3                     ');
    console.log('===============================================================');
    console.log(`Ca 1 (Tạo phiên hội thoại mới):          ${convId ? 'ĐẠT' : 'THẤT BẠI'}`);
    console.log(`Ca 2 (Gửi tin nhắn Multimodal có ảnh):    ${passCa2 ? 'ĐẠT' : 'THẤT BẠI'}`);
    console.log(`Ca 3 (Nạp lịch sử tin nhắn):             ${passCa3 ? 'ĐẠT' : 'THẤT BẠI'}`);
    console.log(`Ca 4.1 (Chặn nhắc nhở khi chưa đủ giờ):   ${pass4_1 ? 'ĐẠT (NOOP)' : 'THẤT BẠI'}`);
    console.log(`Ca 4.2 (Gửi lời nhắc khi đủ giờ):        ${pass4_2 ? 'ĐẠT (REMINDED)' : 'THẤT BẠI'}`);
    console.log(`Ca 4.3 (Chống lặp tin nhắc nhở):         ${pass4_3 ? 'ĐẠT (NOOP)' : 'THẤT BẠI'}`);
    console.log(`Ca 4.4 (Tự đóng phiên ở mốc 5 phút):     ${pass4_4 ? 'ĐẠT (CLOSED)' : 'THẤT BẠI'}`);
    console.log(`Ca 4.5 (Lưu vết CSDL trạng thái CLOSED):  ${pass4_5 ? 'ĐẠT' : 'THẤT BẠI'}`);
    console.log('===============================================================');

  } finally {
    server.close();
    await prisma.$disconnect();
    // Khôi phục lại biến môi trường về mặc định
    delete process.env.TEST_TIMEOUT_REMIND_SEC;
    delete process.env.TEST_TIMEOUT_CLOSE_SEC;
    process.exit(0);
  }
}

runStep3Tests().catch((e) => {
  console.error('Lỗi kiểm thử Bước 3:', e);
  process.exit(1);
});
