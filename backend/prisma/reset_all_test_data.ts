import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAllTestData() {
  console.log('🧹 Bắt đầu dọn dẹp sạch sẽ toàn bộ Đơn hàng, Sọt hàng (ToteBag), Quét Kho (WarehouseScan) và Lộ trình...');

  try {
    // 1. Xóa WarehouseScan & ToteBag
    console.log('  ❌ Xóa WarehouseScan & ToteBag...');
    await prisma.warehouseScan.deleteMany({});
    await prisma.toteBag.deleteMany({});

    // 2. Xóa các bảng liên quan tới Route, Dispatch, Tracking, Scan, Shipment
    console.log('  ❌ Xóa DispatchTask, RouteStop, ShipmentPackage, Shipment, Route...');
    await prisma.dispatchTask.deleteMany({});
    await prisma.routeStop.deleteMany({});
    await prisma.shipmentTransfer.deleteMany({});
    await prisma.shipmentPackage.deleteMany({});
    await prisma.shipment.deleteMany({});
    await prisma.route.deleteMany({});
    await prisma.routeOptimization.deleteMany({});

    // 3. Xóa các lịch sử trạng thái & đơn hàng
    console.log('  ❌ Xóa OrderStatusHistory, OrderPayment, Package, Order...');
    await prisma.orderStatusHistory.deleteMany({});
    await prisma.orderPayment.deleteMany({});
    await prisma.package.deleteMany({});
    await prisma.order.deleteMany({});

    console.log('✅ Dọn dẹp dữ liệu sọt hàng (ToteBag) & đơn hàng hoàn tất!');
  } catch (err) {
    console.error('⚠️ Lỗi khi dọn dẹp:', err);
  } finally {
    await prisma.$disconnect();
  }
}

resetAllTestData();
