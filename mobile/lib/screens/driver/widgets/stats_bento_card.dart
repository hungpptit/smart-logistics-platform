import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';

class StatsBentoCard extends StatelessWidget {
  final List<Map<String, dynamic>> stops;
  final bool isRouteStarted;
  final LatLng? currentLocation;

  const StatsBentoCard({
    super.key,
    required this.stops,
    this.isRouteStarted = true,
    this.currentLocation,
  });

  int get _completedCount => stops
      .where((s) =>
          s['isCheckedIn'] == true ||
          s['status'] == 'DA GIAO' ||
          s['status'] == 'ĐÃ GIAO' ||
          s['status'] == 'DA LAY HANG' ||
          s['status'] == 'ĐÃ LẤY HÀNG')
      .length;

  double get _totalRouteDistanceKm {
    if (stops.isEmpty) return 0.0;
    double totalMeters = 0.0;

    LatLng prevPoint = currentLocation ??
        LatLng(
          double.tryParse(stops.first['latitude']?.toString() ?? '') ?? 10.849,
          double.tryParse(stops.first['longitude']?.toString() ?? '') ?? 106.762,
        );

    for (final stop in stops) {
      final double lat = double.tryParse(stop['latitude']?.toString() ?? '') ?? prevPoint.latitude;
      final double lng = double.tryParse(stop['longitude']?.toString() ?? '') ?? prevPoint.longitude;
      final LatLng currPoint = LatLng(lat, lng);
      totalMeters += Geolocator.distanceBetween(
        prevPoint.latitude,
        prevPoint.longitude,
        currPoint.latitude,
        currPoint.longitude,
      );
      prevPoint = currPoint;
    }

    return totalMeters / 1000.0;
  }

  double get _avgStopMinutes {
    if (stops.isEmpty) return 0.0;
    final totalKm = _totalRouteDistanceKm;
    final totalTravelMinutes = (totalKm / 25.0 * 60.0);
    final totalServiceMinutes = stops.length * 5.0;
    final avg = (totalTravelMinutes + totalServiceMinutes) / stops.length;
    return avg.clamp(3.0, 30.0);
  }

  @override
  Widget build(BuildContext context) {
    final completedCount = _completedCount;
    final totalCount = stops.length;
    final progress = stops.isEmpty ? 0.0 : completedCount / totalCount;
    final bool isPendingScan = !isRouteStarted && stops.isNotEmpty;
    final totalKm = _totalRouteDistanceKm;
    final avgMins = _avgStopMinutes;

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
                'Trạng thái ca',
                style: AppTypography.labelLg.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.deepOnyx,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                decoration: BoxDecoration(
                  color: isPendingScan ? Colors.amber.shade50 : Colors.green.shade50,
                  borderRadius: BorderRadius.circular(12.0),
                ),
                child: Text(
                  isPendingScan ? 'CHỜ QUÉT NHẬN' : 'HOẠT ĐỘNG',
                  style: AppTypography.labelMd.copyWith(
                    color: isPendingScan ? Colors.amber.shade900 : Colors.green.shade800,
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
              Text('Hoàn thành', style: AppTypography.bodyMd.copyWith(color: AppColors.secondary)),
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
                        'Quãng đường',
                        style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                      ),
                      const SizedBox(height: 4.0),
                      Text(
                        '${totalKm.toStringAsFixed(1)} km',
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
                        'Dừng trung bình',
                        style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                      ),
                      const SizedBox(height: 4.0),
                      Text(
                        '${avgMins.toStringAsFixed(1)} phút',
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
