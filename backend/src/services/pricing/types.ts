export interface PricingContext {
  serviceId: string;
  distanceKm: number;
  totalWeightKg: number;
  isFragile?: boolean;
  codAmount?: number;
}

export interface FeeBreakdown {
  calculatorName: string;
  amount: number;
  description: string;
}

export interface PricingResult {
  totalFee: number;
  pricingVersion: number;
  breakdown: FeeBreakdown[];
}

export interface IFeeCalculator {
  name: string;
  calculate(context: PricingContext, serviceConfig: any): Promise<FeeBreakdown>;
}
