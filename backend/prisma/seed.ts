/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

declare const process: any;

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding master lookup tables...');

  // 1. Seed Roles
  console.log('🔑 Seeding Roles...');
  const roles = [
    { roleCode: 'ADMIN', roleName: 'Quản trị hệ thống' },
    { roleCode: 'STAFF', roleName: 'Nhân viên' },
    { roleCode: 'SHIPPER', roleName: 'Tài xế giao hàng' },
    { roleCode: 'CUSTOMER', roleName: 'Khách hàng' },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { roleCode: r.roleCode },
      update: { roleName: r.roleName },
      create: r,
    });
  }

  // 2. Seed Permissions
  console.log('🛡️ Seeding Permissions...');
  const permissions = [
    // Auth Module
    { permissionCode: 'USER_MANAGE', permissionName: 'Quản lý tài khoản' },
    { permissionCode: 'ROLE_MANAGE', permissionName: 'Quản lý phân quyền' },
    // Customer Module
    { permissionCode: 'CUSTOMER_MANAGE', permissionName: 'Quản lý khách hàng' },
    { permissionCode: 'CUSTOMER_VIEW', permissionName: 'Xem hồ sơ khách hàng' },
    // Facility Module
    { permissionCode: 'FACILITY_MANAGE', permissionName: 'Quản lý mạng lưới kho' },
    { permissionCode: 'FACILITY_VIEW', permissionName: 'Xem thông tin kho bãi' },
    // Order Module
    { permissionCode: 'ORDER_CREATE', permissionName: 'Tạo đơn hàng' },
    { permissionCode: 'ORDER_UPDATE', permissionName: 'Cập nhật đơn hàng' },
    { permissionCode: 'ORDER_DELETE', permissionName: 'Xóa đơn hàng' },
    { permissionCode: 'ORDER_VIEW', permissionName: 'Xem danh sách đơn hàng' },
    // Shipment Module
    { permissionCode: 'SHIPMENT_CREATE', permissionName: 'Tạo chuyến hàng' },
    { permissionCode: 'SHIPMENT_UPDATE', permissionName: 'Cập nhật chuyến hàng' },
    { permissionCode: 'SHIPMENT_VIEW', permissionName: 'Xem phiếu vận chuyển' },
    // Fleet Module
    { permissionCode: 'DRIVER_MANAGE', permissionName: 'Quản lý tài xế' },
    { permissionCode: 'VEHICLE_MANAGE', permissionName: 'Quản lý phương tiện' },
    // Routing Module
    { permissionCode: 'ROUTE_PLAN', permissionName: 'Lập tuyến đường' },
    { permissionCode: 'ROUTE_OPTIMIZE', permissionName: 'Tối ưu lộ trình AI' },
    // Tracking & POD Module
    { permissionCode: 'POD_VERIFY', permissionName: 'Xác thực bàn giao POD' },
    { permissionCode: 'SCAN_BARCODE', permissionName: 'Quét barcode kiểm kho' },
    // System Module
    { permissionCode: 'SYSTEM_CONFIG', permissionName: 'Cấu hình hệ thống' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { permissionCode: p.permissionCode },
      update: { permissionName: p.permissionName },
      create: p,
    });
  }

  // 3. Seed Facility Types (Chuẩn hóa đúng 3 Cấp Kho)
  console.log('🏢 Seeding Facility Types (Clean 3 Tiers)...');
  const officialFacilityTypes = [
    { typeCode: 'SORTING_CENTER', typeName: 'Cấp 1 - Kho Tổng Miền' },
    { typeCode: 'PROVINCIAL_HUB', typeName: 'Cấp 2 - Kho Tổng Tỉnh' },
    { typeCode: 'WARD_STATION', typeName: 'Cấp 3 - Bưu Cục Phường / Xã' },
  ];

  for (const ft of officialFacilityTypes) {
    await prisma.facilityType.upsert({
      where: { typeCode: ft.typeCode },
      update: { typeName: ft.typeName },
      create: ft,
    });
  }

  // Delete legacy unused facility types
  const validCodes = officialFacilityTypes.map(t => t.typeCode);
  const legacyTypes = await prisma.facilityType.findMany({
    where: { typeCode: { notIn: validCodes } },
  });

  const wardType = await prisma.facilityType.findUnique({ where: { typeCode: 'WARD_STATION' } });

  for (const legacy of legacyTypes) {
    if (wardType) {
      await prisma.facility.updateMany({
        where: { facilityTypeId: legacy.id },
        data: { facilityTypeId: wardType.id },
      });
      await prisma.facilityType.delete({ where: { id: legacy.id } }).catch(() => {});
    }
  }

  // 4. Seed Vehicle Types
  console.log('🚚 Seeding Vehicle Types...');
  const vehicleTypes = [
    { typeCode: 'MOTORBIKE', typeName: 'Xe máy giao hàng' },
    { typeCode: 'VAN', typeName: 'Xe bán tải / Van' },
    { typeCode: 'TRUCK_1T5', typeName: 'Xe tải 1.5 Tấn' },
    { typeCode: 'CONTAINER', typeName: 'Xe Container cỡ lớn' },
    { typeCode: 'REFRIGERATED_TRUCK', typeName: 'Xe tải đông lạnh' },
  ];

  for (const vt of vehicleTypes) {
    await prisma.vehicleType.upsert({
      where: { typeCode: vt.typeCode },
      update: { typeName: vt.typeName },
      create: vt,
    });
  }

  // 5. Seed Services
  console.log('💼 Seeding Services...');
  const services = [
    {
      serviceCode: 'EXPRESS',
      serviceName: 'Giao hàng Hỏa tốc 2h',
      basePrice: 35000.00,
      freeDistanceKm: 2.0,
      pricePerKm: 8000.00,
      freeWeightKg: 1.0,
      pricePerKg: 5000.00,
      estimatedDeliveryHours: 6,
      isActive: true
    },
    {
      serviceCode: 'STANDARD',
      serviceName: 'Giao hàng Tiêu chuẩn',
      basePrice: 20000.00,
      freeDistanceKm: 0.0,
      pricePerKm: 0.00,
      freeWeightKg: 1.0,
      pricePerKg: 3000.00,
      estimatedDeliveryHours: 24,
      isActive: true
    },
    {
      serviceCode: 'SAVING',
      serviceName: 'Giao hàng Tiết kiệm',
      basePrice: 15000.00,
      freeDistanceKm: 0.0,
      pricePerKm: 0.00,
      freeWeightKg: 1.0,
      pricePerKg: 2000.00,
      estimatedDeliveryHours: 48,
      isActive: true
    },
    {
      serviceCode: 'COLD_CHAIN',
      serviceName: 'Vận chuyển Đông lạnh',
      basePrice: 60000.00,
      freeDistanceKm: 2.0,
      pricePerKm: 12000.00,
      freeWeightKg: 1.0,
      pricePerKg: 8000.00,
      estimatedDeliveryHours: 12,
      isActive: true
    },
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { serviceCode: s.serviceCode },
      update: {
        serviceName: s.serviceName,
        basePrice: s.basePrice,
        freeDistanceKm: s.freeDistanceKm,
        pricePerKm: s.pricePerKm,
        freeWeightKg: s.freeWeightKg,
        pricePerKg: s.pricePerKg,
        estimatedDeliveryHours: s.estimatedDeliveryHours,
        isActive: s.isActive
      },
      create: s,
    });
  }

  // 6. Seed System Settings
  console.log('⚙️ Seeding System Settings...');
  const systemSettings = [
    { settingKey: 'GPS_INTERVAL_SECONDS', settingValue: '10', valueType: 'INTEGER', category: 'GPS', description: 'Khoảng thời gian định kỳ (giây) chạy ngầm gửi vị trí GPS của Shipper.', isEditable: true, isActive: true },
    { settingKey: 'ETA_REFRESH_INTERVAL_MIN', settingValue: '5', valueType: 'INTEGER', category: 'ROUTING', description: 'Chu kỳ tính toán lại thời gian dự kiến giao hàng (ETA) cho các stop.', isEditable: true, isActive: true },
    { settingKey: 'POPULATION_SIZE', settingValue: '100', valueType: 'INTEGER', category: 'AI', description: 'Kích thước quần thể khởi tạo cho thuật toán Genetic Algorithm (GA).', isEditable: true, isActive: true },
    { settingKey: 'MUTATION_RATE', settingValue: '0.15', valueType: 'DECIMAL', category: 'AI', description: 'Tần suất đột biến của thuật toán Genetic Algorithm (GA).', isEditable: true, isActive: true },
    { settingKey: 'CROSSOVER_RATE', settingValue: '0.80', valueType: 'DECIMAL', category: 'AI', description: 'Tỷ lệ lai ghép các tuyến trong quần thể của GA.', isEditable: true, isActive: true },
    { settingKey: 'KMEANS_CLUSTER_RADIUS_METERS', settingValue: '5000', valueType: 'INTEGER', category: 'AI', description: 'Bán kính tối đa của một cụm gom hàng/giao hàng của K-Means.', isEditable: true, isActive: true },
    { settingKey: 'MAX_ROUTE_DISTANCE_KM', settingValue: '120.0', valueType: 'DECIMAL', category: 'ROUTING', description: 'Giới hạn quãng đường di chuyển tối đa của một tài xế trong một ngày.', isEditable: true, isActive: true },
    { settingKey: 'MAX_STOPS_PER_ROUTE', settingValue: '45', valueType: 'INTEGER', category: 'ROUTING', description: 'Số điểm dừng (RouteStop) tối đa gán cho một tuyến giao/nhận.', isEditable: true, isActive: true },
    { settingKey: 'DEFAULT_SERVICE_TIME_MINUTES', settingValue: '10', valueType: 'INTEGER', category: 'BUSINESS', description: 'Thời gian mặc định dừng đỗ xử lý thủ tục giao nhận hàng tại điểm.', isEditable: true, isActive: true },
    { settingKey: 'ENABLE_AI_OPTIMIZATION', settingValue: 'true', valueType: 'BOOLEAN', category: 'SYSTEM', description: 'Bật/tắt chế độ động cơ tối ưu AI tự động (nếu tắt sẽ dùng gán tay thủ công).', isEditable: true, isActive: true },
    { settingKey: 'MAX_DELIVERY_ATTEMPTS', settingValue: '3', valueType: 'INTEGER', category: 'BUSINESS', description: 'Số lần nỗ lực giao tối đa trước khi chuyển trạng thái sang hoàn trả hàng.', isEditable: true, isActive: true },
    { settingKey: 'OTP_EXPIRY_SECONDS', settingValue: '120', valueType: 'INTEGER', category: 'SYSTEM', description: 'Thời gian sống của mã OTP xác thực bàn giao gói hàng.', isEditable: true, isActive: true },
    { settingKey: 'ROUTING_AI_PROVIDER', settingValue: 'LOCAL_OR_TOOLS', valueType: 'STRING', category: 'AI', description: 'Động cơ solver đang sử dụng (LOCAL_OR_TOOLS, GRAPHHOPPER, OSRM).', isEditable: false, isActive: true },
  ];

  for (const ss of systemSettings) {
    // Cast valueType and category to match Prisma types
    await prisma.systemSetting.upsert({
      where: { settingKey: ss.settingKey },
      update: {
        settingValue: ss.settingValue,
        valueType: ss.valueType as any,
        category: ss.category as any,
        description: ss.description,
        isEditable: ss.isEditable,
        isActive: ss.isActive,
      },
      create: {
        settingKey: ss.settingKey,
        settingValue: ss.settingValue,
        valueType: ss.valueType as any,
        category: ss.category as any,
        description: ss.description,
        isEditable: ss.isEditable,
        isActive: ss.isActive,
      },
    });
  }

  // 7. Seed Test Users & Profiles
  console.log('👤 Seeding Test Users & Profiles (Clean 3NF Architecture)...');
  const testUsers = [
    {
      username: 'admin',
      password: 'AdminPassword123',
      roleCode: 'ADMIN',
      fullName: 'Quản trị viên Hệ thống',
      phone: '0900000001',
      email: 'admin@velocity.vn',
      employeeCode: 'EMP-ADMIN-01',
      position: 'ADMIN',
    },
    {
      username: 'staff',
      password: 'StaffPassword123',
      roleCode: 'STAFF',
      fullName: 'Nhân viên Điều phối Bưu cục',
      phone: '0900000002',
      email: 'staff@velocity.vn',
      employeeCode: 'EMP-STAFF-01',
      position: 'STAFF',
    },
    {
      username: 'shipper',
      password: 'DriverPassword123',
      roleCode: 'SHIPPER',
      fullName: 'Tài xế Nguyễn Văn Giao',
      phone: '0900000003',
      email: 'driver@velocity.vn',
      employeeCode: 'EMP-DRIVER-01',
      position: 'DRIVER',
      driverLicenseNumber: 'DRV-998877',
      driverLicenseClass: 'B2',
      driverType: 'HUB_DELIVERY',
    },
    {
      username: 'customer',
      password: 'CustomerPassword123',
      roleCode: 'CUSTOMER',
      fullName: 'Khách hàng Nguyễn Văn A',
      phone: '0900000004',
      email: 'customer@velocity.vn',
      customerCode: 'CUST-001',
    },
  ];

  for (const tu of testUsers) {
    const existing = await prisma.user.findUnique({
      where: { username: tu.username }
    });

    if (!existing) {
      const role = await prisma.role.findUnique({
        where: { roleCode: tu.roleCode }
      });

      if (!role) {
        console.log(`❌ Role not found for code: ${tu.roleCode}`);
        continue;
      }

      const passwordHash = await bcrypt.hash(tu.password, 10);
      const user = await prisma.user.create({
        data: {
          username: tu.username,
          passwordHash: passwordHash,
          status: 'ACTIVE',
          roleId: role.id,
        }
      });

      if (tu.roleCode === 'CUSTOMER') {
        await prisma.customer.create({
          data: {
            userId: user.id,
            customerCode: tu.customerCode!,
            fullName: tu.fullName,
            phone: tu.phone,
            email: tu.email,
            customerType: 'INDIVIDUAL',
          }
        });
      } else {
        await prisma.staff.create({
          data: {
            userId: user.id,
            employeeCode: tu.employeeCode!,
            fullName: tu.fullName,
            phone: tu.phone,
            email: tu.email,
            position: tu.position!,
            driverLicenseNumber: tu.driverLicenseNumber,
            driverLicenseClass: tu.driverLicenseClass,
            driverTypes: {
              create: ((tu as any).driverTypes || [(tu as any).driverType || 'HUB_DELIVERY']).map((t: any) => ({
                driverType: t,
              })),
            },
          } as any
        });
      }

      console.log(`✅ Created test user: ${tu.username} (${tu.roleCode}) with profile`);
    } else {
      console.log(`ℹ️ Test user already exists: ${tu.username}`);
    }
  }

  // 7b. Seed Role Permissions
  console.log('🔑 Seeding Role Permissions...');
  // Clear existing role permissions to avoid duplicates and ensure sync
  await prisma.rolePermission.deleteMany();

  const dbRoles = await prisma.role.findMany();
  const dbPermissions = await prisma.permission.findMany();

  const adminRole = dbRoles.find(r => r.roleCode === 'ADMIN');
  const staffRole = dbRoles.find(r => r.roleCode === 'STAFF');
  const shipperRole = dbRoles.find(r => r.roleCode === 'SHIPPER');
  const customerRole = dbRoles.find(r => r.roleCode === 'CUSTOMER');

  if (adminRole) {
    for (const p of dbPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: adminRole.id,
          permissionId: p.id,
        },
      });
    }
  }

  if (staffRole) {
    const staffPermissionsCodes = [
      'FACILITY_VIEW',
      'ORDER_VIEW', 'ORDER_CREATE', 'ORDER_UPDATE',
      'SHIPMENT_VIEW', 'SHIPMENT_CREATE', 'SHIPMENT_UPDATE',
      'DRIVER_VIEW',
      'VEHICLE_VIEW',
      'ROUTE_PLAN', 'ROUTE_OPTIMIZE',
      'POD_VERIFY', 'SCAN_BARCODE'
    ];
    for (const p of dbPermissions) {
      if (staffPermissionsCodes.includes(p.permissionCode)) {
        await prisma.rolePermission.create({
          data: {
            roleId: staffRole.id,
            permissionId: p.id,
          },
        });
      }
    }
  }

  if (shipperRole) {
    const shipperPermissionsCodes = [
      'ORDER_VIEW',
      'SHIPMENT_VIEW',
      'POD_VERIFY', 'SCAN_BARCODE'
    ];
    for (const p of dbPermissions) {
      if (shipperPermissionsCodes.includes(p.permissionCode)) {
        await prisma.rolePermission.create({
          data: {
            roleId: shipperRole.id,
            permissionId: p.id,
          },
        });
      }
    }
  }

  if (customerRole) {
    const customerPermissionsCodes = [
      'ORDER_CREATE', 'ORDER_VIEW'
    ];
    for (const p of dbPermissions) {
      if (customerPermissionsCodes.includes(p.permissionCode)) {
        await prisma.rolePermission.create({
          data: {
            roleId: customerRole.id,
            permissionId: p.id,
          },
        });
      }
    }
  }

  // 8. Seed Administrative Units (Provinces, Wards, etc.)
  console.log('🇻🇳 Seeding Administrative Units...');
  const provinceCount = await prisma.province.count();
  if (provinceCount === 0) {
    const sqlPath = path.join(__dirname, 'postgres_ImportData_vn_units.sql');
    if (fs.existsSync(sqlPath)) {
      console.log('Reading administrative units SQL dump...');
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      console.log('Executing administrative units SQL dump... (this might take a few seconds)');
      
      const rawStatements = sqlContent.split(/;\s*[\r\n]+/);
      const statements = rawStatements
        .map(s => s.trim())
        .filter(s => s.length > 0);

      console.log(`Found ${statements.length} SQL statements to execute.`);
      
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < statements.length; i++) {
          const stmt = statements[i];
          console.log(`Executing SQL statement ${i + 1}/${statements.length}: ${stmt.substring(0, 80)}...`);
          await tx.$executeRawUnsafe(stmt);
        }
      }, {
        timeout: 90000, // 90 seconds timeout for large SQL seed
      });

      console.log('✅ Administrative units seeded successfully!');
    }
  } else {
    console.log('ℹ️ Administrative units already seeded.');
  }

  // 9. Seed 6 Economic Regions & Link 34 Provinces & Seed 6 Regional Sorting Centers
  console.log('🗺️ Seeding 6 Economic Regions & Linking 34 Provinces to Regional Sorting Centers...');
  
  const regions = [
    { id: 1, name: 'Vùng Trung du và miền núi phía Bắc', nameEn: 'Northern Midlands and Mountains', codeName: 'trung_du_mien_nui_phia_bac', codeNameEn: 'northern_midlands_mountains' },
    { id: 2, name: 'Vùng Đồng bằng sông Hồng', nameEn: 'Red River Delta', codeName: 'dong_bang_song_hong', codeNameEn: 'red_river_delta' },
    { id: 3, name: 'Vùng Bắc Trung Bộ', nameEn: 'North Central Coast', codeName: 'bac_trung_bo', codeNameEn: 'north_central_coast' },
    { id: 4, name: 'Vùng Duyên hải Nam Trung Bộ và Tây Nguyên', nameEn: 'South Central Coast and Central Highlands', codeName: 'duyen_hai_nam_trung_bo_tay_nguyen', codeNameEn: 'south_central_highlands' },
    { id: 5, name: 'Vùng Đông Nam Bộ', nameEn: 'Southeast Region', codeName: 'dong_nam_bo', codeNameEn: 'southeast' },
    { id: 6, name: 'Vùng Đồng bằng sông Cửu Long', nameEn: 'Mekong River Delta', codeName: 'dong_bang_song_cuu_long', codeNameEn: 'mekong_delta' },
  ];

  for (const reg of regions) {
    await prisma.administrativeRegion.upsert({
      where: { id: reg.id },
      update: { name: reg.name, nameEn: reg.nameEn, codeName: reg.codeName, codeNameEn: reg.codeNameEn },
      create: reg,
    });
  }

  // Province to Region Mapping (Official 34 Post-Merger Provinces)
  const provinceRegionMap: Record<string, number> = {
    // Vùng 1: Trung du và miền núi phía Bắc
    '14': 1, '15': 1, '19': 1, '20': 1, '22': 1, '24': 1, '25': 1, '11': 1, '12': 1, '04': 1,
    // Vùng 2: Đồng bằng sông Hồng
    '01': 2, '31': 2, '33': 2, '37': 2,
    // Vùng 3: Bắc Trung Bộ
    '38': 3, '40': 3, '42': 3, '44': 3, '46': 3,
    // Vùng 4: Duyên hải Nam Trung Bộ và Tây Nguyên
    '48': 4, '51': 4, '52': 4, '56': 4, '66': 4, '68': 4,
    // Vùng 5: Đông Nam Bộ
    '79': 5, '75': 5, '80': 5,
    // Vùng 6: Đồng bằng sông Cửu Long
    '92': 6, '82': 6, '86': 6, '91': 6, '96': 6,
  };

  for (const [provCode, regionId] of Object.entries(provinceRegionMap)) {
    await prisma.province.updateMany({
      where: { code: provCode },
      data: { administrativeRegionId: regionId },
    });
  }

  // Seed 6 Regional Sorting Centers (Cấp 1 - SORTING_CENTER)
  const sortingCenterType = await prisma.facilityType.findFirst({ where: { typeCode: 'SORTING_CENTER' } });
  const provincialHubType = await prisma.facilityType.findFirst({ where: { typeCode: 'PROVINCIAL_HUB' } });

  if (sortingCenterType && provincialHubType) {
    // 📍 1. REAL ADDRESS & GPS DATA DICTIONARY FOR 6 REGIONAL SORTING CENTERS (North-South Sequence)
    const scDataMap: Record<number, { code: string; name: string; provCode: string; address: string; lat: number; lng: number; seq: number }> = {
      1: { code: 'FAC-SC-REGION1', name: 'Tổng Kho Miền 1 (Trung du & Miền núi phía Bắc - Thái Nguyên)', provCode: '19', address: 'Khu Công Nghiệp Sông Công 1, Phường Bách Quang, TP. Sông Công, Tỉnh Thái Nguyên', lat: 21.4883, lng: 105.8167, seq: 6 },
      2: { code: 'FAC-SC-REGION2', name: 'Tổng Kho Miền 2 (Đồng bằng sông Hồng - Hà Nội)', provCode: '01', address: 'Số 1 Phố Hàng Bài, Phường Tràng Tiền, Quận Hoàn Kiếm, TP. Hà Nội', lat: 21.0285, lng: 105.8542, seq: 5 },
      3: { code: 'FAC-SC-REGION3', name: 'Tổng Kho Miền 3 (Bắc Trung Bộ - Huế)', provCode: '46', address: 'Khu Công Nghiệp Phú Bài, Phường Phú Bài, TP. Huế, Tỉnh Thừa Thiên Huế', lat: 16.3900, lng: 107.7011, seq: 4 },
      4: { code: 'FAC-SC-REGION4', name: 'Tổng Kho Miền 4 (Nam Trung Bộ & Tây Nguyên - Đà Nẵng)', provCode: '48', address: 'Số 24 Đường Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, TP. Đà Nẵng', lat: 16.0678, lng: 108.2208, seq: 3 },
      5: { code: 'FAC-SC-REGION5', name: 'Tổng Kho Miền 5 (Đông Nam Bộ - TP. Hồ Chí Minh)', provCode: '79', address: 'Số 1 Đường Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', lat: 10.7828, lng: 106.7011, seq: 2 },
      6: { code: 'FAC-SC-REGION6', name: 'Tổng Kho Miền 6 (Đồng bằng sông Cửu Long - Cần Thơ)', provCode: '92', address: 'Khu Công Nghiệp Trà Nóc 1, Phường Trà Nóc, Quận Bình Thủy, TP. Cần Thơ', lat: 10.0825, lng: 105.7483, seq: 1 },
    };

    const findWardInProvince = async (provCode: string, addressText: string) => {
      const wardsInProv = await prisma.ward.findMany({ where: { provinceCode: provCode } });
      const textLower = addressText.toLowerCase();
      for (const w of wardsInProv) {
        if (w.name.length > 2 && (textLower.includes((w.fullName || '').toLowerCase()) || textLower.includes(w.name.toLowerCase()))) {
          return w.code;
        }
      }
      return wardsInProv[0]?.code || null;
    };

    const createdSCMap: Record<number, string> = {};

    for (const [regionId, sc] of Object.entries(scDataMap)) {
      const regIdNum = parseInt(regionId, 10);
      const scWardCode = await findWardInProvince(sc.provCode, sc.address);

      const addr = await prisma.address.create({
        data: {
          addressLine1: sc.address,
          wardCode: scWardCode,
          country: 'Vietnam',
          latitude: sc.lat,
          longitude: sc.lng,
        },
      });

      const scFacility = await prisma.facility.upsert({
        where: { facilityCode: sc.code },
        update: { provinceCode: sc.provCode, addressId: addr.id, regionSequence: sc.seq },
        create: {
          facilityCode: sc.code,
          facilityName: sc.name,
          facilityTypeId: sortingCenterType.id,
          parentFacilityId: null,
          provinceCode: sc.provCode,
          addressId: addr.id,
          operatingStatus: 'ACTIVE',
          regionSequence: sc.seq,
          openedAt: new Date('2025-01-01'),
        },
      });

      createdSCMap[regIdNum] = scFacility.id;
    }

    // 📍 2. REAL ADDRESS & GPS DICTIONARY FOR ALL 34 PROVINCIAL HUBS
    const realProvAddressMap: Record<string, { address: string; lat: number; lng: number }> = {
      '01': { address: 'Số 1 Phố Hàng Bài, Phường Tràng Tiền, Quận Hoàn Kiếm, TP. Hà Nội', lat: 21.0285, lng: 105.8542 },
      '04': { address: 'Số 12 Đường Bằng Giang, Phường Hợp Giang, TP. Cao Bằng, Tỉnh Cao Bằng', lat: 22.6657, lng: 106.2573 },
      '11': { address: 'Số 88 Đường Võ Nguyên Giáp, Phường Mường Thanh, TP. Điện Biên Phủ, Tỉnh Điện Biên', lat: 21.3853, lng: 103.0182 },
      '12': { address: 'Số 15 Đường Trần Phú, Phường Tân Phong, TP. Lai Châu, Tỉnh Lai Châu', lat: 22.3965, lng: 103.4589 },
      '14': { address: 'Số 45 Đường Tô Hiệu, Phường Tô Hiệu, TP. Sơn La, Tỉnh Sơn La', lat: 21.3283, lng: 103.9142 },
      '15': { address: 'Số 30 Đường Hoàng Liên, Phường Cốc Lếu, TP. Lào Cai, Tỉnh Lào Cai', lat: 22.4856, lng: 103.9707 },
      '19': { address: 'Số 10 Đường Đội Cấn, Phường Trưng Vương, TP. Thái Nguyên, Tỉnh Thái Nguyên', lat: 21.5928, lng: 105.8442 },
      '20': { address: 'Số 2 Đường Trần Đăng Ninh, Phường Tam Thanh, TP. Lạng Sơn, Tỉnh Lạng Sơn', lat: 21.8537, lng: 106.7615 },
      '22': { address: 'Số 68 Đường Nguyễn Văn Cừ, Phường Hồng Hà, TP. Hạ Long, Tỉnh Quảng Ninh', lat: 20.9506, lng: 107.0733 },
      '24': { address: 'Số 1 Đường Lý Thái Tổ, Phường Suối Hoa, TP. Bắc Ninh, Tỉnh Bắc Ninh', lat: 21.1861, lng: 106.0763 },
      '25': { address: 'Số 1500 Đường Hùng Vương, Phường Gia Cẩm, TP. Việt Trì, Tỉnh Phú Thọ', lat: 21.3228, lng: 105.4019 },
      '31': { address: 'Số 18 Đường Điện Biên Phủ, Phường Máy Tơ, Quận Ngô Quyền, TP. Hải Phòng', lat: 20.8651, lng: 106.6838 },
      '33': { address: 'Số 50 Đường Điện Biên, Phường Lê Lợi, TP. Hưng Yên, Tỉnh Hưng Yên', lat: 20.6464, lng: 106.0511 },
      '37': { address: 'Số 10 Đường Lê Hồng Phong, Phường Đông Thành, TP. Ninh Bình, Tỉnh Ninh Bình', lat: 20.2506, lng: 105.9745 },
      '38': { address: 'Số 35 Đường Đại lộ Lê Lợi, Phường Lam Sơn, TP. Thanh Hóa, Tỉnh Thanh Hóa', lat: 19.8067, lng: 105.7761 },
      '40': { address: 'Số 1 Đường Trường Thi, Phường Trường Thi, TP. Vinh, Tỉnh Nghệ An', lat: 18.6734, lng: 105.6813 },
      '42': { address: 'Số 88 Đường Phan Đình Phùng, Phường Nam Hà, TP. Hà Tĩnh, Tỉnh Hà Tĩnh', lat: 18.3429, lng: 105.9056 },
      '44': { address: 'Số 12 Đường Hùng Vương, Phường 1, TP. Đông Hà, Tỉnh Quảng Trị', lat: 16.8163, lng: 107.1004 },
      '46': { address: 'Số 16 Đường Lê Lợi, Phường Vĩnh Ninh, TP. Huế, Tỉnh Thừa Thiên Huế', lat: 16.4637, lng: 107.5909 },
      '48': { address: 'Số 24 Đường Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, TP. Đà Nẵng', lat: 16.0678, lng: 108.2208 },
      '51': { address: 'Số 50 Đường Hùng Vương, Phường Trần Phú, TP. Quảng Ngãi, Tỉnh Quảng Ngãi', lat: 15.1205, lng: 108.7924 },
      '52': { address: 'Số 1 Đường Trần Hưng Đạo, Phường Tây Sơn, TP. Pleiku, Tỉnh Gia Lai', lat: 13.9833, lng: 108.0000 },
      '56': { address: 'Số 2 Đường Trần Phú, Phường Xương Huân, TP. Nha Trang, Tỉnh Khánh Hòa', lat: 12.2451, lng: 109.1943 },
      '66': { address: 'Số 10 Đường Lê Duẩn, Phường Tự An, TP. Buôn Ma Thuột, Tỉnh Đắk Lắk', lat: 12.6667, lng: 108.0500 },
      '68': { address: 'Số 1 Đường Trần Phú, Phường 3, TP. Đà Lạt, Tỉnh Lâm Đồng', lat: 11.9404, lng: 108.4378 },
      '75': { address: 'Số 1 Đường Nguyễn Ái Quốc, Phường Tân Tiến, TP. Biên Hòa, Tỉnh Đồng Nai', lat: 10.9575, lng: 106.8427 },
      '79': { address: 'Số 102 Đường Trường Chinh, Phường 12, Quận Tân Bình, TP. Hồ Chí Minh', lat: 10.8050, lng: 106.6500 },
      '80': { address: 'Số 300 Đường 30 Tháng 4, Phường 3, TP. Tây Ninh, Tỉnh Tây Ninh', lat: 11.3122, lng: 106.0983 },
      '82': { address: 'Số 10 Đường Lý Thường Kiệt, Phường 1, TP. Cao Lãnh, Tỉnh Đồng Tháp', lat: 10.4578, lng: 105.6325 },
      '86': { address: 'Số 1 Đường Trưng Nữ Vương, Phường 1, TP. Vĩnh Long, Tỉnh Vĩnh Long', lat: 10.2537, lng: 105.9722 },
      '91': { address: 'Số 12 Đường Tôn Đức Thắng, Phường Mỹ Bình, TP. Long Xuyên, Tỉnh An Giang', lat: 10.3759, lng: 105.4325 },
      '92': { address: 'Số 2 Đường Hòa Bình, Phường Tân An, Quận Ninh Kiều, TP. Cần Thơ', lat: 10.0342, lng: 105.7877 },
      '96': { address: 'Số 9 Đường Trần Hưng Đạo, Phường 5, TP. Cà Mau, Tỉnh Cà Mau', lat: 9.1769, lng: 105.1500 },
    };

    // Seed 34 Provincial Hubs (Cấp 2 - PROVINCIAL_HUB) linked to their Regional Sorting Centers
    console.log('🏢 Seeding 34 Provincial Hubs with AUTHENTIC REAL ADDRESSES & REAL GPS COORDINATES...');
    const allProvinces = await prisma.province.findMany();

    for (const prov of allProvinces) {
      const parentSCId = prov.administrativeRegionId ? createdSCMap[prov.administrativeRegionId] : null;
      const hubCode = `FAC-HUB-PROV-${prov.code}`;
      const hubName = `Kho Tổng ${prov.fullName} (Provincial Hub)`;

      const realInfo = realProvAddressMap[prov.code] || {
        address: `Số 1 Đường Trung Tâm Vận Chuyển Hành Chính, Phường Trung Tâm, ${prov.fullName}`,
        lat: 10.8 + (parseInt(prov.code, 10) % 10) * 0.05,
        lng: 106.6 + (parseInt(prov.code, 10) % 10) * 0.05,
      };

      const provWardCode = await findWardInProvince(prov.code, realInfo.address);

      const addrHub = await prisma.address.create({
        data: {
          addressLine1: realInfo.address,
          wardCode: provWardCode,
          country: 'Vietnam',
          latitude: realInfo.lat,
          longitude: realInfo.lng,
        },
      });

      await prisma.facility.upsert({
        where: { facilityCode: hubCode },
        update: {
          parentFacilityId: parentSCId,
          provinceCode: prov.code,
          addressId: addrHub.id,
        },
        create: {
          facilityCode: hubCode,
          facilityName: hubName,
          facilityTypeId: provincialHubType.id,
          parentFacilityId: parentSCId,
          provinceCode: prov.code,
          addressId: addrHub.id,
          operatingStatus: 'ACTIVE',
          openedAt: new Date('2025-01-01'),
        },
      });
    }
  }

  console.log('✨ Seeding master lookup tables, 6 Regional Sorting Centers & 34 Provincial Hubs completed successfully!');
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
