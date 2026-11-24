import { driverAgentService } from '../src/services/ai/driver_agent.service';
import { prisma } from '../src/config/prisma';

async function main() {
  const driver = await prisma.user.findFirst({
    where: { role: { roleCode: 'SHIPPER' }, staff: { position: 'DRIVER' } },
  });

  if (!driver) {
    console.log('Không tìm thấy tài khoản tài xế.');
    return;
  }

  console.log('User ID tài xế:', driver.id);

  console.log('\n--- TEST 1: Khi bấm chip "Báo kẹt xe / chậm ETA" ---');
  const res1 = await driverAgentService.handleDriverMessage({
    userId: driver.id,
    message: 'Báo kẹt xe / chậm ETA',
  });
  console.log(res1.reply);

  console.log('\n--- TEST 2: Khi tài xế hỏi chi tiết về kẹt xe ---');
  const res2 = await driverAgentService.handleDriverMessage({
    userId: driver.id,
    message: 'Tôi bị kẹt xe trên đường đi giao hàng thì phải làm sao? Giao trễ có bị phạt không?',
  });
  console.log(res2.reply);

  await prisma.$disconnect();
}

main().catch(console.error);
