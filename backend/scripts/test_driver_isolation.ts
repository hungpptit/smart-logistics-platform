import { driverAgentService } from '../src/services/ai/driver_agent.service';
import { customerAgentService } from '../src/services/ai/customer_agent.service';
import { prisma } from '../src/config/prisma';

async function main() {
  const driver = await prisma.user.findFirst({
    where: { role: { roleCode: 'SHIPPER' }, staff: { position: 'DRIVER' } },
  });

  const customer = await prisma.user.findFirst({
    where: { role: { roleCode: 'CUSTOMER' }, customer: { isNot: null } },
  });

  const question = 'Làm thế nào để tôi đặt giao nhiều điểm dừng trên app, tối đa được mấy điểm?';

  console.log(`\n========================================`);
  console.log(`CÂU HỎI: "${question}"`);
  console.log(`========================================`);

  if (driver) {
    console.log('\n[1] TÀI XẾ HỎI TRỢ LÝ TÀI XẾ:');
    const resDriver = await driverAgentService.handleDriverMessage({
      userId: driver.id,
      message: question,
    });
    console.log(resDriver.reply);
  }

  if (customer) {
    console.log('\n[2] KHÁCH HÀNG HỎI TRỢ LÝ KHÁCH HÀNG:');
    const resCustomer = await customerAgentService.handleCustomerMessage({
      userId: customer.id,
      message: question,
    });
    console.log(resCustomer.reply);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
