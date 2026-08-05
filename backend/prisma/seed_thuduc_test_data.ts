/// <reference types="node" />
import { PrismaClient, CustomerType, FacilityStatus, VehicleOperatingStatus, DriverEmploymentStatus, OrderStatus, ShipmentStatus, FeePayer, PickupType, PaymentMethod, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

declare const process: any;
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Bắt đầu nạp lại dữ liệu Test AI Phân cụm & Vận hành Chặng cuối TP. Thủ Đức (Chuẩn Nghiệp vụ Chuyển Kho)...');

  const saltRounds = 10;
  const commonPassHash = await bcrypt.hash('SlpTest@2026', saltRounds);

  // 1. Lấy thông tin Roles & VehicleType
  const staffRole = await prisma.role.findUnique({ where: { roleCode: 'STAFF' } });
  const shipperRole = await prisma.role.findUnique({ where: { roleCode: 'SHIPPER' } });
  const customerRole = await prisma.role.findUnique({ where: { roleCode: 'CUSTOMER' } });
  const motorbikeType = await prisma.vehicleType.findFirst({ where: { typeCode: 'MOTORBIKE' } });
  
  const sortingCenterType = await prisma.facilityType.findFirst({ where: { typeCode: 'SORTING_CENTER' } });
  const provincialHubType = await prisma.facilityType.findFirst({ where: { typeCode: 'PROVINCIAL_HUB' } });
  const lastMileFacilityType = await prisma.facilityType.findFirst({ where: { OR: [{ typeCode: 'WARD_STATION' }, { typeCode: 'LAST_MILE_STATION' }, { typeCode: 'MICRO_HUB' }] } });
  const expressService = await prisma.service.findFirst({ where: { serviceCode: 'EXPRESS' } });

  if (!staffRole || !shipperRole || !customerRole || !motorbikeType || !sortingCenterType || !provincialHubType || !lastMileFacilityType || !expressService) {
    throw new Error('Chưa seed master lookup data (Roles, FacilityType, VehicleType, Service). Vui lòng chạy npx prisma db seed trước!');
  }

  // 1.5 Helper tự động gán wardCode theo địa chỉ
  const defaultHcmWard = await prisma.ward.findFirst({ where: { provinceCode: '79' } });
  const getWardCode = async (text: string) => {
    const textLower = text.toLowerCase();
    const allHcmWards = await prisma.ward.findMany({ where: { provinceCode: '79' } });
    for (const w of allHcmWards) {
      if (w.name.length > 2 && (textLower.includes((w.fullName || '').toLowerCase()) || textLower.includes(w.name.toLowerCase()))) {
        return w.code;
      }
    }
    return defaultHcmWard?.code || null;
  };

  // 2. Tạo Cây Phân cấp Mạng lưới 3 Cấp Kho
  console.log('📍 Tạo Cây Phân cấp Mạng lưới 3 Cấp Kho (Sorting Center -> Provincial Hub -> Last Mile Stations)...');

  // Cấp 1: Tổng Kho Miền Nam (Q.12)
  const addrSC = await prisma.address.create({
    data: {
      addressLine1: 'Km 19 Quốc Lộ 1A, Phường Trung Mỹ Tây, Quận 12',
      wardCode: await getWardCode('Phường Trung Mỹ Tây'),
      country: 'Vietnam',
      latitude: 10.8520,
      longitude: 106.6200,
    },
  });

  const sortingCenter = await prisma.facility.upsert({
    where: { facilityCode: 'FAC-SC-SOUTH' },
    update: {},
    create: {
      facilityCode: 'FAC-SC-SOUTH',
      facilityName: 'Tổng Kho Miền Nam (Sorting Center Q.12)',
      facilityTypeId: sortingCenterType.id,
      parentFacilityId: null,
      provinceCode: '79',
      addressId: addrSC.id,
      operatingStatus: FacilityStatus.ACTIVE,
      openedAt: new Date('2025-01-01'),
    },
  });

  // Cấp 2: Kho Tổng TP.HCM (Tân Bình)
  const addrHubHCM = await prisma.address.create({
    data: {
      addressLine1: '102 Trường Chinh, Phường 12, Quận Tân Bình, TP. Hồ Chí Minh',
      wardCode: await getWardCode('Phường 12'),
      country: 'Vietnam',
      latitude: 10.8050,
      longitude: 106.6500,
    },
  });

  const provincialHub = await prisma.facility.upsert({
    where: { facilityCode: 'FAC-HUB-HCM' },
    update: {
      parentFacilityId: sortingCenter.id,
      provinceCode: '79',
      addressId: addrHubHCM.id,
    },
    create: {
      facilityCode: 'FAC-HUB-HCM',
      facilityName: 'Kho Tổng TP. Hồ Chí Minh (Provincial Hub)',
      facilityTypeId: provincialHubType.id,
      parentFacilityId: sortingCenter.id,
      provinceCode: '79',
      addressId: addrHubHCM.id,
      operatingStatus: FacilityStatus.ACTIVE,
      openedAt: new Date('2025-01-01'),
    },
  });

  // Cấp 3: 4 Trạm Bưu cục Phát TP. Thủ Đức
  const addrHub1 = await prisma.address.create({
    data: {
      addressLine1: '180 Đặng Văn Bi, Phường Bình Thọ, TP. Thủ Đức, TP. Hồ Chí Minh',
      wardCode: await getWardCode('Phường Bình Thọ'),
      country: 'Vietnam',
      latitude: 10.8495,
      longitude: 106.7625,
    },
  });

  const addrHub2 = await prisma.address.create({
    data: {
      addressLine1: '250 Đường Linh Trung, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
      wardCode: await getWardCode('Phường Linh Trung'),
      country: 'Vietnam',
      latitude: 10.8580,
      longitude: 106.7750,
    },
  });

  const addrHub3 = await prisma.address.create({
    data: {
      addressLine1: '85 Đỗ Xuân Hợp, Phường Phước Long B, TP. Thủ Đức, TP. Hồ Chí Minh',
      wardCode: await getWardCode('Phường Phước Long B'),
      country: 'Vietnam',
      latitude: 10.8250,
      longitude: 106.7600,
    },
  });

  const addrHub4 = await prisma.address.create({
    data: {
      addressLine1: '25 Song Hành, Phường An Phú, TP. Thủ Đức, TP. Hồ Chí Minh',
      wardCode: await getWardCode('Phường An Phú'),
      country: 'Vietnam',
      latitude: 10.8010,
      longitude: 106.7420,
    },
  });

  // Bưu cục Đặng Văn Bi (Trạm phát chặng cuối chính)
  const hub1 = await prisma.facility.upsert({
    where: { facilityCode: 'FAC-TD-DANGBI' },
    update: {
      parentFacilityId: provincialHub.id,
      provinceCode: '79',
    },
    create: {
      facilityCode: 'FAC-TD-DANGBI',
      facilityName: 'Bưu cục Đặng Văn Bi - TP. Thủ Đức',
      facilityTypeId: lastMileFacilityType.id,
      parentFacilityId: provincialHub.id,
      provinceCode: '79',
      addressId: addrHub1.id,
      operatingStatus: FacilityStatus.ACTIVE,
      openedAt: new Date('2025-01-01'),
    },
  });

  // Bưu cục Linh Trung (Kho gửi 1)
  const hub2 = await prisma.facility.upsert({
    where: { facilityCode: 'FAC-TD-LINHTRUNG' },
    update: {
      parentFacilityId: provincialHub.id,
      provinceCode: '79',
    },
    create: {
      facilityCode: 'FAC-TD-LINHTRUNG',
      facilityName: 'Bưu cục Linh Trung - TP. Thủ Đức',
      facilityTypeId: lastMileFacilityType.id,
      parentFacilityId: provincialHub.id,
      provinceCode: '79',
      addressId: addrHub2.id,
      operatingStatus: FacilityStatus.ACTIVE,
      openedAt: new Date('2025-01-01'),
    },
  });

  // Bưu cục Phước Long (Kho gửi 2)
  const hub3 = await prisma.facility.upsert({
    where: { facilityCode: 'FAC-TD-PHUOCLONG' },
    update: {
      parentFacilityId: provincialHub.id,
      provinceCode: '79',
    },
    create: {
      facilityCode: 'FAC-TD-PHUOCLONG',
      facilityName: 'Bưu cục Phước Long - TP. Thủ Đức',
      facilityTypeId: lastMileFacilityType.id,
      parentFacilityId: provincialHub.id,
      provinceCode: '79',
      addressId: addrHub3.id,
      operatingStatus: FacilityStatus.ACTIVE,
      openedAt: new Date('2025-01-01'),
    },
  });

  // Bưu cục An Phú (Kho gửi 3 xa xa)
  const hub4 = await prisma.facility.upsert({
    where: { facilityCode: 'FAC-TD-ANPHU' },
    update: {
      parentFacilityId: provincialHub.id,
      provinceCode: '79',
    },
    create: {
      facilityCode: 'FAC-TD-ANPHU',
      facilityName: 'Bưu cục An Phú - TP. Thủ Đức',
      facilityTypeId: lastMileFacilityType.id,
      parentFacilityId: provincialHub.id,
      provinceCode: '79',
      addressId: addrHub4.id,
      operatingStatus: FacilityStatus.ACTIVE,
      openedAt: new Date('2025-01-01'),
    },
  });

  // 3. Tạo 4 Nhân viên Kho
  console.log('👤 Tạo 4 Nhân viên kho (Staff)...');
  const staffData = [
    { username: 'stf_dangvanbi_1', name: 'Trần Văn Khoa (Kho Đặng Văn Bi 1)', facilityId: hub1.id, code: 'STF-TD-01' },
    { username: 'stf_dangvanbi_2', name: 'Lê Thị Xuân (Kho Đặng Văn Bi 2)', facilityId: hub1.id, code: 'STF-TD-02' },
    { username: 'stf_linhtrung_1', name: 'Phạm Văn Bình (Kho Linh Trung)', facilityId: hub2.id, code: 'STF-TD-03' },
    { username: 'stf_phuoclong_1', name: 'Nguyễn Văn Minh (Kho Phước Long)', facilityId: hub3.id, code: 'STF-TD-04' },
  ];

  for (const s of staffData) {
    const user = await prisma.user.upsert({
      where: { username: s.username },
      update: {},
      create: {
        username: s.username,
        passwordHash: commonPassHash,
        status: 'ACTIVE',
        roleId: staffRole.id,
      },
    });

    await prisma.staff.upsert({
      where: { employeeCode: s.code },
      update: {},
      create: {
        userId: user.id,
        employeeCode: s.code,
        fullName: s.name,
        phone: `09010000${s.code.slice(-2)}`,
        position: 'WAREHOUSE_STAFF',
        assignedFacilityId: s.facilityId,
      },
    });
  }

  // 4. Tạo 7 Shipper & Xe máy
  console.log('🛵 Tạo 7 Shipper & Xe máy gán tuyến...');
  const shipperData = [
    // Đặng Văn Bi (3 Shipper chặng cuối)
    { username: 'shp_dangvanbi_1', name: 'Nguyễn Văn Hùng', facilityId: hub1.id, code: 'DRV-TD-01', plate: '59-X1 111.01', lat: 10.8490, lng: 106.7620 },
    { username: 'shp_dangvanbi_2', name: 'Trần Quốc Bảo', facilityId: hub1.id, code: 'DRV-TD-02', plate: '59-X1 111.02', lat: 10.8480, lng: 106.7640 },
    { username: 'shp_dangvanbi_3', name: 'Phạm Hoàng Nam', facilityId: hub1.id, code: 'DRV-TD-03', plate: '59-X1 111.03', lat: 10.8510, lng: 106.7610 },
    // Linh Trung (2 Shipper)
    { username: 'shp_linhtrung_1', name: 'Lê Văn Đức', facilityId: hub2.id, code: 'DRV-TD-04', plate: '59-X1 111.04', lat: 10.8570, lng: 106.7740 },
    { username: 'shp_linhtrung_2', name: 'Vũ Văn Khải', facilityId: hub2.id, code: 'DRV-TD-05', plate: '59-X1 111.05', lat: 10.8590, lng: 106.7760 },
    // Phước Long (2 Shipper)
    { username: 'shp_phuoclong_1', name: 'Bùi Thanh Tùng', facilityId: hub3.id, code: 'DRV-TD-06', plate: '59-X1 111.06', lat: 10.8240, lng: 106.7590 },
    { username: 'shp_phuoclong_2', name: 'Đặng Quang Huy', facilityId: hub3.id, code: 'DRV-TD-07', plate: '59-X1 111.07', lat: 10.8260, lng: 106.7610 },
  ];

  for (const sh of shipperData) {
    const user = await prisma.user.upsert({
      where: { username: sh.username },
      update: {},
      create: {
        username: sh.username,
        passwordHash: commonPassHash,
        status: 'ACTIVE',
        roleId: shipperRole.id,
      },
    });

    const staffObj = await prisma.staff.upsert({
      where: { employeeCode: sh.code },
      update: {},
      create: {
        userId: user.id,
        employeeCode: sh.code,
        fullName: sh.name,
        phone: `09020000${sh.code.slice(-2)}`,
        position: 'DRIVER',
        assignedFacilityId: sh.facilityId,
        driverLicenseNumber: `GPLX-TD-99${sh.code.slice(-2)}`,
        driverLicenseClass: 'A1',
        driverTypes: {
          create: [{ driverType: 'HUB_DELIVERY' }],
        },
        employmentStatus: DriverEmploymentStatus.ACTIVE,
      } as any,
    });

    const vehCode = `VEH-${sh.code}`;
    const vehicle = await prisma.vehicle.upsert({
      where: { vehicleCode: vehCode },
      update: {},
      create: {
        vehicleCode: vehCode,
        plateNumber: sh.plate,
        vehicleTypeId: motorbikeType.id,
        assignedFacilityId: sh.facilityId,
        maxWeight: 150.0,
        maxVolume: 0.5,
        maxLength: 1.2,
        operatingStatus: VehicleOperatingStatus.ACTIVE,
      },
    });

    const existingAssign = await prisma.driverVehicleAssignment.findFirst({
      where: { driverId: staffObj.id, vehicleId: vehicle.id, isActive: true },
    });

    if (!existingAssign) {
      await prisma.driverVehicleAssignment.create({
        data: {
          driverId: staffObj.id,
          vehicleId: vehicle.id,
          assignedFrom: new Date(),
          isActive: true,
        },
      });
    }
  }

  // 5. Tạo 5 Khách hàng (`Customer`)
  console.log('🛍️ Tạo 5 Khách hàng (Customer)...');
  const custData = [
    { username: 'cust_thuduc_1', name: 'Bách Hóa Xanh Linh Trung', code: 'CUST-TD-01', phone: '0903000001', type: CustomerType.BUSINESS, hub: hub2, pickupAddr: '120 Đường Linh Trung, Phường Linh Trung', lat: 10.8575, lng: 106.7740 },
    { username: 'cust_thuduc_2', name: 'Shop Thời Trang Võ Văn Ngân', code: 'CUST-TD-02', phone: '0903000002', type: CustomerType.BUSINESS, hub: hub2, pickupAddr: '50 Võ Văn Ngân, Phường Linh Chiểu', lat: 10.8520, lng: 106.7710 },
    { username: 'cust_thuduc_3', name: 'Cửa Hàng Điện Tử Phước Long', code: 'CUST-TD-03', phone: '0903000003', type: CustomerType.BUSINESS, hub: hub3, pickupAddr: '42 Đỗ Xuân Hợp, Phường Phước Long B', lat: 10.8240, lng: 106.7590 },
    { username: 'cust_thuduc_4', name: 'Nhà Sách Giáo Dục Tây Hòa', code: 'CUST-TD-04', phone: '0903000004', type: CustomerType.INDIVIDUAL, hub: hub3, pickupAddr: '18 Tây Hòa, Phường Phước Long A', lat: 10.8270, lng: 106.7580 },
    { username: 'cust_thuduc_5', name: 'Nông Sản Sạch An Phú (Kho xa)', code: 'CUST-TD-05', phone: '0903000005', type: CustomerType.BUSINESS, hub: hub4, pickupAddr: '15 Song Hành, Phường An Phú', lat: 10.8020, lng: 106.7430 },
  ];

  const createdCustomers = [];
  for (const c of custData) {
    const user = await prisma.user.upsert({
      where: { username: c.username },
      update: {},
      create: {
        username: c.username,
        passwordHash: commonPassHash,
        status: 'ACTIVE',
        roleId: customerRole.id,
      },
    });

    const custObj = await prisma.customer.upsert({
      where: { customerCode: c.code },
      update: {},
      create: {
        userId: user.id,
        customerCode: c.code,
        fullName: c.name,
        phone: c.phone,
        email: `${c.username}@gmail.com`,
        customerType: c.type,
        companyName: c.name,
      },
    });
    createdCustomers.push({ ...custObj, meta: c });
  }

  // 6. Tạo 50 Đơn hàng: Gửi từ Bưu cục Linh Trung / Phước Long / An Phú ➔ Chuyển kho về Bưu cục Đặng Văn Bi
  console.log('📦 Tạo 50 Đơn hàng xuất phát từ Kho gửi khác, Shipper lấy hàng tận nơi (PICKUP), đã trung chuyển về Bưu cục Đặng Văn Bi...');

  const deliveryLocations = [
    // Cụm 1: Đường Đặng Văn Bi & Phường Bình Thọ
    { name: 'Anh Nguyễn Văn An', phone: '0981000001', addr: '12 Đặng Văn Bi, Phường Bình Thọ', lat: 10.8465, lng: 106.7595 },
    { name: 'Chị Trần Thị Bình', phone: '0981000002', addr: '45 Đặng Văn Bi, Phường Bình Thọ', lat: 10.8475, lng: 106.7605 },
    { name: 'Anh Bùi Hoàng Cường', phone: '0981000003', addr: '88 Đặng Văn Bi, Phường Bình Thọ', lat: 10.8485, lng: 106.7615 },
    { name: 'Chị Lê Mai Dung', phone: '0981000004', addr: '120 Đặng Văn Bi, Phường Bình Thọ', lat: 10.8502, lng: 106.7635 },
    { name: 'Anh Phạm Quốc Báo', phone: '0981000005', addr: '155 Đặng Văn Bi, Phường Trường Thọ', lat: 10.8515, lng: 106.7648 },
    { name: 'Chị Đỗ Thùy Trang', phone: '0981000006', addr: '190 Đặng Văn Bi, Phường Trường Thọ', lat: 10.8525, lng: 106.7660 },
    { name: 'Anh Vũ Đức Đạt', phone: '0981000007', addr: '215 Đặng Văn Bi, Phường Trường Thọ', lat: 10.8535, lng: 106.7672 },
    { name: 'Chị Trịnh Phương Thảo', phone: '0981000008', addr: '15 Đường Dân Chủ, Phường Bình Thọ', lat: 10.8490, lng: 106.7640 },
    { name: 'Anh Ngô Hữu Nghĩa', phone: '0981000009', addr: '32 Đường Bác Ái, Phường Bình Thọ', lat: 10.8480, lng: 106.7650 },
    { name: 'Chị Dương Minh Ánh', phone: '0981000010', addr: '64 Đường Thống Nhất, Phường Bình Thọ', lat: 10.8510, lng: 106.7630 },

    // Cụm 2: Đường Võ Văn Ngân & Ngã tư Thủ Đức
    { name: 'Anh Hoàng Văn Hùng', phone: '0981000011', addr: '10 Võ Văn Ngân, Phường Trường Thọ', lat: 10.8500, lng: 106.7680 },
    { name: 'Chị Đặng Thị Lan', phone: '0981000012', addr: '48 Võ Văn Ngân, Phường Bình Thọ', lat: 10.8512, lng: 106.7695 },
    { name: 'Anh Hồ Văn Nam', phone: '0981000013', addr: '85 Võ Văn Ngân, Phường Bình Thọ', lat: 10.8520, lng: 106.7710 },
    { name: 'Chị Phan Thu Hồng', phone: '0981000014', addr: '120 Võ Văn Ngân, Phường Linh Chiểu', lat: 10.8528, lng: 106.7725 },
    { name: 'Anh Nguyễn Minh Khôi', phone: '0981000015', addr: '160 Võ Văn Ngân, Phường Linh Chiểu', lat: 10.8538, lng: 106.7740 },
    { name: 'Chị Võ Tuyết Mai', phone: '0981000016', addr: '215 Võ Văn Ngân, Phường Linh Chiểu', lat: 10.8548, lng: 106.7755 },
    { name: 'Anh Cao Thanh Sơn', phone: '0981000017', addr: '250 Võ Văn Ngân, Phường Bình Thọ', lat: 10.8558, lng: 106.7770 },
    { name: 'Chị Lý Ngọc Trinh', phone: '0981000018', addr: '18 Đường Chu Văn An, Phường Bình Thọ', lat: 10.8505, lng: 106.7665 },
    { name: 'Anh Lâm Quốc Huy', phone: '0981000019', addr: '42 Đường Hòa Bình, Phường Bình Thọ', lat: 10.8492, lng: 106.7655 },
    { name: 'Chị Nguyễn Khánh Linh', phone: '0981000020', addr: '75 Đường Bác Ái, Phường Bình Thọ', lat: 10.8478, lng: 106.7645 },

    // Cụm 3: Đường Kha Vạn Cân & Phường Linh Đông
    { name: 'Anh Trịnh Gia Bảo', phone: '0981000021', addr: '500 Kha Vạn Cân, Phường Linh Đông', lat: 10.8445, lng: 106.7550 },
    { name: 'Chị Bùi Thị Hoa', phone: '0981000022', addr: '550 Kha Vạn Cân, Phường Linh Đông', lat: 10.8455, lng: 106.7565 },
    { name: 'Anh Nguyễn Hoàng Long', phone: '0981000023', addr: '610 Kha Vạn Cân, Phường Linh Đông', lat: 10.8468, lng: 106.7580 },
    { name: 'Chị Đinh Phương Linh', phone: '0981000024', addr: '680 Kha Vạn Cân, Phường Linh Chiểu', lat: 10.8480, lng: 106.7595 },
    { name: 'Anh Đỗ Thanh Tùng', phone: '0981000025', addr: '720 Kha Vạn Cân, Phường Linh Chiểu', lat: 10.8492, lng: 106.7610 },
    { name: 'Chị Lê Thị Tuyết', phone: '0981000026', addr: '790 Kha Vạn Cân, Phường Linh Chiểu', lat: 10.8505, lng: 106.7625 },
    { name: 'Anh Nguyễn Tiến Đạt', phone: '0981000027', addr: '850 Kha Vạn Cân, Phường Linh Chiểu', lat: 10.8518, lng: 106.7640 },
    { name: 'Chị Trần Kim Ngân', phone: '0981000028', addr: '910 Kha Vạn Cân, Phường Trường Thọ', lat: 10.8530, lng: 106.7655 },
    { name: 'Anh Bùi Minh Quân', phone: '0981000029', addr: '960 Kha Vạn Cân, Phường Trường Thọ', lat: 10.8542, lng: 106.7670 },
    { name: 'Chị Phạm Thu Trang', phone: '0981000030', addr: '1020 Kha Vạn Cân, Phường Linh Trung', lat: 10.8555, lng: 106.7685 },

    // Cụm 4: Đường Lê Văn Việt & Phước Long A/B
    { name: 'Anh Võ Hoàng Nam', phone: '0981000031', addr: '15 Lê Văn Việt, Phường Hiệp Phú', lat: 10.8450, lng: 106.7790 },
    { name: 'Chị Nguyễn Thanh Hương', phone: '0981000032', addr: '60 Lê Văn Việt, Phường Hiệp Phú', lat: 10.8462, lng: 106.7805 },
    { name: 'Anh Đặng Văn Khoa', phone: '0981000033', addr: '110 Lê Văn Việt, Phường Tăng Nhơn Phú A', lat: 10.8475, lng: 106.7820 },
    { name: 'Chị Bùi Ngọc Hà', phone: '0981000034', addr: '150 Lê Văn Việt, Phường Tăng Nhơn Phú A', lat: 10.8488, lng: 106.7835 },
    { name: 'Anh Bùi Văn Lộc', phone: '0981000035', addr: '200 Lê Văn Việt, Phường Tăng Nhơn Phú A', lat: 10.8500, lng: 106.7850 },
    { name: 'Chị Trịnh Mai Anh', phone: '0981000036', addr: '25 Đường số 3, Phường Phước Long B', lat: 10.8300, lng: 106.7620 },
    { name: 'Anh Ngô Hữu Thắng', phone: '0981000037', addr: '48 Đường số 5, Phường Phước Long B', lat: 10.8320, lng: 106.7640 },
    { name: 'Chị Đỗ Mỹ Linh', phone: '0981000038', addr: '90 Đường Tăng Nhơn Phú, Phường Phước Long B', lat: 10.8350, lng: 106.7680 },
    { name: 'Anh Hồ Văn Đức', phone: '0981000039', addr: '120 Đường Tăng Nhơn Phú, Phường Tăng Nhơn Phú B', lat: 10.8380, lng: 106.7710 },
    { name: 'Chị Lê Thị Hoài', phone: '0981000040', addr: '150 Đường Tăng Nhơn Phú, Phường Tăng Nhơn Phú B', lat: 10.8400, lng: 106.7730 },

    // Cụm 5: Đường Đỗ Xuân Hợp & Tây Hòa
    { name: 'Anh Nguyễn Văn Thành', phone: '0981000041', addr: '100 Đỗ Xuân Hợp, Phường Phước Long B', lat: 10.8260, lng: 106.7610 },
    { name: 'Chị Đặng Thu Thủy', phone: '0981000042', addr: '160 Đỗ Xuân Hợp, Phường Phước Long B', lat: 10.8280, lng: 106.7630 },
    { name: 'Anh Trần Văn Phát', phone: '0981000043', addr: '210 Đỗ Xuân Hợp, Phường Phước Long B', lat: 10.8300, lng: 106.7650 },
    { name: 'Chị Bùi Thảo Vân', phone: '0981000044', addr: '270 Đỗ Xuân Hợp, Phường Phước Long B', lat: 10.8320, lng: 106.7670 },
    { name: 'Anh Bùi Tiến Dũng', phone: '0981000045', addr: '320 Đỗ Xuân Hợp, Phường Phước Long A', lat: 10.8340, lng: 106.7690 },
    { name: 'Chị Nguyễn Phương Anh', phone: '0981000046', addr: '15 Đường Tây Hòa, Phường Phước Long A', lat: 10.8270, lng: 106.7580 },
    { name: 'Anh Đỗ Văn Hải', phone: '0981000047', addr: '45 Đường Tây Hòa, Phường Phước Long A', lat: 10.8285, lng: 106.7595 },
    { name: 'Chị Bùi Khánh Vân', phone: '0981000048', addr: '80 Đường Tây Hòa, Phường Phước Long A', lat: 10.8300, lng: 106.7610 },
    { name: 'Anh Hoàng Văn Nam', phone: '0981000049', addr: '110 Đường Nam Hòa, Phường Phước Long A', lat: 10.8255, lng: 106.7570 },
    { name: 'Chị Lê Thị Thanh', phone: '0981000050', addr: '140 Đường Nam Hòa, Phường Phước Long A', lat: 10.8265, lng: 106.7585 },
  ];

  for (let i = 0; i < 50; i++) {
    const custIndex = i % 5;
    const customer = createdCustomers[custIndex];
    const meta = customer.meta;
    const loc = deliveryLocations[i];
    const orderIndex = i + 1;
    const orderCode = `ORD-TD-${String(orderIndex).padStart(3, '0')}`;
    const packageCode = `PKG-TD-${String(orderIndex).padStart(3, '0')}`;
    const shipmentCode = `SPM-TD-${String(orderIndex).padStart(3, '0')}`;

    // 1. Tạo địa chỉ LẤY HÀNG tận nơi tại Shop/Kho gửi của Khách hàng
    const pickupAddress = await prisma.address.create({
      data: {
        addressLine1: meta.pickupAddr.split(',')[0],
        wardCode: await getWardCode(meta.pickupAddr),
        country: 'Vietnam',
        latitude: meta.lat,
        longitude: meta.lng,
      },
    });

    // 2. Tạo địa chỉ GIẢI HÀNG chặng cuối xung quanh Bưu cục Đặng Văn Bi
    const deliveryAddress = await prisma.address.create({
      data: {
        addressLine1: loc.addr.split(',')[0],
        wardCode: await getWardCode(loc.addr),
        country: 'Vietnam',
        latitude: loc.lat,
        longitude: loc.lng,
      },
    });

    // 3. Tạo đơn hàng (Shipper LẤY TẬN NƠI (PICKUP) tại Shop ➔ Đưa về Bưu cục gửi ➔ Vận chuyển kho về Bưu cục Đặng Văn Bi)
    const order = await prisma.order.upsert({
      where: { orderCode },
      update: {
        pickupType: PickupType.PICKUP,
        originFacilityId: meta.hub.id,
        destinationFacilityId: hub1.id,
        status: OrderStatus.AT_HUB,
        pickupAddressId: pickupAddress.id,
        pickupAddressText: pickupAddress.addressLine1,
        pickupLatitude: pickupAddress.latitude,
        pickupLongitude: pickupAddress.longitude,
      },
      create: {
        orderCode,
        customerId: customer.id,
        serviceId: expressService.id,
        pickupAddressId: pickupAddress.id,
        pickupAddressText: pickupAddress.addressLine1,
        pickupLatitude: pickupAddress.latitude,
        pickupLongitude: pickupAddress.longitude,
        deliveryAddressId: deliveryAddress.id,
        receiverName: loc.name,
        receiverPhone: loc.phone,
        deliveryAddressText: deliveryAddress.addressLine1,
        deliveryLatitude: loc.lat,
        deliveryLongitude: loc.lng,
        estimatedShippingFee: 25000,
        estimatedInsuranceFee: 0,
        estimatedCodAmount: (i % 3 === 0) ? 180000 : 0,
        estimatedDistance: 4.8,
        estimatedDuration: 20,
        status: OrderStatus.AT_HUB,
        pickupType: PickupType.PICKUP, // Shipper lấy hàng tận nơi
        originFacilityId: meta.hub.id, // Kho xuất phát gửi (Linh Trung / Phước Long / An Phú)
        destinationFacilityId: hub1.id, // Kho nhận chặng cuối (Đặng Văn Bi)
        createdBy: customer.userId,
      },
    });

    // 4. Tạo Kiện hàng hiện đã về tới Kho Bưu cục Đặng Văn Bi
    const pkg = await prisma.package.upsert({
      where: { packageCode },
      update: {
        currentFacilityId: hub1.id,
      },
      create: {
        orderId: order.id,
        packageCode,
        weight: 1.5 + (i % 4) * 0.5,
        length: 20,
        width: 15,
        height: 10,
        volume: 0.003,
        currentFacilityId: hub1.id, // Hiện đã nằm tại Kho Đặng Văn Bi
      },
    });

    // 5. Tạo Phiếu vận chuyển Shipment (Status AT_HUB - Sẵn sàng cho AI phân cụm lộ trình phát)
    const shipment = await prisma.shipment.upsert({
      where: { shipmentCode },
      update: {
        originFacilityId: meta.hub.id,
        destinationFacilityId: hub1.id,
        status: ShipmentStatus.AT_HUB,
      },
      create: {
        shipmentCode,
        originFacilityId: meta.hub.id,
        destinationFacilityId: hub1.id,
        status: ShipmentStatus.AT_HUB,
        createdBy: customer.userId,
      },
    });

    // Nối Shipment và Package
    await prisma.shipmentPackage.upsert({
      where: {
        shipmentId_packageId: {
          shipmentId: shipment.id,
          packageId: pkg.id,
        },
      },
      update: {},
      create: {
        shipmentId: shipment.id,
        packageId: pkg.id,
      },
    });
  }

  console.log('🎉 Hoàn tất nạp lại dữ liệu Test 50 Đơn hàng TP. Thủ Đức chuẩn nghiệp vụ PICKUP & CHUYỂN KHO!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi nạp dữ liệu seed test:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
