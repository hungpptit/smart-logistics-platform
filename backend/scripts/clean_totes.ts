import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanTotes() {
  console.log('🧹 Bắt đầu dọn dẹp các thùng/sọt gom hàng (ToteBag) và lịch sử quét kho liên quan...');

  // 1. Lấy danh sách các tote hiện có
  const totes = await prisma.toteBag.findMany({
    include: {
      warehouseScans: true,
      facility: true,
    },
  });

  console.log(`📊 Tìm thấy ${totes.length} sọt/thùng hàng (ToteBag) trong DB:`);
  totes.forEach((t) => {
    console.log(`  - [${t.toteCode}] Trạng thái: ${t.status} | Khu vực: ${t.zoneCode} | Kho: ${t.facility?.facilityName || t.facilityId} | Số lượt quét: ${t.warehouseScans.length}`);
  });

  // 2. Xóa các liên kết quét kho gắn với ToteBag
  const deletedScans = await prisma.warehouseScan.deleteMany({
    where: {
      toteBagId: { not: null },
    },
  });
  console.log(`🗑️ Đã xóa ${deletedScans.count} bản ghi WarehouseScan liên quan đến ToteBag.`);

  // 3. Xóa các liên kết chuyến xe/chuyển hàng liên quan nếu có
  await prisma.shipmentTransfer.deleteMany({});
  await prisma.shipmentPackage.deleteMany({});
  await prisma.shipment.deleteMany({});

  // 4. Xóa tất cả các ToteBag
  const deletedTotes = await prisma.toteBag.deleteMany({});
  console.log(`✅ Đã xóa sạch toàn bộ ${deletedTotes.count} ToteBag trong database!`);

  // 5. Kiểm tra lại số lượng
  const countAfter = await prisma.toteBag.count();
  console.log(`📊 Tổng số ToteBag còn lại trong DB: ${countAfter}.`);
}

cleanTotes()
  .catch((e) => {
    console.error('❌ Lỗi khi dọn dẹp ToteBag:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
