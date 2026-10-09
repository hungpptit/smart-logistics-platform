import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Kiểm tra các bản ghi thanh toán cũ cần backfill...');
  const paidPayments = await prisma.orderPayment.findMany({
    where: { 
      paymentStatus: 'PAID', 
      transactions: { none: {} } 
    }
  });

  console.log(`Tìm thấy ${paidPayments.length} đơn hàng đã PAID chưa có bản ghi PaymentTransaction.`);

  for (const p of paidPayments) {
    const totalAmount = Number(p.finalShippingFee) + Number(p.finalCodAmount);
    await prisma.paymentTransaction.create({
      data: {
        orderPaymentId: p.id,
        gatewayProvider: 'CASH',
        merchantTransCode: `LEGACY_PAID_${p.id.substring(0, 8)}_${Date.now().toString().slice(-4)}`,
        amount: totalAmount > 0 ? totalAmount : 10000,
        shippingAmount: p.finalShippingFee,
        codAmount: p.finalCodAmount,
        currency: 'VND',
        transactionType: 'PREPAY_SHIPPING',
        transactionStatus: 'SUCCESS',
        paidAt: p.updatedAt || new Date()
      }
    });
  }

  if (paidPayments.length > 0) {
    console.log(`✅ Đã backfill thành công ${paidPayments.length} giao dịch lịch sử.`);
  } else {
    console.log('✅ Dữ liệu hoàn toàn sạch, không có bản ghi nào bị thiếu.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Lỗi backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
