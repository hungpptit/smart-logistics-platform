import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';

class ShiftSummaryDialog extends StatelessWidget {
  const ShiftSummaryDialog({super.key});

  static void show(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => const ShiftSummaryDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.pureWhite,
      shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Tóm tắt ca',
                  style: AppTypography.headlineLgMobile.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.deepOnyx,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppColors.secondary),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16.0),
            Container(
              padding: const EdgeInsets.all(16.0),
              decoration: BoxDecoration(
                color: AppColors.cloudGray,
                borderRadius: AppStyles.roundedLg,
              ),
              child: Row(
                children: [
                  const Icon(Icons.timer, color: AppColors.logisticsRed, size: 40.0),
                  const SizedBox(width: 16.0),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'THỜI GIAN HIỆN TẠI',
                        style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                      ),
                      const SizedBox(height: 2.0),
                      Text(
                        '0giờ 42phút 12giây',
                        style: AppTypography.headlineMd.copyWith(
                          color: AppColors.deepOnyx,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16.0),
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16.0),
                    decoration: BoxDecoration(
                      borderRadius: AppStyles.roundedLg,
                      border: Border.all(color: AppColors.surfaceContainerHighest),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Thành công',
                            style: AppTypography.labelMd.copyWith(color: AppColors.secondary)),
                        const SizedBox(height: 4.0),
                        Text(
                          '4',
                          style: AppTypography.headlineMd.copyWith(
                            color: Colors.green,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12.0),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16.0),
                    decoration: BoxDecoration(
                      borderRadius: AppStyles.roundedLg,
                      border: Border.all(color: AppColors.surfaceContainerHighest),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Đang chờ',
                            style: AppTypography.labelMd.copyWith(color: AppColors.secondary)),
                        const SizedBox(height: 4.0),
                        Text(
                          '14',
                          style: AppTypography.headlineMd.copyWith(
                            color: AppColors.deepOnyx,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16.0),
            Container(
              padding: const EdgeInsets.all(16.0),
              decoration: BoxDecoration(
                borderRadius: AppStyles.roundedLg,
                border: Border.all(color: AppColors.surfaceContainerHighest),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Thu nhập (Dự kiến)',
                      style: AppTypography.labelMd.copyWith(color: AppColors.secondary)),
                  const SizedBox(height: 4.0),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '\$142.50',
                        style: AppTypography.headlineLgMobile.copyWith(
                          color: AppColors.deepOnyx,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '+\$12.00 thưởng',
                        style: AppTypography.labelLg.copyWith(
                          color: Colors.green,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24.0),
            SizedBox(
              width: double.infinity,
              height: 48.0,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.logisticsRed,
                  foregroundColor: AppColors.pureWhite,
                  shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                ),
                child: const Text('TẢI BÁO CÁO'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
