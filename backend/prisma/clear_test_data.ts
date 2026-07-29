/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

declare const process: any;
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Bắt đầu dọn dẹp toàn bộ dữ liệu Test TP. Thủ Đức...');

  // 1. Xóa các đơn hàng test ORD-TD-%
  const orders = await prisma.order.findMany({
    where: { orderCode: { startsWith: 'ORD-TD-' } },
    select: { id: true, pickupAddressId: true, deliveryAddressId: true },
  });

  const orderIds = orders.map(o => o.id);
  const addressIds = orders.flatMap(o => [o.pickupAddressId, o.deliveryAddressId]).filter(Boolean) as string[];

  console.log(`📦 Đang xóa ${orderIds.length} Đơn hàng test và kiện hàng liên quan...`);

  // Xóa ShipmentPackage & Shipment
  const shipments = await prisma.shipment.findMany({
    where: { shipmentCode: { startsWith: 'SPM-TD-' } },
    select: { id: true },
  });
  const shipmentIds = shipments.map(s => s.id);

  await prisma.shipmentPackage.deleteMany({ where: { shipmentId: { in: shipmentIds } } });
  await prisma.shipment.deleteMany({ where: { id: { in: shipmentIds } } });
  await prisma.package.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });

  // 2. Xóa các tài xế test & gán xe
  const drivers = await prisma.staff.findMany({
    where: { employeeCode: { startsWith: 'DRV-TD-' } },
    select: { id: true, userId: true },
  });

  const driverIds = drivers.map(d => d.id);
  const driverUserIds = drivers.map(d => d.userId);

  console.log(`🛵 Đang xóa ${driverIds.length} Tài xế test & Xe máy...`);
  await prisma.driverVehicleAssignment.deleteMany({ where: { driverId: { in: driverIds } } });
  await prisma.vehicle.deleteMany({ where: { vehicleCode: { startsWith: 'VEH-DRV-TD-' } } });
  await prisma.staff.deleteMany({ where: { id: { in: driverIds } } });
  await prisma.user.deleteMany({ where: { id: { in: driverUserIds } } });

  // 3. Xóa nhân viên kho test
  const staffMembers = await prisma.staff.findMany({
    where: { employeeCode: { startsWith: 'STF-TD-' } },
    select: { id: true, userId: true },
  });
  const staffIds = staffMembers.map(s => s.id);
  const staffUserIds = staffMembers.map(s => s.userId);

  console.log(`👤 Đang xóa ${staffIds.length} Nhân viên kho test...`);
  await prisma.staff.deleteMany({ where: { id: { in: staffIds } } });
  await prisma.user.deleteMany({ where: { id: { in: staffUserIds } } });

  // 4. Xóa Khách hàng test
  const customers = await prisma.customer.findMany({
    where: { customerCode: { startsWith: 'CUST-TD-' } },
    select: { id: true, userId: true },
  });
  const custUserIds = customers.map(c => c.userId);
  const custIds = customers.map(c => c.id);

  console.log(`🛍️ Đang xóa ${custIds.length} Khách hàng test...`);
  await prisma.customerAddress.deleteMany({ where: { customerId: { in: custIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: custIds } } });
  await prisma.user.deleteMany({ where: { id: { in: custUserIds } } });

  // 5. Xóa 3 Bưu cục test
  const facilities = await prisma.facility.findMany({
    where: { facilityCode: { startsWith: 'FAC-TD-' } },
    select: { id: true, addressId: true },
  });
  const facilityIds = facilities.map(f => f.id);
  const facilityAddrIds = facilities.map(f => f.addressId).filter(Boolean) as string[];

  console.log(`🏢 Đang xóa ${facilityIds.length} Bưu cục test...`);
  await prisma.facility.deleteMany({ where: { id: { in: facilityIds } } });

  // 6. Xóa các địa chỉ liên quan
  const allAddrIds = Array.from(new Set([...addressIds, ...facilityAddrIds]));
  await prisma.address.deleteMany({ where: { id: { in: allAddrIds } } });

  console.log('✨ Đã dọn dẹp toàn bộ dữ liệu Test TP. Thủ Đức hoàn tất sạch sẽ!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi dọn dẹp data test:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
