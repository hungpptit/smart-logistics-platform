import { DBSCANService } from '../services/routing/dbscan.service';
import { KMeansService } from '../services/routing/kmeans.service';
import { VRPService } from '../services/routing/vrp.service';
import { AssignmentService } from '../services/routing/assignment.service';
import { Order, OrderStatus, Staff, DriverLocation, Vehicle, DriverVehicleAssignment } from '@prisma/client';

// Simple Assertion Helper
function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m : ${testName} ${detail ? `(${detail})` : ''}`);
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m : ${testName} ${detail ? `(${detail})` : ''}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
}

// Mock Order Generator
function createMockOrder(
  id: string,
  code: string,
  lat: number,
  lng: number,
  weight: number = 1.5,
  volume: number = 0.005,
  status: OrderStatus = OrderStatus.READY_FOR_PICKUP,
  deadline?: Date
): Order {
  return {
    id,
    customerId: 'cust-mock',
    orderCode: code,
    status,
    serviceId: 'srv-mock',
    scheduledPickupAt: new Date(),
    pickupAddressId: 'addr-pickup',
    pickupAddressText: `Pickup address for ${code}`,
    pickupLatitude: lat,
    pickupLongitude: lng,
    deliveryAddressId: 'addr-delivery',
    receiverName: `Receiver ${code}`,
    receiverPhone: '0901234567',
    deliveryAddressText: `Delivery address for ${code}`,
    deliveryLatitude: lat + 0.005,
    deliveryLongitude: lng + 0.005,
    estimatedShippingFee: 25000 as any,
    estimatedInsuranceFee: 0 as any,
    estimatedCodAmount: 200000 as any,
    estimatedDistance: 5.0 as any,
    estimatedDuration: 15,
    estimatedDeliveryDate: deadline || new Date(Date.now() + 86400000),
    pickupType: 'PICKUP',
    originFacilityId: 'fac-origin',
    destinationFacilityId: 'fac-dest',
    createdBy: 'usr-admin',
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    package: {
      id: `pkg-${id}`,
      orderId: id,
      packageCode: `PKG-${code}`,
      description: 'Mock item',
      declaredValue: 500000 as any,
      weight: weight as any,
      length: 20 as any,
      width: 15 as any,
      height: 10 as any,
      volume: volume as any,
      isFragile: false,
      temperatureRequirement: null,
      requiredVehicleTypeId: null,
      currentFacilityId: 'fac-origin',
      currentZoneId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any,
  } as any;
}

// Mock Driver Generator
function createMockDriver(
  id: string,
  fullName: string,
  lat: number,
  lng: number,
  maxWeightKg: number = 50.0
): Staff & {
  location: DriverLocation;
  assignments: (DriverVehicleAssignment & { vehicle: Vehicle })[];
} {
  return {
    id,
    userId: `usr-${id}`,
    employeeCode: `DRV-${id}`,
    fullName,
    phone: '0909999888',
    email: `${id}@smartlog.com`,
    citizenId: `07909${id}`,
    position: 'DRIVER',
    assignedFacilityId: 'fac-origin',
    driverLicenseNumber: `GPLX-${id}`,
    driverLicenseClass: 'A1',
    employmentStatus: 'ACTIVE',
    hireDate: new Date('2025-01-01'),
    createdAt: new Date(),
    location: {
      driverId: id,
      latitude: lat,
      longitude: lng,
      recordedAt: new Date(),
    },
    assignments: [
      {
        id: `dva-${id}`,
        driverId: id,
        vehicleId: `veh-${id}`,
        assignedFrom: new Date(),
        assignedTo: null,
        isActive: true,
        vehicle: {
          id: `veh-${id}`,
          vehicleCode: `XE-${id}`,
          plateNumber: `59-A1 ${id}`,
          vehicleTypeId: 'vtype-bike',
          assignedFacilityId: 'fac-origin',
          maxWeight: maxWeightKg as any,
          maxVolume: 0.25 as any,
          maxLength: 0.8 as any,
          isRefrigerated: false,
          operatingStatus: 'ACTIVE',
          createdAt: new Date(),
        },
      },
    ],
  };
}

async function runTestSuite() {
  console.log('\n========================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG LÕI AI 3 MODULE (SMART LOGISTICS PLATFORM)');
  console.log('========================================================================\n');

  const dbscanService = new DBSCANService();
  const kmeansService = new KMeansService();
  const vrpService = new VRPService();
  const assignmentService = new AssignmentService();

  const facilityLocation = { lat: 10.7728, lng: 106.6582 }; // Kho Bưu cục Q10, TP.HCM

  // -----------------------------------------------------------------------------------------
  // TEST SUITE 1: MODULE 1 — PHÂN CỤM ĐỊA LÝ (DBSCAN + K-MEANS)
  // -----------------------------------------------------------------------------------------
  console.log('📦 [TEST SUITE 1] Module 1: Phân cụm địa lý (DBSCAN + K-Means)...');

  // Tạo 2 cụm đơn dày đặc tại Q10 và Q1 + 1 đơn ngoại lai tại Hóc Môn (Noise)
  const ordersDistrict10 = [
    createMockOrder('ord-10-1', 'ORD10_1', 10.7720, 106.6580, 2.0),
    createMockOrder('ord-10-2', 'ORD10_2', 10.7730, 106.6590, 3.0),
    createMockOrder('ord-10-3', 'ORD10_3', 10.7710, 106.6570, 1.5),
  ];

  const ordersDistrict1 = [
    createMockOrder('ord-1-1', 'ORD1_1', 10.7750, 106.7020, 2.5),
    createMockOrder('ord-1-2', 'ORD1_2', 10.7760, 106.7030, 4.0),
    createMockOrder('ord-1-3', 'ORD1_3', 10.7740, 106.7010, 2.0),
  ];

  // Đơn ngoại lai ở Hóc Môn cách xa 18km
  const outlierOrder = createMockOrder('ord-outlier', 'ORD_NOISE', 10.8850, 106.5920, 1.0);

  const testBatch1 = [...ordersDistrict10, ...ordersDistrict1, outlierOrder];

  // 1.1 Kiểm tra DBSCAN thuần
  const dbscanResult = dbscanService.clusterOrdersDBSCAN(testBatch1, 2.0, 2);
  assert(dbscanResult.clusters.length === 2, 'DBSCAN nhận diện chính xác 2 vùng mật độ tự nhiên (Q10 và Q1)', `Số cụm: ${dbscanResult.clusters.length}`);
  assert(dbscanResult.noiseOrders.length === 1, 'DBSCAN phân lập chính xác 1 đơn ngoại lai (Noise point)', `Mã đơn: ${dbscanResult.noiseOrders[0]?.orderCode}`);
  assert(dbscanResult.noiseOrders[0]?.id === 'ord-outlier', 'Đơn ngoại lai phát hiện đúng là đơn Hóc Môn');

  // 1.2 Kiểm tra Hybrid DBSCAN + K-Means
  const hybridClusters = kmeansService.clusterOrders(testBatch1, 2);
  assert(hybridClusters.length <= 2, 'Hybrid gom cụm tự động không vượt quá số lượng xe tối đa K=2', `Số cụm: ${hybridClusters.length}`);
  const totalClusteredOrders = hybridClusters.reduce((sum, c) => sum + c.orders.length, 0);
  assert(totalClusteredOrders === testBatch1.length, 'Tất cả đơn hàng (kể cả đơn ngoại lai) đều được gán đầy đủ vào các cụm, không đơn nào bị bỏ sót', `Tổng: ${totalClusteredOrders}/${testBatch1.length}`);

  // 1.3 Kiểm tra Ràng buộc Tải trọng (Capacity Constraint)
  const heavyOrders = [
    createMockOrder('ord-h-1', 'ORD_H1', 10.7720, 106.6580, 40.0), // 40kg
    createMockOrder('ord-h-2', 'ORD_H2', 10.7725, 106.6585, 45.0), // 45kg (Tổng 85kg vượt quá tải 1 xe 50kg)
  ];
  const capacityClusters = kmeansService.clusterOrders(heavyOrders, 2);
  assert(capacityClusters.length === 2, 'Tự động tách thành 2 cụm riêng biệt khi tải trọng vượt quá sức chứa xe máy (50kg)', `Số cụm sinh ra: ${capacityClusters.length}`);

  console.log('   ↳ \x1b[32mHoàn tất Test Suite 1\x1b[0m\n');

  // -----------------------------------------------------------------------------------------
  // TEST SUITE 2: MODULE 2 — TỐI ƯU LỘ TRÌNH (GENETIC ALGORITHM)
  // -----------------------------------------------------------------------------------------
  console.log('🧬 [TEST SUITE 2] Module 2: Tối ưu lộ trình (Genetic Algorithm)...');

  // Tạo chuỗi 6 điểm dừng theo thứ tự lộn xộn
  const messyOrders = [
    createMockOrder('stop-4', 'STOP_4_Q1', 10.7750, 106.7020), // Xa
    createMockOrder('stop-1', 'STOP_1_Q10', 10.7730, 106.6590), // Gần kho
    createMockOrder('stop-5', 'STOP_5_Q1', 10.7760, 106.7030), // Xa
    createMockOrder('stop-2', 'STOP_2_Q10', 10.7735, 106.6600), // Gần kho
    createMockOrder('stop-3', 'STOP_3_Q3', 10.7740, 106.6800),  // Giữa
  ];

  // Tính tổng cự ly nếu đi theo thứ tự lộn xộn ban đầu (FIFO)
  let rawDistance = 0;
  let prev = facilityLocation;
  for (const o of messyOrders) {
    const coords = { lat: o.pickupLatitude!, lng: o.pickupLongitude! };
    rawDistance += vrpService['haversineDistance'](prev.lat, prev.lng, coords.lat, coords.lng);
    prev = coords;
  }
  rawDistance += vrpService['haversineDistance'](prev.lat, prev.lng, facilityLocation.lat, facilityLocation.lng);

  // Chạy Genetic Algorithm tối ưu hóa
  const optimizedOrders = await vrpService.optimizeRouteStops(messyOrders, facilityLocation);

  // Tính tổng cự ly sau tối ưu
  let optimizedDistance = 0;
  prev = facilityLocation;
  for (const o of optimizedOrders) {
    const coords = { lat: o.pickupLatitude!, lng: o.pickupLongitude! };
    optimizedDistance += vrpService['haversineDistance'](prev.lat, prev.lng, coords.lat, coords.lng);
    prev = coords;
  }
  optimizedDistance += vrpService['haversineDistance'](prev.lat, prev.lng, facilityLocation.lat, facilityLocation.lng);

  assert(optimizedOrders.length === messyOrders.length, 'Số lượng điểm dừng sau tối ưu không thay đổi', `${optimizedOrders.length}/${messyOrders.length}`);
  assert(new Set(optimizedOrders.map(o => o.id)).size === messyOrders.length, 'Không có điểm dừng nào bị lặp lại hoặc biến mất');
  
  const distanceReductionPct = ((rawDistance - optimizedDistance) / rawDistance) * 100;
  assert(optimizedDistance <= rawDistance, 'Genetic Algorithm tối ưu giảm thiểu quãng đường di chuyển', `Ban đầu: ${rawDistance.toFixed(2)}km -> Sau GA: ${optimizedDistance.toFixed(2)}km (Tiết kiệm ${distanceReductionPct.toFixed(1)}%)`);

  console.log('   ↳ \x1b[32mHoàn tất Test Suite 2\x1b[0m\n');

  // -----------------------------------------------------------------------------------------
  // TEST SUITE 3: MODULE 3 — PHÂN CÔNG TÀI XẾ (HUNGARIAN ALGORITHM)
  // -----------------------------------------------------------------------------------------
  console.log('🛵 [TEST SUITE 3] Module 3: Phân công tài xế (Hungarian Matching)...');

  // Tạo 2 tài xế: Tài xế Nam đang ở Q10, Tài xế Tuấn đang ở Q1
  const driverNamQ10 = createMockDriver('drv-nam', 'Lê Văn Nam (Q10)', 10.7725, 106.6580);
  const driverTuanQ1 = createMockDriver('drv-tuan', 'Trần Anh Tuấn (Q1)', 10.7755, 106.7025);

  const testDrivers = [driverNamQ10, driverTuanQ1];

  // 2 Cụm: Cụm 0 ở Q10, Cụm 1 ở Q1
  const clusterQ10 = {
    id: 0,
    centroid: { lat: 10.7720, lng: 106.6580 },
    orders: ordersDistrict10,
  };
  const clusterQ1 = {
    id: 1,
    centroid: { lat: 10.7750, lng: 106.7020 },
    orders: ordersDistrict1,
  };

  const testClusters = [clusterQ10, clusterQ1];

  const assignments = await assignmentService.assignDriversToClusters(testDrivers, testClusters, facilityLocation);

  assert(assignments.length === 2, 'Hungarian Algorithm ghép chính xác 2 cặp Tài xế - Cụm tuyến', `Số lượt ghép: ${assignments.length}`);
  
  const assignedNam = assignments.find(a => a.driverId === 'drv-nam');
  const assignedTuan = assignments.find(a => a.driverId === 'drv-tuan');

  assert(assignedNam?.clusterId === 0, 'Tài xế Nam (đang ở Q10) được ghép tối ưu vào Cụm Q10');
  assert(assignedTuan?.clusterId === 1, 'Tài xế Tuấn (đang ở Q1) được ghép tối ưu vào Cụm Q1');
  assert(assignedNam?.clusterId !== assignedTuan?.clusterId, 'Không có hiện tượng 2 tài xế bị gán trùng 1 cụm');

  console.log('   ↳ \x1b[32mHoàn tất Test Suite 3\x1b[0m\n');

  // -----------------------------------------------------------------------------------------
  // TEST SUITE 4: END-TO-END PIPELINE INTEGRATION
  // -----------------------------------------------------------------------------------------
  console.log('🚀 [TEST SUITE 4] End-to-End Pipeline Integration (DBSCAN -> GA -> Hungarian)...');

  // Bước 1: Gom cụm
  const pipelineClusters = kmeansService.clusterOrders(testBatch1, testDrivers.length);
  assert(pipelineClusters.length > 0, 'E2E Bước 1: DBSCAN + K-Means hoàn thành');

  // Bước 2: Tối ưu lộ trình từng cụm
  const pipelineOptimizedClusters = await Promise.all(
    pipelineClusters.map(async (c) => {
      const sorted = await vrpService.optimizeRouteStops(c.orders, facilityLocation);
      return { ...c, orders: sorted };
    })
  );
  assert(pipelineOptimizedClusters.length === pipelineClusters.length, 'E2E Bước 2: Genetic Algorithm tối ưu hóa toàn bộ cụm thành công');

  // Bước 3: Phân công tài xế
  const pipelineAssignments = await assignmentService.assignDriversToClusters(testDrivers, pipelineOptimizedClusters, facilityLocation);
  assert(pipelineAssignments.length === pipelineOptimizedClusters.length, 'E2E Bước 3: Hungarian Matching gán tài xế vào toàn bộ lộ trình thành công');

  console.log('   ↳ \x1b[32mHoàn tất Test Suite 4 (E2E Integration)\x1b[0m\n');

  console.log('========================================================================');
  console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ TỰ ĐỘNG ĐÃ VƯỢT QUA 100% THÀNH CÔNG!');
  console.log('========================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n❌ KIỂM THỬ TỰ ĐỘNG THẤT BẠI:', err);
  process.exit(1);
});
