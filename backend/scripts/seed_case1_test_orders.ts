import { PrismaClient, OrderStatus, PaymentMethod, FeePayer, PickupType, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCase1TestOrder() {
  console.log('🚀 Bắt đầu nạp 1 đơn hàng Case 1 (Nội hạt: Kho 1 Lê Văn Việt ➔ 120 Man Thiện Tăng Nhơn Phú)...');

  const customer = await prisma.customer.findFirst({
    where: { user: { username: 'cust_thuduc_1' } },
  }) || await prisma.customer.findFirst();

  if (!customer) {
    throw new Error('Không tìm thấy tài khoản khách hàng cust_thuduc_1!');
  }

  const service = await prisma.service.findFirst({
    where: { serviceCode: 'STANDARD' },
  }) || await prisma.service.findFirst();

  const tangNhonPhuFac = await prisma.facility.findUnique({
    where: { facilityCode: 'FAC-TD-TANGNHONPHU' },
  });

  if (!tangNhonPhuFac) {
    throw new Error('Không tìm thấy Bưu cục Tăng Nhơn Phú!');
  }

  // Sender: Kho 1 (29 Đường Lê Văn Việt, Phường Tăng Nhơn Phú)
  const pickupLat = 10.845849;
  const pickupLng = 106.7874619;
  const pickupAddr = '29 Đường Lê Văn Việt, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh';
  const senderName = 'Kho 1';
  const senderPhone = '0903000001';

  // Receiver: 120 Man Thiện (cùng Phường Tăng Nhơn Phú)
  const item = {
    code: 'ORD-CASE1-0001',
    receiverName: 'Nguyễn Thị Thu Hà',
    receiverPhone: '0912345678',
    deliveryAddressText: '120 Man Thiện, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh',
    lat: 10.8490,
    lng: 106.7875,
    pkgDesc: 'Hộp trà thảo mộc Đông Trùng Hạ Thảo cao cấp',
    weight: 0.5,
    cod: 250000,
    fee: 18000,
  };

  const baseTime = new Date();

  const order = await prisma.order.upsert({
    where: { orderCode: item.code },
    update: {
      status: OrderStatus.READY_FOR_PICKUP,
      originFacilityId: tangNhonPhuFac.id,
      destinationFacilityId: tangNhonPhuFac.id, // Cùng bưu cục Tăng Nhơn Phú
      pickupAddressText: pickupAddr,
      pickupLatitude: pickupLat,
      pickupLongitude: pickupLng,
      receiverName: item.receiverName,
      receiverPhone: item.receiverPhone,
      deliveryAddressText: item.deliveryAddressText,
      deliveryLatitude: item.lat,
      deliveryLongitude: item.lng,
      estimatedShippingFee: item.fee,
      estimatedCodAmount: item.cod,
      pickupType: PickupType.PICKUP,
    },
    create: {
      orderCode: item.code,
      customerId: customer.id,
      serviceId: service?.id || '',
      status: OrderStatus.READY_FOR_PICKUP,
      originFacilityId: tangNhonPhuFac.id,
      destinationFacilityId: tangNhonPhuFac.id,
      pickupAddressText: pickupAddr,
      pickupLatitude: pickupLat,
      pickupLongitude: pickupLng,
      receiverName: item.receiverName,
      receiverPhone: item.receiverPhone,
      deliveryAddressText: item.deliveryAddressText,
      deliveryLatitude: item.lat,
      deliveryLongitude: item.lng,
      estimatedShippingFee: item.fee,
      estimatedInsuranceFee: 2000,
      estimatedCodAmount: item.cod,
      pickupType: PickupType.PICKUP,
    },
  });

  const pkgCode = `${item.code}-PKG-01`;
  await prisma.package.upsert({
    where: { packageCode: pkgCode },
    update: {
      orderId: order.id,
      currentFacilityId: tangNhonPhuFac.id,
      weight: item.weight,
      length: 18,
      width: 12,
      height: 8,
      volume: 0.002,
    },
    create: {
      packageCode: pkgCode,
      orderId: order.id,
      currentFacilityId: tangNhonPhuFac.id,
      weight: item.weight,
      length: 18,
      width: 12,
      height: 8,
      volume: 0.002,
    },
  });

  // Create / Update Payment info
  await prisma.orderPayment.upsert({
    where: { orderId: order.id },
    update: {
      finalShippingFee: item.fee,
      finalInsuranceFee: 2000,
      finalCodAmount: item.cod,
      feePayer: FeePayer.SENDER,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.UNPAID,
    },
    create: {
      orderId: order.id,
      finalShippingFee: item.fee,
      finalInsuranceFee: 2000,
      finalCodAmount: item.cod,
      feePayer: FeePayer.SENDER,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  // Status History
  await prisma.orderStatusHistory.deleteMany({
    where: { orderId: order.id },
  });

  await prisma.orderStatusHistory.createMany({
    data: [
      {
        orderId: order.id,
        status: OrderStatus.CREATED,
        reason: 'Đơn hàng khởi tạo từ Kho 1 (29 Đường Lê Văn Việt, Phường Tăng Nhơn Phú)',
        createdAt: new Date(baseTime.getTime() - 1000 * 60 * 20),
      },
      {
        orderId: order.id,
        status: OrderStatus.READY_FOR_PICKUP,
        reason: 'Đang chờ Shipper bưu cục Tăng Nhơn Phú tiếp nhận lấy hàng',
        createdAt: new Date(baseTime.getTime() - 1000 * 60 * 10),
      },
    ],
  });

  console.log(`✅ Đã tạo thành công 1 đơn hàng Case 1 [${item.code}] ➔ ${item.receiverName} (${item.deliveryAddressText})`);
}

seedCase1TestOrder()
  .catch((e) => {
    console.error('❌ Lỗi khi nạp đơn Case 1:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
