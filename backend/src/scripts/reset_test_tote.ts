import { PrismaClient, OrderStatus, ShipmentStatus, RouteStatus, RouteStopStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function resetTestOrdersAndTote() {
  console.log('🔄 Resetting test data to arrive AT Tổng Kho Miền Nam (Sorting Center Q.12)...');

  const orderCodes = ['ORD-5709000059', 'ORD-2500000056', 'ORD-5227000058'];

  // 1. Fetch Orders & Packages
  const orders = await prisma.order.findMany({
    where: { orderCode: { in: orderCodes } },
    include: { package: true },
  });

  const orderIds = orders.map((o) => o.id);
  const packageIds = orders.map((o) => o.package?.id).filter((id): id is string => id !== undefined && id !== null);

  // 2. Find Facilities
  const scSouth = await prisma.facility.findFirst({
    where: {
      OR: [
        { facilityCode: 'FAC_SC_SOUTH' },
        { facilityCode: 'FAC-SC-SOUTH' },
        { facilityName: { contains: 'Tổng Kho Miền Nam' } },
      ],
    },
    include: { facilityZones: true },
  });

  const hubHcm = await prisma.facility.findFirst({
    where: {
      OR: [
        { facilityCode: 'FAC_HUB_HCM' },
        { facilityCode: 'FAC-HUB-HCM' },
        { facilityName: { contains: 'Kho Tổng TP' } },
      ],
    },
  });

  const scSouthId = scSouth?.id || 'facility-sc-south-id';
  const hubHcmId = hubHcm?.id || 'facility-hub-hcm-id';

  const unloadingZone = scSouth?.facilityZones.find((z) => z.zoneCode === 'ZONE-S-UNLOADING') || scSouth?.facilityZones[0];

  // 3. Reset Orders & Packages to AT_HUB at SC South
  await prisma.order.updateMany({
    where: { id: { in: orderIds } },
    data: {
      status: OrderStatus.AT_HUB,
      estimatedDeliveryDate: new Date('2026-08-13T18:00:00Z'),
    },
  });

  if (packageIds.length > 0) {
    await prisma.package.updateMany({
      where: { id: { in: packageIds } },
      data: {
        currentFacilityId: scSouthId,
        currentZoneId: unloadingZone?.id || null,
      },
    });
  }
  console.log('✅ Updated orders status to AT_HUB at Tổng Kho Miền Nam (Sorting Center Q.12)');

  // 4. Clean up previous test scans, histories & extra totes at SC South
  if (packageIds.length > 0) {
    await prisma.warehouseScan.deleteMany({
      where: {
        packageId: { in: packageIds },
        facilityId: scSouthId,
      },
    });
  }

  await prisma.orderStatusHistory.deleteMany({
    where: {
      orderId: { in: orderIds },
      OR: [
        { reason: { contains: 'Phân loại vào' } },
        { reason: { contains: 'bưu cục tiếp theo' } },
      ],
    },
  });

  // Ensure each order has a full sequential history: IN_TRANSIT (Linehaul Truck) -> AT_HUB (Arrived Mega Sorter)
  for (const order of orders) {
    const existingInTransitHistory = await prisma.orderStatusHistory.findFirst({
      where: {
        orderId: order.id,
        status: OrderStatus.IN_TRANSIT,
        reason: { contains: 'Tổng Kho Miền Nam' },
      },
    });

    if (!existingInTransitHistory) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.IN_TRANSIT,
          reason: 'Đơn hàng đang trên xe tải trung chuyển từ Kho Tổng TP. Hồ Chí Minh đến Tổng Kho Miền Nam (Sorting Center Q.12)',
          createdAt: new Date(Date.now() - 1800000), // 30 mins ago
        },
      });
    }

    const existingAtHubHistory = await prisma.orderStatusHistory.findFirst({
      where: {
        orderId: order.id,
        status: OrderStatus.AT_HUB,
        reason: { contains: 'Tổng Kho Miền Nam' },
      },
    });

    if (!existingAtHubHistory) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.AT_HUB,
          reason: 'Đã nhập kho thành công tại Tổng Kho Miền Nam (Sorting Center Q.12)',
          createdAt: new Date(Date.now() - 900000), // 15 mins ago
        },
      });
    }
  }

  // Reset SC South ToteBag statuses to OPEN and delete extra -002 totes
  await prisma.toteBag.deleteMany({
    where: {
      facilityId: scSouthId,
      toteCode: { contains: '-002' },
    },
  });

  await prisma.toteBag.updateMany({
    where: { facilityId: scSouthId },
    data: {
      status: 'OPEN',
      sealedAt: null,
    },
  });

  console.log('🧹 Cleaned up and reset SC South ToteBags to OPEN status with 0 packages');

  // 5. Clean up old linehaul shipments & create arrived shipment
  const routeCode = 'RT-LH-99381587';
  const shipmentCode = 'SHP-LH-99381587';

  const existingRoutes = await prisma.route.findMany({ where: { routeCode } });
  const existingRouteIds = existingRoutes.map((r) => r.id);
  if (existingRouteIds.length > 0) {
    await prisma.routeStop.deleteMany({ where: { routeId: { in: existingRouteIds } } });
    await prisma.shipment.deleteMany({ where: { routeId: { in: existingRouteIds } } });
    await prisma.route.deleteMany({ where: { id: { in: existingRouteIds } } });
  }

  const driverUser = await prisma.user.findFirst({ where: { username: 'drv_linehaul_dongnai' } });

  const route = await prisma.route.create({
    data: {
      routeCode,
      startFacilityId: hubHcmId,
      endFacilityId: scSouthId,
      status: RouteStatus.COMPLETED,
      actualStartAt: new Date(Date.now() - 3600000),
      completedAt: new Date(),
      plannedDistanceKm: 15.0,
      plannedDurationMin: 35,
      totalStops: 2,
    },
  });

  const shipment = await prisma.shipment.create({
    data: {
      shipmentCode,
      status: ShipmentStatus.AT_HUB,
      routeId: route.id,
      originFacilityId: hubHcmId,
      destinationFacilityId: scSouthId,
      createdBy: driverUser?.id || undefined,
    },
  });

  // Create WarehouseScans at SC South Unloading Zone
  for (const pkgId of packageIds) {
    await prisma.shipmentPackage.create({
      data: {
        shipmentId: shipment.id,
        packageId: pkgId,
      },
    });

    await prisma.warehouseScan.create({
      data: {
        facilityId: scSouthId,
        shipmentId: shipment.id,
        packageId: pkgId,
        scannedBy: driverUser?.id || orders[0].customerId,
        scannedAt: new Date(),
      },
    });
  }

  console.log(`🎉 Success! 3 test orders are now AT_HUB inside Tổng Kho Miền Nam (Sorting Center Q.12)!`);
  await prisma.$disconnect();
}

resetTestOrdersAndTote().catch((err) => {
  console.error('Error during reset:', err);
  process.exit(1);
});
