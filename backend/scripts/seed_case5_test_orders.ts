import { PrismaClient, ToteStatus, OrderStatus, FeePayer, PickupType, PaymentMethod, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedCase5TestOrders() {
  console.log('🚀 Bắt đầu nạp bộ đơn hàng Case 5 (Sọt Trung Chuyển Liên Kho & Tuyến Đa Cấp Bưu Cục)...');

  const tote1Code = 'TOTE-FAC_TD_TANGNHONPHU-ZONE-W-PROVINCE-DISPATCH-001';
  const tote2Code = 'TOTE-FAC_TD_TANGNHONPHU-ZONE-W-PROVINCE-DISPATCH-002';
  const toteScNorthCode = 'TOTE-SC-NORTH-TEST01';

  // 1. Xóa các mã đơn cũ nếu còn tồn tại trong DB (ORD-0182000004, ORD-0419000003, ORD-9782000002, ORD-1314000001, ORD-TEST-SEALED-001)
  const legacyCodes = [
    'ORD-0182000004',
    'ORD-0419000003',
    'ORD-9782000002',
    'ORD-1314000001',
    'ORD-TEST-SEALED-001',
  ];
  const oldOrders = await prisma.order.findMany({
    where: { orderCode: { in: legacyCodes } },
    select: { id: true, orderCode: true },
  });
  const oldOrderIds = oldOrders.map(o => o.id);
  if (oldOrderIds.length > 0) {
    await prisma.warehouseScan.deleteMany({
      where: { package: { orderId: { in: oldOrderIds } } },
    });
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: oldOrderIds } },
    });
    await prisma.orderPayment.deleteMany({
      where: { orderId: { in: oldOrderIds } },
    });
    await prisma.package.deleteMany({
      where: { orderId: { in: oldOrderIds } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: oldOrderIds } },
    });
    console.log(`🧹 Đã dọn dẹp sạch ${oldOrderIds.length} mã đơn cũ khỏi DB (${legacyCodes.join(', ')}).`);
  }

  // 2. Tìm các cơ sở kho bãi & khách hàng chuẩn
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
    include: { facilityZones: true },
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

  if (!tangNhonPhuFac) {
    throw new Error('Không tìm thấy Bưu cục Tăng Nhơn Phú (FAC-TD-TANGNHONPHU)!');
  }

  const zoneProvinceDispatch = tangNhonPhuFac.facilityZones.find(z => z.zoneCode === 'ZONE-W-PROVINCE-DISPATCH') || tangNhonPhuFac.facilityZones[0];

  // 3. Khởi tạo / Cập nhật 3 Sọt Hàng (Tote Bags)
  const tote1 = await prisma.toteBag.upsert({
    where: { toteCode: tote1Code },
    update: {
      status: ToteStatus.SEALED,
      sealedAt: new Date(),
      facilityId: tangNhonPhuFac.id,
      zoneCode: zoneProvinceDispatch ? zoneProvinceDispatch.zoneCode : 'ZONE-W-PROVINCE-DISPATCH',
    },
    create: {
      toteCode: tote1Code,
      status: ToteStatus.SEALED,
      sealedAt: new Date(),
      facilityId: tangNhonPhuFac.id,
      zoneCode: zoneProvinceDispatch ? zoneProvinceDispatch.zoneCode : 'ZONE-W-PROVINCE-DISPATCH',
    },
  });

  const tote2 = await prisma.toteBag.upsert({
    where: { toteCode: tote2Code },
    update: {
      status: ToteStatus.SEALED,
      sealedAt: new Date(),
      facilityId: tangNhonPhuFac.id,
      zoneCode: zoneProvinceDispatch ? zoneProvinceDispatch.zoneCode : 'ZONE-W-PROVINCE-DISPATCH',
    },
    create: {
      toteCode: tote2Code,
      status: ToteStatus.SEALED,
      sealedAt: new Date(),
      facilityId: tangNhonPhuFac.id,
      zoneCode: zoneProvinceDispatch ? zoneProvinceDispatch.zoneCode : 'ZONE-W-PROVINCE-DISPATCH',
    },
  });

  let toteSc: any = null;
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

    toteSc = await prisma.toteBag.upsert({
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
  }

  const baseTime = new Date();

  // -------------------------------------------------------------
  // ĐƠN 1: ORD-CASE5-0001 (Tăng Nhơn Phú ➔ Linh Trung | READY_FOR_PICKUP)
  // -------------------------------------------------------------
  const order1 = await prisma.order.upsert({
    where: { orderCode: 'ORD-CASE5-0001' },
    update: {
      customerId: customer.id,
      serviceId: standardService.id,
      status: OrderStatus.READY_FOR_PICKUP,
      originFacilityId: tangNhonPhuFac.id,
      destinationFacilityId: linhTrungFac?.id || tangNhonPhuFac.id,
      pickupAddressText: '97 Man Thiện, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh',
      pickupLatitude: 10.84802,
      pickupLongitude: 106.786677,
      receiverName: 'Nguyễn Văn Long',
      receiverPhone: '0987111001',
      deliveryAddressText: '250 Đường Linh Trung, Phường Linh Trung, Thành phố Hồ Chí Minh',
      deliveryLatitude: 10.8580,
      deliveryLongitude: 106.7750,
      estimatedShippingFee: 22000,
      estimatedInsuranceFee: 2000,
      estimatedCodAmount: 350000,
      pickupType: PickupType.PICKUP,
    },
    create: {
      orderCode: 'ORD-CASE5-0001',
      customerId: customer.id,
      serviceId: standardService.id,
      status: OrderStatus.READY_FOR_PICKUP,
      originFacilityId: tangNhonPhuFac.id,
      destinationFacilityId: linhTrungFac?.id || tangNhonPhuFac.id,
      pickupAddressText: '97 Man Thiện, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh',
      pickupLatitude: 10.84802,
      pickupLongitude: 106.786677,
      receiverName: 'Nguyễn Văn Long',
      receiverPhone: '0987111001',
      deliveryAddressText: '250 Đường Linh Trung, Phường Linh Trung, Thành phố Hồ Chí Minh',
      deliveryLatitude: 10.8580,
      deliveryLongitude: 106.7750,
      estimatedShippingFee: 22000,
      estimatedInsuranceFee: 2000,
      estimatedCodAmount: 350000,
      pickupType: PickupType.PICKUP,
    },
  });

  const pkg1 = await prisma.package.upsert({
    where: { packageCode: 'ORD-CASE5-0001-PKG-01' },
    update: {
      orderId: order1.id,
      currentFacilityId: tangNhonPhuFac.id,
      description: 'Hộp trà thảo mộc Đông Trùng Hạ Thảo cao cấp',
      weight: 0.8,
      length: 20,
      width: 15,
      height: 10,
      volume: 0.003,
    },
    create: {
      packageCode: 'ORD-CASE5-0001-PKG-01',
      orderId: order1.id,
      currentFacilityId: tangNhonPhuFac.id,
      description: 'Hộp trà thảo mộc Đông Trùng Hạ Thảo cao cấp',
      weight: 0.8,
      length: 20,
      width: 15,
      height: 10,
      volume: 0.003,
    },
  });

  await prisma.orderPayment.upsert({
    where: { orderId: order1.id },
    update: {
      finalShippingFee: 22000,
      finalInsuranceFee: 2000,
      finalCodAmount: 350000,
      feePayer: FeePayer.SENDER,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.UNPAID,
    },
    create: {
      orderId: order1.id,
      finalShippingFee: 22000,
      finalInsuranceFee: 2000,
      finalCodAmount: 350000,
      feePayer: FeePayer.SENDER,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  // -------------------------------------------------------------
  // ĐƠN 2: ORD-CASE5-0002 (Tăng Nhơn Phú ➔ Bưu cục Xuân Sơn, Vũng Tàu | AT_HUB trong Tote 1)
  // -------------------------------------------------------------
  const order2 = await prisma.order.upsert({
    where: { orderCode: 'ORD-CASE5-0002' },
    update: {
      customerId: customer.id,
      serviceId: standardService.id,
      status: OrderStatus.AT_HUB,
      originFacilityId: tangNhonPhuFac.id,
      destinationFacilityId: xuanSonFac?.id || tangNhonPhuFac.id,
      pickupAddressText: '97 Man Thiện, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh',
      pickupLatitude: 10.84802,
      pickupLongitude: 106.786677,
      receiverName: 'Huy',
      receiverPhone: '01207412287',
      deliveryAddressText: 'Cửa Hàng Đồ Sắt Thành Thủy, Mỹ Xuân - Hòa Bình, Xã Xuân Sơn, Huyện Châu Đức, Tỉnh Bà Rịa - Vũng Tàu',
      deliveryLatitude: 10.6428151,
      deliveryLongitude: 107.314633,
      estimatedShippingFee: 32000,
      estimatedInsuranceFee: 0,
      estimatedCodAmount: 0,
      pickupType: PickupType.PICKUP,
    },
    create: {
      orderCode: 'ORD-CASE5-0002',
      customerId: customer.id,
      serviceId: standardService.id,
      status: OrderStatus.AT_HUB,
      originFacilityId: tangNhonPhuFac.id,
      destinationFacilityId: xuanSonFac?.id || tangNhonPhuFac.id,
      pickupAddressText: '97 Man Thiện, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh',
      pickupLatitude: 10.84802,
      pickupLongitude: 106.786677,
      receiverName: 'Huy',
      receiverPhone: '01207412287',
      deliveryAddressText: 'Cửa Hàng Đồ Sắt Thành Thủy, Mỹ Xuân - Hòa Bình, Xã Xuân Sơn, Huyện Châu Đức, Tỉnh Bà Rịa - Vũng Tàu',
      deliveryLatitude: 10.6428151,
      deliveryLongitude: 107.314633,
      estimatedShippingFee: 32000,
      estimatedInsuranceFee: 0,
      estimatedCodAmount: 0,
      pickupType: PickupType.PICKUP,
    },
  });

  const pkg2 = await prisma.package.upsert({
    where: { packageCode: 'ORD-CASE5-0002-PKG-01' },
    update: {
      orderId: order2.id,
      currentFacilityId: tangNhonPhuFac.id,
      description: 'Kiện hàng quần áo thời trang xuất khẩu',
      weight: 1.0,
      length: 20,
      width: 15,
      height: 10,
      volume: 0.003,
    },
    create: {
      packageCode: 'ORD-CASE5-0002-PKG-01',
      orderId: order2.id,
      currentFacilityId: tangNhonPhuFac.id,
      description: 'Kiện hàng quần áo thời trang xuất khẩu',
      weight: 1.0,
      length: 20,
      width: 15,
      height: 10,
      volume: 0.003,
    },
  });

  await prisma.orderPayment.upsert({
    where: { orderId: order2.id },
    update: {
      finalShippingFee: 32000,
      finalInsuranceFee: 0,
      finalCodAmount: 0,
      feePayer: FeePayer.SENDER,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PAID,
    },
    create: {
      orderId: order2.id,
      finalShippingFee: 32000,
      finalInsuranceFee: 0,
      finalCodAmount: 0,
      feePayer: FeePayer.SENDER,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PAID,
    },
  });

  // -------------------------------------------------------------
  // ĐƠN 3: ORD-CASE5-0003 (Tăng Nhơn Phú ➔ Bưu cục Dương Minh Châu, Tây Ninh | AT_HUB trong Tote 2)
  // -------------------------------------------------------------
  const order3 = await prisma.order.upsert({
    where: { orderCode: 'ORD-CASE5-0003' },
    update: {
      customerId: customer.id,
      serviceId: standardService.id,
      status: OrderStatus.AT_HUB,
      originFacilityId: tangNhonPhuFac.id,
      destinationFacilityId: tayNinhFac?.id || tangNhonPhuFac.id,
      pickupAddressText: '97 Man Thiện, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh',
      pickupLatitude: 10.84802,
      pickupLongitude: 106.786677,
      receiverName: 'Trần Quốc Toản',
      receiverPhone: '0933112233',
      deliveryAddressText: 'Số 88 Đường Nguyễn Chí Thanh, Xã Dương Minh Châu, Tỉnh Tây Ninh',
      deliveryLatitude: 11.3520,
      deliveryLongitude: 106.1820,
      estimatedShippingFee: 45000,
      estimatedInsuranceFee: 3000,
      estimatedCodAmount: 320000,
      pickupType: PickupType.PICKUP,
    },
    create: {
      orderCode: 'ORD-CASE5-0003',
      customerId: customer.id,
      serviceId: standardService.id,
      status: OrderStatus.AT_HUB,
      originFacilityId: tangNhonPhuFac.id,
      destinationFacilityId: tayNinhFac?.id || tangNhonPhuFac.id,
      pickupAddressText: '97 Man Thiện, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh',
      pickupLatitude: 10.84802,
      pickupLongitude: 106.786677,
      receiverName: 'Trần Quốc Toản',
      receiverPhone: '0933112233',
      deliveryAddressText: 'Số 88 Đường Nguyễn Chí Thanh, Xã Dương Minh Châu, Tỉnh Tây Ninh',
      deliveryLatitude: 11.3520,
      deliveryLongitude: 106.1820,
      estimatedShippingFee: 45000,
      estimatedInsuranceFee: 3000,
      estimatedCodAmount: 320000,
      pickupType: PickupType.PICKUP,
    },
  });

  const pkg3 = await prisma.package.upsert({
    where: { packageCode: 'ORD-CASE5-0003-PKG-01' },
    update: {
      orderId: order3.id,
      currentFacilityId: tangNhonPhuFac.id,
      description: 'Set quà đặc sản Tây Ninh cao cấp',
      weight: 1.2,
      length: 25,
      width: 20,
      height: 15,
      volume: 0.007,
    },
    create: {
      packageCode: 'ORD-CASE5-0003-PKG-01',
      orderId: order3.id,
      currentFacilityId: tangNhonPhuFac.id,
      description: 'Set quà đặc sản Tây Ninh cao cấp',
      weight: 1.2,
      length: 25,
      width: 20,
      height: 15,
      volume: 0.007,
    },
  });

  await prisma.orderPayment.upsert({
    where: { orderId: order3.id },
    update: {
      finalShippingFee: 45000,
      finalInsuranceFee: 3000,
      finalCodAmount: 320000,
      feePayer: FeePayer.SENDER,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.UNPAID,
    },
    create: {
      orderId: order3.id,
      finalShippingFee: 45000,
      finalInsuranceFee: 3000,
      finalCodAmount: 320000,
      feePayer: FeePayer.SENDER,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  // -------------------------------------------------------------
  // ĐƠN 4: ORD-CASE5-0004 (Tăng Nhơn Phú ➔ Bưu cục Hà Đông, Hà Nội | AT_HUB trong Tote 2)
  // -------------------------------------------------------------
  const order4 = await prisma.order.upsert({
    where: { orderCode: 'ORD-CASE5-0004' },
    update: {
      customerId: customer.id,
      serviceId: standardService.id,
      status: OrderStatus.AT_HUB,
      originFacilityId: tangNhonPhuFac.id,
      destinationFacilityId: haDongFac?.id || tangNhonPhuFac.id,
      pickupAddressText: '97 Man Thiện, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh',
      pickupLatitude: 10.84802,
      pickupLongitude: 106.786677,
      receiverName: 'Phạm Tuấn Hưng',
      receiverPhone: '0988112233',
      deliveryAddressText: 'Học viện Công nghệ Bưu chính Viễn thông, Km 10 Trần Phú, Mộ Lao, Phường Hà Đông, Thành phố Hà Nội',
      deliveryLatitude: 20.9780,
      deliveryLongitude: 105.7830,
      estimatedShippingFee: 55000,
      estimatedInsuranceFee: 3000,
      estimatedCodAmount: 500000,
      pickupType: PickupType.PICKUP,
    },
    create: {
      orderCode: 'ORD-CASE5-0004',
      customerId: customer.id,
      serviceId: standardService.id,
      status: OrderStatus.AT_HUB,
      originFacilityId: tangNhonPhuFac.id,
      destinationFacilityId: haDongFac?.id || tangNhonPhuFac.id,
      pickupAddressText: '97 Man Thiện, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh',
      pickupLatitude: 10.84802,
      pickupLongitude: 106.786677,
      receiverName: 'Phạm Tuấn Hưng',
      receiverPhone: '0988112233',
      deliveryAddressText: 'Học viện Công nghệ Bưu chính Viễn thông, Km 10 Trần Phú, Mộ Lao, Phường Hà Đông, Thành phố Hà Nội',
      deliveryLatitude: 20.9780,
      deliveryLongitude: 105.7830,
      estimatedShippingFee: 55000,
      estimatedInsuranceFee: 3000,
      estimatedCodAmount: 500000,
      pickupType: PickupType.PICKUP,
    },
  });

  const pkg4 = await prisma.package.upsert({
    where: { packageCode: 'ORD-CASE5-0004-PKG-01' },
    update: {
      orderId: order4.id,
      currentFacilityId: tangNhonPhuFac.id,
      description: 'Kiện tài liệu & quà lưu niệm Hội nghị PTIT Bắc - Nam',
      weight: 1.5,
      length: 30,
      width: 20,
      height: 15,
      volume: 0.009,
    },
    create: {
      packageCode: 'ORD-CASE5-0004-PKG-01',
      orderId: order4.id,
      currentFacilityId: tangNhonPhuFac.id,
      description: 'Kiện tài liệu & quà lưu niệm Hội nghị PTIT Bắc - Nam',
      weight: 1.5,
      length: 30,
      width: 20,
      height: 15,
      volume: 0.009,
    },
  });

  await prisma.orderPayment.upsert({
    where: { orderId: order4.id },
    update: {
      finalShippingFee: 55000,
      finalInsuranceFee: 3000,
      finalCodAmount: 500000,
      feePayer: FeePayer.SENDER,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.UNPAID,
    },
    create: {
      orderId: order4.id,
      finalShippingFee: 55000,
      finalInsuranceFee: 3000,
      finalCodAmount: 500000,
      feePayer: FeePayer.SENDER,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  // -------------------------------------------------------------
  // ĐƠN 5: ORD-CASE5-0005 (Tổng Kho Miền 4 Đà Nẵng ➔ Bưu cục Hà Đông, Hà Nội | AT_HUB trong Tote Đà Nẵng)
  // -------------------------------------------------------------
  let order5: any = null;
  let pkg5: any = null;
  if (scRegion4Fac && haDongFac) {
    const zoneNorth = scRegion4Fac.facilityZones.find(z => z.zoneCode === 'ZONE-OUTBOUND-NORTH' || z.zoneCode === 'ZONE-S-NORTH-DISPATCH') || scRegion4Fac.facilityZones[0];

    order5 = await prisma.order.upsert({
      where: { orderCode: 'ORD-CASE5-0005' },
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
        orderCode: 'ORD-CASE5-0005',
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

    pkg5 = await prisma.package.upsert({
      where: { packageCode: 'ORD-CASE5-0005-PKG-01' },
      update: {
        orderId: order5.id,
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
        packageCode: 'ORD-CASE5-0005-PKG-01',
        orderId: order5.id,
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
      where: { orderId: order5.id },
      update: {
        finalShippingFee: 35000,
        finalInsuranceFee: 3000,
        finalCodAmount: 500000,
        feePayer: FeePayer.SENDER,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.UNPAID,
      },
      create: {
        orderId: order5.id,
        finalShippingFee: 35000,
        finalInsuranceFee: 3000,
        finalCodAmount: 500000,
        feePayer: FeePayer.SENDER,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.UNPAID,
      },
    });

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

  // 4. Lịch sử trạng thái chuẩn chỉ cho Case 5
  const staffTangNhonPhu = await prisma.user.findUnique({
    where: { username: 'stf_tangnhonphu_1' },
  });

  const case5Orders = [order1, order2, order3, order4, order5].filter(Boolean);
  const case5OrderIds = case5Orders.map(o => o.id);

  await prisma.orderStatusHistory.deleteMany({
    where: { orderId: { in: case5OrderIds } },
  });

  for (const o of case5Orders) {
    if (o.orderCode === 'ORD-CASE5-0001') {
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
    } else if (o.orderCode === 'ORD-CASE5-0005') {
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

  // 5. Warehouse Scans liên kết kiện hàng vào Sọt niêm phong
  const adminUser = await prisma.user.findFirst();
  const scannedUserId = staffTangNhonPhu?.id || adminUser?.id || '00000000-0000-0000-0000-000000000000';

  await prisma.warehouseScan.deleteMany({
    where: {
      packageId: { in: [pkg1?.id, pkg2?.id, pkg3?.id, pkg4?.id, pkg5?.id].filter(Boolean) as string[] },
    },
  });

  if (tote1 && pkg2) {
    await prisma.warehouseScan.create({
      data: {
        facilityId: tote1.facilityId,
        toteBagId: tote1.id,
        packageId: pkg2.id,
        scannedBy: scannedUserId,
      },
    });
    console.log(`  + Sọt 1 [${tote1Code}] chứa kiện: ${pkg2.packageCode}`);
  }

  if (tote2 && pkg3 && pkg4) {
    await prisma.warehouseScan.createMany({
      data: [
        {
          facilityId: tote2.facilityId,
          toteBagId: tote2.id,
          packageId: pkg3.id,
          scannedBy: scannedUserId,
        },
        {
          facilityId: tote2.facilityId,
          toteBagId: tote2.id,
          packageId: pkg4.id,
          scannedBy: scannedUserId,
        },
      ],
    });
    console.log(`  + Sọt 2 [${tote2Code}] chứa 2 kiện: ${pkg3.packageCode} & ${pkg4.packageCode}`);
  }

  if (toteSc && pkg5) {
    await prisma.warehouseScan.create({
      data: {
        facilityId: toteSc.facilityId,
        toteBagId: toteSc.id,
        packageId: pkg5.id,
        scannedBy: scannedUserId,
      },
    });
    console.log(`  + Sọt 3 [${toteScNorthCode}] chứa kiện: ${pkg5.packageCode}`);
  }

  console.log('✅ Đã nạp thành công 5 đơn hàng Case 5 hoàn toàn độc lập!');
}

seedCase5TestOrders()
  .catch((e) => {
    console.error('❌ Lỗi khi nạp đơn Case 5:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
