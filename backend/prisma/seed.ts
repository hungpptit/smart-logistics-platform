import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

declare const process: any;

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding master lookup tables...');

  // 1. Seed Roles
  console.log('🔑 Seeding Roles...');
  const roles = [
    { roleCode: 'ADMIN', roleName: 'Quản trị hệ thống', description: 'Quản trị nhân sự và phân quyền, quản lý khách hàng, cấu hình tham số thuật toán AI, cấu hình hạ tầng kỹ thuật (chu kỳ GPS, API Keys bản đồ), báo cáo thống kê doanh thu và hiệu suất' },
    { roleCode: 'STAFF', roleName: 'Nhân viên', description: 'Tiếp nhận và phân loại đơn hàng, cập nhật nhập/xuất kho, kích hoạt định tuyến tự động bằng AI, giám sát vị trí shipper realtime, điều phối và xử lý sự cố lộ trình' },
    { roleCode: 'SHIPPER', roleName: 'Tài xế giao hàng', description: 'Tiếp nhận ca làm việc và lộ trình tối ưu, sử dụng bản đồ điều hướng, quét QR code cập nhật trạng thái đơn hàng (kèm ảnh và tọa độ), đồng bộ tọa độ GPS chạy ngầm' },
    { roleCode: 'CUSTOMER', roleName: 'Khách hàng', description: 'Tạo đơn hàng lẻ/hàng loạt, in mã vận đơn QR, đặt lịch hẹn lấy hàng, tra cứu hành trình đơn hàng realtime, theo dõi vị trí shipper trên bản đồ' },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { roleCode: r.roleCode },
      update: { roleName: r.roleName, description: r.description },
      create: r,
    });
  }

  // 2. Seed Permissions
  console.log('🛡️ Seeding Permissions...');
  const permissions = [
    // Auth Module
    { permissionCode: 'USER_MANAGE', permissionName: 'Quản lý tài khoản', module: 'AUTH', description: 'Tạo, sửa, xóa, khóa tài khoản người dùng' },
    { permissionCode: 'ROLE_MANAGE', permissionName: 'Quản lý phân quyền', module: 'AUTH', description: 'Quản lý vai trò và phân quyền hạn' },
    // Customer Module
    { permissionCode: 'CUSTOMER_MANAGE', permissionName: 'Quản lý khách hàng', module: 'CUSTOMER', description: 'Quản lý hồ sơ và sổ địa chỉ khách hàng' },
    { permissionCode: 'CUSTOMER_VIEW', permissionName: 'Xem hồ sơ khách hàng', module: 'CUSTOMER', description: 'Xem danh sách và chi tiết khách hàng' },
    // Facility Module
    { permissionCode: 'FACILITY_MANAGE', permissionName: 'Quản lý mạng lưới kho', module: 'FACILITY', description: 'Quản lý tổng kho, hub, trạm giao nhận' },
    { permissionCode: 'FACILITY_VIEW', permissionName: 'Xem thông tin kho bãi', module: 'FACILITY', description: 'Xem danh sách các trạm/kho bãi' },
    // Order Module
    { permissionCode: 'ORDER_CREATE', permissionName: 'Tạo đơn hàng', module: 'ORDER', description: 'Tạo đơn hàng mới trên hệ thống' },
    { permissionCode: 'ORDER_UPDATE', permissionName: 'Cập nhật đơn hàng', module: 'ORDER', description: 'Sửa thông tin đơn hàng, đổi trạng thái' },
    { permissionCode: 'ORDER_DELETE', permissionName: 'Xóa đơn hàng', module: 'ORDER', description: 'Xóa mềm đơn hàng' },
    { permissionCode: 'ORDER_VIEW', permissionName: 'Xem danh sách đơn hàng', module: 'ORDER', description: 'Xem và tra cứu danh sách đơn hàng' },
    // Shipment Module
    { permissionCode: 'SHIPMENT_CREATE', permissionName: 'Tạo chuyến hàng', module: 'SHIPMENT', description: 'Tạo phiếu vận chuyển gom nhiều kiện hàng' },
    { permissionCode: 'SHIPMENT_UPDATE', permissionName: 'Cập nhật chuyến hàng', module: 'SHIPMENT', description: 'Điều chỉnh gom kiện, cập nhật trạng thái luân chuyển' },
    { permissionCode: 'SHIPMENT_VIEW', permissionName: 'Xem phiếu vận chuyển', module: 'SHIPMENT', description: 'Tra cứu hành trình và trạng thái các chuyến hàng' },
    // Fleet Module
    { permissionCode: 'DRIVER_MANAGE', permissionName: 'Quản lý tài xế', module: 'FLEET', description: 'Quản lý hồ sơ tài xế và gán xe' },
    { permissionCode: 'VEHICLE_MANAGE', permissionName: 'Quản lý phương tiện', module: 'FLEET', description: 'Quản lý danh mục xe và đăng kiểm' },
    // Routing Module
    { permissionCode: 'ROUTE_PLAN', permissionName: 'Lập tuyến đường', module: 'ROUTING', description: 'Tạo thủ công hoặc xếp tuyến cho xe chạy' },
    { permissionCode: 'ROUTE_OPTIMIZE', permissionName: 'Tối ưu lộ trình AI', module: 'ROUTING', description: 'Chạy động cơ AI tối ưu hóa điểm dừng (VRP)' },
    // Tracking & POD Module
    { permissionCode: 'POD_VERIFY', permissionName: 'Xác thực bàn giao POD', module: 'TRACKING', description: 'Xác nhận chữ ký, ảnh chụp, mã OTP khi giao nhận' },
    { permissionCode: 'SCAN_BARCODE', permissionName: 'Quét barcode kiểm kho', module: 'TRACKING', description: 'Quét barcode/QR nhập xuất kho, phân loại' },
    // System Module
    { permissionCode: 'SYSTEM_CONFIG', permissionName: 'Cấu hình hệ thống', module: 'SYSTEM', description: 'Cấu hình thông số và siêu tham số AI' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { permissionCode: p.permissionCode },
      update: { permissionName: p.permissionName, module: p.module, description: p.description },
      create: p,
    });
  }

  // 3. Seed Facility Types
  console.log('🏢 Seeding Facility Types...');
  const facilityTypes = [
    { typeCode: 'MAIN_DEPOT', typeName: 'Tổng kho / Kho trung tâm', description: 'Nơi tập kết hàng hóa cấp vùng lớn nhất' },
    { typeCode: 'REGIONAL_WAREHOUSE', typeName: 'Kho khu vực', description: 'Kho chứa hàng quy mô cấp tỉnh/thành phố' },
    { typeCode: 'HUB', typeName: 'Trạm trung chuyển lớn', description: 'Điểm phân loại hàng hóa liên quận/huyện' },
    { typeCode: 'MICRO_HUB', typeName: 'Bưu cục / Trạm giao nhận chặng cuối', description: 'Điểm tập kết hàng chặng cuối cho shipper lấy đi giao' },
    { typeCode: 'FULFILLMENT_CENTER', typeName: 'Trung tâm xử lý đơn hàng', description: 'Kho chuyên biệt đóng gói, dán nhãn hoàn thiện đơn hàng' },
  ];

  for (const ft of facilityTypes) {
    await prisma.facilityType.upsert({
      where: { typeCode: ft.typeCode },
      update: { typeName: ft.typeName, description: ft.description },
      create: ft,
    });
  }

  // 4. Seed Vehicle Types
  console.log('🚚 Seeding Vehicle Types...');
  const vehicleTypes = [
    { typeCode: 'MOTORBIKE', typeName: 'Xe máy', maxDefaultWeight: 80.00, description: 'Phương tiện giao hàng chặng cuối linh hoạt ngõ hẻm' },
    { typeCode: 'VAN', typeName: 'Xe bán tải / Van', maxDefaultWeight: 500.00, description: 'Giao hàng nội ô thành phố, chở hàng vừa và nhỏ' },
    { typeCode: 'TRUCK_1T5', typeName: 'Xe tải 1.5 Tấn', maxDefaultWeight: 1500.00, description: 'Vận chuyển chặng giữa nội đô và liên quận' },
    { typeCode: 'CONTAINER', typeName: 'Xe Container cỡ lớn', maxDefaultWeight: 30000.00, description: 'Vận chuyển liên tỉnh đường dài giữa các tổng kho' },
    { typeCode: 'REFRIGERATED_TRUCK', typeName: 'Xe tải đông lạnh', maxDefaultWeight: 2000.00, description: 'Chuyên chở hàng thực phẩm, y tế yêu cầu bảo quản lạnh' },
  ];

  for (const vt of vehicleTypes) {
    await prisma.vehicleType.upsert({
      where: { typeCode: vt.typeCode },
      update: { typeName: vt.typeName, maxDefaultWeight: vt.maxDefaultWeight, description: vt.description },
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
      pricingVersion: 1,
      description: 'Cam kết giao trong vòng 2 giờ kể từ khi lấy hàng thành công',
      isActive: true
    },
    {
      serviceCode: 'STANDARD',
      serviceName: 'Giao hàng Tiêu chuẩn',
      basePrice: 20000.00,
      freeDistanceKm: 2.0,
      pricePerKm: 5000.00,
      freeWeightKg: 1.0,
      pricePerKg: 3000.00,
      estimatedDeliveryHours: 24,
      pricingVersion: 1,
      description: 'Thời gian giao hàng từ 1-3 ngày, phù hợp hàng thường',
      isActive: true
    },
    {
      serviceCode: 'SAVING',
      serviceName: 'Giao hàng Tiết kiệm',
      basePrice: 15000.00,
      freeDistanceKm: 2.0,
      pricePerKm: 3000.00,
      freeWeightKg: 1.0,
      pricePerKg: 2000.00,
      estimatedDeliveryHours: 72,
      pricingVersion: 1,
      description: 'Cước phí tối ưu, giao từ 3-5 ngày',
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
      pricingVersion: 1,
      description: 'Đảm bảo dải nhiệt độ tiêu chuẩn cho hàng đông lạnh y tế',
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
        pricingVersion: s.pricingVersion,
        description: s.description,
        isActive: s.isActive
      },
      create: s,
    });
  }

  // 6. Seed System Settings
  console.log('⚙️ Seeding System Settings...');
  const systemSettings = [
    { settingKey: 'GPS_INTERVAL_SECONDS', settingValue: '5', valueType: 'INTEGER', category: 'GPS', description: 'Khoảng thời gian định kỳ (giây) chạy ngầm gửi vị trí GPS của Shipper.', isEditable: true, isActive: true },
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

  // 7. Seed Test Users
  console.log('👤 Seeding Test Users...');
  const testUsers = [
    {
      username: 'admin',
      email: 'admin@velocity.vn',
      password: 'AdminPassword123',
      phone: '0900000001',
      roleCode: 'ADMIN',
    },
    {
      username: 'dispatcher',
      email: 'staff@velocity.vn',
      password: 'StaffPassword123',
      phone: '0900000002',
      roleCode: 'STAFF',
    },
    {
      username: 'shipper',
      email: 'driver@velocity.vn',
      password: 'DriverPassword123',
      phone: '0900000003',
      roleCode: 'SHIPPER',
    },
    {
      username: 'customer',
      email: 'customer@velocity.vn',
      password: 'CustomerPassword123',
      phone: '0900000004',
      roleCode: 'CUSTOMER',
    },
  ];

  for (const tu of testUsers) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: tu.username },
          { email: tu.email }
        ]
      }
    });

    if (!existing) {
      const passwordHash = await bcrypt.hash(tu.password, 10);
      const user = await prisma.user.create({
        data: {
          username: tu.username,
          email: tu.email,
          passwordHash: passwordHash,
          phone: tu.phone,
          status: 'ACTIVE',
        }
      });

      const role = await prisma.role.findUnique({
        where: { roleCode: tu.roleCode }
      });

      if (role) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
          }
        });
      }
      console.log(`✅ Created test user: ${tu.username} (${tu.roleCode})`);
    } else {
      console.log(`ℹ️ Test user already exists: ${tu.username}`);
    }
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
