import { IFeeCalculator, PricingContext, FeeBreakdown } from '../types';

export class WeightFeeCalculator implements IFeeCalculator {
  name = 'WEIGHT_FEE';

  async calculate(context: PricingContext, serviceConfig: any): Promise<FeeBreakdown> {
    const { totalWeightKg } = context;
    const freeWeight = serviceConfig.freeWeightKg;
    const pricePerKg = Number(serviceConfig.pricePerKg);

    let amount = 0;
    let description = `Miễn phí cước khối lượng (${totalWeightKg} kg <= ${freeWeight} kg đầu)`;

    if (totalWeightKg > freeWeight) {
      const chargeableWeight = totalWeightKg - freeWeight;
      amount = chargeableWeight * pricePerKg;
      description = `Phí khối lượng vượt định mức: ${chargeableWeight.toFixed(1)} kg x ${pricePerKg.toLocaleString()} đ/kg`;
    }

    return { calculatorName: this.name, amount, description };
  }
}
