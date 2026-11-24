import 'reflect-metadata';
import { prisma } from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import express from 'express';
import chatRoutes from '../src/routes/chat.routes';
import { errorMiddleware } from '../src/middlewares/error.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_slp_2026';

async function main() {
  console.log('--- 1. KIỂM TRA TRẠNG THÁI TÀI KHOẢN TÀI XẾ TRONG DB ---');
  const driverUser = await prisma.user.findFirst({
    where: { role: { roleCode: 'SHIPPER' } },
    include: { staff: true, role: true },
  });

  console.log('Driver user record:', {
    username: driverUser?.username,
    userStatus: driverUser?.status,
    staffPosition: driverUser?.staff?.position,
    employmentStatus: driverUser?.staff?.employmentStatus,
  });

  console.log('\n--- 2. KIỂM TRA TÀI XẾ GỌI /chat/customer/messages ---');
  const app = express();
  app.use(express.json());
  app.use('/api/v1/chat', chatRoutes);
  app.use(errorMiddleware);

  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/chat`;

  if (driverUser) {
    const driverToken = jwt.sign(
      {
        id: driverUser.id,
        username: driverUser.username,
        email: driverUser.staff?.email || driverUser.email || '',
        role: 'SHIPPER',
        roles: ['SHIPPER'],
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await fetch(`${baseUrl}/customer/messages`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${driverToken}`,
      },
    });

    const data = await res.json();
    console.log(`HTTP Status: ${res.status}`);
    console.log(`Response Body:`, JSON.stringify(data, null, 2));
  }

  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
