import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanCase5TestOrders() {
  console.log('🧹 Bắt đầu dọn dẹp các đơn hàng test Case 5...');

  // 1. Tìm tất cả đơn hàng thuộc Case 5
  const case5Orders = await prisma.order.findMany({
    where: {
      orderCode: { startsWith: 'ORD-CASE5-' },
    },
    select: {
      id: true,
      orderCode: true,
    },
  });

  const case5OrderIds = case5Orders.map((o) => o.id);

  if (case5OrderIds.length > 0) {
    // 1. Xóa toàn bộ liên kết lộ trình, tracking và proofs phát sinh
    await prisma.trackingEvent.deleteMany({});
    await prisma.routeStop.deleteMany({});
    await prisma.dispatchTask.deleteMany({});
    await prisma.shipmentTransfer.deleteMany({});
    await prisma.shipmentPackage.deleteMany({});
    await prisma.deliveryProof.deleteMany({});
    await prisma.shipment.deleteMany({});
    await prisma.route.deleteMany({});
    await prisma.routeOptimization.deleteMany({});

    // 2. Xóa dữ liệu liên quan trực tiếp đến 5 đơn Case 5
    await prisma.warehouseScan.deleteMany({
      where: {
        package: {
          orderId: { in: case5OrderIds },
        },
      },
    });

    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: case5OrderIds } },
    });

    await prisma.orderPayment.deleteMany({
      where: { orderId: { in: case5OrderIds } },
    });

    await prisma.package.deleteMany({
      where: { orderId: { in: case5OrderIds } },
    });

    await prisma.order.deleteMany({
      where: { id: { in: case5OrderIds } },
    });

    console.log(`✅ Đã xóa sạch ${case5OrderIds.length} đơn hàng Case 5 (${case5Orders.map(o => o.orderCode).join(', ')}) thành công!`);
  } else {
    console.log('✨ Không tìm thấy đơn hàng Case 5 nào trong database.');
  }

  const remaining = await prisma.order.count();
  console.log(`📊 Tổng số đơn hàng hiện tại trong DB: ${remaining}.`);
}

cleanCase5TestOrders()
  .catch((e) => {
    console.error('❌ Lỗi khi dọn dẹp đơn hàng Case 5:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
