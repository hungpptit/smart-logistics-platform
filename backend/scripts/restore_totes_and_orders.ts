/// <reference types="node" />
import { PrismaClient, ToteStatus, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function restoreState() {
  console.log('🔄 Restoring Totes, Orders, and wiping ALL driver routes...');

  const tote1Code = 'TOTE-FAC_TD_TANGNHONPHU-ZONE-W-PROVINCE-DISPATCH-001';
  const tote2Code = 'TOTE-FAC_TD_TANGNHONPHU-ZONE-W-PROVINCE-DISPATCH-002';
  const toteScNorthCode = 'TOTE-SC-NORTH-TEST01';

  const orderCodes = [
    'ORD-0182000004',
    'ORD-9782000002',
    'ORD-1314000001',
    'ORD-0419000003',
    'ORD-TEST-SEALED-001',
  ];

  const tangNhonPhuFac = await prisma.facility.findUnique({
    where: { facilityCode: 'FAC-TD-TANGNHONPHU' },
  });
  const linhTrungFac = await prisma.facility.findUnique({
    where: { facilityCode: 'FAC-TD-LINHTRUNG' },
  });
  const xuanSonFac = await prisma.facility.findFirst({
    where: { OR: [{ facilityCode: 'FAC-000050' }, { facilityName: { contains: 'Xuân Sơn' } }] },
  });
  const tayNinhFac = await prisma.facility.findUnique({
    where: { facilityCode: 'FAC-WM-TAYNINH' },
  });
  const haDongFac = await prisma.facility.findUnique({
    where: { facilityCode: 'FAC-WM-HADONG' },
  });
  const scRegion4Fac = await prisma.facility.findUnique({
    where: { facilityCode: 'FAC-SC-REGION4' },
    include: { facilityZones: true },
  });

  // 1. Restore Tote Bags to SEALED
  await prisma.toteBag.updateMany({
    where: { toteCode: { in: [tote1Code, tote2Code] } },
    data: {
      status: ToteStatus.SEALED,
      sealedAt: new Date(),
      facilityId: tangNhonPhuFac?.id || undefined,
    },
  });

  if (scRegion4Fac) {
    let zone = scRegion4Fac.facilityZones.find(z => z.zoneCode === 'ZONE-OUTBOUND-NORTH') || scRegion4Fac.facilityZones[0];
    if (!zone) {
      zone = await prisma.facilityZone.create({
        data: {
          facilityId: scRegion4Fac.id,
          zoneCode: 'ZONE-OUTBOUND-NORTH',
          zoneName: 'Khu vực gom hàng xuất bến đi Miền Bắc',
          zoneType: 'SHIPPING',
          capacity: 50,
        },
      });
    }

    await prisma.toteBag.upsert({
      where: { toteCode: toteScNorthCode },
      update: {
        status: ToteStatus.SEALED,
        sealedAt: new Date(),
        facilityId: scRegion4Fac.id,
        zoneCode: zone.zoneCode,
      },
      create: {
        toteCode: toteScNorthCode,
        zoneCode: zone.zoneCode,
        facilityId: scRegion4Fac.id,
        status: ToteStatus.SEALED,
        sealedAt: new Date(),
      },
    });
  }
  console.log('✅ Restored Totes status to SEALED (including TOTE-SC-NORTH-TEST01 at FAC-SC-REGION4 Đà Nẵng)');

  // 2. Restore Orders to AT_HUB with originFacility = Bưu cục Tăng Nhơn Phú & Destination Facilities
  if (tangNhonPhuFac) {
    await prisma.order.updateMany({
      where: { orderCode: { in: ['ORD-9782000002', 'ORD-1314000001', 'ORD-0419000003'] } },
      data: {
        status: OrderStatus.AT_HUB,
        originFacilityId: tangNhonPhuFac.id,
      },
    });

    if (linhTrungFac) {
      await prisma.order.update({
        where: { orderCode: 'ORD-0182000004' },
        data: { destinationFacilityId: linhTrungFac.id, status: OrderStatus.READY_FOR_PICKUP },
      });
    }
    if (xuanSonFac) {
      await prisma.order.update({
        where: { orderCode: 'ORD-9782000002' },
        data: { destinationFacilityId: xuanSonFac.id },
      });
    }
    if (tayNinhFac) {
      await prisma.order.update({
        where: { orderCode: 'ORD-1314000001' },
        data: { destinationFacilityId: tayNinhFac.id },
      });
    }
    if (haDongFac) {
      await prisma.order.update({
        where: { orderCode: 'ORD-0419000003' },
        data: { destinationFacilityId: haDongFac.id },
      });
    }

    const pkgOrders = await prisma.order.findMany({
      where: { orderCode: { in: ['ORD-0182000004', 'ORD-9782000002', 'ORD-1314000001', 'ORD-0419000003'] } },
      select: { id: true },
    });
    await prisma.package.updateMany({
      where: { orderId: { in: pkgOrders.map(o => o.id) } },
      data: {
        currentFacilityId: tangNhonPhuFac.id,
      },
    });
  }

  // Restore ORD-TEST-SEALED-001 at FAC-SC-REGION4 (Tổng Kho Miền 4 - Đà Nẵng)
  if (scRegion4Fac && haDongFac) {
    const customer = await prisma.customer.findFirst({ include: { user: true } });
    const service = await prisma.service.findFirst();
    const zone = scRegion4Fac.facilityZones.find(z => z.zoneCode === 'ZONE-OUTBOUND-NORTH') || scRegion4Fac.facilityZones[0];

    const orderTest = await prisma.order.upsert({
      where: { orderCode: 'ORD-TEST-SEALED-001' },
      update: {
        status: OrderStatus.AT_HUB,
        originFacilityId: scRegion4Fac.id,
        destinationFacilityId: haDongFac.id,
        pickupAddressText: 'Số 24 Đường Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, TP. Đà Nẵng',
        pickupLatitude: 16.0678,
        pickupLongitude: 108.2208,
        receiverName: 'Trần Thị Bích Ngọc',
        receiverPhone: '0987654321',
        deliveryAddressText: 'Học viện Công nghệ Bưu chính Viễn thông, Km 10 Trần Phú, Mộ Lao, Hà Đông, Hà Nội',
        deliveryLatitude: 20.9806,
        deliveryLongitude: 105.7876,
      },
      create: {
        orderCode: 'ORD-TEST-SEALED-001',
        customerId: customer?.id || '',
        serviceId: service?.id || '',
        status: OrderStatus.AT_HUB,
        originFacilityId: scRegion4Fac.id,
        destinationFacilityId: haDongFac.id,
        pickupAddressText: 'Số 24 Đường Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, TP. Đà Nẵng',
        pickupLatitude: 16.0678,
        pickupLongitude: 108.2208,
        receiverName: 'Trần Thị Bích Ngọc',
        receiverPhone: '0987654321',
        deliveryAddressText: 'Học viện Công nghệ Bưu chính Viễn thông, Km 10 Trần Phú, Mộ Lao, Hà Đông, Hà Nội',
        deliveryLatitude: 20.9806,
        deliveryLongitude: 105.7876,
        estimatedShippingFee: 45000,
        estimatedInsuranceFee: 5000,
        estimatedCodAmount: 500000,
      },
    });

    const pkgTest = await prisma.package.upsert({
      where: { packageCode: 'PKG-TEST-SEALED-001' },
      update: {
        orderId: orderTest.id,
        currentFacilityId: scRegion4Fac.id,
        currentZoneId: zone?.id || null,
        weight: 12.5,
        length: 30,
        width: 25,
        height: 20,
        volume: 0.015,
      },
      create: {
        packageCode: 'PKG-TEST-SEALED-001',
        orderId: orderTest.id,
        currentFacilityId: scRegion4Fac.id,
        currentZoneId: zone?.id || null,
        weight: 12.5,
        length: 30,
        width: 25,
        height: 20,
        volume: 0.015,
      },
    });

    // Ensure staff account for Da Nang SC
    const staffRole = await prisma.role.findUnique({ where: { roleCode: 'STAFF' } });
    if (staffRole) {
      const passHash = await bcrypt.hash('SlpTest@2026', 10);
      const userDaNang = await prisma.user.upsert({
        where: { username: 'stf_sorter_danang_1' },
        update: { passwordHash: passHash, status: 'ACTIVE', roleId: staffRole.id },
        create: {
          username: 'stf_sorter_danang_1',
          passwordHash: passHash,
          roleId: staffRole.id,
          status: 'ACTIVE',
        },
      });

      await prisma.staff.upsert({
        where: { employeeCode: 'STF-DN-01' },
        update: { fullName: 'Trần Văn An (Thủ kho Tổng Kho Miền 4 Đà Nẵng)', assignedFacilityId: scRegion4Fac.id, position: 'WAREHOUSE_STAFF' },
        create: {
          userId: userDaNang.id,
          employeeCode: 'STF-DN-01',
          fullName: 'Trần Văn An (Thủ kho Tổng Kho Miền 4 Đà Nẵng)',
          phone: '0904000004',
          position: 'WAREHOUSE_STAFF',
          assignedFacilityId: scRegion4Fac.id,
        },
      });
    }
  }

  const restoredOrders = await prisma.order.findMany({
    where: { orderCode: { in: orderCodes } },
    select: { id: true, orderCode: true },
  });
  const restoredOrderIds = restoredOrders.map(o => o.id);

  // Clean ALL old orderStatusHistory
  await prisma.orderStatusHistory.deleteMany({
    where: {
      orderId: { in: restoredOrderIds },
    },
  });

  const staffTangNhonPhu = await prisma.user.findUnique({
    where: { username: 'stf_tangnhonphu_1' },
  });

  const baseTime = new Date();
  for (const o of restoredOrders) {
    if (o.orderCode === 'ORD-0182000004') {
      await prisma.orderStatusHistory.createMany({
        data: [
          {
            orderId: o.id,
            status: OrderStatus.CREATED,
            reason: 'Đơn hàng đã được khởi tạo thành công trên hệ thống',
            createdAt: new Date(baseTime.getTime() - 1000 * 60 * 30),
          },
          {
            orderId: o.id,
            status: OrderStatus.READY_FOR_PICKUP,
            reason: 'Đang chờ Shipper tiếp nhận lấy hàng tại 97 Man Thiện',
            createdAt: new Date(baseTime.getTime() - 1000 * 60 * 20),
          },
        ],
      });
    } else if (o.orderCode === 'ORD-TEST-SEALED-001') {
      await prisma.orderStatusHistory.createMany({
        data: [
          {
            orderId: o.id,
            status: OrderStatus.CREATED,
            reason: 'Đơn hàng đã được khởi tạo thành công trên hệ thống',
            createdAt: new Date(baseTime.getTime() - 1000 * 60 * 60),
          },
          {
            orderId: o.id,
            status: OrderStatus.AT_HUB,
            reason: 'Đã nhập kho Tổng Kho Miền 4 (Nam Trung Bộ & Tây Nguyên - Đà Nẵng) và đóng gói vào sọt niêm phong đi Hà Nội',
            createdAt: new Date(baseTime.getTime() - 1000 * 60 * 15),
          },
        ],
      });
    } else {
      await prisma.orderStatusHistory.createMany({
        data: [
          {
            orderId: o.id,
            status: OrderStatus.CREATED,
            reason: 'Đơn hàng đã được khởi tạo thành công trên hệ thống',
            createdAt: new Date(baseTime.getTime() - 1000 * 60 * 60),
          },
          {
            orderId: o.id,
            status: OrderStatus.READY_FOR_PICKUP,
            reason: 'Đang chờ Shipper tiếp nhận lấy hàng',
            createdAt: new Date(baseTime.getTime() - 1000 * 60 * 50),
          },
          {
            orderId: o.id,
            status: OrderStatus.PICKED_UP,
            reason: 'Shipper đã lấy hàng thành công từ người gửi',
            createdAt: new Date(baseTime.getTime() - 1000 * 60 * 30),
          },
          {
            orderId: o.id,
            status: OrderStatus.ARRIVED_ORIGIN_FACILITY,
            reason: 'Hàng đã về bưu cục Tăng Nhơn Phú',
            createdAt: new Date(baseTime.getTime() - 1000 * 60 * 20),
          },
          {
            orderId: o.id,
            status: OrderStatus.AT_HUB,
            changedByUserId: staffTangNhonPhu?.id,
            reason: 'Đã nhập kho thành công tại Bưu cục Tăng Nhơn Phú - TP. Thủ Đức',
            createdAt: new Date(baseTime.getTime() - 1000 * 60 * 15),
          },
        ],
      });
    }
  }

  console.log('✅ Restored clean initial status history for all orders');

  // 3. Wipe ALL Shipments, ShipmentPackages, DispatchTasks, RouteStops, Routes, and TrackingEvents
  await prisma.trackingEvent.deleteMany({});
  await prisma.shipmentTransfer.deleteMany({});
  await prisma.shipmentPackage.deleteMany({});
  await prisma.warehouseScan.deleteMany({});
  await prisma.dispatchTask.deleteMany({});
  await prisma.routeStop.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.route.deleteMany({});
  console.log('🧹 Cleaned up ALL test Shipments, ShipmentTransfers, Routes, RouteStops, TrackingEvents, and DispatchTasks 100%');

  // 3.1 Re-link WarehouseScans linking packages to totes
  const adminUser = await prisma.user.findFirst();
  const scannedUserId = adminUser?.id || '00000000-0000-0000-0000-000000000000';

  const tote1 = await prisma.toteBag.findUnique({ where: { toteCode: tote1Code } });
  const tote2 = await prisma.toteBag.findUnique({ where: { toteCode: tote2Code } });
  const toteSc = await prisma.toteBag.findUnique({ where: { toteCode: toteScNorthCode } });

  const order1 = await prisma.order.findUnique({ where: { orderCode: 'ORD-9782000002' }, include: { package: true } });
  const order2 = await prisma.order.findUnique({ where: { orderCode: 'ORD-1314000001' }, include: { package: true } });
  const order3 = await prisma.order.findUnique({ where: { orderCode: 'ORD-0419000003' }, include: { package: true } });
  const orderTest = await prisma.order.findUnique({ where: { orderCode: 'ORD-TEST-SEALED-001' }, include: { package: true } });

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

  if (toteSc && orderTest?.package) {
    await prisma.warehouseScan.create({
      data: {
        facilityId: toteSc.facilityId,
        toteBagId: toteSc.id,
        packageId: orderTest.package.id,
        scannedBy: scannedUserId,
      },
    });
  }
  console.log('✅ Re-linked packages inside Tote 1, Tote 2, and Tote SC-North');

  // 4. Restore ORD-0182000004 to READY_FOR_PICKUP (CHỜ LẤY HÀNG)
  const targetOrder = await prisma.order.findUnique({
    where: { orderCode: 'ORD-0182000004' },
    select: { id: true },
  });

  if (targetOrder) {
    await prisma.order.update({
      where: { id: targetOrder.id },
      data: {
        status: OrderStatus.READY_FOR_PICKUP,
      },
    });

    await prisma.orderStatusHistory.deleteMany({
      where: {
        orderId: targetOrder.id,
        status: { in: [OrderStatus.PICKUP_ASSIGNED, OrderStatus.PICKING, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT] },
      },
    });

    console.log('✅ Restored ORD-0182000004 status to READY_FOR_PICKUP (CHỜ LẤY HÀNG) & cleared driver assignment');
  }

  console.log('🎉 Full restoration complete! All Totes are SEALED, Orders are AT_HUB / READY_FOR_PICKUP, and ALL driver routes cleared 100%.');
}

restoreState().finally(() => prisma.$disconnect());
