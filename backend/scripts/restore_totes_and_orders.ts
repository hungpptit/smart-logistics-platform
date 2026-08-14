import { PrismaClient, ToteStatus, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function restoreState() {
  console.log('🔄 Restoring 2 Totes, 3 Orders, and wiping ALL test Linehaul Shipments/Routes...');

  const tote1Code = 'TOTE-FAC_TD_TANGNHONPHU-ZONE-W-PROVINCE-DISPATCH-001';
  const tote2Code = 'TOTE-FAC_TD_TANGNHONPHU-ZONE-W-PROVINCE-DISPATCH-002';

  const orderCodes = [
    'ORD-9782000002',
    'ORD-1314000001',
    'ORD-0419000003',
  ];

  // 1. Restore Tote Bags to SEALED
  await prisma.toteBag.updateMany({
    where: { toteCode: { in: [tote1Code, tote2Code] } },
    data: {
      status: ToteStatus.SEALED,
      sealedAt: new Date(),
    },
  });
  console.log('✅ Restored Totes status to SEALED');

  // 2. Restore Orders to AT_HUB
  await prisma.order.updateMany({
    where: { orderCode: { in: orderCodes } },
    data: {
      status: OrderStatus.AT_HUB,
    },
  });
  console.log('✅ Restored 3 Orders status to AT_HUB');

  // 3. Find and wipe ALL Linehaul test Shipments and Routes (SHP-LH-..., RT-LH-...)
  const testShipments = await prisma.shipment.findMany({
    where: {
      shipmentCode: { startsWith: 'SHP-LH-' },
    },
    select: { id: true, routeId: true },
  });

  const shipmentIds = testShipments.map((s) => s.id);
  const routeIds = testShipments.map((s) => s.routeId).filter((id): id is string => id !== null);

  // Also include any routes starting with RT-LH-
  const lhRoutes = await prisma.route.findMany({
    where: { routeCode: { startsWith: 'RT-LH-' } },
    select: { id: true },
  });
  lhRoutes.forEach((r) => {
    if (!routeIds.includes(r.id)) routeIds.push(r.id);
  });

  if (shipmentIds.length > 0) {
    await prisma.shipmentPackage.deleteMany({
      where: { shipmentId: { in: shipmentIds } },
    });
  }

  if (routeIds.length > 0) {
    await prisma.routeStop.deleteMany({
      where: { routeId: { in: routeIds } },
    });
    await prisma.route.deleteMany({
      where: { id: { in: routeIds } },
    });
    console.log(`🧹 Cleaned up ${routeIds.length} test Linehaul Route(s)`);
  }

  if (shipmentIds.length > 0) {
    await prisma.shipment.deleteMany({
      where: { id: { in: shipmentIds } },
    });
    console.log(`🧹 Cleaned up ${shipmentIds.length} test Linehaul Shipment(s)`);
  }

  console.log('🎉 Full restoration complete! Totes are SEALED, Orders are AT_HUB, and driver test routes have been cleared 100%.');
}

restoreState().finally(() => prisma.$disconnect());
