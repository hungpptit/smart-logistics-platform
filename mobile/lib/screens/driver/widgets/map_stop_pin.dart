import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';

class MapStopPin extends StatelessWidget {
  final String label;
  const MapStopPin({super.key, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 28.0,
          height: 28.0,
          decoration: BoxDecoration(
            color: AppColors.logisticsRed,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.pureWhite, width: 2.0),
            boxShadow: AppStyles.softShadow,
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: AppTypography.labelMd.copyWith(
              color: AppColors.pureWhite,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        Container(
          width: 3.0,
          height: 6.0,
          color: AppColors.logisticsRed,
        ),
      ],
    );
  }
}
