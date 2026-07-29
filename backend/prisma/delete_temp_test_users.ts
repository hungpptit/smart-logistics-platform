/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

declare const process: any;
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Searching and deleting temporary test users with email/username containing "hungneverdie24"...');

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: 'hungneverdie24', mode: 'insensitive' } },
        { username: { contains: 'testtaotaikhoan', mode: 'insensitive' } },
        { customer: { email: { contains: 'hungneverdie24', mode: 'insensitive' } } },
        { staff: { email: { contains: 'hungneverdie24', mode: 'insensitive' } } },
      ],
    },
    include: {
      customer: true,
      staff: true,
    },
  });

  console.log(`Found ${users.length} temporary user(s) to delete.`);

  for (const u of users) {
    if (u.customer) {
      await prisma.customerAddress.deleteMany({ where: { customerId: u.customer.id } });
      await prisma.customer.delete({ where: { id: u.customer.id } });
      console.log(`  - Deleted customer profile (${u.customer.customerCode}) for ${u.username}`);
    }
    if (u.staff) {
      await prisma.staff.delete({ where: { id: u.staff.id } });
      console.log(`  - Deleted staff profile (${u.staff.employeeCode}) for ${u.username}`);
    }
    await prisma.user.delete({ where: { id: u.id } });
    console.log(`✅ Deleted user account ${u.username} (${u.id})`);
  }

  console.log('✨ Cleaned up temporary test users successfully!');
}

main()
  .catch((e) => {
    console.error('Error deleting temp users:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
