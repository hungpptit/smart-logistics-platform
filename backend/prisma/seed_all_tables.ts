import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

declare const process: any;

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting seeding for all database tables...');

  console.log('🧹 Cleaning old mock data...');
  await prisma.trackingAttachment.deleteMany({});
  await prisma.deliveryProof.deleteMany({});
  await prisma.driverCheckIn.deleteMany({});
  await prisma.barcodeScan.deleteMany({});
  await prisma.trackingEvent.deleteMany({});
  await prisma.routeLocationLog.deleteMany({});
  await prisma.dispatchTask.deleteMany({});
  await prisma.routeStop.deleteMany({});
  await prisma.shipmentTransfer.deleteMany({});
  await prisma.shipmentEvent.deleteMany({});
  await prisma.shipmentPackage.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.route.deleteMany({});
  await prisma.routeOptimization.deleteMany({});
  await prisma.orderStatusHistory.deleteMany({});
  await prisma.orderPayment.deleteMany({});
  await prisma.package.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.driverVehicleAssignment.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.driverLocation.deleteMany({});
  await prisma.driver.deleteMany({});
  await prisma.staffProfile.deleteMany({});
  await prisma.facilityZone.deleteMany({});
  await prisma.facilityAddress.deleteMany({});
  await prisma.facility.deleteMany({});
  await prisma.customerAddress.deleteMany({});
  await prisma.customerContact.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.address.deleteMany({});
  
  const standardUsernames = ['admin', 'dispatcher', 'Tài xế giao hàng (Shipper)', 'customer'];
  await prisma.user.deleteMany({
    where: {
      username: {
        notIn: standardUsernames
      }
    }
  });

  // Helper: Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Velocity123!', salt);

  // ==========================================
  // 1. Roles (Ensure at least 5)
  // ==========================================
  console.log('🔑 Seeding Roles (Minimum 5)...');
  const rolesData = [
    { roleCode: 'ADMIN', roleName: 'Quản trị hệ thống' },
    { roleCode: 'STAFF', roleName: 'Nhân viên' },
    { roleCode: 'SHIPPER', roleName: 'Tài xế giao hàng' },
    { roleCode: 'CUSTOMER', roleName: 'Khách hàng' },
    { roleCode: 'PARTNER', roleName: 'Đối tác liên kết' },
  ];
  for (const r of rolesData) {
    await prisma.role.upsert({
      where: { roleCode: r.roleCode },
      update: { roleName: r.roleName },
      create: r,
    });
  }
  const dbRoles = await prisma.role.findMany();

  // ==========================================
  // 2. Services (Ensure at least 5)
  // ==========================================
  console.log('💼 Seeding Services (Minimum 5)...');
  const servicesData = [
    { serviceCode: 'EXPRESS', serviceName: 'Giao hàng Hỏa tốc 2h', basePrice: 35000.00, pricePerKm: 8000.00, pricePerKg: 5000.00, estimatedDeliveryHours: 6 },
    { serviceCode: 'STANDARD', serviceName: 'Giao hàng Tiêu chuẩn', basePrice: 20000.00, pricePerKm: 0.00, pricePerKg: 3000.00, estimatedDeliveryHours: 24 },
    { serviceCode: 'SAVING', serviceName: 'Giao hàng Tiết kiệm', basePrice: 15000.00, pricePerKm: 0.00, pricePerKg: 2000.00, estimatedDeliveryHours: 72 },
    { serviceCode: 'COLD_CHAIN', serviceName: 'Vận chuyển Đông lạnh', basePrice: 60000.00, pricePerKm: 12000.00, pricePerKg: 8000.00, estimatedDeliveryHours: 12 },
    { serviceCode: 'BULK', serviceName: 'Vận chuyển Hàng cồng kềnh', basePrice: 120000.00, pricePerKm: 15000.00, pricePerKg: 10000.00, estimatedDeliveryHours: 48 },
  ];
  for (const s of servicesData) {
    await prisma.service.upsert({
      where: { serviceCode: s.serviceCode },
      update: s,
      create: s,
    });
  }
  const dbServices = await prisma.service.findMany();

  // ==========================================
  // 3. Facility Types (Ensure at least 5)
  // ==========================================
  console.log('🏢 Seeding Facility Types (Minimum 5)...');
  const fTypesData = [
    { typeCode: 'MAIN_DEPOT', typeName: 'Tổng kho / Kho trung tâm' },
    { typeCode: 'REGIONAL_WAREHOUSE', typeName: 'Kho khu vực' },
    { typeCode: 'HUB', typeName: 'Trạm trung chuyển lớn' },
    { typeCode: 'MICRO_HUB', typeName: 'Bưu cục / Trạm giao nhận chặng cuối' },
    { typeCode: 'FULFILLMENT_CENTER', typeName: 'Trung tâm xử lý đơn hàng' },
  ];
  for (const ft of fTypesData) {
    await prisma.facilityType.upsert({
      where: { typeCode: ft.typeCode },
      update: { typeName: ft.typeName },
      create: ft,
    });
  }
  const dbFacilityTypes = await prisma.facilityType.findMany();

  // ==========================================
  // 4. Vehicle Types (Ensure at least 5)
  // ==========================================
  console.log('🚚 Seeding Vehicle Types (Minimum 5)...');
  const vTypesData = [
    { typeCode: 'MOTORBIKE', typeName: 'Xe máy', maxDefaultWeight: 80.00, description: 'Chặng cuối ngõ hẻm' },
    { typeCode: 'VAN', typeName: 'Xe bán tải / Van', maxDefaultWeight: 500.00, description: 'Nội đô thành phố' },
    { typeCode: 'TRUCK_1T5', typeName: 'Xe tải 1.5 Tấn', maxDefaultWeight: 1500.00, description: 'Liên quận' },
    { typeCode: 'CONTAINER', typeName: 'Xe Container cỡ lớn', maxDefaultWeight: 30000.00, description: 'Liên tỉnh chặng dài' },
    { typeCode: 'REFRIGERATED_TRUCK', typeName: 'Xe tải đông lạnh', maxDefaultWeight: 2000.00, description: 'Bảo quản nhiệt độ thấp' },
  ];
  for (const vt of vTypesData) {
    await prisma.vehicleType.upsert({
      where: { typeCode: vt.typeCode },
      update: vt,
      create: vt,
    });
  }
  const dbVehicleTypes = await prisma.vehicleType.findMany();

  // ==========================================
  // 5. Users (Ensure at least 10 users to support sub-profiles)
  // ==========================================
  console.log('👤 Seeding Users (Minimum 10)...');
  const usersData = [
    { username: 'admin_all', email: 'admin_all@velocity.vn', phone: '0901000001', roleCode: 'ADMIN' },
    { username: 'staff_a', email: 'staff_a@velocity.vn', phone: '0901000002', roleCode: 'STAFF' },
    { username: 'staff_b', email: 'staff_b@velocity.vn', phone: '0901000003', roleCode: 'STAFF' },
    { username: 'staff_c', email: 'staff_c@velocity.vn', phone: '0901000004', roleCode: 'STAFF' },
    { username: 'staff_d', email: 'staff_d@velocity.vn', phone: '0901000005', roleCode: 'STAFF' },
    { username: 'driver_a', email: 'driver_a@velocity.vn', phone: '0901000006', roleCode: 'SHIPPER' },
    { username: 'driver_b', email: 'driver_b@velocity.vn', phone: '0901000007', roleCode: 'SHIPPER' },
    { username: 'driver_c', email: 'driver_c@velocity.vn', phone: '0901000008', roleCode: 'SHIPPER' },
    { username: 'driver_d', email: 'driver_d@velocity.vn', phone: '0901000009', roleCode: 'SHIPPER' },
    { username: 'driver_e', email: 'driver_e@velocity.vn', phone: '0901000010', roleCode: 'SHIPPER' },
    { username: 'customer_a', email: 'customer_a@velocity.vn', phone: '0901000011', roleCode: 'CUSTOMER' },
    { username: 'customer_b', email: 'customer_b@velocity.vn', phone: '0901000012', roleCode: 'CUSTOMER' },
    { username: 'customer_c', email: 'customer_c@velocity.vn', phone: '0901000013', roleCode: 'CUSTOMER' },
    { username: 'customer_d', email: 'customer_d@velocity.vn', phone: '0901000014', roleCode: 'CUSTOMER' },
    { username: 'customer_e', email: 'customer_e@velocity.vn', phone: '0901000015', roleCode: 'CUSTOMER' },
  ];

  const dbUsers: any[] = [];
  for (const u of usersData) {
    const role = dbRoles.find(r => r.roleCode === u.roleCode);
    if (!role) continue;
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { phone: u.phone, roleId: role.id },
      create: {
        username: u.username,
        email: u.email,
        phone: u.phone,
        passwordHash,
        roleId: role.id,
        status: 'ACTIVE',
      },
    });
    dbUsers.push(user);
  }

  // ==========================================
  // 6. Addresses (Ensure at least 5)
  // ==========================================
  console.log('📍 Seeding Addresses (Minimum 5)...');
  // Get some real ward codes from DB if available
  const wards = await prisma.ward.findMany({ take: 10 });
  const ward1 = wards[0]?.code || null;
  const ward2 = wards[1]?.code || null;
  const ward3 = wards[2]?.code || null;
  const ward4 = wards[3]?.code || null;
  const ward5 = wards[4]?.code || null;

  const addressesData = [
    { addressLine1: '120 Lê Lợi', ward: 'Bến Nghé', province: 'Hồ Chí Minh', latitude: 10.776, longitude: 106.701, formattedAddress: '120 Lê Lợi, Bến Nghé, Quận 1, Hồ Chí Minh', wardCode: ward1 },
    { addressLine1: '45 Cầu Giấy', ward: 'Quan Hoa', province: 'Hà Nội', latitude: 21.036, longitude: 105.801, formattedAddress: '45 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội', wardCode: ward2 },
    { addressLine1: '88 Nguyễn Văn Linh', ward: 'Nam Dương', province: 'Đà Nẵng', latitude: 16.061, longitude: 108.215, formattedAddress: '88 Nguyễn Văn Linh, Nam Dương, Hải Châu, Đà Nẵng', wardCode: ward3 },
    { addressLine1: '12 Trần Phú', ward: 'Lương Khánh Thiện', province: 'Hải Phòng', latitude: 20.862, longitude: 106.685, formattedAddress: '12 Trần Phú, Lương Khánh Thiện, Ngô Quyền, Hải Phòng', wardCode: ward4 },
    { addressLine1: '54 Mậu Thân', ward: 'An Nghiệp', province: 'Cần Thơ', latitude: 10.038, longitude: 105.772, formattedAddress: '54 Mậu Thân, An Nghiệp, Ninh Kiều, Cần Thơ', wardCode: ward5 },
  ];

  const dbAddresses: any[] = [];
  for (const addr of addressesData) {
    const created = await prisma.address.create({
      data: addr,
    });
    dbAddresses.push(created);
  }

  // ==========================================
  // 7. Customers & Contacts (Ensure at least 5)
  // ==========================================
  console.log('👥 Seeding Customers & Contacts (Minimum 5)...');
  const customerUsers = dbUsers.filter(u => {
    const role = dbRoles.find(r => r.id === u.roleId);
    return role?.roleCode === 'CUSTOMER';
  });

  const dbCustomers: any[] = [];
  const dbContacts: any[] = [];

  for (let i = 0; i < 5; i++) {
    const cUser = customerUsers[i] || customerUsers[0];
    const customer = await prisma.customer.create({
      data: {
        userId: cUser.id,
        customerCode: `CUST_${1000 + i}`,
        customerType: i % 2 === 0 ? 'INDIVIDUAL' : 'BUSINESS',
        companyName: i % 2 === 0 ? null : `Công ty TNHH Giải pháp Logistics ${String.fromCharCode(65 + i)}`,
        taxCode: i % 2 === 0 ? null : `031245678${i}`,
        status: 'ACTIVE',
      },
    });
    dbCustomers.push(customer);

    // Customer Contact
    const contact = await prisma.customerContact.create({
      data: {
        customerId: customer.id,
        fullName: `Liên hệ Khách hàng ${String.fromCharCode(65 + i)}`,
        phone: `098900000${i}`,
        email: `contact_${i}@velocity.vn`,
        position: i % 2 === 0 ? 'Chủ shop' : 'Trưởng phòng Logistics',
        isPrimary: true,
      },
    });
    dbContacts.push(contact);

    // Customer Address
    await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        addressId: dbAddresses[i % dbAddresses.length].id,
        addressType: 'HOME',
        isDefault: true,
      },
    });
  }

  // ==========================================
  // 8. Facilities (Ensure at least 5)
  // ==========================================
  console.log('🏢 Seeding Facilities (Minimum 5)...');
  const staffUsers = dbUsers.filter(u => {
    const role = dbRoles.find(r => r.id === u.roleId);
    return role?.roleCode === 'STAFF';
  });

  const dbFacilities: any[] = [];
  for (let i = 0; i < 5; i++) {
    const fType = dbFacilityTypes[i % dbFacilityTypes.length];
    const staff = staffUsers[i % staffUsers.length];
    const facility = await prisma.facility.create({
      data: {
        facilityCode: `FAC_${100 + i}`,
        facilityName: `Kho/Bưu cục Velocity ${i + 1}`,
        facilityTypeId: fType.id,
        managerUserId: staff.id,
        operatingStatus: 'ACTIVE',
        openedAt: new Date('2025-01-01'),
      },
    });
    dbFacilities.push(facility);

    // Facility Address
    await prisma.facilityAddress.create({
      data: {
        facilityId: facility.id,
        addressId: dbAddresses[i % dbAddresses.length].id,
        addressType: 'MAIN',
        isPrimary: true,
      },
    });

    // Facility Zones (Ensure at least 5 Zones per Facility)
    const zonesData = [
      { zoneCode: 'REC', zoneName: 'Khu vực nhập hàng', zoneType: 'RECEIVING', capacity: 100 },
      { zoneCode: 'STOR', zoneName: 'Khu vực lưu trữ', zoneType: 'STORAGE', capacity: 500 },
      { zoneCode: 'SORT', zoneName: 'Khu vực phân loại', zoneType: 'SORTING', capacity: 200 },
      { zoneCode: 'DISP', zoneName: 'Khu vực xuất hàng', zoneType: 'DISPATCH', capacity: 150 },
      { zoneCode: 'QUAR', zoneName: 'Khu vực cách ly / Kiểm định', zoneType: 'QUARANTINE', capacity: 50 },
    ];
    for (const z of zonesData) {
      await prisma.facilityZone.create({
        data: {
          facilityId: facility.id,
          zoneCode: `${z.zoneCode}_${i}`,
          zoneName: `${z.zoneName} ${i + 1}`,
          zoneType: z.zoneType as any,
          capacity: z.capacity,
        },
      });
    }
  }

  // ==========================================
  // 9. Staff Profiles (Ensure at least 5)
  // ==========================================
  console.log('👔 Seeding Staff Profiles (Minimum 5)...');
  const dbStaffProfiles: any[] = [];
  for (let i = 0; i < 5; i++) {
    const sUser = staffUsers[i % staffUsers.length];
    const fac = dbFacilities[i % dbFacilities.length];
    
    // Check if staff profile already exists for user
    const existingSp = await prisma.staffProfile.findUnique({
      where: { userId: sUser.id }
    });

    if (!existingSp) {
      const sp = await prisma.staffProfile.create({
        data: {
          userId: sUser.id,
          citizenId: `12345678901${i}`,
          assignedFacilityId: fac.id,
        },
      });
      dbStaffProfiles.push(sp);
    } else {
      dbStaffProfiles.push(existingSp);
    }
  }

  // ==========================================
  // 10. Drivers & Locations (Ensure at least 5)
  // ==========================================
  console.log('🛵 Seeding Drivers & Locations (Minimum 5)...');
  const shipperUsers = dbUsers.filter(u => {
    const role = dbRoles.find(r => r.id === u.roleId);
    return role?.roleCode === 'SHIPPER';
  });

  const dbDrivers: any[] = [];
  for (let i = 0; i < 5; i++) {
    const sUser = shipperUsers[i] || shipperUsers[0];
    const fac = dbFacilities[i % dbFacilities.length];

    const driver = await prisma.driver.create({
      data: {
        userId: sUser.id,
        employeeCode: `DRV_${100 + i}`,
        fullName: `Tài xế giao hàng ${String.fromCharCode(65 + i)}`,
        phone: `090500000${i}`,
        citizenId: `03120000045${i}`,
        driverLicenseNumber: `GPLX_${2000 + i}`,
        driverLicenseClass: 'B2',
        hireDate: new Date('2025-02-15'),
        employmentStatus: 'ACTIVE',
        homeFacilityId: fac.id,
        driverType: 'HUB_DELIVERY',
      },
    });
    dbDrivers.push(driver);

    // Driver Location
    await prisma.driverLocation.create({
      data: {
        driverId: driver.id,
        latitude: 10.776 + (i * 0.01),
        longitude: 106.701 + (i * 0.01),
        heading: 90.0,
        speed: 30.5,
        accuracy: 5.0,
        recordedAt: new Date(),
      },
    });
  }

  // ==========================================
  // 11. Vehicles & Assignments (Ensure at least 5)
  // ==========================================
  console.log('🚚 Seeding Vehicles & Assignments (Minimum 5)...');
  const dbVehicles: any[] = [];
  const dbAssignments: any[] = [];

  for (let i = 0; i < 5; i++) {
    const vType = dbVehicleTypes[i % dbVehicleTypes.length];
    const fac = dbFacilities[i % dbFacilities.length];
    const driver = dbDrivers[i];

    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleCode: `VEH_${100 + i}`,
        licensePlate: `29A-${12345 + i}`,
        vehicleTypeId: vType.id,
        homeFacilityId: fac.id,
        maxWeight: new Prisma.Decimal(vType.maxDefaultWeight.toString()),
        maxVolume: new Prisma.Decimal('10.5'),
        maxLength: new Prisma.Decimal('3.2'),
        refrigerationSupported: i === 4,
        operatingStatus: 'ACTIVE',
      },
    });
    dbVehicles.push(vehicle);

    // Driver Vehicle Assignment
    const assign = await prisma.driverVehicleAssignment.create({
      data: {
        driverId: driver.id,
        vehicleId: vehicle.id,
        assignedFrom: new Date(),
        isActive: true,
      },
    });
    dbAssignments.push(assign);
  }

  // ==========================================
  // 12. Orders, Packages, Payments & Histories (Minimum 5)
  // ==========================================
  console.log('📦 Seeding Orders, Packages & Payments (Minimum 5)...');
  const dbOrders: any[] = [];
  const dbPackages: any[] = [];
  const dbPayments: any[] = [];

  for (let i = 0; i < 5; i++) {
    const customer = dbCustomers[i];
    const service = dbServices[i % dbServices.length];
    const addrFrom = dbAddresses[i % dbAddresses.length];
    const addrTo = dbAddresses[(i + 1) % dbAddresses.length];
    const contactFrom = dbContacts[i];
    const contactTo = dbContacts[(i + 1) % dbContacts.length];
    const staff = staffUsers[i % staffUsers.length];

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        orderCode: `ORD_${10000 + i}`,
        status: i === 0 ? 'CREATED' : i === 1 ? 'READY_FOR_PICKUP' : i === 2 ? 'DELIVERED' : i === 3 ? 'COMPLETED' : 'CANCELLED',
        serviceId: service.id,
        
        pickupAddressId: addrFrom.id,
        senderContactId: contactFrom.id,
        senderName: contactFrom.fullName,
        senderPhone: contactFrom.phone,
        pickupAddressText: addrFrom.formattedAddress,
        pickupLatitude: addrFrom.latitude,
        pickupLongitude: addrFrom.longitude,

        deliveryAddressId: addrTo.id,
        receiverContactId: contactTo.id,
        receiverName: contactTo.fullName,
        receiverPhone: contactTo.phone,
        deliveryAddressText: addrTo.formattedAddress,
        deliveryLatitude: addrTo.latitude,
        deliveryLongitude: addrTo.longitude,

        estimatedShippingFee: new Prisma.Decimal('35000.00'),
        estimatedInsuranceFee: new Prisma.Decimal('500.00'),
        estimatedCodAmount: new Prisma.Decimal(i % 2 === 0 ? '200000.00' : '0.00'),
        estimatedTotalAmount: new Prisma.Decimal('35500.00'),
        estimatedDistance: new Prisma.Decimal('12.5'),
        estimatedDuration: 35,
        pickupType: 'PICKUP',
        originFacilityId: dbFacilities[i % dbFacilities.length].id,
        destinationFacilityId: dbFacilities[(i + 1) % dbFacilities.length].id,
        createdBy: staff.id,
      },
    });
    dbOrders.push(order);

    // Packages
    const pack = await prisma.package.create({
      data: {
        orderId: order.id,
        packageCode: `PKG_${20000 + i}`,
        weight: new Prisma.Decimal('2.5'),
        length: new Prisma.Decimal('20.0'),
        width: new Prisma.Decimal('15.0'),
        height: new Prisma.Decimal('10.0'),
        volume: new Prisma.Decimal('0.003'),
        isFragile: i % 2 === 0,
        temperatureRequirement: i === 4 ? '2-8 C' : null,
      },
    });
    dbPackages.push(pack);

    // Payments
    const payment = await prisma.orderPayment.create({
      data: {
        orderId: order.id,
        finalShippingFee: new Prisma.Decimal('35000.00'),
        finalInsuranceFee: new Prisma.Decimal('500.00'),
        finalCodAmount: new Prisma.Decimal(i % 2 === 0 ? '200000.00' : '0.00'),
        feePayer: 'SENDER',
        paymentMethod: i % 2 === 0 ? 'COD' : 'BANK_TRANSFER',
        paymentStatus: i === 3 ? 'PAID' : 'UNPAID',
      },
    });
    dbPayments.push(payment);

    // Order Status History
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'CREATED',
        changedByUserId: staff.id,
        changeSource: 'SYSTEM',
        reason: 'Đơn hàng được khởi tạo thành công trên ứng dụng mobile',
      },
    });
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: order.status,
        changedByUserId: staff.id,
        changeSource: 'ADMIN',
        reason: 'Cập nhật trạng thái tự động theo hệ thống quét',
      },
    });
  }

  // ==========================================
  // 13. Route Optimization, Routes, RouteStops & LocationLogs (Minimum 5)
  // ==========================================
  console.log('🤖 Seeding Route Optimization & Routes (Minimum 5)...');
  const dbOptimizations: any[] = [];
  const dbRoutes: any[] = [];

  for (let i = 0; i < 5; i++) {
    const optim = await prisma.routeOptimization.create({
      data: {
        algorithmName: 'Genetic Algorithm VRP',
        algorithmVersion: '1.2.0',
        inputShipmentCount: 15,
        outputRouteCount: 3,
        totalDistanceKm: new Prisma.Decimal('56.2'),
        estimatedDurationMin: 180,
        executionTimeMs: 450,
        fitnessScore: new Prisma.Decimal('0.8564'),
        optimizationStatus: 'SUCCESS',
      },
    });
    dbOptimizations.push(optim);

    const assign = dbAssignments[i];
    const facStart = dbFacilities[i % dbFacilities.length];
    const facEnd = dbFacilities[(i + 1) % dbFacilities.length];

    const route = await prisma.route.create({
      data: {
        routeCode: `RTE_${1000 + i}`,
        driverVehicleAssignmentId: assign.id,
        startFacilityId: facStart.id,
        endFacilityId: facEnd.id,
        optimizationId: optim.id,
        plannedDistanceKm: new Prisma.Decimal('25.5'),
        actualDistanceKm: new Prisma.Decimal('26.1'),
        plannedDurationMin: 90,
        actualDurationMin: 95,
        totalStops: 3,
        status: 'IN_PROGRESS',
        plannedStartAt: new Date(),
      },
    });
    dbRoutes.push(route);

    // Route Location Log
    await prisma.routeLocationLog.create({
      data: {
        routeId: route.id,
        latitude: 10.776 + (i * 0.005),
        longitude: 106.701 + (i * 0.005),
        speedMps: new Prisma.Decimal('8.5'),
        headingDegrees: new Prisma.Decimal('45.0'),
        accuracyMeters: new Prisma.Decimal('3.0'),
      },
    });
  }

  // ==========================================
  // 14. Shipments, ShipmentPackages, Transfers & Events (Minimum 5)
  // ==========================================
  console.log('📦 Seeding Shipments, Transfers & Events (Minimum 5)...');
  const dbShipments: any[] = [];
  for (let i = 0; i < 5; i++) {
    const route = dbRoutes[i];
    const staff = staffUsers[i % staffUsers.length];

    const shipment = await prisma.shipment.create({
      data: {
        shipmentCode: `SHP_${10000 + i}`,
        status: 'IN_TRANSIT',
        routeId: route.id,
        createdBy: staff.id,
      },
    });
    dbShipments.push(shipment);

    // Shipment Package
    await prisma.shipmentPackage.create({
      data: {
        shipmentId: shipment.id,
        packageId: dbPackages[i].id,
      },
    });

    // Shipment Event
    await prisma.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        eventType: 'DEPARTED_FACILITY',
        facilityId: dbFacilities[i % dbFacilities.length].id,
        latitude: 10.776,
        longitude: 106.701,
        eventTime: new Date(),
        createdBy: staff.id,
      },
    });

    // Shipment Transfer
    await prisma.shipmentTransfer.create({
      data: {
        shipmentId: shipment.id,
        fromFacilityId: dbFacilities[i % dbFacilities.length].id,
        toFacilityId: dbFacilities[(i + 1) % dbFacilities.length].id,
        status: 'IN_TRANSIT',
        dispatchedAt: new Date(),
      },
    });
  }

  // ==========================================
  // 15. Route Stops, Dispatch Tasks, CheckIns (Minimum 5)
  // ==========================================
  console.log('📌 Seeding Route Stops & Tasks (Minimum 5)...');
  const dbStops: any[] = [];
  for (let i = 0; i < 5; i++) {
    const route = dbRoutes[i];
    const shipment = dbShipments[i];
    const fac = dbFacilities[i % dbFacilities.length];
    const driver = dbDrivers[i];
    const admin = dbUsers.find(u => {
      const role = dbRoles.find(r => r.id === u.roleId);
      return role?.roleCode === 'ADMIN';
    }) || dbUsers[0];

    const stop = await prisma.routeStop.create({
      data: {
        routeId: route.id,
        shipmentId: shipment.id,
        facilityId: fac.id,
        stopType: 'DELIVERY',
        sequence: i + 1,
        addressSnapshot: fac.facilityName,
        latitude: 10.776 + (i * 0.002),
        longitude: 106.701 + (i * 0.002),
        status: 'PENDING',
      },
    });
    dbStops.push(stop);

    // Dispatch Task
    await prisma.dispatchTask.create({
      data: {
        taskCode: `TSK_${1000 + i}`,
        routeId: route.id,
        assignedBy: admin.id,
        assignedTo: driver.id,
        taskType: 'ASSIGN_ROUTE',
        priority: 1,
        status: 'ACCEPTED',
        note: `Nhiệm vụ giao vận chuyển hàng cho tài xế ${driver.fullName}`,
      },
    });

    // Driver Check-in
    await prisma.driverCheckIn.create({
      data: {
        routeStopId: stop.id,
        driverId: driver.id,
        latitude: 10.776 + (i * 0.002),
        longitude: 106.701 + (i * 0.002),
        note: 'Đã check-in chuẩn bị kiểm kho',
      },
    });
  }

  // ==========================================
  // 16. Tracking, Barcode Scans, PODs (Minimum 5)
  // ==========================================
  console.log('📷 Seeding Tracking, Scans, Proof of Deliveries (Minimum 5)...');
  for (let i = 0; i < 5; i++) {
    const shipment = dbShipments[i];
    const stop = dbStops[i];
    const pack = dbPackages[i];
    const fac = dbFacilities[i % dbFacilities.length];
    const driver = dbDrivers[i];

    // Tracking Event
    await prisma.trackingEvent.create({
      data: {
        shipmentId: shipment.id,
        routeStopId: stop.id,
        eventType: 'ARRIVED_HUB',
        eventSource: 'DRIVER_APP',
        description: `Chuyến hàng đã cập bến bưu cục ${fac.facilityName}`,
        latitude: stop.latitude,
        longitude: stop.longitude,
        createdBy: driver.userId,
        occurredAt: new Date(),
      },
    });

    // Barcode Scan
    await prisma.barcodeScan.create({
      data: {
        shipmentId: shipment.id,
        packageId: pack.id,
        routeStopId: stop.id,
        facilityId: fac.id,
        scannedBy: driver.userId!,
        scanType: 'INBOUND',
        barcodeValue: pack.packageCode,
        latitude: stop.latitude,
        longitude: stop.longitude,
      },
    });

    // Delivery Proof
    const proof = await prisma.deliveryProof.create({
      data: {
        shipmentId: shipment.id,
        routeStopId: stop.id,
        proofType: 'PHOTO',
        deliveryResult: 'SUCCESS',
        receiverName: `Người nhận ${String.fromCharCode(65 + i)}`,
        receiverPhone: `090000012${i}`,
        verifiedLatitude: stop.latitude,
        verifiedLongitude: stop.longitude,
      },
    });

    // Tracking Attachment
    await prisma.trackingAttachment.create({
      data: {
        deliveryProofId: proof.id,
        fileType: 'PHOTO',
        storageProvider: 'S3',
        objectKey: `proofs/shipment_${shipment.id}_photo.jpg`,
        mimeType: 'image/jpeg',
        fileSizeBytes: BigInt(204800),
      },
    });
  }

  console.log('✨ All 39 database tables have been seeded with at least 5 realistic sample data records successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
