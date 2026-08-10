import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/app_styles.dart';

/// Small interactive map preview used in the address sections of order creation.
/// UI preserved exactly from original _buildMapPreviewWidget method:
/// - height: 180, Stack layout, locate button at bottom-right overlay.
class AddressMapPreview extends StatelessWidget {
  final bool isSender;
  final double lat;
  final double lng;
  final MapController mapController;
  final bool isLocating;
  final VoidCallback onLocate;

  const AddressMapPreview({
    super.key,
    required this.isSender,
    required this.lat,
    required this.lng,
    required this.mapController,
    required this.isLocating,
    required this.onLocate,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 180.0,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: AppStyles.roundedLg,
        border: Border.all(color: AppColors.surfaceContainerHighest),
      ),
      child: ClipRRect(
        borderRadius: AppStyles.roundedLg,
        child: Stack(
          children: [
            FlutterMap(
              mapController: mapController,
              options: MapOptions(
                initialCenter: LatLng(lat, lng),
                initialZoom: 15.0,
              ),
              children: [
                TileLayer(
                  urlTemplate: AppConfig.mapTileUrl,
                  userAgentPackageName: 'com.velocity.slp.velocity_mobile',
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: LatLng(lat, lng),
                      width: 40.0,
                      height: 40.0,
                      child: const Icon(
                        Icons.location_on,
                        color: AppColors.logisticsRed,
                        size: 38.0,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            Positioned(
              bottom: 10,
              right: 10,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: isLocating ? null : onLocate,
                  borderRadius: BorderRadius.circular(20.0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
                    decoration: BoxDecoration(
                      color: AppColors.pureWhite,
                      borderRadius: BorderRadius.circular(20.0),
                      boxShadow: AppStyles.ambientShadow,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (isLocating) ...[
                          const SizedBox(
                            width: 14.0,
                            height: 14.0,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.0,
                              color: AppColors.logisticsRed,
                            ),
                          ),
                          const SizedBox(width: 6.0),
                          Text(
                            'Dang dinh vi...',
                            style: AppTypography.labelMd.copyWith(
                              color: AppColors.logisticsRed,
                              fontSize: 11.0,
                            ),
                          ),
                        ] else ...[
                          const Icon(
                            Icons.my_location,
                            size: 16.0,
                            color: AppColors.logisticsRed,
                          ),
                          const SizedBox(width: 6.0),
                          Text(
                            'Vi tri hien tai',
                            style: AppTypography.labelMd.copyWith(
                              color: AppColors.logisticsRed,
                              fontSize: 11.0,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
