import { PrismaClient, ToteStatus, OrderStatus, FeePayer, PickupType, PaymentMethod, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function restoreState() {
  console.log('🔄 Cleaning up database: Removing all routes, extra orders, and restoring pristine 5 demo orders...');

  const tote1Code = 'TOTE-FAC_TD_TANGNHONPHU-ZONE-W-PROVINCE-DISPATCH-001';
  const tote2Code = 'TOTE-FAC_TD_TANGNHONPHU-ZONE-W-PROVINCE-DISPATCH-002';
  const toteScNorthCode = 'TOTE-SC-NORTH-TEST01';

  const keepOrderCodes = [
    'ORD-0182000004',
    'ORD-9782000002',
    'ORD-1314000001',
    'ORD-0419000003',
    'ORD-TEST-SEALED-001',
  ];

  // 1. Wipe ALL Routes, RouteStops, DispatchTasks, TrackingEvents, Shipments, ShipmentTransfers, ShipmentPackages, WarehouseScans
  console.log('🧹 1. Deleting all Routes, RouteStops, TrackingEvents, Shipments, and DispatchTasks...');
  await prisma.trackingEvent.deleteMany({});
  await prisma.routeStop.deleteMany({});
  await prisma.dispatchTask.deleteMany({});
  await prisma.shipmentTransfer.deleteMany({});
  await prisma.shipmentPackage.deleteMany({});
  await prisma.warehouseScan.deleteMany({});
  await prisma.deliveryProof.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.route.deleteMany({});
  await prisma.routeOptimization.deleteMany({});

  // 2. Delete ALL orders NOT in keepOrderCodes
  console.log('🗑️ 2. Deleting all non-demo orders from database...');
  const otherOrders = await prisma.order.findMany({
    where: { orderCode: { notIn: keepOrderCodes } },
    select: { id: true, orderCode: true },
  });
  const otherOrderIds = otherOrders.map(o => o.id);

  if (otherOrderIds.length > 0) {
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: otherOrderIds } },
    });
    await prisma.orderPayment.deleteMany({
      where: { orderId: { in: otherOrderIds } },
    });
    await prisma.package.deleteMany({
      where: { orderId: { in: otherOrderIds } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: otherOrderIds } },
    });
    console.log(`✅ Deleted ${otherOrderIds.length} extra orders and their associated packages/histories.`);
  } else {
    console.log('ℹ️ No extra orders to delete.');
  }

  // 3. Find target facilities
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

  // 4. Restore Tote Bags to SEALED
  console.log('📦 3. Restoring Tote Bags to SEALED...');
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

  // 5. Restore 4 Tăng Nhơn Phú Orders
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
        data: {
          originFacilityId: tangNhonPhuFac.id,
          destinationFacilityId: linhTrungFac.id,
          status: OrderStatus.READY_FOR_PICKUP,
        },
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

  // 6. Restore ORD-TEST-SEALED-001 at FAC-SC-REGION4 (Tổng Kho Miền 4 - Đà Nẵng)
  if (scRegion4Fac && haDongFac) {
    const customer = await prisma.customer.findFirst({ include: { user: true } });
    const standardService = await prisma.service.findFirst({
      where: { serviceCode: 'STANDARD' },
    }) || await prisma.service.findFirst();
    const zone = scRegion4Fac.facilityZones.find(z => z.zoneCode === 'ZONE-OUTBOUND-NORTH') || scRegion4Fac.facilityZones[0];

    const orderTest = await prisma.order.upsert({
      where: { orderCode: 'ORD-TEST-SEALED-001' },
      update: {
        serviceId: standardService?.id || '',
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
        estimatedShippingFee: 35000,
        estimatedInsuranceFee: 3000,
        estimatedCodAmount: 500000,
        pickupType: PickupType.PICKUP,
      },
      create: {
        orderCode: 'ORD-TEST-SEALED-001',
        customerId: customer?.id || '',
        serviceId: standardService?.id || '',
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
        estimatedShippingFee: 35000,
        estimatedInsuranceFee: 3000,
        estimatedCodAmount: 500000,
        pickupType: PickupType.PICKUP,
      },
    });

    await prisma.package.upsert({
      where: { packageCode: 'PKG-TEST-SEALED-001' },
      update: {
        orderId: orderTest.id,
        currentFacilityId: scRegion4Fac.id,
        currentZoneId: zone?.id || null,
        description: 'Set đặc sản Miền Trung (Bánh khô mè, Mực rim me, Trà Sâm Dứa Đà Nẵng)',
        weight: 2.5,
        length: 30,
        width: 20,
        height: 15,
        volume: 0.009,
      },
      create: {
        packageCode: 'PKG-TEST-SEALED-001',
        orderId: orderTest.id,
        currentFacilityId: scRegion4Fac.id,
        currentZoneId: zone?.id || null,
        description: 'Set đặc sản Miền Trung (Bánh khô mè, Mực rim me, Trà Sâm Dứa Đà Nẵng)',
        weight: 2.5,
        length: 30,
        width: 20,
        height: 15,
        volume: 0.009,
      },
    });

    await prisma.orderPayment.upsert({
      where: { orderId: orderTest.id },
      update: {
        finalShippingFee: 35000,
        finalInsuranceFee: 3000,
        finalCodAmount: 500000,
        feePayer: FeePayer.SENDER,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.UNPAID,
      },
      create: {
        orderId: orderTest.id,
        finalShippingFee: 35000,
        finalInsuranceFee: 3000,
        finalCodAmount: 500000,
        feePayer: FeePayer.SENDER,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.UNPAID,
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

  // 7. Clean and recreate pristine initial status history for the 5 kept orders
  const restoredOrders = await prisma.order.findMany({
    where: { orderCode: { in: keepOrderCodes } },
    select: { id: true, orderCode: true },
  });
  const restoredOrderIds = restoredOrders.map(o => o.id);

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

  // 8. Re-link WarehouseScans linking packages to totes
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

  console.log('🎉 Full database cleanup & restoration complete! Only 5 pristine demo orders kept. All routes wiped. Ready for Demo!');
}

restoreState().finally(() => prisma.$disconnect());
