import { IFeeCalculator, PricingContext, FeeBreakdown } from '../types';

export class DistanceFeeCalculator implements IFeeCalculator {
  name = 'DISTANCE_FEE';

  async calculate(context: PricingContext, serviceConfig: any): Promise<FeeBreakdown> {
    const { distanceKm } = context;
    const freeDist = serviceConfig.freeDistanceKm;
    const pricePerKm = Number(serviceConfig.pricePerKm);

    let amount = 0;
    let description = `Miễn phí cước di chuyển (${distanceKm} km <= ${freeDist} km đầu)`;

    if (distanceKm > freeDist) {
      const chargeableDist = distanceKm - freeDist;
      amount = chargeableDist * pricePerKm;
      description = `Phí di chuyển vượt định mức: ${chargeableDist.toFixed(1)} km tiếp theo x ${pricePerKm.toLocaleString()} đ/km`;
    }

    return { calculatorName: this.name, amount, description };
  }
}
