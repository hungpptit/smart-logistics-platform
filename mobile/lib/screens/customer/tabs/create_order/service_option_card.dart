import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/app_styles.dart';

/// Tappable card for selecting a shipping service level (EXPRESS, STANDARD, etc.)
class ServiceOptionCard extends StatelessWidget {
  final String code;
  final String title;
  final String subtitle;
  final String priceText;
  final bool isSelected;
  final VoidCallback onTap;

  const ServiceOptionCard({
    super.key,
    required this.code,
    required this.title,
    required this.subtitle,
    required this.priceText,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16.0),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.logisticsRed.withValues(alpha: 0.06)
              : AppColors.pureWhite,
          borderRadius: AppStyles.roundedLg,
          border: Border.all(
            color: isSelected ? AppColors.logisticsRed : AppColors.surfaceContainerHighest,
            width: isSelected ? 2.0 : 1.0,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 20.0,
              height: 20.0,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected ? AppColors.logisticsRed : Colors.transparent,
                border: Border.all(
                  color: isSelected ? AppColors.logisticsRed : AppColors.secondary,
                  width: 2.0,
                ),
              ),
              child: isSelected
                  ? const Icon(Icons.check, size: 12.0, color: Colors.white)
                  : null,
            ),
            const SizedBox(width: 14.0),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTypography.labelLg.copyWith(
                      fontWeight: FontWeight.bold,
                      color: isSelected ? AppColors.logisticsRed : AppColors.deepOnyx,
                    ),
                  ),
                  const SizedBox(height: 4.0),
                  Text(
                    subtitle,
                    style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8.0),
            Text(
              priceText,
              style: AppTypography.labelLg.copyWith(
                color: isSelected ? AppColors.logisticsRed : AppColors.deepOnyx,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
