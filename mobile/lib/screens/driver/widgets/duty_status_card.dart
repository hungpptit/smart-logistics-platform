import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';

class DutyStatusCard extends StatelessWidget {
  final bool isDutyActive;
  final bool isDutyLoading;
  final void Function(bool) onToggle;

  const DutyStatusCard({
    super.key,
    required this.isDutyActive,
    required this.isDutyLoading,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16.0),
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      decoration: BoxDecoration(
        color: AppColors.pureWhite,
        borderRadius: AppStyles.roundedLg,
        border: Border.all(
          color: isDutyActive ? Colors.green.shade300 : AppColors.surfaceContainerHighest,
        ),
        boxShadow: AppStyles.softShadow,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 10.0,
                height: 10.0,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isDutyActive ? Colors.green : Colors.grey.shade400,
                ),
              ),
              const SizedBox(width: 10.0),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isDutyActive ? 'Trang thai: Truc tuyen' : 'Trang thai: Ngoai tuyen',
                    style: AppTypography.labelLg.copyWith(
                      fontWeight: FontWeight.bold,
                      color: isDutyActive ? Colors.green.shade800 : AppColors.deepOnyx,
                    ),
                  ),
                  const SizedBox(height: 2.0),
                  Text(
                    isDutyActive ? 'San sang nhan lo trinh tu buu cuc' : 'Tam dung nhan lo trinh moi',
                    style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                  ),
                ],
              ),
            ],
          ),
          Switch(
            value: isDutyActive,
            activeThumbColor: Colors.green,
            activeTrackColor: Colors.green.shade300,
            inactiveThumbColor: Colors.grey,
            onChanged: isDutyLoading ? null : onToggle,
          ),
        ],
      ),
    );
  }
}
