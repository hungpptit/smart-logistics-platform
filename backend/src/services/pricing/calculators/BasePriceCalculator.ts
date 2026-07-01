import { IFeeCalculator, PricingContext, FeeBreakdown } from '../types';

export class BasePriceCalculator implements IFeeCalculator {
  name = 'BASE_PRICE';

  async calculate(context: PricingContext, serviceConfig: any): Promise<FeeBreakdown> {
    return {
      calculatorName: this.name,
      amount: Number(serviceConfig.basePrice),
      description: `Cước dịch vụ cơ bản (${serviceConfig.serviceName})`
    };
  }
}
