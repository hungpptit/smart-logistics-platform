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

  const addrHub5 = await prisma.address.create({
    data: {
      addressLine1: '97 Đường Man Thiện, Phường Tăng Nhơn Phú A, TP. Thủ Đức, TP. Hồ Chí Minh',
      wardCode: await getWardCode('Phường Tăng Nhơn Phú A'),
      country: 'Vietnam',
      latitude: 10.8465,
      longitude: 106.7865,
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

  // Bưu cục Tăng Nhơn Phú (Kho gửi 4 - Đường Man Thiện)
  const hub5 = await prisma.facility.upsert({
    where: { facilityCode: 'FAC-TD-TANGNHONPHU' },
    update: {
      parentFacilityId: provincialHub.id,
      provinceCode: '79',
      addressId: addrHub5.id,
    },
    create: {
      facilityCode: 'FAC-TD-TANGNHONPHU',
      facilityName: 'Bưu cục Tăng Nhơn Phú - TP. Thủ Đức',
      facilityTypeId: lastMileFacilityType.id,
      parentFacilityId: provincialHub.id,
      provinceCode: '79',
      addressId: addrHub5.id,
      operatingStatus: FacilityStatus.ACTIVE,
      openedAt: new Date('2025-01-01'),
    },
  });

  // 2.5 Tạo Phân Khu Kho (FacilityZone) Phân Cấp Chuẩn Logistics cho TOÀN BỘ Kho Bãi trong CSDL
  console.log('📦 Khởi tạo Phân Khu Kho (FacilityZone) 3 Cấp cho TOÀN BỘ Bưu cục & Kho Tổng...');
  const dbFacilities = await prisma.facility.findMany({
    include: { facilityType: true },
  });

  for (const fac of dbFacilities) {
    const typeCode = fac.facilityType.typeCode;
    let zonesForFacility: { code: string; name: string; type: string; capacity?: number }[] = [];

    if (typeCode === 'SORTING_CENTER') {
      // 🏬 CẤP 1: MEGA SORTER CENTER (Tổng Kho Miền)
      zonesForFacility = [
        { code: 'ZONE-S-UNLOADING', name: 'Sàn Hạ Bãi Xe Tải Container 15 Tấn', type: 'RECEIVING', capacity: 2000 },
        { code: 'ZONE-S-AUTOMATED-SORTER', name: 'Phân Khu Băng Chuyền Phân Loại Tự Động Cross-Docking', type: 'SORTING', capacity: 5000 },
        { code: 'ZONE-S-NORTH-DISPATCH', name: 'Khu Xuất Hàng Tuyến Miền Bắc & Hà Nội', type: 'SHIPPING', capacity: 2000 },
        { code: 'ZONE-S-CENTRAL-DISPATCH', name: 'Khu Xuất Hàng Tuyến Miền Trung & Đà Nẵng', type: 'SHIPPING', capacity: 2000 },
        { code: 'ZONE-S-SOUTH-DISPATCH', name: 'Khu Xuất Hàng Tuyến Miền Nam & Miền Tây', type: 'SHIPPING', capacity: 2000 },
        { code: 'ZONE-S-HOLDING', name: 'Khu Lưu Hàng Tạm Chờ Xe Tải Đêm', type: 'STORAGE', capacity: 1500 },
      ];
    } else if (typeCode === 'PROVINCIAL_HUB') {
      // 🏢 CẤP 2: PROVINCIAL HUB (Kho Tổng Tỉnh / Thành Phố)
      zonesForFacility = [
        { code: 'ZONE-P-INBOUND', name: 'Bãi Nhập Hàng Xe Tải Bưu Cục Phường', type: 'RECEIVING', capacity: 1000 },
        { code: 'ZONE-P-INTRA-PROVINCE', name: 'Khu Phân Loại & Chia Tuyến Nội Tỉnh', type: 'SORTING', capacity: 2000 },
        { code: 'ZONE-P-INTER-HUB', name: 'Khu Xuất Hàng Đi Sorter Trung Tâm / Liên Tỉnh', type: 'SHIPPING', capacity: 1500 },
        { code: 'ZONE-P-DISTRICT-HOLD', name: 'Khu Xếp Hàng Phân Theo Quận / Huyện', type: 'STORAGE', capacity: 1000 },
      ];
    } else {
      // 🏬 CẤP 3: WARD STATION / LAST MILE FACILITY (Bưu Cục Phường / Xã)
      zonesForFacility = [
        { code: 'ZONE-W-REC', name: 'Khu Tiếp Nhận & Bàn Giao Hàng', type: 'RECEIVING', capacity: 500 },
        { code: 'ZONE-W-LOCAL', name: 'Khu Giao Hàng Nội Phường (Cùng Bưu Cục)', type: 'SORTING', capacity: 800 },
        { code: 'ZONE-W-PROVINCE-DISPATCH', name: 'Khu Xuất Hàng Đi Kho Tỉnh / TP', type: 'SHIPPING', capacity: 600 },
        { code: 'ZONE-W-RETURN', name: 'Khu Lưu Kho & Hàng Cho Chuyển Hoàn', type: 'RETURN', capacity: 300 },
      ];
    }

    for (const z of zonesForFacility) {
      await prisma.facilityZone.upsert({
        where: {
          facilityId_zoneCode: {
            facilityId: fac.id,
            zoneCode: z.code,
          },
        },
        update: {
          zoneName: z.name,
          zoneType: z.type as any,
          capacity: z.capacity || 500,
        },
        create: {
          facilityId: fac.id,
          zoneCode: z.code,
          zoneName: z.name,
          zoneType: z.type as any,
          capacity: z.capacity || 500,
        },
      });
    }
  }

  // 3. Tạo Nhân viên Kho (bao gồm Kho Bưu cục & Kho Trung chuyển Hub/Sorter)
  console.log('👤 Tạo Nhân viên kho (Staff cho Bưu cục & Kho Trung chuyển)...');

  // Lấy thêm bưu cục Bà Rịa - Vũng Tàu (FAC-000050) nếu có
  const facBrvt = await prisma.facility.findFirst({
    where: { OR: [{ facilityCode: 'FAC-000050' }, { facilityName: { contains: 'Xuân Sơn' } }] },
  });

  const staffData = [
    { username: 'stf_dangvanbi_1', name: 'Trần Văn Khoa (Kho Đặng Văn Bi 1)', facilityId: hub1.id, code: 'STF-TD-01' },
    { username: 'stf_dangvanbi_2', name: 'Lê Thị Xuân (Kho Đặng Văn Bi 2)', facilityId: hub1.id, code: 'STF-TD-02' },
    { username: 'stf_linhtrung_1', name: 'Phạm Văn Bình (Kho Linh Trung)', facilityId: hub2.id, code: 'STF-TD-03' },
    { username: 'stf_phuoclong_1', name: 'Nguyễn Văn Minh (Kho Phước Long)', facilityId: hub3.id, code: 'STF-TD-04' },
    { username: 'stf_tangnhonphu_1', name: 'Vũ Văn Hoàng (Kho Tăng Nhơn Phú)', facilityId: hub5.id, code: 'STF-TD-05' },
    // Nhân viên Kho Trung chuyển Tỉnh/Sorter
    { username: 'stf_sorter_south_1', name: 'Trần Văn Thắng (Thủ kho Tổng Kho Miền Nam Q.12)', facilityId: sortingCenter.id, code: 'STF-HUB-01' },
    { username: 'stf_hub_hcm_1', name: 'Đặng Hoàng Lâm (Thủ kho Kho Tổng TP.HCM Tân Bình)', facilityId: provincialHub.id, code: 'STF-HUB-02' },
    { username: 'stf_hub_brvt_1', name: 'Vũ Đức Anh (Thủ kho Bưu Cục Xuân Sơn BR-VT)', facilityId: facBrvt?.id || hub1.id, code: 'STF-HUB-03' },
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

  // 4. Tạo Shipper Chặng Cuối & Tài Xế Xe Tải Trung Chuyển Đường Dài
  console.log('🛵 Tạo Shipper Xe Máy & 🚛 Tài Xế Xe Tải Trung Chuyển Linehaul...');
  const truckType = await prisma.vehicleType.findFirst({
    where: { OR: [{ typeCode: 'TRUCK' }, { typeCode: 'CONTAINER' }, { typeCode: 'HEAVY_TRUCK' }] },
  });

  const shipperData = [
    // Đặng Văn Bi (3 Shipper chặng cuối)
    { username: 'shp_dangvanbi_1', name: 'Nguyễn Văn Hùng', facilityId: hub1.id, code: 'DRV-TD-01', plate: '59-X1 111.01', isTruck: false, lat: 10.8490, lng: 106.7620 },
    { username: 'shp_dangvanbi_2', name: 'Trần Quốc Bảo', facilityId: hub1.id, code: 'DRV-TD-02', plate: '59-X1 111.02', isTruck: false, lat: 10.8480, lng: 106.7640 },
    { username: 'shp_dangvanbi_3', name: 'Phạm Hoàng Nam', facilityId: hub1.id, code: 'DRV-TD-03', plate: '59-X1 111.03', isTruck: false, lat: 10.8510, lng: 106.7610 },
    // Linh Trung (2 Shipper)
    { username: 'shp_linhtrung_1', name: 'Lê Văn Đức', facilityId: hub2.id, code: 'DRV-TD-04', plate: '59-X1 111.04', isTruck: false, lat: 10.8570, lng: 106.7740 },
    { username: 'shp_linhtrung_2', name: 'Vũ Văn Khải', facilityId: hub2.id, code: 'DRV-TD-05', plate: '59-X1 111.05', isTruck: false, lat: 10.8590, lng: 106.7760 },
    // Phước Long (2 Shipper)
    { username: 'shp_phuoclong_1', name: 'Bùi Thanh Tùng', facilityId: hub3.id, code: 'DRV-TD-06', plate: '59-X1 111.06', isTruck: false, lat: 10.8240, lng: 106.7590 },
    { username: 'shp_phuoclong_2', name: 'Đặng Quang Huy', facilityId: hub3.id, code: 'DRV-TD-07', plate: '59-X1 111.07', isTruck: false, lat: 10.8260, lng: 106.7610 },
    // Tăng Nhơn Phú (2 Shipper)
    { username: 'shp_tangnhonphu_1', name: 'Đỗ Văn Nam', facilityId: hub5.id, code: 'DRV-TD-08', plate: '59-X1 111.08', isTruck: false, lat: 10.8460, lng: 106.7860 },
    { username: 'shp_tangnhonphu_2', name: 'Trịnh Hoàng Long', facilityId: hub5.id, code: 'DRV-TD-09', plate: '59-X1 111.09', isTruck: false, lat: 10.8470, lng: 106.7870 },

    // 🚛 TÀI XẾ XE TẢI TRUNG CHUYỂN LIÊN KHO (LINEHAUL TRUCK DRIVERS)
    { username: 'drv_linehaul_hcm', name: 'Phạm Quốc Hùng (Tài xế Xe Tải Kho Tổng TP.HCM)', facilityId: provincialHub.id, code: 'DRV-LH-01', plate: '50H-888.01', isTruck: true, lat: 10.8050, lng: 106.6500 },
    { username: 'drv_linehaul_dongnai', name: 'Nguyễn Tấn Đạt (Tài xế Xe Tải Tổng Kho Q.12)', facilityId: sortingCenter.id, code: 'DRV-LH-02', plate: '60C-999.02', isTruck: true, lat: 10.8520, lng: 106.6200 },
    { username: 'drv_linehaul_brvt', name: 'Trần Hoàng Nam (Tài xế Xe Tải Bưu Cục BR-VT)', facilityId: facBrvt?.id || hub1.id, code: 'DRV-LH-03', plate: '72C-777.03', isTruck: true, lat: 10.6470, lng: 107.3291 },
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
        driverLicenseNumber: sh.isTruck ? `GPLX-LH-88${sh.code.slice(-2)}` : `GPLX-TD-99${sh.code.slice(-2)}`,
        driverLicenseClass: sh.isTruck ? 'C' : 'A1',
        driverTypes: {
          create: [{ driverType: sh.isTruck ? 'LINEHAUL_TRANSFER' : 'HUB_DELIVERY' }],
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
        vehicleTypeId: sh.isTruck ? (truckType?.id || motorbikeType.id) : motorbikeType.id,
        assignedFacilityId: sh.facilityId,
        maxWeight: sh.isTruck ? 15000.0 : 150.0,
        maxVolume: sh.isTruck ? 45.0 : 0.5,
        maxLength: sh.isTruck ? 8.5 : 1.2,
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
    { username: 'cust_thuduc_6', name: 'Cửa Hàng Thiết Bị Số Man Thiện', code: 'CUST-TD-06', phone: '0903000006', type: CustomerType.BUSINESS, hub: hub5, pickupAddr: '97 Đường Man Thiện, Phường Tăng Nhơn Phú A', lat: 10.8465, lng: 106.7865 },
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

    // 6. Tạo Lịch sử Trạng thái Đơn hàng (Order Status History)
    await prisma.orderStatusHistory.createMany({
      data: [
        {
          orderId: order.id,
          status: OrderStatus.CREATED,
          changedByUserId: customer.userId,
          reason: `Đơn hàng ${orderCode} được khởi tạo thành công trên hệ thống.`,
        },
        {
          orderId: order.id,
          status: OrderStatus.AT_HUB,
          changedByUserId: customer.userId,
          reason: `Hàng hóa đã được nhập kho Bưu cục Đặng Văn Bi và sẵn sàng gom cụm AI.`,
        },
      ],
      skipDuplicates: true,
    });

    // 7. Tạo Nhật ký Sự kiện Vận chuyển ban đầu (Tracking Events)
    await prisma.trackingEvent.createMany({
      data: [
        {
          shipmentId: shipment.id,
          eventType: 'CREATED',
          description: `Vận đơn ${shipmentCode} đã được tạo cho đơn hàng ${orderCode}.`,
          latitude: meta.lat,
          longitude: meta.lng,
          createdBy: customer.userId,
        },
        {
          shipmentId: shipment.id,
          eventType: 'ARRIVED_FACILITY',
          description: `Vận đơn ${shipmentCode} đã nhập kho Bưu cục Đặng Văn Bi (TP. Thủ Đức).`,
          latitude: 10.8495,
          longitude: 106.7625,
          createdBy: customer.userId,
        },
      ],
      skipDuplicates: true,
    });
  }

  // ==========================================
  // 3. TẠO ĐƠN HÀNG LIÊN MIỀN 3 CẤP KHO (HÀ NỘI ➔ TPHCM)
  // Quy trình: Ward (HN) -> Provincial Hub (HN) -> Sorter (HN) -> Sorter (HCM) -> Provincial Hub (HCM) -> Ward (Đặng Văn Bi)
  // ==========================================
  console.log('✈️ Tạo Đơn hàng liên miền Hà Nội ➔ TP.HCM quy trình Vận chuyển 3 Cấp Kho (ORD-INTER-001)...');

  // Địa chỉ kho Hà Nội
  const addrSCHN = await prisma.address.create({
    data: {
      addressLine1: 'Số 1 Đường Nguyễn Văn Linh, Phường Gia Thụy, Quận Long Biên, Hà Nội',
      country: 'Vietnam',
      latitude: 21.0500,
      longitude: 105.9000,
    },
  });

  const sortingCenterHN = await prisma.facility.upsert({
    where: { facilityCode: 'FAC-SC-NORTH' },
    update: {},
    create: {
      facilityCode: 'FAC-SC-NORTH',
      facilityName: 'Tổng Kho Miền Bắc (Sorting Center Long Biên, Hà Nội)',
      facilityTypeId: sortingCenterType.id,
      parentFacilityId: null,
      provinceCode: '01',
      addressId: addrSCHN.id,
      operatingStatus: FacilityStatus.ACTIVE,
      openedAt: new Date('2025-01-01'),
    },
  });

  const addrHubHN = await prisma.address.create({
    data: {
      addressLine1: 'Số 68 Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội',
      country: 'Vietnam',
      latitude: 21.0300,
      longitude: 105.7800,
    },
  });

  const provincialHubHN = await prisma.facility.upsert({
    where: { facilityCode: 'FAC-HUB-HN' },
    update: {},
    create: {
      facilityCode: 'FAC-HUB-HN',
      facilityName: 'Kho Tổng Hà Nội (Provincial Hub Cầu Giấy)',
      facilityTypeId: provincialHubType.id,
      parentFacilityId: sortingCenterHN.id,
      provinceCode: '01',
      addressId: addrHubHN.id,
      operatingStatus: FacilityStatus.ACTIVE,
      openedAt: new Date('2025-01-01'),
    },
  });

  const addrStationHN = await prisma.address.create({
    data: {
      addressLine1: '25 Hàng Bạc, Phường Hàng Bạc, Quận Hoàn Kiếm, Hà Nội',
      country: 'Vietnam',
      latitude: 21.0335,
      longitude: 105.8525,
    },
  });

  const wardStationHN = await prisma.facility.upsert({
    where: { facilityCode: 'FAC-WM-HOANKIEM' },
    update: {},
    create: {
      facilityCode: 'FAC-WM-HOANKIEM',
      facilityName: 'Bưu cục Hoàn Kiếm (Ward Station Hà Nội)',
      facilityTypeId: lastMileFacilityType.id,
      parentFacilityId: provincialHubHN.id,
      provinceCode: '01',
      addressId: addrStationHN.id,
      operatingStatus: FacilityStatus.ACTIVE,
      openedAt: new Date('2025-01-01'),
    },
  });

  // Tạo địa chỉ nhận tại Đặng Văn Bi Thủ Đức
  const interOrderCode = 'ORD-INTER-001';
  const interPackageCode = 'PKG-INTER-001';
  const interShipmentCode = 'SPM-INTER-001';
  const customerHN = createdCustomers[0];

  const interOrder = await prisma.order.upsert({
    where: { orderCode: interOrderCode },
    update: {
      status: OrderStatus.AT_HUB,
    },
    create: {
      orderCode: interOrderCode,
      customerId: customerHN.id,
      serviceId: expressService.id,
      pickupAddressId: addrStationHN.id,
      pickupAddressText: '25 Hàng Bạc, Phường Hàng Bạc, Quận Hoàn Kiếm, Hà Nội',
      pickupLatitude: 21.0335,
      pickupLongitude: 105.8525,
      deliveryAddressId: addrHub1.id,
      receiverName: 'Anh Phạm Văn Nam',
      receiverPhone: '0909998877',
      deliveryAddressText: '180 Đặng Văn Bi, Phường Bình Thọ, TP. Thủ Đức, TP. Hồ Chí Minh',
      deliveryLatitude: 10.8495,
      deliveryLongitude: 106.7625,
      estimatedShippingFee: 55000,
      estimatedInsuranceFee: 5000,
      estimatedCodAmount: 350000,
      estimatedDistance: 1720,
      estimatedDuration: 2880,
      status: OrderStatus.AT_HUB,
      pickupType: PickupType.PICKUP,
      originFacilityId: wardStationHN.id,
      destinationFacilityId: hub1.id,
      createdBy: customerHN.userId,
    },
  });

  const interPkg = await prisma.package.upsert({
    where: { packageCode: interPackageCode },
    update: { currentFacilityId: hub1.id },
    create: {
      orderId: interOrder.id,
      packageCode: interPackageCode,
      weight: 2.5,
      length: 30,
      width: 20,
      height: 15,
      volume: 0.009,
      currentFacilityId: hub1.id,
    },
  });

  const interShipment = await prisma.shipment.upsert({
    where: { shipmentCode: interShipmentCode },
    update: { status: ShipmentStatus.AT_HUB },
    create: {
      shipmentCode: interShipmentCode,
      originFacilityId: wardStationHN.id,
      destinationFacilityId: hub1.id,
      status: ShipmentStatus.AT_HUB,
      createdBy: customerHN.userId,
    },
  });

  await prisma.shipmentPackage.upsert({
    where: { shipmentId_packageId: { shipmentId: interShipment.id, packageId: interPkg.id } },
    update: {},
    create: { shipmentId: interShipment.id, packageId: interPkg.id },
  });

  // Tạo 13 Mốc Sự kiện Vận chuyển Luân chuyển Liên miền 3 Cấp Kho
  await prisma.trackingEvent.deleteMany({ where: { shipmentId: interShipment.id } });
  await prisma.trackingEvent.createMany({
    data: [
      {
        shipmentId: interShipment.id,
        eventType: 'CREATED',
        description: 'Vận đơn SPM-INTER-001 đã được tạo cho đơn hàng liên miền ORD-INTER-001 tại Quận Hoàn Kiếm, Hà Nội.',
        latitude: 21.0335,
        longitude: 105.8525,
        createdBy: customerHN.userId,
      },
      {
        shipmentId: interShipment.id,
        eventType: 'PICKED_UP',
        description: 'Tài xế đã tiếp nhận thành công kiện hàng tại 25 Hàng Bạc, Hoàn Kiếm, Hà Nội.',
        latitude: 21.0335,
        longitude: 105.8525,
        createdBy: customerHN.userId,
      },
      {
        shipmentId: interShipment.id,
        eventType: 'ARRIVED_FACILITY',
        description: 'Đã nhập kho Bưu cục Hoàn Kiếm (Hà Nội).',
        latitude: 21.0330,
        longitude: 105.8520,
        createdBy: customerHN.userId,
      },
      {
        shipmentId: interShipment.id,
        eventType: 'DEPARTED_FACILITY',
        description: 'Xuất kho Bưu cục Hoàn Kiếm luân chuyển lên Kho Tổng Hà Nội.',
        latitude: 21.0330,
        longitude: 105.8520,
        createdBy: customerHN.userId,
      },
      {
        shipmentId: interShipment.id,
        eventType: 'ARRIVED_HUB',
        description: 'Đã nhập kho Kho Tổng Hà Nội (Provincial Hub Cầu Giấy).',
        latitude: 21.0300,
        longitude: 105.7800,
        createdBy: customerHN.userId,
      },
      {
        shipmentId: interShipment.id,
        eventType: 'DEPARTED_HUB',
        description: 'Xe tải trung chuyển xuất Kho Tổng Hà Nội lên Tổng Kho Miền Bắc.',
        latitude: 21.0300,
        longitude: 105.7800,
        createdBy: customerHN.userId,
      },
      {
        shipmentId: interShipment.id,
        eventType: 'ARRIVED_HUB',
        description: 'Đã nhập Tổng Kho Miền Bắc (Sorting Center Long Biên, Hà Nội) - Đang phân loại liên miền.',
        latitude: 21.0500,
        longitude: 105.9000,
        createdBy: customerHN.userId,
      },
      {
        shipmentId: interShipment.id,
        eventType: 'DEPARTED_HUB',
        description: 'Xuất Tổng Kho Miền Bắc vận chuyển đường dài vào TP. Hồ Chí Minh.',
        latitude: 21.0500,
        longitude: 105.9000,
        createdBy: customerHN.userId,
      },
      {
        shipmentId: interShipment.id,
        eventType: 'ARRIVED_HUB',
        description: 'Đã cập bến và nhập kho Tổng Kho Miền Nam (Sorting Center Q.12, TP.HCM).',
        latitude: 10.8520,
        longitude: 106.6200,
        createdBy: customerHN.userId,
      },
      {
        shipmentId: interShipment.id,
        eventType: 'DEPARTED_HUB',
        description: 'Phân loại xong, xe tải trung chuyển xuất kho Tổng Kho Miền Nam về Kho Tổng TP.HCM.',
        latitude: 10.8520,
        longitude: 106.6200,
        createdBy: customerHN.userId,
      },
      {
        shipmentId: interShipment.id,
        eventType: 'ARRIVED_HUB',
        description: 'Đã nhập kho Kho Tổng TP. Hồ Chí Minh (Provincial Hub Tân Bình).',
        latitude: 10.8050,
        longitude: 106.6500,
        createdBy: customerHN.userId,
      },
      {
        shipmentId: interShipment.id,
        eventType: 'DEPARTED_FACILITY',
        description: 'Xuất kho Kho Tổng TP.HCM về bưu cục phát chặng cuối Đặng Văn Bi.',
        latitude: 10.8050,
        longitude: 106.6500,
        createdBy: customerHN.userId,
      },
      {
        shipmentId: interShipment.id,
        eventType: 'ARRIVED_FACILITY',
        description: 'Đã cập bến Bưu cục Đặng Văn Bi - TP. Thủ Đức. Sẵn sàng cho AI phân tuyến Shipper phát tận nhà!',
        latitude: 10.8495,
        longitude: 106.7625,
        createdBy: customerHN.userId,
      },
    ],
  });

  console.log('🎉 Hoàn tất nạp lại dữ liệu Test 50 Đơn hàng TP. Thủ Đức + 1 Đơn liên miền 3 Cấp Kho (ORD-INTER-001)!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi nạp dữ liệu seed test:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
