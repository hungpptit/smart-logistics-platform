import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';

class MapPreviewCard extends StatelessWidget {
  final MapController mapController;
  final LatLng currentLocation;
  final List<Map<String, dynamic>> stops;
  final List<LatLng> roadPolylinePoints;
  final VoidCallback onStartNavigation;
  final bool isRouteStarted;

  const MapPreviewCard({
    super.key,
    required this.mapController,
    required this.currentLocation,
    required this.stops,
    required this.roadPolylinePoints,
    required this.onStartNavigation,
    this.isRouteStarted = true,
  });

  @override
  Widget build(BuildContext context) {
    final bool allCompleted = stops.isNotEmpty &&
        stops.every((s) =>
            s['isCheckedIn'] == true ||
            s['status'] == 'DA GIAO' ||
            s['status'] == 'ĐÃ GIAO' ||
            s['status'] == 'DA LAY HANG' ||
            s['status'] == 'ĐÃ LẤY HÀNG' ||
            s['status'] == 'COMPLETED');

    double distanceKm = 0.0;
    int estimatedMinutes = 0;

    if (stops.isEmpty) {
      distanceKm = 0.0;
      estimatedMinutes = 0;
    } else if (allCompleted) {
      final double hubLat = 10.8460;
      final double hubLng = 106.7860;
      final double distanceMeters = Geolocator.distanceBetween(
        currentLocation.latitude, currentLocation.longitude, hubLat, hubLng,
      );
      distanceKm = distanceMeters / 1000.0;
      estimatedMinutes = (distanceKm / 25 * 60).round();
      if (estimatedMinutes < 2) estimatedMinutes = 2;
    } else {
      final activeStop = stops.firstWhere(
        (s) => s['isCheckedIn'] != true,
        orElse: () => stops.isNotEmpty ? stops.first : <String, dynamic>{},
      );

      if (activeStop.isNotEmpty) {
        final double lat = double.tryParse(activeStop['latitude']?.toString() ?? '') ?? currentLocation.latitude;
        final double lng = double.tryParse(activeStop['longitude']?.toString() ?? '') ?? currentLocation.longitude;
        final double distanceMeters = Geolocator.distanceBetween(
          currentLocation.latitude, currentLocation.longitude, lat, lng,
        );
        distanceKm = distanceMeters / 1000.0;
        estimatedMinutes = (distanceKm / 25 * 60).round();
        if (estimatedMinutes < 2) estimatedMinutes = 2;
      }
    }

    return Container(
      height: 220.0,
      width: double.infinity,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: AppStyles.roundedXl,
        border: Border.all(color: AppColors.surfaceContainer),
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: FlutterMap(
              mapController: mapController,
              options: MapOptions(
                initialCenter: currentLocation,
                initialZoom: 13.0,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.velocity.mobile',
                ),
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: roadPolylinePoints.isNotEmpty
                          ? roadPolylinePoints
                          : [
                              currentLocation,
                              ...stops.map((stop) {
                                final lat = double.tryParse(stop['latitude']?.toString() ?? '') ??
                                    currentLocation.latitude;
                                final lng = double.tryParse(stop['longitude']?.toString() ?? '') ??
                                    currentLocation.longitude;
                                return LatLng(lat, lng);
                              }),
                            ],
                      strokeWidth: 3.5,
                      color: AppColors.logisticsRed,
                    ),
                  ],
                ),
                MarkerLayer(
                  markers: [
                    ...stops.map((stop) {
                      final lat = double.tryParse(stop['latitude']?.toString() ?? '') ??
                          currentLocation.latitude;
                      final lng = double.tryParse(stop['longitude']?.toString() ?? '') ??
                          currentLocation.longitude;
                      return Marker(
                        point: LatLng(lat, lng),
                        width: 24.0,
                        height: 24.0,
                        child: Container(
                          decoration: const BoxDecoration(
                            color: AppColors.logisticsRed,
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '${stop['index']}',
                            style: const TextStyle(
                                color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                      );
                    }),
                    Marker(
                      point: currentLocation,
                      width: 30.0,
                      height: 30.0,
                      child: const Icon(
                        Icons.my_location,
                        color: AppColors.logisticsRed,
                        size: 24.0,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    AppColors.deepOnyx.withValues(alpha: 0.5),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            left: 16.0,
            right: 16.0,
            bottom: 16.0,
            child: Container(
              padding: const EdgeInsets.all(12.0),
              decoration: BoxDecoration(
                color: AppColors.pureWhite.withValues(alpha: 0.95),
                borderRadius: AppStyles.roundedLg,
                border: Border.all(
                  color: allCompleted ? Colors.green.shade400 : AppColors.surfaceContainerHighest,
                  width: allCompleted ? 1.5 : 1.0,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 36.0,
                    height: 36.0,
                    decoration: BoxDecoration(
                      color: allCompleted ? Colors.green.shade700 : AppColors.logisticsRed,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      allCompleted ? Icons.warehouse_rounded : Icons.navigation,
                      color: AppColors.pureWhite,
                      size: 18.0,
                    ),
                  ),
                  const SizedBox(width: 12.0),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          stops.isEmpty
                              ? 'Chưa có lộ trình phân công'
                              : (allCompleted ? 'Quay về Bưu cục bàn giao thùng hàng' : 'Dự kiến điểm dừng tiếp'),
                          style: AppTypography.labelMd.copyWith(
                            color: stops.isEmpty
                                ? AppColors.secondary
                                : (allCompleted ? Colors.green.shade900 : AppColors.logisticsRed),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          stops.isEmpty
                              ? 'Chờ nhận chuyến từ Bưu cục (0.0 km)'
                              : (allCompleted
                                  ? 'Bưu cục Tăng Nhơn Phú ($estimatedMinutes Phút - ${distanceKm.toStringAsFixed(1)} km)'
                                  : '$estimatedMinutes Phút (${distanceKm.toStringAsFixed(1)} km)'),
                          style: AppTypography.bodyMd.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppColors.deepOnyx,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (isRouteStarted || allCompleted)
                    ElevatedButton(
                      onPressed: onStartNavigation,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: allCompleted ? Colors.green.shade800 : AppColors.deepOnyx,
                        foregroundColor: AppColors.pureWhite,
                        shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                        padding: const EdgeInsets.symmetric(horizontal: 14.0),
                      ),
                      child: Text(allCompleted ? 'Về bưu cục' : 'Dẫn đường'),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
