import { DBSCANService } from '../services/routing/dbscan.service';
import { KMeansService } from '../services/routing/kmeans.service';
import { VRPService } from '../services/routing/vrp.service';
import { AssignmentService } from '../services/routing/assignment.service';
import { Order, OrderStatus, Staff, DriverLocation, Vehicle, DriverVehicleAssignment } from '@prisma/client';

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m : ${testName} ${detail ? `(${detail})` : ''}`);
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m : ${testName} ${detail ? `(${detail})` : ''}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
}

// 10 Đơn hàng thực tế của Case 2 (Khu vực Thủ Đức / Tăng Nhơn Phú ➔ Linh Trung, TP.HCM)
const case2RawData = [
  // 🏬 Nhóm 1: Kho PTIT Man Thiện (4 đơn)
  { code: 'ORD-CASE2-0001', pickupLat: 10.84802, pickupLng: 106.786677, delLat: 10.8585, delLng: 106.7752, weight: 0.8, volume: 0.003, desc: 'Mỹ phẩm Innisfree' },
  { code: 'ORD-CASE2-0002', pickupLat: 10.84802, pickupLng: 106.786677, delLat: 10.8612, delLng: 106.7780, weight: 0.5, volume: 0.002, desc: 'Tai nghe Bluetooth Sony' },
  { code: 'ORD-CASE2-0003', pickupLat: 10.84802, pickupLng: 106.786677, delLat: 10.8550, delLng: 106.7690, weight: 1.2, volume: 0.005, desc: 'Giày thể thao sneaker' },
  { code: 'ORD-CASE2-0004', pickupLat: 10.84802, pickupLng: 106.786677, delLat: 10.8640, delLng: 106.7810, weight: 0.3, volume: 0.001, desc: 'Đồng hồ thông minh Smartwatch' },
  // 🏬 Nhóm 2: Kho Đình Phong Phú (3 đơn)
  { code: 'ORD-CASE2-0005', pickupLat: 10.83458, pickupLng: 106.782749, delLat: 10.8590, delLng: 106.7730, weight: 2.5, volume: 0.010, desc: 'Nồi chiên không dầu Lock&Lock' },
  { code: 'ORD-CASE2-0006', pickupLat: 10.83458, pickupLng: 106.782749, delLat: 10.8625, delLng: 106.7765, weight: 0.4, volume: 0.002, desc: 'Váy đầm thời trang công sở' },
  { code: 'ORD-CASE2-0007', pickupLat: 10.83458, pickupLng: 106.782749, delLat: 10.8565, delLng: 106.7715, weight: 1.8, volume: 0.006, desc: 'Bộ ấm chén gốm sứ Bát Tràng' },
  // 🏬 Nhóm 3: Kho Đường D1 (3 đơn)
  { code: 'ORD-CASE2-0008', pickupLat: 10.85337, pickupLng: 106.796179, delLat: 10.8605, delLng: 106.7795, weight: 0.9, volume: 0.003, desc: 'Chuột không dây Logitech' },
  { code: 'ORD-CASE2-0009', pickupLat: 10.85337, pickupLng: 106.796179, delLat: 10.8660, delLng: 106.7840, weight: 1.5, volume: 0.005, desc: 'Bàn phím cơ DareU' },
  { code: 'ORD-CASE2-0010', pickupLat: 10.85337, pickupLng: 106.796179, delLat: 10.8578, delLng: 106.7745, weight: 3.2, volume: 0.012, desc: 'Bộ nồi inox 3 đáy Sunhouse' },
];

function buildCase2Orders(status: OrderStatus = OrderStatus.READY_FOR_PICKUP): Order[] {
  return case2RawData.map((d, idx) => ({
    id: `ord-c2-${idx + 1}`,
    customerId: 'cust-c2',
    orderCode: d.code,
    status,
    serviceId: 'srv-standard',
    scheduledPickupAt: new Date(),
    pickupAddressId: `addr-p-${idx}`,
    pickupAddressText: `Kho xuất phát ${d.code}`,
    pickupLatitude: d.pickupLat,
    pickupLongitude: d.pickupLng,
    deliveryAddressId: `addr-d-${idx}`,
    receiverName: `Khách nhận ${d.code}`,
    receiverPhone: '0912111000',
    deliveryAddressText: `Điểm giao ${d.code}`,
    deliveryLatitude: d.delLat,
    deliveryLongitude: d.delLng,
    estimatedShippingFee: 22000 as any,
    estimatedInsuranceFee: 0 as any,
    estimatedCodAmount: 350000 as any,
    estimatedDistance: 4.5 as any,
    estimatedDuration: 15,
    estimatedDeliveryDate: new Date(Date.now() + 86400000),
    pickupType: 'PICKUP',
    originFacilityId: 'fac-tang-nhon-phu',
    destinationFacilityId: 'fac-linh-trung',
    createdBy: 'usr-c2',
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    package: {
      id: `pkg-c2-${idx + 1}`,
      orderId: `ord-c2-${idx + 1}`,
      packageCode: `PKG-${d.code}`,
      description: d.desc,
      declaredValue: 500000 as any,
      weight: d.weight as any,
      length: 20 as any,
      width: 15 as any,
      height: 10 as any,
      volume: d.volume as any,
      isFragile: false,
      temperatureRequirement: null,
      requiredVehicleTypeId: null,
      currentFacilityId: 'fac-tang-nhon-phu',
      currentZoneId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any,
  } as any));
}

function buildCase2Drivers(): (Staff & {
  location: DriverLocation;
  assignments: (DriverVehicleAssignment & { vehicle: Vehicle })[];
})[] {
  // 2 Tài xế bưu cục Tăng Nhơn Phú
  return [
    {
      id: 'drv-c2-01',
      userId: 'usr-drv-01',
      employeeCode: 'DRV-TNP-01',
      fullName: 'Nguyễn Văn Tài (Tăng Nhơn Phú)',
      phone: '0901111222',
      email: 'tai.driver@smartlog.com',
      citizenId: '079090001111',
      position: 'DRIVER',
      assignedFacilityId: 'fac-tang-nhon-phu',
      driverLicenseNumber: 'GPLX-TNP-01',
      driverLicenseClass: 'A1',
      employmentStatus: 'ACTIVE',
      hireDate: new Date('2025-01-01'),
      createdAt: new Date(),
      location: {
        driverId: 'drv-c2-01',
        latitude: 10.8480,
        longitude: 106.7865, // Đang đứng gần Kho PTIT Man Thiện
        recordedAt: new Date(),
      },
      assignments: [
        {
          id: 'dva-c2-01',
          driverId: 'drv-c2-01',
          vehicleId: 'veh-c2-01',
          assignedFrom: new Date(),
          assignedTo: null,
          isActive: true,
          vehicle: {
            id: 'veh-c2-01',
            vehicleCode: 'XE-BIKE-TNP-01',
            plateNumber: '59-X1 123.45',
            vehicleTypeId: 'vtype-bike',
            assignedFacilityId: 'fac-tang-nhon-phu',
            maxWeight: 50.0 as any,
            maxVolume: 0.25 as any,
            maxLength: 0.8 as any,
            isRefrigerated: false,
            operatingStatus: 'ACTIVE',
            createdAt: new Date(),
          },
        },
      ],
    },
    {
      id: 'drv-c2-02',
      userId: 'usr-drv-02',
      employeeCode: 'DRV-TNP-02',
      fullName: 'Lê Hoàng Hưng (Đình Phong Phú)',
      phone: '0902222333',
      email: 'hung.driver@smartlog.com',
      citizenId: '079090002222',
      position: 'DRIVER',
      assignedFacilityId: 'fac-tang-nhon-phu',
      driverLicenseNumber: 'GPLX-TNP-02',
      driverLicenseClass: 'A1',
      employmentStatus: 'ACTIVE',
      hireDate: new Date('2025-01-01'),
      createdAt: new Date(),
      location: {
        driverId: 'drv-c2-02',
        latitude: 10.8350,
        longitude: 106.7830, // Đang đứng gần Kho Đình Phong Phú
        recordedAt: new Date(),
      },
      assignments: [
        {
          id: 'dva-c2-02',
          driverId: 'drv-c2-02',
          vehicleId: 'veh-c2-02',
          assignedFrom: new Date(),
          assignedTo: null,
          isActive: true,
          vehicle: {
            id: 'veh-c2-02',
            vehicleCode: 'XE-BIKE-TNP-02',
            plateNumber: '59-X1 678.90',
            vehicleTypeId: 'vtype-bike',
            assignedFacilityId: 'fac-tang-nhon-phu',
            maxWeight: 50.0 as any,
            maxVolume: 0.25 as any,
            maxLength: 0.8 as any,
            isRefrigerated: false,
            operatingStatus: 'ACTIVE',
            createdAt: new Date(),
          },
        },
      ],
    },
  ];
}

async function runCase2Test() {
  console.log('\n========================================================================================');
  console.log('🧪 KIỂM THỬ TỰ ĐỘNG LÕI AI 3 MODULE VỚI TẬP DỮ LIỆU CASE 2 (10 ĐƠN TĂNG NHƠN PHÚ ➔ LINH TRUNG)');
  console.log('========================================================================================\n');

  const dbscanService = new DBSCANService();
  const kmeansService = new KMeansService();
  const vrpService = new VRPService();
  const assignmentService = new AssignmentService();

  const hubLocation = { lat: 10.84802, lng: 106.786677 }; // Bưu cục xuất phát Tăng Nhơn Phú
  const orders = buildCase2Orders(OrderStatus.READY_FOR_PICKUP);
  const drivers = buildCase2Drivers();

  console.log(`📦 Đã nạp ${orders.length} đơn hàng Case 2 và ${drivers.length} tài xế trực chiến.`);

  // -------------------------------------------------------------------------
  // 1. MODULE 1: GOM CỤM ĐỊA LÝ (DBSCAN + K-MEANS)
  // -------------------------------------------------------------------------
  console.log('\n--- 1. KIỂM THỬ MODULE 1: GOM CỤM DBSCAN + K-MEANS ---');
  
  // 1.1 DBSCAN phát hiện các cụm kho lấy hàng
  const dbscanRes = dbscanService.clusterOrdersDBSCAN(orders, 2.5, 2);
  assert(dbscanRes.clusters.length >= 1, 'DBSCAN phân tách thành công các khu vực gom hàng', `Số vùng: ${dbscanRes.clusters.length}`);

  // 1.2 Hybrid DBSCAN + K-Means chia đều cho 2 tài xế
  const clusters = kmeansService.clusterOrders(orders, drivers.length);
  assert(clusters.length === 2, 'Hybrid DBSCAN+KMeans phân bổ chính xác thành 2 cụm tuyến cho 2 tài xế', `Số cụm: ${clusters.length}`);
  
  const totalAssignedOrders = clusters.reduce((sum, c) => sum + c.orders.length, 0);
  assert(totalAssignedOrders === 10, 'Toàn bộ 10 đơn hàng Case 2 đều được phân bổ, không đơn nào bị thất thoát', `Tổng đơn: ${totalAssignedOrders}/10`);

  clusters.forEach((c, idx) => {
    console.log(`   📍 Cụm ${idx + 1}: ${c.orders.length} đơn | Tải trọng: ${c.totalWeightKg?.toFixed(1)}kg | Thể tích: ${c.totalVolumeM3?.toFixed(3)}m³ | Tâm cụm: (${c.centroid.lat.toFixed(4)}, ${c.centroid.lng.toFixed(4)})`);
  });

  // -------------------------------------------------------------------------
  // 2. MODULE 2: TỐI ƯU HÓA CHUỖI ĐIỂM DỪNG (GENETIC ALGORITHM)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. KIỂM THỬ MODULE 2: TỐI ƯU LỘ TRÌNH BẰNG GENETIC ALGORITHM ---');

  const optimizedClusters = await Promise.all(
    clusters.map(async (c, idx) => {
      // Tính cự ly chưa tối ưu (FIFO)
      let rawDist = 0;
      let prev = hubLocation;
      for (const o of c.orders) {
        const coords = { lat: o.pickupLatitude!, lng: o.pickupLongitude! };
        rawDist += vrpService['haversineDistance'](prev.lat, prev.lng, coords.lat, coords.lng);
        prev = coords;
      }
      rawDist += vrpService['haversineDistance'](prev.lat, prev.lng, hubLocation.lat, hubLocation.lng);

      // Chạy Genetic Algorithm
      const sortedOrders = await vrpService.optimizeRouteStops(c.orders, hubLocation);

      // Tính cự ly sau tối ưu
      let optDist = 0;
      prev = hubLocation;
      for (const o of sortedOrders) {
        const coords = { lat: o.pickupLatitude!, lng: o.pickupLongitude! };
        optDist += vrpService['haversineDistance'](prev.lat, prev.lng, coords.lat, coords.lng);
        prev = coords;
      }
      optDist += vrpService['haversineDistance'](prev.lat, prev.lng, hubLocation.lat, hubLocation.lng);

      const savedPct = ((rawDist - optDist) / rawDist) * 100;
      assert(optDist <= rawDist, `Cụm ${idx + 1}: Genetic Algorithm tối ưu hóa quãng đường thành công`, `Chưa tối ưu: ${rawDist.toFixed(2)}km -> Sau GA: ${optDist.toFixed(2)}km (Tiết kiệm ${savedPct.toFixed(1)}%)`);
      assert(sortedOrders.length === c.orders.length, `Cụm ${idx + 1}: Bảo toàn 100% số lượng đơn (${sortedOrders.length}/${c.orders.length})`);

      return {
        ...c,
        orders: sortedOrders,
      };
    })
  );

  // -------------------------------------------------------------------------
  // 3. MODULE 3: PHÂN CÔNG TÀI XẾ (HUNGARIAN MATCHING & DISPATCHING)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. KIỂM THỬ MODULE 3: PHÂN CÔNG TÀI XẾ BẰNG HUNGARIAN ALGORITHM ---');

  const assignments = await assignmentService.assignDriversToClusters(drivers, optimizedClusters, hubLocation);

  assert(assignments.length === 2, 'Hungarian Algorithm ghép chính xác 2 tài xế cho 2 tuyến', `Số ca gán: ${assignments.length}`);
  
  assignments.forEach((asg) => {
    const drv = drivers.find(d => d.id === asg.driverId);
    const cl = optimizedClusters[asg.clusterId];
    console.log(`   🛵 Tài xế: \x1b[36m${drv?.fullName}\x1b[0m ➔ Nhận \x1b[33mCụm Tuyến ${asg.clusterId + 1}\x1b[0m (${cl.orders.length} điểm dừng) | Chi phí cự ly tiếp cận: ${asg.cost.toFixed(2)}km`);
  });

  const uniqueClusters = new Set(assignments.map(a => a.clusterId));
  assert(uniqueClusters.size === 2, 'Không có hiện tượng tranh chấp hoặc trùng lặp tuyến giữa các tài xế');

  console.log('\n========================================================================================');
  console.log('🎉 KẾT QUẢ: 100% CÁC BÀI KIỂM THỬ TỰ ĐỘNG VỚI DATA CASE 2 ĐÃ VƯỢT QUA XUẤT SẮC!');
  console.log('========================================================================================\n');
}

runCase2Test().catch((err) => {
  console.error('\n❌ KIỂM THỬ THẤT BẠI:', err);
  process.exit(1);
});
