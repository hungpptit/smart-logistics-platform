import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';

class StatsBentoCard extends StatelessWidget {
  final List<Map<String, dynamic>> stops;

  const StatsBentoCard({super.key, required this.stops});

  int get _completedCount => stops
      .where((s) =>
          s['isCheckedIn'] == true ||
          s['status'] == 'DA GIAO' ||
          s['status'] == 'DA LAY HANG')
      .length;

  @override
  Widget build(BuildContext context) {
    final completedCount = _completedCount;
    final totalCount = stops.length;
    final progress = stops.isEmpty ? 0.0 : completedCount / totalCount;

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
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Trang thai ca',
                style: AppTypography.labelLg.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.deepOnyx,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(12.0),
                ),
                child: Text(
                  'HOAT DONG',
                  style: AppTypography.labelMd.copyWith(
                    color: Colors.green.shade800,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16.0),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Hoan thanh', style: AppTypography.bodyMd.copyWith(color: AppColors.secondary)),
              Text(
                '$completedCount / $totalCount',
                style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 8.0),
          LinearProgressIndicator(
            value: progress,
            backgroundColor: AppColors.cloudGray,
            color: AppColors.logisticsRed,
            minHeight: 8.0,
            borderRadius: BorderRadius.circular(4.0),
          ),
          const SizedBox(height: 20.0),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12.0),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerLow,
                    borderRadius: AppStyles.roundedLg,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Quang duong',
                        style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                      ),
                      const SizedBox(height: 4.0),
                      Text(
                        stops.isEmpty
                            ? '0.0 km'
                            : '${(stops.length * 3.5).toStringAsFixed(1)} km',
                        style: AppTypography.headlineMd.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppColors.deepOnyx,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12.0),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12.0),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerLow,
                    borderRadius: AppStyles.roundedLg,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Dung trung binh',
                        style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                      ),
                      const SizedBox(height: 4.0),
                      Text(
                        stops.isEmpty
                            ? '0.0 phut'
                            : '${(12.0 / (stops.isNotEmpty ? stops.length : 1)).toStringAsFixed(1)} phut',
                        style: AppTypography.headlineMd.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppColors.deepOnyx,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
