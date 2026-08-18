import { PrismaClient, OrderStatus, PaymentMethod, FeePayer, PickupType, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCase2TestOrders() {
  console.log('🚀 Bắt đầu nạp 10 đơn hàng Case 2 (Lấy hàng tại 3 Kho Tăng Nhơn Phú ➔ Giao 10 điểm Linh Trung)...');

  const customer = await prisma.customer.findFirst({
    where: { user: { username: 'cust_thuduc_1' } },
  }) || await prisma.customer.findFirst();

  if (!customer) {
    throw new Error('Không tìm thấy tài khoản khách hàng để tạo đơn!');
  }

  const service = await prisma.service.findFirst({
    where: { serviceCode: 'STANDARD' },
  }) || await prisma.service.findFirst();

  const tangNhonPhuFac = await prisma.facility.findUnique({
    where: { facilityCode: 'FAC-TD-TANGNHONPHU' },
  });

  const linhTrungFac = await prisma.facility.findUnique({
    where: { facilityCode: 'FAC-TD-LINHTRUNG' },
  });

  if (!tangNhonPhuFac || !linhTrungFac) {
    throw new Error('Không tìm thấy Bưu cục Tăng Nhơn Phú hoặc Linh Trung!');
  }

  // 3 Điểm lấy hàng tại Tăng Nhơn Phú
  const warehousePtit = {
    name: 'PTIT HCM 1',
    phone: '0987654321',
    address: '97 Man Thiện, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh',
    lat: 10.84802,
    lng: 106.786677,
  };

  const warehouseKho2 = {
    name: 'kho 2',
    phone: '0903000001',
    address: 'số 185 Đình Phong Phú, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh',
    lat: 10.8345859,
    lng: 106.7827499,
  };

  const warehouseKho3 = {
    name: 'Kho 3',
    phone: '0903000001',
    address: '4 Đường D1, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh',
    lat: 10.8533749,
    lng: 106.7961793,
  };

  const orders = [
    // 🏬 Nhóm 1: Lấy hàng tại KHO PTIT HCM 1 (97 Man Thiện - 4 đơn)
    {
      code: 'ORD-CASE2-0001',
      pickup: warehousePtit,
      receiverName: 'Nguyễn Thị Mai Anh',
      receiverPhone: '0912111001',
      deliveryAddressText: '120 Đường Linh Trung, Phường Linh Xuân, Thành phố Hồ Chí Minh',
      lat: 10.8585,
      lng: 106.7752,
      pkgDesc: 'Bộ mỹ phẩm dưỡng da Hàn Quốc Innisfree',
      weight: 0.8,
      cod: 350000,
      fee: 22000,
    },
    {
      code: 'ORD-CASE2-0002',
      pickup: warehousePtit,
      receiverName: 'Trần Đình Trọng',
      receiverPhone: '0912111002',
      deliveryAddressText: '45 Đường Lê Văn Chí, Phường Linh Xuân, Thành phố Hồ Chí Minh',
      lat: 10.8612,
      lng: 106.7780,
      pkgDesc: 'Tai nghe Bluetooth chụp tai chống ồn Sony',
      weight: 0.5,
      cod: 450000,
      fee: 22000,
    },
    {
      code: 'ORD-CASE2-0003',
      pickup: warehousePtit,
      receiverName: 'Lê Hoàng Nam',
      receiverPhone: '0912111003',
      deliveryAddressText: '78 Đường Hoàng Diệu 2, Phường Linh Xuân, Thành phố Hồ Chí Minh',
      lat: 10.8550,
      lng: 106.7690,
      pkgDesc: 'Giày thể thao sneaker nam cao cấp size 42',
      weight: 1.2,
      cod: 620000,
      fee: 28000,
    },
    {
      code: 'ORD-CASE2-0004',
      pickup: warehousePtit,
      receiverName: 'Phạm Ngọc Hân',
      receiverPhone: '0912111004',
      deliveryAddressText: '15 Đường Số 5, Khu phố 2, Phường Linh Xuân, Thành phố Hồ Chí Minh',
      lat: 10.8640,
      lng: 106.7730,
      pkgDesc: 'Set đầm xòe công sở thiết kế hoa nhí',
      weight: 0.6,
      cod: 280000,
      fee: 22000,
    },

    // 🏬 Nhóm 2: Lấy hàng tại KHO 2 (số 185 Đình Phong Phú - 3 đơn)
    {
      code: 'ORD-CASE2-0005',
      pickup: warehouseKho2,
      receiverName: 'Vũ Minh Tuấn',
      receiverPhone: '0912111005',
      deliveryAddressText: '210 Quốc Lộ 1K, Phường Linh Xuân, Thành phố Hồ Chí Minh',
      lat: 10.8690,
      lng: 106.7795,
      pkgDesc: 'Bàn phím cơ Bluetooth RGB Gaming 87 phím',
      weight: 1.5,
      cod: 890000,
      fee: 32000,
    },
    {
      code: 'ORD-CASE2-0006',
      pickup: warehouseKho2,
      receiverName: 'Đặng Thu Trang',
      receiverPhone: '0912111006',
      deliveryAddressText: '32 Đường Số 7, Linh Trung, Phường Linh Xuân, Thành phố Hồ Chí Minh',
      lat: 10.8605,
      lng: 106.7715,
      pkgDesc: 'Nồi chiên không dầu điện tử Tefal 5.5L',
      weight: 3.5,
      cod: 1150000,
      fee: 55000,
    },
    {
      code: 'ORD-CASE2-0007',
      pickup: warehouseKho2,
      receiverName: 'Hoàng Quốc Việt',
      receiverPhone: '0912111007',
      deliveryAddressText: '88 Đường Kha Vạn Cân, Phường Linh Xuân, Thành phố Hồ Chí Minh',
      lat: 10.8525,
      lng: 106.7645,
      pkgDesc: 'Bộ dụng cụ cơ khí sửa chữa đa năng 108 món',
      weight: 2.2,
      cod: 380000,
      fee: 40000,
    },

    // 🏬 Nhóm 3: Lấy hàng tại KHO 3 (4 Đường D1 - 3 đơn)
    {
      code: 'ORD-CASE2-0008',
      pickup: warehouseKho3,
      receiverName: 'Bùi Thị Thu Thảo',
      receiverPhone: '0912111008',
      deliveryAddressText: '102 Đường Linh Trung, Phường Linh Xuân, Thành phố Hồ Chí Minh',
      lat: 10.8575,
      lng: 106.7740,
      pkgDesc: 'Đèn bàn LED bảo vệ thị lực có sạc không dây',
      weight: 1.1,
      cod: 520000,
      fee: 28000,
    },
    {
      code: 'ORD-CASE2-0009',
      pickup: warehouseKho3,
      receiverName: 'Ngô Thành Đạt',
      receiverPhone: '0912111009',
      deliveryAddressText: '15 Đường Võ Văn Ngân, Phường Linh Xuân, Thành phố Hồ Chí Minh',
      lat: 10.8510,
      lng: 106.7620,
      pkgDesc: 'Áo khoác gió thể thao 2 lớp chống nước',
      weight: 0.7,
      cod: 490000,
      fee: 22000,
    },
    {
      code: 'ORD-CASE2-0010',
      pickup: warehouseKho3,
      receiverName: 'Dương Kim Ngân',
      receiverPhone: '0912111010',
      deliveryAddressText: '60 Đường Chương Dương, Phường Linh Xuân, Thành phố Hồ Chí Minh',
      lat: 10.8540,
      lng: 106.7660,
      pkgDesc: 'Bình giữ nhiệt Lock&Lock dung tích 800ml',
      weight: 0.5,
      cod: 230000,
      fee: 22000,
    },
  ];

  const baseTime = new Date();

  for (const item of orders) {
    const order = await prisma.order.upsert({
      where: { orderCode: item.code },
      update: {
        status: OrderStatus.READY_FOR_PICKUP,
        originFacilityId: tangNhonPhuFac.id,
        destinationFacilityId: linhTrungFac.id,
        pickupAddressText: item.pickup.address,
        pickupLatitude: item.pickup.lat,
        pickupLongitude: item.pickup.lng,
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
        destinationFacilityId: linhTrungFac.id,
        pickupAddressText: item.pickup.address,
        pickupLatitude: item.pickup.lat,
        pickupLongitude: item.pickup.lng,
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
        length: 20,
        width: 15,
        height: 10,
        volume: 0.003,
      },
      create: {
        packageCode: pkgCode,
        orderId: order.id,
        currentFacilityId: tangNhonPhuFac.id,
        weight: item.weight,
        length: 20,
        width: 15,
        height: 10,
        volume: 0.003,
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
          reason: `Đơn hàng khởi tạo từ ${item.pickup.name} (${item.pickup.address})`,
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

    console.log(`  + Đã tạo đơn [${item.code}] | Lấy tại: ${item.pickup.name} ➔ Giao cho: ${item.receiverName}`);
  }

  console.log('✅ Đã nạp thành công 10 đơn hàng Case 2 với 3 điểm lấy hàng khác nhau!');
}

seedCase2TestOrders()
  .catch((e) => {
    console.error('❌ Lỗi khi nạp đơn Case 2:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
