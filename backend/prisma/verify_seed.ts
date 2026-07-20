import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const vehicles = await prisma.vehicle.findMany({
    include: { vehicleType: true, homeFacility: true },
  });

  console.log('\n========================================');
  console.log('🚚 DANH SÁCH PHƯƠNG TIỆN ĐÃ SEED THÀNH CÔNG:');
  console.log('========================================');
  vehicles.forEach((v, index) => {
    console.log(
      `${index + 1}. [${v.vehicleCode}] BKS: ${v.licensePlate} | Loại: ${v.vehicleType.typeName} (${v.vehicleType.typeCode})`
    );
    console.log(
      `   👉 Tải trọng: ${v.maxWeight} kg | Thể tích: ${v.maxVolume} m³ | Chiều dài: ${v.maxLength} m | Trạng thái: ${v.operatingStatus}`
    );
  });

  const counts = {
    users: await prisma.user.count(),
    customers: await prisma.customer.count(),
    facilities: await prisma.facility.count(),
    drivers: await prisma.driver.count(),
    vehicles: await prisma.vehicle.count(),
    orders: await prisma.order.count(),
    packages: await prisma.package.count(),
    shipments: await prisma.shipment.count(),
    routes: await prisma.route.count(),
  };

  console.log('\n========================================');
  console.log('📊 TỔNG HỢP DỮ LIỆU ĐÃ NẠP VÀO DATABASE:');
  console.log('========================================');
  console.log(`- Người dùng (Users): ${counts.users}`);
  console.log(`- Khách hàng (Customers): ${counts.customers}`);
  console.log(`- Kho / Bưu cục (Facilities): ${counts.facilities}`);
  console.log(`- Tài xế (Drivers): ${counts.drivers}`);
  console.log(`- Phương tiện (Vehicles): ${counts.vehicles}`);
  console.log(`- Đơn hàng (Orders): ${counts.orders}`);
  console.log(`- Kiện hàng (Packages): ${counts.packages}`);
  console.log(`- Vận đơn (Shipments): ${counts.shipments}`);
  console.log(`- Tuyến đường (Routes): ${counts.routes}`);
  console.log('========================================\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
  });
