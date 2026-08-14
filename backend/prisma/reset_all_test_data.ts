import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAllTestData() {
  console.log('🧹 Bắt đầu dọn dẹp sạch toàn bộ dữ liệu Đơn hàng, Kiện hàng, Vận đơn, Lộ trình, Sọt hàng & Log hệ thống...');

  try {
    // 1. Xóa DeliveryProof, TrackingEvent, WarehouseScan, ToteBag, DriverLocation
    console.log('  ❌ Xóa DeliveryProof, TrackingEvent, WarehouseScan, ToteBag, DriverLocation...');
    await prisma.deliveryProof.deleteMany({});
    await prisma.trackingEvent.deleteMany({});
    await prisma.warehouseScan.deleteMany({});
    await prisma.toteBag.deleteMany({});
    await prisma.driverLocation.deleteMany({});

    // 2. Xóa RouteAdjustmentLog, DispatchTask, RouteStop, ShipmentTransfer, ShipmentPackage, Shipment, Route, RouteOptimization
    console.log('  ❌ Xóa DispatchTask, RouteStop, RouteAdjustmentLog, ShipmentTransfer, ShipmentPackage, Shipment, Route, RouteOptimization...');
    await prisma.routeAdjustmentLog.deleteMany({});
    await prisma.dispatchTask.deleteMany({});
    await prisma.routeStop.deleteMany({});
    await prisma.shipmentTransfer.deleteMany({});
    await prisma.shipmentPackage.deleteMany({});
    await prisma.shipment.deleteMany({});
    await prisma.route.deleteMany({});
    await prisma.routeOptimization.deleteMany({});

    // 3. Xóa OrderStatusHistory, OrderPayment, Package, Order
    console.log('  ❌ Xóa OrderStatusHistory, OrderPayment, Package, Order...');
    await prisma.orderStatusHistory.deleteMany({});
    await prisma.orderPayment.deleteMany({});
    await prisma.package.deleteMany({});
    await prisma.order.deleteMany({});

    console.log('✨ Đã xóa sạch toàn bộ Đơn hàng, Kiện hàng, Vận đơn, Lộ trình, Sọt hàng và Log liên quan!');
  } catch (err) {
    console.error('⚠️ Lỗi khi dọn dẹp dữ liệu:', err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

resetAllTestData();
