import { prisma } from '../src/config/prisma';

async function resetDemoRouteData() {
  console.log('🔄 Đang bắt đầu khôi phục dữ liệu Lộ trình RT-66266482 về trạng thái ban đầu...');

  // 1. Find Route RT-66266482
  const route = await prisma.route.findFirst({
    where: { routeCode: 'RT-66266482' },
    include: {
      stops: {
        include: {
          shipment: {
            include: {
              shipmentPackages: {
                include: {
                  package: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!route) {
    console.error('❌ Không tìm thấy Lộ trình RT-66266482 trong CSDL!');
    return;
  }

  // Collect shipment IDs and order IDs
  const shipmentIds: string[] = [];
  const orderIds: string[] = [];

  route.stops.forEach((stop) => {
    if (stop.shipmentId) {
      shipmentIds.push(stop.shipmentId);
      stop.shipment?.shipmentPackages.forEach((sp) => {
        if (sp.package?.orderId) {
          orderIds.push(sp.package.orderId);
        }
      });
    }
  });

  console.log(`📦 Tìm thấy ${route.stops.length} điểm dừng, ${shipmentIds.length} Vận đơn, ${orderIds.length} Đơn hàng.`);

  await prisma.$transaction(async (tx) => {
    // 1. Reset Route
    await tx.route.update({
      where: { id: route.id },
      data: {
        status: 'IN_PROGRESS',
        completedAt: null,
      },
    });

    // 2. Reset RouteStops
    await tx.routeStop.updateMany({
      where: { routeId: route.id },
      data: {
        status: 'PENDING',
      },
    });

    // 3. Reset Shipments
    if (shipmentIds.length > 0) {
      await tx.shipment.updateMany({
        where: { id: { in: shipmentIds } },
        data: {
          status: 'OUT_FOR_DELIVERY',
        },
      });
    }

    // 4. Reset Orders
    if (orderIds.length > 0) {
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: {
          status: 'OUT_FOR_DELIVERY',
        },
      });
    }
  });

  console.log('✅ KHÔI PHỤC DỮ LIỆU THÀNH CÔNG!');
  console.log(' - Lộ trình RT-66266482 -> IN_PROGRESS (Hoàn thành 0 / 8)');
  console.log(' - Tất cả 8 điểm dừng -> PENDING');
  console.log(' - Tất cả Vận đơn & Đơn hàng -> OUT_FOR_DELIVERY');
}

resetDemoRouteData()
  .catch((err) => {
    console.error('💥 Lỗi khi khôi phục dữ liệu:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
