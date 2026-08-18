import { PrismaClient, OrderStatus, PaymentMethod, FeePayer, PickupType, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCase3TestOrder() {
  console.log('🚀 Bắt đầu nạp 1 đơn hàng Case 3 (Liên tỉnh: 97 Man Thiện Tăng Nhơn Phú ➔ Bưu cục Dương Minh Châu, Tây Ninh)...');

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

  const tayNinhFac = await prisma.facility.findUnique({
    where: { facilityCode: 'FAC-WM-TAYNINH' },
  });

  if (!tangNhonPhuFac || !tayNinhFac) {
    throw new Error('Không tìm thấy Bưu cục Tăng Nhơn Phú hoặc Bưu cục Dương Minh Châu - Tây Ninh!');
  }

  // Sender: Kho mặc định PTIT HCM 1 (97 Man Thiện)
  const pickupLat = 10.84802;
  const pickupLng = 106.786677;
  const pickupAddr = '97 Man Thiện, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh';
  const senderName = 'PTIT HCM 1';
  const senderPhone = '0987654321';

  // Receiver: Thuộc Bưu cục Dương Minh Châu - Tây Ninh
  const item = {
    code: 'ORD-CASE3-0001',
    receiverName: 'Trần Quốc Toản',
    receiverPhone: '0933112233',
    deliveryAddressText: 'Số 88 Đường Nguyễn Chí Thanh, Xã Dương Minh Châu, Tỉnh Tây Ninh',
    lat: 11.3520,
    lng: 106.1820,
    pkgDesc: 'Thùng đặc sản Bánh tráng phơi sương & Muối tôm Tây Ninh',
    weight: 1.5,
    cod: 320000,
    fee: 45000,
  };

  const baseTime = new Date();

  const order = await prisma.order.upsert({
    where: { orderCode: item.code },
    update: {
      status: OrderStatus.READY_FOR_PICKUP,
      originFacilityId: tangNhonPhuFac.id,
      destinationFacilityId: tayNinhFac.id,
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
      destinationFacilityId: tayNinhFac.id,
      pickupAddressText: pickupAddr,
      pickupLatitude: pickupLat,
      pickupLongitude: pickupLng,
      receiverName: item.receiverName,
      receiverPhone: item.receiverPhone,
      deliveryAddressText: item.deliveryAddressText,
      deliveryLatitude: item.lat,
      deliveryLongitude: item.lng,
      estimatedShippingFee: item.fee,
      estimatedInsuranceFee: 3000,
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
      length: 30,
      width: 20,
      height: 15,
      volume: 0.009,
    },
    create: {
      packageCode: pkgCode,
      orderId: order.id,
      currentFacilityId: tangNhonPhuFac.id,
      weight: item.weight,
      length: 30,
      width: 20,
      height: 15,
      volume: 0.009,
    },
  });

  // Create / Update Payment info
  await prisma.orderPayment.upsert({
    where: { orderId: order.id },
    update: {
      finalShippingFee: item.fee,
      finalInsuranceFee: 3000,
      finalCodAmount: item.cod,
      feePayer: FeePayer.SENDER,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.UNPAID,
    },
    create: {
      orderId: order.id,
      finalShippingFee: item.fee,
      finalInsuranceFee: 3000,
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
        reason: 'Đơn hàng khởi tạo từ kho mặc định PTIT HCM 1 (97 Man Thiện)',
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

  console.log(`✅ Đã tạo thành công 1 đơn hàng Case 3 [${item.code}] ➔ ${item.receiverName} (${item.deliveryAddressText})`);
}

seedCase3TestOrder()
  .catch((e) => {
    console.error('❌ Lỗi khi nạp đơn Case 3:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
