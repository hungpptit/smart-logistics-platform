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

  // 3. Seed Facility Types
  console.log('🏢 Seeding Facility Types...');
  const facilityTypes = [
    { typeCode: 'MAIN_DEPOT', typeName: 'Tổng kho / Kho trung tâm' },
    { typeCode: 'REGIONAL_WAREHOUSE', typeName: 'Kho khu vực' },
    { typeCode: 'HUB', typeName: 'Trạm trung chuyển lớn' },
    { typeCode: 'MICRO_HUB', typeName: 'Bưu cục / Trạm giao nhận chặng cuối' },
    { typeCode: 'FULFILLMENT_CENTER', typeName: 'Trung tâm xử lý đơn hàng' },
  ];

  for (const ft of facilityTypes) {
    await prisma.facilityType.upsert({
      where: { typeCode: ft.typeCode },
      update: { typeName: ft.typeName },
      create: ft,
    });
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
      estimatedDeliveryHours: 72,
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
            driverType: tu.driverType as any,
          }
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
    } else {
      console.log('⚠️ postgres_ImportData_vn_units.sql not found at:', sqlPath);
    }
  } else {
    console.log('ℹ️ Administrative units already seeded.');
  }

  console.log('✨ Seeding master lookup tables completed successfully!');
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
