import axios from 'axios';
import { prisma } from '../../config/prisma';
import { BadRequestException } from '../../middlewares/error.middleware';
import { expressDeadlineSec } from '../routing/express_insertion';

export class PricingService {
  /**
   * Gọi Goong Distance Matrix (1x1 xe máy) với cơ chế Retry 1 lần (delay 1s) khi gặp sự cố mạng
   */
  private async fetchGoongDurationWithRetry(
    pickup: { lat: number; lng: number },
    delivery: { lat: number; lng: number }
  ): Promise<number | null> {
    const apiKey = process.env.GOONG_API_KEY;
    if (!apiKey) return null;

    const url = `https://rsapi.goong.io/DistanceMatrix?origins=${pickup.lat},${pickup.lng}&destinations=${delivery.lat},${delivery.lng}&vehicle=bike&api_key=${apiKey}`;

    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        const res = await axios.get(url, { timeout: 3500 });
        const element = res.data?.rows?.[0]?.elements?.[0];
        if (element?.status === 'OK' && typeof element.duration?.value === 'number') {
          return element.duration.value; // Số giây thực tế từ Goong
        }
      } catch (err) {
        if (attempt === 0) {
          // Delay 1 giây (1000ms) rồi gọi lại lần 2 chống chập chờn mạng
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        console.warn('⚠️ [PricingService] Goong Matrix failed after retry, using calibrated fallback:', (err as Error).message);
      }
    }
    return null;
  }

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
    destWardCode?: string,
    pickupCoords?: { lat: number; lng: number },
    deliveryCoords?: { lat: number; lng: number }
  ) {
    // 1. Lấy thông tin gói cước dịch vụ từ DB
    const service = await prisma.service.findUnique({
      where: { serviceCode, isActive: true },
    });

    if (!service) {
      throw new BadRequestException(`Gói dịch vụ '${serviceCode}' không tồn tại hoặc đã bị khóa`);
    }

    // 2. Tính ETA dự kiến giao hàng (truyền tọa độ để gọi Goong nếu là EXPRESS)
    const etaResult = await this.calculateDeliveryEta(
      serviceCode,
      distanceKm,
      originWardCode,
      destWardCode,
      pickupCoords,
      deliveryCoords
    );

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
    destWardCode?: string,
    pickupCoords?: { lat: number; lng: number },
    deliveryCoords?: { lat: number; lng: number }
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

      // Thử gọi Goong Distance Matrix 1x1 xe máy kèm retry 1s
      let pickupToDropSec: number | null = null;
      if (pickupCoords?.lat && pickupCoords?.lng && deliveryCoords?.lat && deliveryCoords?.lng) {
        pickupToDropSec = await this.fetchGoongDurationWithRetry(pickupCoords, deliveryCoords);
      }

      let totalMinutes: number;
      if (pickupToDropSec !== null) {
        // Áp dụng hàm expressDeadlineSec: 25p đệm (15p tới đón + 5p gửi + 5p giao) + 1.3 * thời gian Goong
        const deadlineSec = expressDeadlineSec(pickupToDropSec);
        totalMinutes = Math.max(25, Math.round(deadlineSec / 60));
      } else {
        // Fallback khoa học khi mất mạng: Haversine * 1.76 độ uốn lượn / 11.3 km/h
        const fallbackTravelSec = Math.round(((distanceKm * 1.76) / 11.3) * 3600);
        const deadlineSec = expressDeadlineSec(fallbackTravelSec);
        totalMinutes = Math.max(25, Math.round(deadlineSec / 60));
      }

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
