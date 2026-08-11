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
  /**
   * Tính toán phí vận chuyển tự động & thời gian dự kiến giao hàng (ETA)
   */
  public async calculatePrice(
    serviceCode: string,
    distanceKm: number,
    totalWeightKg: number,
    isFragile: boolean = false,
    codAmount: number = 0,
    originWardCode?: string,
    destWardCode?: string
  ) {
    // 1. Lấy thông tin gói cước dịch vụ từ DB
    const service = await prisma.service.findUnique({
      where: { serviceCode, isActive: true },
    });

    if (!service) {
      throw new BadRequestException(`Gói dịch vụ '${serviceCode}' không tồn tại hoặc đã bị khóa`);
    }

    // 2. Tính ETA dự kiến giao hàng
    const etaResult = await this.calculateDeliveryEta(serviceCode, distanceKm, originWardCode, destWardCode);

    const basePrice = Number(service.basePrice);
    const freeDistanceKm = service.freeDistanceKm;
    const pricePerKm = Number(service.pricePerKm);
    const freeWeightKg = service.freeWeightKg;
    const pricePerKg = Number(service.pricePerKg);

    // 3. Tính phí khoảng cách quá hạn
    const isDistanceBased = serviceCode === 'EXPRESS' || serviceCode === 'COLD_CHAIN';
    const billableDistance = isDistanceBased ? Math.max(0, distanceKm - freeDistanceKm) : 0;
    const distanceFee = isDistanceBased ? billableDistance * pricePerKm : 0;

    // 4. Tính phí trọng lượng quá hạn
    const billableWeight = Math.max(0, totalWeightKg - freeWeightKg);
    const weightFee = billableWeight * pricePerKg;

    // 5. Phụ phí hàng dễ vỡ (Mặc định 15,000 VND nếu có hàng dễ vỡ)
    const fragileSurcharge = isFragile ? 15000 : 0;

    // 6. Tính phí bảo hiểm/thu hộ COD (0.5% số tiền COD, tối thiểu 0, tối đa 50,000 VND)
    let insuranceFee = 0;
    if (codAmount > 0) {
      insuranceFee = Math.min(50000, Math.max(0, codAmount * 0.005));
    }

    // 7. Tổng cước vận chuyển
    const shippingFee = basePrice + distanceFee + weightFee + fragileSurcharge;
    const totalAmount = shippingFee + insuranceFee;

    return {
      serviceId: service.id,
      pricingVersion: 1,
      basePrice,
      distanceFee,
      weightFee,
      fragileSurcharge,
      shippingFee: parseFloat(shippingFee.toFixed(2)),
      insuranceFee: parseFloat(insuranceFee.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      estimatedDeliveryHours: etaResult.estimatedDeliveryHours,
      estimatedDeliveryDate: etaResult.estimatedDeliveryDate,
      formattedDeliveryEta: etaResult.formattedDeliveryEta,
    };
  }

  /**
   * Tính toán thời gian dự kiến giao hàng (ETA) động 100% dựa trên gói dịch vụ, khoảng cách và vùng địa lý
   */
  public async calculateDeliveryEta(
    serviceCode: string,
    distanceKm: number,
    originWardCode?: string,
    destWardCode?: string
  ) {
    const service = await prisma.service.findUnique({
      where: { serviceCode, isActive: true },
    });

    if (!service) {
      throw new BadRequestException(`Gói dịch vụ '${serviceCode}' không tồn tại`);
    }

    const now = new Date();

    if (serviceCode === 'EXPRESS') {
      if (distanceKm > 20.0) {
        throw new BadRequestException('Dịch vụ Hỏa tốc (EXPRESS) chỉ hỗ trợ giao hàng dưới 20km');
      }
      const totalMinutes = Math.round(25 + (distanceKm * 2.4));
      const hours = totalMinutes / 60;
      const estimatedDate = new Date(now.getTime() + totalMinutes * 60 * 1000);

      let formattedEta = '';
      if (totalMinutes < 60) {
        formattedEta = `Dự kiến giao sau ${totalMinutes} phút`;
      } else {
        const hrs = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        formattedEta = mins > 0 ? `Dự kiến giao sau ${hrs} tiếng ${mins} phút` : `Dự kiến giao sau ${hrs} tiếng`;
      }

      return {
        estimatedDeliveryHours: parseFloat(hours.toFixed(2)),
        estimatedDeliveryDate: estimatedDate,
        formattedDeliveryEta: formattedEta,
      };
    }

    // Standard, Saving, Cold Chain
    // Standard, Saving, Cold Chain - 4-Tier Distance Matrix matching delivery_time_formula_report.md
    const baseHours = service.estimatedDeliveryHours || 24;
    let extraHours = 0;

    if (distanceKm <= 30) {
      // 1. Nội tỉnh / Nội thành (< 30km)
      extraHours = 0;
    } else if (distanceKm <= 300) {
      // 2. Nội miền khác tỉnh (30km - 300km)
      extraHours = serviceCode === 'COLD_CHAIN' ? 12 : 24;
    } else if (distanceKm <= 800) {
      // 3. Cận miền (300km - 800km)
      extraHours = serviceCode === 'COLD_CHAIN' ? 24 : 48;
    } else {
      // 4. Liên miền (> 800km)
      extraHours = serviceCode === 'COLD_CHAIN' ? 24 : 72;
    }

    const totalHours = baseHours + extraHours;
    const estimatedDate = new Date(now.getTime() + totalHours * 60 * 60 * 1000);

    const days = Math.round(totalHours / 24);
    const dayText = days > 0 ? `${days} ngày` : `${totalHours} giờ`;
    const formattedDate = estimatedDate.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    return {
      estimatedDeliveryHours: totalHours,
      estimatedDeliveryDate: estimatedDate,
      formattedDeliveryEta: `Dự kiến giao: ${formattedDate} (${dayText})`,
    };
  }
}
