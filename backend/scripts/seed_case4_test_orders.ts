import { PrismaClient, ToteStatus, OrderStatus, PaymentMethod, FeePayer, PickupType, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedCase4TestOrders() {
  console.log('🚀 Bắt đầu nạp 2 đơn hàng Case 4 (Liên miền: Tuyến Bắc - Nam & Tổng Kho Miền)...');

  const customer = await prisma.customer.findFirst({
    where: { user: { username: 'cust_thuduc_1' } },
  }) || await prisma.customer.findFirst();

  if (!customer) {
    throw new Error('Không tìm thấy tài khoản khách hàng cust_thuduc_1!');
  }

  const standardService = await prisma.service.findFirst({
    where: { serviceCode: 'STANDARD' },
  }) || await prisma.service.findFirst();

  if (!standardService) {
    throw new Error('Không tìm thấy dịch vụ STANDARD!');
  }

  const tangNhonPhuFac = await prisma.facility.findUnique({
    where: { facilityCode: 'FAC-TD-TANGNHONPHU' },
  });

  const haDongFac = await prisma.facility.findUnique({
    where: { facilityCode: 'FAC-WM-HADONG' },
  });

  const scRegion4Fac = await prisma.facility.findUnique({
    where: { facilityCode: 'FAC-SC-REGION4' },
    include: { facilityZones: true },
  });

  if (!tangNhonPhuFac || !haDongFac) {
    throw new Error('Không tìm thấy Bưu cục Tăng Nhơn Phú hoặc Bưu cục Hà Đông - TP. Hà Nội!');
  }

  const baseTime = new Date();

  // =========================================================================
  // 1. ĐƠN HÀNG 1: ORD-CASE4-0001 (TP.HCM ➔ Hà Nội | Sẵn sàng chờ lấy hàng)
  // =========================================================================
  const pickupLat1 = 10.84802;
  const pickupLng1 = 106.786677;
  const pickupAddr1 = '97 Man Thiện, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh';

  const order1 = await prisma.order.upsert({
    where: { orderCode: 'ORD-CASE4-0001' },
    update: {
      status: OrderStatus.READY_FOR_PICKUP,
      originFacilityId: tangNhonPhuFac.id,
      destinationFacilityId: haDongFac.id,
      pickupAddressText: pickupAddr1,
      pickupLatitude: pickupLat1,
      pickupLongitude: pickupLng1,
      receiverName: 'Phạm Tuấn Hưng',
      receiverPhone: '0988112233',
      deliveryAddressText: 'Học viện Công nghệ Bưu chính Viễn thông, Km 10 Trần Phú, Mộ Lao, Phường Hà Đông, Thành phố Hà Nội',
      deliveryLatitude: 20.9780,
      deliveryLongitude: 105.7830,
      estimatedShippingFee: 55000,
      estimatedInsuranceFee: 2000,
      estimatedCodAmount: 0,
      pickupType: PickupType.PICKUP,
    },
    create: {
      orderCode: 'ORD-CASE4-0001',
      customerId: customer.id,
      serviceId: standardService.id,
      status: OrderStatus.READY_FOR_PICKUP,
      originFacilityId: tangNhonPhuFac.id,
      destinationFacilityId: haDongFac.id,
      pickupAddressText: pickupAddr1,
      pickupLatitude: pickupLat1,
      pickupLongitude: pickupLng1,
      receiverName: 'Phạm Tuấn Hưng',
      receiverPhone: '0988112233',
      deliveryAddressText: 'Học viện Công nghệ Bưu chính Viễn thông, Km 10 Trần Phú, Mộ Lao, Phường Hà Đông, Thành phố Hà Nội',
      deliveryLatitude: 20.9780,
      deliveryLongitude: 105.7830,
      estimatedShippingFee: 55000,
      estimatedInsuranceFee: 2000,
      estimatedCodAmount: 0,
      pickupType: PickupType.PICKUP,
    },
  });

  const pkg1 = await prisma.package.upsert({
    where: { packageCode: 'ORD-CASE4-0001-PKG-01' },
    update: {
      orderId: order1.id,
      currentFacilityId: tangNhonPhuFac.id,
      description: 'Kiện tài liệu & quà lưu niệm Hội nghị PTIT Bắc - Nam',
      weight: 1.0,
      length: 30,
      width: 20,
      height: 10,
      volume: 0.006,
    },
    create: {
      packageCode: 'ORD-CASE4-0001-PKG-01',
      orderId: order1.id,
      currentFacilityId: tangNhonPhuFac.id,
      description: 'Kiện tài liệu & quà lưu niệm Hội nghị PTIT Bắc - Nam',
      weight: 1.0,
      length: 30,
      width: 20,
      height: 10,
      volume: 0.006,
    },
  });

  await prisma.orderPayment.upsert({
    where: { orderId: order1.id },
    update: {
      finalShippingFee: 55000,
      finalInsuranceFee: 2000,
      finalCodAmount: 0,
      feePayer: FeePayer.SENDER,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PAID,
    },
    create: {
      orderId: order1.id,
      finalShippingFee: 55000,
      finalInsuranceFee: 2000,
      finalCodAmount: 0,
      feePayer: FeePayer.SENDER,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PAID,
    },
  });

  await prisma.orderStatusHistory.deleteMany({
    where: { orderId: order1.id },
  });

  await prisma.orderStatusHistory.createMany({
    data: [
      {
        orderId: order1.id,
        status: OrderStatus.CREATED,
        reason: 'Đơn hàng khởi tạo từ kho mặc định PTIT HCM 1 (97 Man Thiện)',
        createdAt: new Date(baseTime.getTime() - 1000 * 60 * 20),
      },
      {
        orderId: order1.id,
        status: OrderStatus.READY_FOR_PICKUP,
        reason: 'Đang chờ Shipper bưu cục Tăng Nhơn Phú tiếp nhận lấy hàng',
        createdAt: new Date(baseTime.getTime() - 1000 * 60 * 10),
      },
    ],
  });

  console.log(`  + Đã tạo đơn 1 [ORD-CASE4-0001] (97 Man Thiện TP.HCM ➔ PTIT Hà Đông)`);

  // =========================================================================
  // 2. ĐƠN HÀNG 2: ORD-TEST-SEALED-001 (Tổng Kho Miền 4 Đà Nẵng ➔ Hà Đông | Đã đóng Sọt Niêm Phong)
  // =========================================================================
  if (scRegion4Fac) {
    let zoneNorth = scRegion4Fac.facilityZones.find(z => z.zoneCode === 'ZONE-OUTBOUND-NORTH' || z.zoneCode === 'ZONE-S-NORTH-DISPATCH') || scRegion4Fac.facilityZones[0];
    if (!zoneNorth) {
      zoneNorth = await prisma.facilityZone.create({
        data: {
          facilityId: scRegion4Fac.id,
          zoneCode: 'ZONE-OUTBOUND-NORTH',
          zoneName: 'Khu vực gom hàng xuất bến đi Miền Bắc',
          zoneType: 'SHIPPING',
          capacity: 50,
        },
      });
    }

    const toteScNorthCode = 'TOTE-SC-NORTH-TEST01';
    const toteSc = await prisma.toteBag.upsert({
      where: { toteCode: toteScNorthCode },
      update: {
        status: ToteStatus.SEALED,
        sealedAt: new Date(),
        facilityId: scRegion4Fac.id,
        zoneCode: zoneNorth.zoneCode,
      },
      create: {
        toteCode: toteScNorthCode,
        zoneCode: zoneNorth.zoneCode,
        facilityId: scRegion4Fac.id,
        status: ToteStatus.SEALED,
        sealedAt: new Date(),
      },
    });

    const order2 = await prisma.order.upsert({
      where: { orderCode: 'ORD-TEST-SEALED-001' },
      update: {
        customerId: customer.id,
        serviceId: standardService.id,
        status: OrderStatus.AT_HUB,
        originFacilityId: scRegion4Fac.id,
        destinationFacilityId: haDongFac.id,
        pickupAddressText: 'Số 24 Đường Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, TP. Đà Nẵng',
        pickupLatitude: 16.0678,
        pickupLongitude: 108.2208,
        receiverName: 'Trần Thị Bích Ngọc',
        receiverPhone: '0987654321',
        deliveryAddressText: 'Học viện Công nghệ Bưu chính Viễn thông, Km 10 Trần Phú, Mộ Lao, Phường Hà Đông, Thành phố Hà Nội',
        deliveryLatitude: 20.9806,
        deliveryLongitude: 105.7876,
        estimatedShippingFee: 35000,
        estimatedInsuranceFee: 3000,
        estimatedCodAmount: 500000,
        pickupType: PickupType.PICKUP,
      },
      create: {
        orderCode: 'ORD-TEST-SEALED-001',
        customerId: customer.id,
        serviceId: standardService.id,
        status: OrderStatus.AT_HUB,
        originFacilityId: scRegion4Fac.id,
        destinationFacilityId: haDongFac.id,
        pickupAddressText: 'Số 24 Đường Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, TP. Đà Nẵng',
        pickupLatitude: 16.0678,
        pickupLongitude: 108.2208,
        receiverName: 'Trần Thị Bích Ngọc',
        receiverPhone: '0987654321',
        deliveryAddressText: 'Học viện Công nghệ Bưu chính Viễn thông, Km 10 Trần Phú, Mộ Lao, Phường Hà Đông, Thành phố Hà Nội',
        deliveryLatitude: 20.9806,
        deliveryLongitude: 105.7876,
        estimatedShippingFee: 35000,
        estimatedInsuranceFee: 3000,
        estimatedCodAmount: 500000,
        pickupType: PickupType.PICKUP,
      },
    });

    const pkg2 = await prisma.package.upsert({
      where: { packageCode: 'PKG-TEST-SEALED-001' },
      update: {
        orderId: order2.id,
        currentFacilityId: scRegion4Fac.id,
        currentZoneId: zoneNorth?.id || null,
        description: 'Set đặc sản Miền Trung (Bánh khô mè, Mực rim me, Trà Sâm Dứa Đà Nẵng)',
        weight: 2.5,
        length: 30,
        width: 20,
        height: 15,
        volume: 0.009,
      },
      create: {
        packageCode: 'PKG-TEST-SEALED-001',
        orderId: order2.id,
        currentFacilityId: scRegion4Fac.id,
        currentZoneId: zoneNorth?.id || null,
        description: 'Set đặc sản Miền Trung (Bánh khô mè, Mực rim me, Trà Sâm Dứa Đà Nẵng)',
        weight: 2.5,
        length: 30,
        width: 20,
        height: 15,
        volume: 0.009,
      },
    });

    await prisma.orderPayment.upsert({
      where: { orderId: order2.id },
      update: {
        finalShippingFee: 35000,
        finalInsuranceFee: 3000,
        finalCodAmount: 500000,
        feePayer: FeePayer.SENDER,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.UNPAID,
      },
      create: {
        orderId: order2.id,
        finalShippingFee: 35000,
        finalInsuranceFee: 3000,
        finalCodAmount: 500000,
        feePayer: FeePayer.SENDER,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.UNPAID,
      },
    });

    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: order2.id },
    });

    await prisma.orderStatusHistory.createMany({
      data: [
        {
          orderId: order2.id,
          status: OrderStatus.CREATED,
          reason: 'Đơn hàng đã được khởi tạo thành công trên hệ thống',
          createdAt: new Date(baseTime.getTime() - 1000 * 60 * 60),
        },
        {
          orderId: order2.id,
          status: OrderStatus.AT_HUB,
          reason: 'Đã nhập kho Tổng Kho Miền 4 (Nam Trung Bộ & Tây Nguyên - Đà Nẵng) và đóng gói vào sọt niêm phong đi Hà Nội',
          createdAt: new Date(baseTime.getTime() - 1000 * 60 * 15),
        },
      ],
    });

    // Tạo thủ kho Đà Nẵng nếu chưa có
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

    // Quét mã WarehouseScan gắn kiện vào sọt niêm phong Đà Nẵng
    const adminUser = await prisma.user.findFirst();
    const scannedUserId = adminUser?.id || '00000000-0000-0000-0000-000000000000';

    await prisma.warehouseScan.deleteMany({
      where: { packageId: pkg2.id },
    });

    await prisma.warehouseScan.create({
      data: {
        facilityId: scRegion4Fac.id,
        toteBagId: toteSc.id,
        packageId: pkg2.id,
        scannedBy: scannedUserId,
      },
    });

    console.log(`  + Đã tạo đơn 2 [ORD-TEST-SEALED-001] (Đà Nẵng ➔ PTIT Hà Đông | Sọt niêm phong ${toteScNorthCode})`);
  }

  console.log('✅ Đã nạp thành công 2 đơn hàng Case 4 (Liên miền Bắc - Nam)!');
}

seedCase4TestOrders()
  .catch((e) => {
    console.error('❌ Lỗi khi nạp đơn Case 4:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
