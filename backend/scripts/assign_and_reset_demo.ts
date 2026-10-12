import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Kiểm tra tài xế shipper (driver@velocity.vn)...');
  const user = await prisma.user.findFirst({
    where: { username: 'shipper' },
    include: { staff: true },
  });

  if (!user || !user.staff) {
    console.error('❌ Không tìm thấy thông tin tài xế shipper!');
    return;
  }

  const staff = user.staff;
  console.log(`✅ Tìm thấy tài xế: ${staff.fullName} (ID: ${staff.id})`);

  // Tìm hoặc tạo DriverVehicleAssignment
  let assignment = await prisma.driverVehicleAssignment.findFirst({
    where: { driverId: staff.id, isActive: true },
  });

  if (!assignment) {
    // Tìm 1 xe bất kỳ
    const vehicle = await prisma.vehicle.findFirst();
    if (!vehicle) {
      console.error('❌ Không tìm thấy xe trong DB!');
      return;
    }
    assignment = await prisma.driverVehicleAssignment.create({
      data: {
        driverId: staff.id,
        vehicleId: vehicle.id,
        isActive: true,
        assignedFrom: new Date(),
      },
    });
    console.log(`🚗 Đã tạo DriverVehicleAssignment mới cho xe: ${vehicle.plateNumber}`);
  } else {
    console.log(`🚗 Đã có DriverVehicleAssignment: ${assignment.id}`);
  }

  // Tìm route mới nhất
  const route = await prisma.route.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      stops: {
        include: {
          shipment: true,
        },
      },
    },
  });

  if (!route) {
    console.error('❌ Không có route nào trong hệ thống!');
    return;
  }

  console.log(`🗺️ Chuẩn bị gán Lộ trình ${route.routeCode} (ID: ${route.id}) cho tài xế...`);

  // Cập nhật Route sang IN_PROGRESS và gán cho tài xế
  await prisma.route.update({
    where: { id: route.id },
    data: {
      driverVehicleAssignmentId: assignment.id,
      status: 'IN_PROGRESS',
      completedAt: null,
    },
  });

  // Reset các điểm dừng về PENDING
  await prisma.routeStop.updateMany({
    where: { routeId: route.id },
    data: {
      status: 'PENDING',
    },
  });

  // Reset các shipment sang OUT_FOR_DELIVERY
  const shipmentIds = route.stops
    .map((s) => s.shipmentId)
    .filter((id): id is string => Boolean(id));

  if (shipmentIds.length > 0) {
    await prisma.shipment.updateMany({
      where: { id: { in: shipmentIds } },
      data: {
        status: 'OUT_FOR_DELIVERY',
      },
    });
  }

  console.log(`🎉 HOÀN TẤT DỌN DẸP & SẴN SÀNG TEST!`);
  console.log(` - Tuyến: ${route.routeCode}`);
  console.log(` - Trạng thái tuyến: IN_PROGRESS`);
  console.log(` - Số điểm dừng: ${route.stops.length} điểm (Tất cả PENDING)`);
  console.log(` - Tài xế: ${staff.fullName} (${user.username} / DriverPassword123)`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
