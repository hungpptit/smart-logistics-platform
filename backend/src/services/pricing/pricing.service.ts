import { prisma } from '../../config/prisma';
import { BadRequestException } from '../../middlewares/error.middleware';

export class PricingService {
  /**
   * Tính toán phí vận chuyển tự động
   * @param serviceCode Mã dịch vụ (EXPRESS, STANDARD, SAVING, COLD_CHAIN)
   * @param distanceKm Khoảng cách địa lý tính theo Km
   * @param totalWeightKg Tổng trọng lượng các kiện hàng tính bằng Kg
   * @param isFragile Có chứa hàng dễ vỡ không
   * @param codAmount Số tiền thu hộ COD
   */
  public async calculatePrice(
    serviceCode: string,
    distanceKm: number,
    totalWeightKg: number,
    isFragile: boolean = false,
    codAmount: number = 0
  ) {
    // 1. Lấy thông tin gói cước dịch vụ từ DB
    const service = await prisma.service.findUnique({
      where: { serviceCode, isActive: true },
    });

    if (!service) {
      throw new BadRequestException(`Gói dịch vụ '${serviceCode}' không tồn tại hoặc đã bị khóa`);
    }

    const basePrice = Number(service.basePrice);
    const freeDistanceKm = service.freeDistanceKm;
    const pricePerKm = Number(service.pricePerKm);
    const freeWeightKg = service.freeWeightKg;
    const pricePerKg = Number(service.pricePerKg);

    // 2. Tính phí khoảng cách quá hạn (Chỉ áp dụng cho dịch vụ chặng cuối gom giao trực tiếp: EXPRESS, COLD_CHAIN. STANDARD và SAVING giao liên tỉnh không tính phí theo km đường bộ)
    const isDistanceBased = serviceCode === 'EXPRESS' || serviceCode === 'COLD_CHAIN';
    const billableDistance = isDistanceBased ? Math.max(0, distanceKm - freeDistanceKm) : 0;
    const distanceFee = isDistanceBased ? billableDistance * pricePerKm : 0;

    // 3. Tính phí trọng lượng quá hạn
    const billableWeight = Math.max(0, totalWeightKg - freeWeightKg);
    const weightFee = billableWeight * pricePerKg;

    // 4. Phụ phí hàng dễ vỡ (Mặc định 15,000 VND nếu có hàng dễ vỡ)
    const fragileSurcharge = isFragile ? 15000 : 0;

    // 5. Tính phí bảo hiểm/thu hộ COD (0.5% số tiền COD, tối thiểu 0, tối đa 50,000 VND)
    let insuranceFee = 0;
    if (codAmount > 0) {
      insuranceFee = Math.min(50000, Math.max(0, codAmount * 0.005));
    }

    // 6. Tổng cước vận chuyển
    const shippingFee = basePrice + distanceFee + weightFee + fragileSurcharge;
    const totalAmount = shippingFee + insuranceFee;

    return {
      serviceId: service.id,
      pricingVersion: service.pricingVersion,
      basePrice,
      distanceFee,
      weightFee,
      fragileSurcharge,
      shippingFee: parseFloat(shippingFee.toFixed(2)),
      insuranceFee: parseFloat(insuranceFee.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
    };
  }
}
