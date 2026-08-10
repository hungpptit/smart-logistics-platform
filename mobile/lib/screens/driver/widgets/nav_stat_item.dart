import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';

class NavStatItem extends StatelessWidget {
  final String label;
  final String value;
  final String unit;
  final bool isRed;

  const NavStatItem({
    super.key,
    required this.label,
    required this.value,
    required this.unit,
    this.isRed = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: AppTypography.labelMd.copyWith(color: AppColors.secondary, fontSize: 10.0),
        ),
        const SizedBox(height: 2.0),
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              value,
              style: AppTypography.headlineLgMobile.copyWith(
                fontWeight: FontWeight.bold,
                color: isRed ? AppColors.logisticsRed : AppColors.deepOnyx,
                fontSize: 22.0,
              ),
            ),
            const SizedBox(width: 2.0),
            Text(
              unit,
              style: AppTypography.labelMd.copyWith(
                color: AppColors.deepOnyx,
                fontSize: 12.0,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
