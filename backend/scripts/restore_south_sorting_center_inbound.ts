import { PrismaClient, ToteStatus, OrderStatus, FacilityZoneType, FeePayer, PickupType, PaymentMethod, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function restoreSouthSCInboundState() {
  console.log('🔄 Đang khôi phục hệ thống về trạng thái: HÀNG ĐÃ NHẬP TỔNG KHO MIỀN NAM (FAC-SC-SOUTH)...');

  const tangNhonPhuFac = await prisma.facility.findUnique({ where: { facilityCode: 'FAC-TD-TANGNHONPHU' } });
  const hubHcmFac = await prisma.facility.findUnique({ where: { facilityCode: 'FAC-HUB-HCM' }, include: { facilityZones: true } });
  const scSouthFac = await prisma.facility.findUnique({ where: { facilityCode: 'FAC-SC-SOUTH' }, include: { facilityZones: true } });
  const scRegion4Fac = await prisma.facility.findUnique({ where: { facilityCode: 'FAC-SC-REGION4' }, include: { facilityZones: true } });
  const linhTrungFac = await prisma.facility.findUnique({ where: { facilityCode: 'FAC-TD-LINHTRUNG' } });
  const xuanSonFac = await prisma.facility.findFirst({ where: { OR: [{ facilityCode: 'FAC-000050' }, { facilityName: { contains: 'Xuân Sơn' } }] } });
  const tayNinhFac = await prisma.facility.findUnique({ where: { facilityCode: 'FAC-WM-TAYNINH' } });
  const haDongFac = await prisma.facility.findUnique({ where: { facilityCode: 'FAC-WM-HADONG' } });

  if (!scSouthFac || !hubHcmFac || !tangNhonPhuFac || !scRegion4Fac || !haDongFac) {
    throw new Error('Không tìm thấy đủ thông tin các kho bãi trong cơ sở dữ liệu!');
  }

  // 1. Dọn dẹp sạch các chuyến xe, route stops, tracking events, dispatch tasks cũ
  await prisma.trackingEvent.deleteMany({});
  await prisma.shipmentTransfer.deleteMany({});
  await prisma.shipmentPackage.deleteMany({});
  await prisma.warehouseScan.deleteMany({});
  await prisma.dispatchTask.deleteMany({});
  await prisma.routeStop.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.route.deleteMany({});
  console.log('🧹 Đã xóa sạch các chuyến đi thử nghiệm trước đó.');

  // 2. Phân khu tại Tổng Kho Miền Nam
  const zoneUnloading = scSouthFac.facilityZones.find(z => z.zoneCode === 'ZONE-S-UNLOADING') || scSouthFac.facilityZones[0];
  const zoneNorthDispatch = scSouthFac.facilityZones.find(z => z.zoneCode === 'ZONE-S-NORTH-DISPATCH') || zoneUnloading;
  const zoneTayNinhDispatch = scSouthFac.facilityZones.find(z => z.zoneCode === 'ZONE-S-DISPATCH-TAYNINH') || zoneUnloading;

  // Phân khu tại Kho Tổng TP.HCM
  const zoneHcmIntra = hubHcmFac.facilityZones.find(z => z.zoneCode === 'ZONE-P-INTRA-PROVINCE') || hubHcmFac.facilityZones[0];

  // Phân khu tại Tổng Kho Miền 4 Đà Nẵng
  let zoneDaNangNorth = scRegion4Fac.facilityZones.find(z => z.zoneCode === 'ZONE-S-NORTH-DISPATCH' || z.zoneCode === 'ZONE-OUTBOUND-NORTH') || scRegion4Fac.facilityZones[0];
  if (!zoneDaNangNorth) {
    zoneDaNangNorth = await prisma.facilityZone.create({
      data: {
        facilityId: scRegion4Fac.id,
        zoneCode: 'ZONE-S-NORTH-DISPATCH',
        zoneName: 'Khu Xuất Hàng Tuyến Miền Bắc & Hà Nội',
        zoneType: 'SHIPPING',
        capacity: 50,
      },
    });
  }

  // 3. Khôi phục các sọt hàng (Tote Bags)
  // 3.1 Sọt tại Tổng Kho Miền Nam
  const toteSouthUnloading = await prisma.toteBag.upsert({
    where: { toteCode: 'TOTE-FAC_SC_SOUTH-ZONE-S-UNLOADING-001' },
    update: {
      status: ToteStatus.OPEN,
      facilityId: scSouthFac.id,
      zoneCode: zoneUnloading.zoneCode,
      sealedAt: null,
    },
    create: {
      toteCode: 'TOTE-FAC_SC_SOUTH-ZONE-S-UNLOADING-001',
      status: ToteStatus.OPEN,
      facilityId: scSouthFac.id,
      zoneCode: zoneUnloading.zoneCode,
    },
  });

  // 3.2 Sọt tại Kho Tổng TP.HCM
  const toteHcmIntra = await prisma.toteBag.upsert({
    where: { toteCode: 'TOTE-FAC_HUB_HCM-ZONE-P-INTRA-PROVINCE-001' },
    update: {
      status: ToteStatus.OPEN,
      facilityId: hubHcmFac.id,
      zoneCode: zoneHcmIntra.zoneCode,
      sealedAt: null,
    },
    create: {
      toteCode: 'TOTE-FAC_HUB_HCM-ZONE-P-INTRA-PROVINCE-001',
      status: ToteStatus.OPEN,
      facilityId: hubHcmFac.id,
      zoneCode: zoneHcmIntra.zoneCode,
    },
  });

  // 3.3 Sọt niêm phong tại Tổng Kho Miền 4 Đà Nẵng
  const toteDaNang = await prisma.toteBag.upsert({
    where: { toteCode: 'TOTE-SC-NORTH-TEST01' },
    update: {
      status: ToteStatus.SEALED,
      facilityId: scRegion4Fac.id,
      zoneCode: zoneDaNangNorth.zoneCode,
      sealedAt: new Date(),
    },
    create: {
      toteCode: 'TOTE-SC-NORTH-TEST01',
      status: ToteStatus.SEALED,
      facilityId: scRegion4Fac.id,
      zoneCode: zoneDaNangNorth.zoneCode,
      sealedAt: new Date(),
    },
  });

  // 4. Khôi phục các đơn hàng và vị trí kiện hàng
  const baseTime = new Date();
  const staffSouth = await prisma.user.findUnique({ where: { username: 'stf_sorter_south_1' } });
  const staffHcm = await prisma.user.findUnique({ where: { username: 'stf_hub_hcm_1' } });
  const adminUser = await prisma.user.findFirst();
  const scannedUserId = staffSouth?.id || adminUser?.id || '00000000-0000-0000-0000-000000000000';

  // 4.1 ĐƠN ORD-0419000003 (Đi Hà Đông, Hà Nội - Đã về Tổng Kho Miền Nam)
  const orderHaDong = await prisma.order.update({
    where: { orderCode: 'ORD-0419000003' },
    data: {
      status: OrderStatus.AT_HUB,
      originFacilityId: tangNhonPhuFac.id,
      destinationFacilityId: haDongFac.id,
    },
  });
  const pkgHaDong = await prisma.package.update({
    where: { orderId: orderHaDong.id },
    data: {
      currentFacilityId: scSouthFac.id,
      currentZoneId: zoneUnloading.id,
    },
  });
  await prisma.warehouseScan.create({
    data: {
      facilityId: scSouthFac.id,
      packageId: pkgHaDong.id,
      toteBagId: toteSouthUnloading.id,
      scannedBy: scannedUserId,
      scannedAt: new Date(baseTime.getTime() - 1000 * 60 * 10),
    },
  });

  // 4.2 ĐƠN ORD-1314000001 (Đi Tây Ninh - Đã về Tổng Kho Miền Nam)
  if (tayNinhFac) {
    const orderTayNinh = await prisma.order.update({
      where: { orderCode: 'ORD-1314000001' },
      data: {
        status: OrderStatus.AT_HUB,
        originFacilityId: tangNhonPhuFac.id,
        destinationFacilityId: tayNinhFac.id,
      },
    });
    const pkgTayNinh = await prisma.package.update({
      where: { orderId: orderTayNinh.id },
      data: {
        currentFacilityId: scSouthFac.id,
        currentZoneId: zoneUnloading.id,
      },
    });
    await prisma.warehouseScan.create({
      data: {
        facilityId: scSouthFac.id,
        packageId: pkgTayNinh.id,
        toteBagId: toteSouthUnloading.id,
        scannedBy: scannedUserId,
        scannedAt: new Date(baseTime.getTime() - 1000 * 60 * 10),
      },
    });
  }

  // 4.3 ĐƠN ORD-9782000002 (Đi Xuân Sơn - Đang ở Kho Tổng TP.HCM)
  if (xuanSonFac) {
    const orderXuanSon = await prisma.order.update({
      where: { orderCode: 'ORD-9782000002' },
      data: {
        status: OrderStatus.AT_HUB,
        originFacilityId: tangNhonPhuFac.id,
        destinationFacilityId: xuanSonFac.id,
      },
    });
    const pkgXuanSon = await prisma.package.update({
      where: { orderId: orderXuanSon.id },
      data: {
        currentFacilityId: hubHcmFac.id,
        currentZoneId: zoneHcmIntra.id,
      },
    });
    await prisma.warehouseScan.create({
      data: {
        facilityId: hubHcmFac.id,
        packageId: pkgXuanSon.id,
        toteBagId: toteHcmIntra.id,
        scannedBy: staffHcm?.id || scannedUserId,
        scannedAt: new Date(baseTime.getTime() - 1000 * 60 * 30),
      },
    });
  }

  // 4.4 ĐƠN ORD-TEST-SEALED-001 (Đang ở Tổng Kho Miền 4 Đà Nẵng - Sẵn sàng cho xe ghé bốc)
  const customer = await prisma.customer.findFirst();
  const standardService = await prisma.service.findFirst({
    where: { serviceCode: 'STANDARD' },
  }) || await prisma.service.findFirst();

  const orderTestDaNang = await prisma.order.upsert({
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

  const pkgTestDaNang = await prisma.package.upsert({
    where: { packageCode: 'PKG-TEST-SEALED-001' },
    update: {
      orderId: orderTestDaNang.id,
      currentFacilityId: scRegion4Fac.id,
      currentZoneId: zoneDaNangNorth.id,
      description: 'Set đặc sản Miền Trung (Bánh khô mè, Mực rim me, Trà Sâm Dứa Đà Nẵng)',
      weight: 2.5,
      length: 30,
      width: 20,
      height: 15,
      volume: 0.009,
    },
    create: {
      packageCode: 'PKG-TEST-SEALED-001',
      orderId: orderTestDaNang.id,
      currentFacilityId: scRegion4Fac.id,
      currentZoneId: zoneDaNangNorth.id,
      description: 'Set đặc sản Miền Trung (Bánh khô mè, Mực rim me, Trà Sâm Dứa Đà Nẵng)',
      weight: 2.5,
      length: 30,
      width: 20,
      height: 15,
      volume: 0.009,
    },
  });

  await prisma.orderPayment.upsert({
    where: { orderId: orderTestDaNang.id },
    update: {
      finalShippingFee: 35000,
      finalInsuranceFee: 3000,
      finalCodAmount: 500000,
      feePayer: FeePayer.SENDER,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.UNPAID,
    },
    create: {
      orderId: orderTestDaNang.id,
      finalShippingFee: 35000,
      finalInsuranceFee: 3000,
      finalCodAmount: 500000,
      feePayer: FeePayer.SENDER,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  await prisma.warehouseScan.create({
    data: {
      facilityId: scRegion4Fac.id,
      packageId: pkgTestDaNang.id,
      toteBagId: toteDaNang.id,
      scannedBy: scannedUserId,
      scannedAt: new Date(baseTime.getTime() - 1000 * 60 * 15),
    },
  });

  // 4.5 ĐƠN ORD-0182000004 (Đang ở Bưu cục Tăng Nhơn Phú - Chờ Shipper lấy hàng)
  if (linhTrungFac) {
    const orderLinhTrung = await prisma.order.update({
      where: { orderCode: 'ORD-0182000004' },
      data: {
        status: OrderStatus.READY_FOR_PICKUP,
        originFacilityId: tangNhonPhuFac.id,
        destinationFacilityId: linhTrungFac.id,
      },
    });
    await prisma.package.update({
      where: { orderId: orderLinhTrung.id },
      data: {
        currentFacilityId: tangNhonPhuFac.id,
        currentZoneId: null,
      },
    });
  }

  // 5. Cập nhật lịch sử trạng thái sạch sẽ cho từng đơn
  const allTestOrders = await prisma.order.findMany({
    where: { orderCode: { in: ['ORD-0419000003', 'ORD-1314000001', 'ORD-9782000002', 'ORD-0182000004', 'ORD-TEST-SEALED-001'] } },
  });

  await prisma.orderStatusHistory.deleteMany({
    where: { orderId: { in: allTestOrders.map(o => o.id) } },
  });

  for (const o of allTestOrders) {
    if (o.orderCode === 'ORD-0419000003' || o.orderCode === 'ORD-1314000001') {
      await prisma.orderStatusHistory.createMany({
        data: [
          { orderId: o.id, status: OrderStatus.CREATED, reason: 'Đơn hàng đã được khởi tạo thành công trên hệ thống', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 120) },
          { orderId: o.id, status: OrderStatus.READY_FOR_PICKUP, reason: 'Đang chờ Shipper tiếp nhận lấy hàng', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 100) },
          { orderId: o.id, status: OrderStatus.PICKED_UP, reason: 'Shipper đã lấy hàng thành công từ người gửi', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 80) },
          { orderId: o.id, status: OrderStatus.ARRIVED_ORIGIN_FACILITY, reason: 'Hàng đã về Bưu cục Tăng Nhơn Phú', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 60) },
          { orderId: o.id, status: OrderStatus.IN_TRANSIT, reason: 'Xe tải trung chuyển tuyến Bưu cục ➔ Kho Tổng TP.HCM', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 45) },
          { orderId: o.id, status: OrderStatus.IN_TRANSIT, reason: 'Xe tải trung chuyển tuyến Kho Tổng TP.HCM ➔ Tổng Kho Miền Nam Q.12', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 25) },
          { orderId: o.id, status: OrderStatus.AT_HUB, changedByUserId: staffSouth?.id, reason: 'Đã nhập kho thành công tại Tổng Kho Miền Nam (Sorting Center Q.12)', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 10) },
        ],
      });
    } else if (o.orderCode === 'ORD-9782000002') {
      await prisma.orderStatusHistory.createMany({
        data: [
          { orderId: o.id, status: OrderStatus.CREATED, reason: 'Đơn hàng đã được khởi tạo', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 120) },
          { orderId: o.id, status: OrderStatus.READY_FOR_PICKUP, reason: 'Chờ lấy hàng', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 100) },
          { orderId: o.id, status: OrderStatus.PICKED_UP, reason: 'Đã lấy hàng', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 80) },
          { orderId: o.id, status: OrderStatus.ARRIVED_ORIGIN_FACILITY, reason: 'Về bưu cục Tăng Nhơn Phú', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 60) },
          { orderId: o.id, status: OrderStatus.IN_TRANSIT, reason: 'Xe tải trung chuyển đến Kho Tổng TP.HCM', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 45) },
          { orderId: o.id, status: OrderStatus.AT_HUB, changedByUserId: staffHcm?.id, reason: 'Đã nhập kho thành công tại Kho Tổng TP. Hồ Chí Minh (Provincial Hub)', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 30) },
        ],
      });
    } else if (o.orderCode === 'ORD-TEST-SEALED-001') {
      await prisma.orderStatusHistory.createMany({
        data: [
          { orderId: o.id, status: OrderStatus.CREATED, reason: 'Đơn hàng đã được khởi tạo', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 120) },
          { orderId: o.id, status: OrderStatus.AT_HUB, reason: 'Đã nhập kho Tổng Kho Miền 4 (Nam Trung Bộ & Tây Nguyên - Đà Nẵng) và đóng gói vào sọt niêm phong đi Hà Nội', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 15) },
        ],
      });
    } else if (o.orderCode === 'ORD-0182000004') {
      await prisma.orderStatusHistory.createMany({
        data: [
          { orderId: o.id, status: OrderStatus.CREATED, reason: 'Đơn hàng đã được khởi tạo thành công trên hệ thống', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 60) },
          { orderId: o.id, status: OrderStatus.READY_FOR_PICKUP, reason: 'Đang chờ Shipper tiếp nhận lấy hàng tại 97 Man Thiện', createdAt: new Date(baseTime.getTime() - 1000 * 60 * 30) },
        ],
      });
    }
  }

  // 6. Đảm bảo tài khoản thủ kho Đà Nẵng tồn tại
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

  console.log('\n========================================================================');
  console.log('🎉 KHÔI PHỤC HOÀN TẤT VỀ TRẠNG THÁI: HÀNG ĐÃ NHẬP TỔNG KHO MIỀN NAM!');
  console.log('========================================================================');
  console.log('📦 Đơn ORD-0419000003 & ORD-1314000001 : AT_HUB tại Tổng Kho Miền Nam (ZONE-S-UNLOADING)');
  console.log('📦 Đơn ORD-9782000002                  : AT_HUB tại Kho Tổng TP.HCM (ZONE-P-INTRA-PROVINCE)');
  console.log('📦 Đơn ORD-TEST-SEALED-001             : AT_HUB tại Tổng Kho Miền 4 Đà Nẵng (Sọt SEALED)');
  console.log('📦 Đơn ORD-0182000004                  : READY_FOR_PICKUP tại Bưu cục Tăng Nhơn Phú');
  console.log('========================================================================\n');
}

restoreSouthSCInboundState()
  .catch((err) => {
    console.error('❌ Lỗi:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
