import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Bắt đầu tự động cập nhật wardCode cho tất cả địa chỉ đang bị NULL...');

  // Lấy danh sách tất cả các Wards để map tên Phường/Xã với ward.code
  const allWards = await prisma.ward.findMany({
    include: {
      province: true,
    },
  });

  console.log(`📊 Tìm thấy tổng cộng ${allWards.length} xã/phường trong DB.`);

  // Lấy danh sách tất cả các Address chưa có wardCode
  const nullAddresses = await prisma.address.findMany({
    where: {
      wardCode: null,
    },
    include: {
      facilities: true,
      pickupOrders: true,
      deliveryOrders: true,
    },
  });

  console.log(`📍 Tìm thấy ${nullAddresses.length} địa chỉ có wardCode = NULL.`);

  let updatedCount = 0;

  for (const addr of nullAddresses) {
    let matchedWardCode: string | null = null;

    // 1. Thử khớp theo tên Phường/Xã xuất hiện trong địa chỉ (addressLine1)
    const textLower = addr.addressLine1.toLowerCase();
    
    // Tìm ward trùng tên nhất trong DB
    for (const ward of allWards) {
      const wardNameLower = ward.name.toLowerCase(); // vd: "linh trung", "bình thọ"
      const wardFullNameLower = (ward.fullName || '').toLowerCase(); // vd: "phường linh trung"
      
      if (wardNameLower.length > 2 && (textLower.includes(wardFullNameLower) || textLower.includes(wardNameLower))) {
        matchedWardCode = ward.code;
        break;
      }
    }

    // 2. Nếu vẫn chưa tìm thấy, lấy provinceCode từ Facility liên quan hoặc mặc định '79' (TP.HCM cho test data)
    if (!matchedWardCode) {
      let targetProvCode = '79'; // Mặc định TP.HCM cho dữ liệu test Thủ Đức
      
      if (addr.facilities && addr.facilities.length > 0 && addr.facilities[0].provinceCode) {
        targetProvCode = addr.facilities[0].provinceCode;
      }

      // Lấy 1 ward đại diện bất kỳ thuộc Tỉnh/TP đó
      const fallbackWard = allWards.find(w => w.provinceCode === targetProvCode);
      if (fallbackWard) {
        matchedWardCode = fallbackWard.code;
      }
    }

    if (matchedWardCode) {
      await prisma.address.update({
        where: { id: addr.id },
        data: { wardCode: matchedWardCode },
      });
      updatedCount++;
    }
  }

  console.log(`✅ Hoàn tất! Đã cập nhật thành công wardCode cho ${updatedCount}/${nullAddresses.length} địa chỉ.`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi cập nhật wardCode:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
