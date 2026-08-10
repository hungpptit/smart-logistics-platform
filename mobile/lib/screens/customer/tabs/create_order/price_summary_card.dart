import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/app_styles.dart';
import 'form_section_header.dart';

/// Dark card showing the computed shipping price breakdown
class PriceSummaryCard extends StatelessWidget {
  final double basePrice;
  final double serviceFee;
  final double fuelTax;
  final double totalCost;
  final String Function(double) formatCurrency;

  const PriceSummaryCard({
    super.key,
    required this.basePrice,
    required this.serviceFee,
    required this.fuelTax,
    required this.totalCost,
    required this.formatCurrency,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        color: AppColors.deepOnyx,
        borderRadius: AppStyles.roundedXl,
        boxShadow: AppStyles.ambientShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.receipt_long, color: AppColors.logisticsRed),
              const SizedBox(width: 8.0),
              Text(
                'Chi tiet cuoc tam tinh',
                style: AppTypography.headlineMd.copyWith(color: AppColors.pureWhite, fontSize: 17.0),
              ),
            ],
          ),
          const SizedBox(height: 14.0),
          const Divider(color: Colors.white24),
          const SizedBox(height: 10.0),
          SummaryRow(label: 'Cuoc co ban', value: formatCurrency(basePrice)),
          const SizedBox(height: 8.0),
          SummaryRow(label: 'Cuoc khoang cach & phu phi', value: formatCurrency(serviceFee)),
          const SizedBox(height: 8.0),
          SummaryRow(label: 'Cuoc can nang & bao hiem', value: formatCurrency(fuelTax)),
          const SizedBox(height: 14.0),
          const Divider(color: Colors.white24),
          const SizedBox(height: 10.0),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Tong cuoc tam tinh',
                style: AppTypography.headlineMd.copyWith(color: AppColors.pureWhite, fontWeight: FontWeight.bold),
              ),
              Text(
                formatCurrency(totalCost),
                style: AppTypography.headlineMd.copyWith(
                  color: AppColors.logisticsRed,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
