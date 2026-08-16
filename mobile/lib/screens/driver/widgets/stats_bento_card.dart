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
  final bool isLinehaul;
  final int loadedTotesCount;
  final int totalPackageCount;

  const StatsBentoCard({
    super.key,
    required this.stops,
    this.isRouteStarted = true,
    this.currentLocation,
    this.isLinehaul = false,
    this.loadedTotesCount = 0,
    this.totalPackageCount = 0,
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

  /// Tính tổng thời gian dự kiến di chuyển + xử lý bốc dỡ tại các điểm dừng
  double get _totalEstimatedMinutes {
    if (stops.isEmpty) return 0.0;
    final totalKm = _totalRouteDistanceKm;
    final bool isLinehaulMode = isLinehaul || (stops.isNotEmpty && stops.first['isLinehaul'] == true);
    final double avgSpeedKmh = isLinehaulMode ? 60.0 : 30.0; // Xe tải đường trường/quốc lộ ~60 km/h, Shipper nội thành ~30 km/h
    final double travelMinutes = (totalKm / avgSpeedKmh) * 60.0;
    final double serviceMinutesPerStop = isLinehaulMode ? 10.0 : 4.0;
    final double totalServiceMinutes = stops.length * serviceMinutesPerStop;
    return travelMinutes + totalServiceMinutes;
  }

  String get _formattedEstimatedTime {
    final double totalMins = _totalEstimatedMinutes;
    if (totalMins <= 0) return '0 phút';
    if (totalMins < 60) {
      return '${totalMins.round()} phút';
    }
    final int hours = totalMins ~/ 60;
    final int remainingMins = (totalMins % 60).round();
    if (remainingMins == 0) {
      return '$hours giờ';
    }
    return '$hours giờ $remainingMins p';
  }

  @override
  Widget build(BuildContext context) {
    final completedCount = _completedCount;
    final totalCount = stops.length;
    final progress = stops.isEmpty ? 0.0 : completedCount / totalCount;
    final bool isToteMode = isLinehaul || loadedTotesCount > 0 || (stops.isNotEmpty && stops.first['isLinehaul'] == true);
    final bool hasPickup = stops.isNotEmpty && stops.any((s) => s['isPickup'] == true || s['stopType'] == 'PICKUP');
    final bool isPendingPickupConfirm = !isRouteStarted && stops.isNotEmpty && !isToteMode && hasPickup;
    final bool isPendingDeliveryScan = !isRouteStarted && stops.isNotEmpty && !isToteMode && !hasPickup;
    final double totalKm = _totalRouteDistanceKm;
    final String estimatedTimeStr = _formattedEstimatedTime;
    final bool isAllFinished = totalCount > 0 && completedCount == totalCount;

    final String statusText = stops.isEmpty
        ? 'SẴN SÀNG'
        : (isToteMode
            ? 'TRUNG CHUYỂN'
            : (isAllFinished
                ? 'HOÀN THÀNH'
                : (isPendingPickupConfirm
                    ? 'CHỜ XÁC NHẬN'
                    : (isPendingDeliveryScan ? 'CHỜ QUÉT NHẬN' : 'HOẠT ĐỘNG'))));

    final Color badgeBg = stops.isEmpty
        ? Colors.green.shade50
        : (isToteMode
            ? Colors.indigo.shade50
            : (isAllFinished
                ? Colors.blue.shade50
                : (isPendingPickupConfirm
                    ? const Color(0xFFEFF6FF)
                    : (isPendingDeliveryScan ? Colors.amber.shade50 : Colors.green.shade50))));

    final Color badgeTextColor = stops.isEmpty
        ? Colors.green.shade800
        : (isToteMode
            ? Colors.indigo.shade900
            : (isAllFinished
                ? Colors.blue.shade900
                : (isPendingPickupConfirm
                    ? const Color(0xFF1D4ED8)
                    : (isPendingDeliveryScan ? Colors.amber.shade900 : Colors.green.shade800))));

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
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(20.0),
                ),
                child: Text(
                  statusText,
                  style: AppTypography.labelMd.copyWith(
                    color: badgeTextColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16.0),

          if (isToteMode && stops.isNotEmpty) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Hàng đã lên xe', style: AppTypography.bodyMd.copyWith(color: AppColors.secondary)),
                Text(
                  '$loadedTotesCount thùng ($totalPackageCount bưu kiện)',
                  style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.bold, color: Colors.indigo.shade800),
                ),
              ],
            ),
            const SizedBox(height: 16.0),
          ] else if (isRouteStarted && totalCount > 0) ...[
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
          ] else ...[
            const SizedBox(height: 8.0),
          ],

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
                        'Thời gian dự kiến',
                        style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                      ),
                      const SizedBox(height: 4.0),
                      Text(
                        estimatedTimeStr,
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
