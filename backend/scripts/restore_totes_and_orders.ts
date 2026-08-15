import { PrismaClient, ToteStatus, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function restoreState() {
  console.log('🔄 Restoring Totes, Orders, and wiping ALL driver routes...');

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

  // 3. Wipe ALL Shipments, ShipmentPackages, DispatchTasks, RouteStops, and Routes
  await prisma.shipmentTransfer.deleteMany({});
  await prisma.shipmentPackage.deleteMany({});
  await prisma.warehouseScan.deleteMany({});
  await prisma.dispatchTask.deleteMany({});
  await prisma.routeStop.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.route.deleteMany({});
  console.log('🧹 Cleaned up ALL test Shipments, ShipmentTransfers, Routes, RouteStops, and DispatchTasks 100%');

  // 3.1 Re-link WarehouseScans linking packages to tote1 and tote2
  const adminUser = await prisma.user.findFirst();
  const scannedUserId = adminUser?.id || '00000000-0000-0000-0000-000000000000';

  const tote1 = await prisma.toteBag.findUnique({ where: { toteCode: tote1Code } });
  const tote2 = await prisma.toteBag.findUnique({ where: { toteCode: tote2Code } });

  const order1 = await prisma.order.findUnique({ where: { orderCode: 'ORD-9782000002' }, include: { package: true } });
  const order2 = await prisma.order.findUnique({ where: { orderCode: 'ORD-1314000001' }, include: { package: true } });
  const order3 = await prisma.order.findUnique({ where: { orderCode: 'ORD-0419000003' }, include: { package: true } });

  if (tote1 && order1?.package) {
    await prisma.warehouseScan.create({
      data: {
        facilityId: tote1.facilityId,
        toteBagId: tote1.id,
        packageId: order1.package.id,
        scannedBy: scannedUserId,
      },
    });
  }

  if (tote2 && order2?.package && order3?.package) {
    await prisma.warehouseScan.createMany({
      data: [
        {
          facilityId: tote2.facilityId,
          toteBagId: tote2.id,
          packageId: order2.package.id,
          scannedBy: scannedUserId,
        },
        {
          facilityId: tote2.facilityId,
          toteBagId: tote2.id,
          packageId: order3.package.id,
          scannedBy: scannedUserId,
        },
      ],
    });
  }
  console.log('✅ Re-linked packages inside Tote 1 and Tote 2');

  // 4. Restore ORD-0182000004 to READY_FOR_PICKUP (CHỜ LẤY HÀNG)
  const targetOrder = await prisma.order.findUnique({
    where: { orderCode: 'ORD-0182000004' },
    select: { id: true },
  });

  if (targetOrder) {
    // 4.1 Update Order status to READY_FOR_PICKUP
    await prisma.order.update({
      where: { id: targetOrder.id },
      data: {
        status: OrderStatus.READY_FOR_PICKUP,
      },
    });

    // 4.2 Wipe newer status history entries (keep only CREATED and READY_FOR_PICKUP)
    await prisma.orderStatusHistory.deleteMany({
      where: {
        orderId: targetOrder.id,
        status: { in: [OrderStatus.PICKUP_ASSIGNED, OrderStatus.PICKING, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT] },
      },
    });

    console.log('✅ Restored ORD-0182000004 status to READY_FOR_PICKUP (CHỜ LẤY HÀNG) & cleared driver assignment');
  }

  console.log('🎉 Full restoration complete! Totes are SEALED and linked with packages, Orders are AT_HUB / READY_FOR_PICKUP, and ALL driver routes have been cleared 100%.');
}

restoreState().finally(() => prisma.$disconnect());
