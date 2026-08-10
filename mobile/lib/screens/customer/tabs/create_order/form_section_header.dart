import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/app_styles.dart';

/// Numbered section header used in the order creation form.
/// UI preserved exactly from original _buildSectionHeader method.
class FormSectionHeader extends StatelessWidget {
  final int num;
  final String title;

  const FormSectionHeader({super.key, required this.num, required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(6.0),
          decoration: const BoxDecoration(
            color: AppColors.logisticsRed,
            shape: BoxShape.circle,
          ),
          child: Text(
            '$num',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 12.0,
            ),
          ),
        ),
        const SizedBox(width: 10.0),
        Expanded(
          child: Text(
            title,
            style: AppTypography.headlineMd.copyWith(
              fontWeight: FontWeight.bold,
              fontSize: 15.0,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

/// White card container for grouping form fields.
/// UI preserved exactly from original _buildFormCard method.
class FormCard extends StatelessWidget {
  final List<Widget> children;

  const FormCard({super.key, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppStyles.roundedXl,
        border: Border.all(color: AppColors.surfaceContainerHigh),
        boxShadow: AppStyles.ambientShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }
}

/// A summary row used in the price summary card (label + value).
/// UI preserved exactly from original _buildSummaryRow method.
class SummaryRow extends StatelessWidget {
  final String label;
  final String value;

  const SummaryRow({super.key, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTypography.bodyMd.copyWith(color: Colors.white70, fontSize: 13.0)),
        Text(value, style: AppTypography.bodyMd.copyWith(color: AppColors.pureWhite, fontWeight: FontWeight.bold, fontSize: 13.0)),
      ],
    );
  }
}
