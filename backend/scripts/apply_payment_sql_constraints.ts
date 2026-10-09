import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Đang áp dụng các CHECK Constraints & Partial Indexes nâng cao...');

  try {
    // 1. Áp dụng CHECK constraints
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pay_amount_pos') THEN
          ALTER TABLE payment_transactions ADD CONSTRAINT chk_pay_amount_pos CHECK (amount > 0);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_refund_amount_pos') THEN
          ALTER TABLE refund_transactions ADD CONSTRAINT chk_refund_amount_pos CHECK (amount > 0);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_paid_at_consistency') THEN
          ALTER TABLE payment_transactions ADD CONSTRAINT chk_paid_at_consistency 
            CHECK ((transaction_status = 'SUCCESS' AND paid_at IS NOT NULL) OR (transaction_status != 'SUCCESS'));
        END IF;
      END $$;
    `);
    console.log('✅ CHECK Constraints (amount > 0, paid_at consistency) đã được áp dụng.');

    // 2. Áp dụng Partial Unique Index (Chỉ 1 phiên PENDING cho mỗi nghĩa vụ thanh toán của 1 đơn)
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_pay_trans_one_pending
        ON payment_transactions (order_payment_id, transaction_type)
        WHERE transaction_status = 'PENDING';
    `);
    console.log('✅ Partial Unique Index (uq_pay_trans_one_pending) đã được tạo.');

    // 3. Áp dụng Partial Index cho Job quét phiên hết hạn
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_pay_trans_pending_expiry
        ON payment_transactions (expires_at) 
        WHERE transaction_status = 'PENDING';
    `);
    console.log('✅ Partial Index (idx_pay_trans_pending_expiry) đã được tạo.');

    console.log('🎉 Hoàn tất cấu hình toàn vẹn và tối ưu hiệu năng CSDL!');
  } catch (error) {
    console.error('❌ Lỗi khi áp dụng SQL constraints:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
