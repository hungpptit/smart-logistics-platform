// Extensible Pricing Engine for Smart Logistics Platform
import { prisma } from '../../config/prisma';
import { PricingContext, PricingResult, IFeeCalculator } from './types';
import { BasePriceCalculator } from './calculators/BasePriceCalculator';
import { DistanceFeeCalculator } from './calculators/DistanceFeeCalculator';
import { WeightFeeCalculator } from './calculators/WeightFeeCalculator';

export class PricingEngine {
  private calculators: IFeeCalculator[] = [];

  constructor() {
    // Chỉ nạp 3 bộ tính cốt lõi cho Phase 1
    this.calculators.push(new BasePriceCalculator());
    this.calculators.push(new DistanceFeeCalculator());
    this.calculators.push(new WeightFeeCalculator());
  }

  public async calculateShippingFee(context: PricingContext): Promise<PricingResult> {
    const serviceConfig = await prisma.service.findUnique({
      where: { id: context.serviceId }
    });

    if (!serviceConfig) {
      throw new Error('Dịch vụ vận chuyển không tồn tại.');
    }

    let totalFee = 0;
    const breakdown = [];

    // Chạy qua Pipeline tính phí
    for (const calculator of this.calculators) {
      const fee = await calculator.calculate(context, serviceConfig);
      totalFee += fee.amount;
      breakdown.push(fee);
    }

    return {
      totalFee,
      pricingVersion: 1,
      breakdown
    };
  }
}
