import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/app_styles.dart';

/// Numbered section header used in the order creation form
class FormSectionHeader extends StatelessWidget {
  final int num;
  final String title;

  const FormSectionHeader({super.key, required this.num, required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 30.0,
          height: 30.0,
          decoration: const BoxDecoration(
            color: AppColors.logisticsRed,
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Text(
            '$num',
            style: AppTypography.labelLg.copyWith(
              color: AppColors.pureWhite,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(width: 10.0),
        Expanded(
          child: Text(
            title,
            style: AppTypography.headlineMd.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.deepOnyx,
            ),
          ),
        ),
      ],
    );
  }
}

/// White card container for grouping form fields
class FormCard extends StatelessWidget {
  final List<Widget> children;

  const FormCard({super.key, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        color: AppColors.pureWhite,
        borderRadius: AppStyles.roundedXl,
        border: Border.all(color: AppColors.surfaceContainer),
        boxShadow: AppStyles.ambientShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }
}

/// A summary row used in the price summary card (label + value)
class SummaryRow extends StatelessWidget {
  final String label;
  final String value;

  const SummaryRow({super.key, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTypography.bodyMd.copyWith(color: Colors.white70)),
        Text(value, style: AppTypography.bodyMd.copyWith(color: AppColors.pureWhite, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
