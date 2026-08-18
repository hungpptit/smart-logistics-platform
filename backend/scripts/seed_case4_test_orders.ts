import { PrismaClient, OrderStatus, PaymentMethod, FeePayer, PickupType, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCase4TestOrder() {
  console.log('🚀 Bắt đầu nạp 1 đơn hàng Case 4 (Liên miền: 97 Man Thiện TP.HCM ➔ PTIT Hà Đông, Hà Nội)...');

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

  const haDongFac = await prisma.facility.findUnique({
    where: { facilityCode: 'FAC-WM-HADONG' },
  });

  if (!tangNhonPhuFac || !haDongFac) {
    throw new Error('Không tìm thấy Bưu cục Tăng Nhơn Phú hoặc Bưu cục Hà Đông - TP. Hà Nội!');
  }

  // Sender: Kho mặc định PTIT HCM 1 (97 Man Thiện, Phường Tăng Nhơn Phú)
  const pickupLat = 10.84802;
  const pickupLng = 106.786677;
  const pickupAddr = '97 Man Thiện, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh';
  const senderName = 'PTIT HCM 1';
  const senderPhone = '0987654321';

  // Receiver: Học viện Công nghệ Bưu chính Viễn thông Hà Đông
  const item = {
    code: 'ORD-CASE4-0001',
    receiverName: 'Phạm Tuấn Hưng',
    receiverPhone: '0988112233',
    deliveryAddressText: 'Học viện Công nghệ Bưu chính Viễn thông, Km 10 Trần Phú, Mộ Lao, Phường Hà Đông, Thành phố Hà Nội',
    lat: 20.9780,
    lng: 105.7830,
    pkgDesc: 'Kiện tài liệu & quà lưu niệm Hội nghị PTIT Bắc - Nam',
    weight: 1.0,
    cod: 0,
    fee: 55000,
  };

  const baseTime = new Date();

  const order = await prisma.order.upsert({
    where: { orderCode: item.code },
    update: {
      status: OrderStatus.READY_FOR_PICKUP,
      originFacilityId: tangNhonPhuFac.id,
      destinationFacilityId: haDongFac.id,
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
      destinationFacilityId: haDongFac.id,
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
      length: 30,
      width: 20,
      height: 10,
      volume: 0.006,
    },
    create: {
      packageCode: pkgCode,
      orderId: order.id,
      currentFacilityId: tangNhonPhuFac.id,
      weight: item.weight,
      length: 30,
      width: 20,
      height: 10,
      volume: 0.006,
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
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PAID,
    },
    create: {
      orderId: order.id,
      finalShippingFee: item.fee,
      finalInsuranceFee: 2000,
      finalCodAmount: item.cod,
      feePayer: FeePayer.SENDER,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PAID,
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

  console.log(`✅ Đã tạo thành công 1 đơn hàng Case 4 [${item.code}] ➔ ${item.receiverName} (${item.deliveryAddressText})`);
}

seedCase4TestOrder()
  .catch((e) => {
    console.error('❌ Lỗi khi nạp đơn Case 4:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
