import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';

class StopCard extends StatelessWidget {
  final Map<String, dynamic> stop;
  final VoidCallback? onTap;

  const StopCard({super.key, required this.stop, this.onTap});

  @override
  Widget build(BuildContext context) {
    final int index = stop['index'] as int;
    final String title = stop['title'] as String;
    final String address = stop['address'] as String;
    final int packages = stop['packages'] as int;
    final String eta = stop['eta'] as String;
    final String status = stop['status'] as String;
    final bool isActive = stop['isActive'] as bool;

    return GestureDetector(
      onTap: isActive ? onTap : null,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.pureWhite,
          borderRadius: AppStyles.roundedXl,
          border: Border.all(color: AppColors.surfaceContainer),
          boxShadow: AppStyles.ambientShadow,
        ),
        clipBehavior: Clip.antiAlias,
        child: Row(
          children: [
            // Left gradient line for active item
            Container(
              width: 4.0,
              height: 120.0,
              color: isActive ? AppColors.logisticsRed : Colors.transparent,
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Stop Number Circle
                    Container(
                      width: 36.0,
                      height: 36.0,
                      decoration: BoxDecoration(
                        color: isActive ? AppColors.logisticsRed : AppColors.surfaceContainer,
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        '$index',
                        style: AppTypography.headlineMd.copyWith(
                          color: isActive ? AppColors.pureWhite : AppColors.secondary,
                          fontSize: 16.0,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12.0),
                    // Information
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Flexible(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8.0, vertical: 2.0),
                                  decoration: BoxDecoration(
                                    color: AppColors.logisticsRed.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(4.0),
                                  ),
                                  child: Text(
                                    stop['orderCode'] ?? 'ORD-66266482',
                                    style: const TextStyle(
                                      color: AppColors.logisticsRed,
                                      fontSize: 10.0,
                                      fontWeight: FontWeight.bold,
                                      fontFamily: 'monospace',
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4.0),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6.0, vertical: 2.0),
                                decoration: BoxDecoration(
                                  color: status == 'DANG THUC HIEN'
                                      ? AppColors.logisticsRed.withValues(alpha: 0.1)
                                      : AppColors.surfaceContainer,
                                  borderRadius: BorderRadius.circular(4.0),
                                ),
                                child: Text(
                                  status,
                                  style: TextStyle(
                                    color: status == 'DANG THUC HIEN'
                                        ? AppColors.logisticsRed
                                        : AppColors.secondary,
                                    fontSize: 9.0,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6.0),
                          Text(
                            title,
                            style: AppTypography.labelLg.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppColors.deepOnyx,
                            ),
                          ),
                          const SizedBox(height: 4.0),
                          Row(
                            children: [
                              const Icon(Icons.location_on,
                                  size: 14.0, color: AppColors.secondary),
                              const SizedBox(width: 4.0),
                              Expanded(
                                child: Text(
                                  address,
                                  style: AppTypography.labelMd
                                      .copyWith(color: AppColors.secondary),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8.0),
                          Row(
                            children: [
                              Icon(Icons.inventory_2,
                                  size: 14.0,
                                  color: isActive
                                      ? AppColors.tertiary
                                      : AppColors.secondary),
                              const SizedBox(width: 4.0),
                              Text(
                                '$packages Kien hang',
                                style: AppTypography.labelMd.copyWith(
                                  color: isActive
                                      ? AppColors.tertiary
                                      : AppColors.secondary,
                                  fontWeight: isActive
                                      ? FontWeight.bold
                                      : FontWeight.normal,
                                ),
                              ),
                              const SizedBox(width: 16.0),
                              const Icon(Icons.schedule,
                                  size: 14.0, color: AppColors.secondary),
                              const SizedBox(width: 4.0),
                              Text(
                                'Du kien: $eta',
                                style: AppTypography.labelMd
                                    .copyWith(color: AppColors.secondary),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
