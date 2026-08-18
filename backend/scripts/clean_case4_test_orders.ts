import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanCase4TestOrders() {
  console.log('🧹 Bắt đầu dọn dẹp các đơn hàng test Case 4...');

  const keepOrderCodes = [
    'ORD-0182000004',
    'ORD-9782000002',
    'ORD-1314000001',
    'ORD-0419000003',
    'ORD-TEST-SEALED-001',
  ];

  // 1. Xóa toàn bộ liên kết lộ trình, tracking và proofs
  console.log('🗑️ 1. Xóa dữ liệu lộ trình, quét mã và sự kiện...');
  await prisma.trackingEvent.deleteMany({});
  await prisma.routeStop.deleteMany({});
  await prisma.dispatchTask.deleteMany({});
  await prisma.shipmentTransfer.deleteMany({});
  await prisma.shipmentPackage.deleteMany({});
  await prisma.deliveryProof.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.route.deleteMany({});
  await prisma.routeOptimization.deleteMany({});

  // 2. Tìm tất cả đơn hàng phát sinh ngoài 5 đơn cơ sở
  console.log('🗑️ 2. Xóa các đơn hàng phát sinh ngoài 5 đơn demo gốc...');
  const extraOrders = await prisma.order.findMany({
    where: {
      orderCode: { notIn: keepOrderCodes },
    },
    select: {
      id: true,
      orderCode: true,
    },
  });

  const extraOrderIds = extraOrders.map((o) => o.id);

  if (extraOrderIds.length > 0) {
    await prisma.warehouseScan.deleteMany({
      where: {
        package: {
          orderId: { in: extraOrderIds },
        },
      },
    });

    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: extraOrderIds } },
    });

    await prisma.orderPayment.deleteMany({
      where: { orderId: { in: extraOrderIds } },
    });

    await prisma.package.deleteMany({
      where: { orderId: { in: extraOrderIds } },
    });

    await prisma.order.deleteMany({
      where: { id: { in: extraOrderIds } },
    });

    console.log(`✅ Đã xóa sạch ${extraOrderIds.length} đơn hàng phát sinh thành công!`);
  } else {
    console.log('✨ Không có đơn hàng phát sinh nào. Dữ liệu đã sạch!');
  }

  const remaining = await prisma.order.count();
  console.log(`📊 Số đơn hàng hiện tại trong DB: ${remaining} (Đúng chuẩn 5 đơn demo gốc).`);
}

cleanCase4TestOrders()
  .catch((e) => {
    console.error('❌ Lỗi khi dọn dẹp đơn hàng Case 4:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
