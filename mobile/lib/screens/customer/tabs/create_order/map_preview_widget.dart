import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/app_styles.dart';

/// Small interactive map preview used in the address sections of order creation
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              isSender ? 'Vi tri tren ban do (Nguoi gui)' : 'Vi tri tren ban do (Nguoi nhan)',
              style: AppTypography.labelMd.copyWith(color: AppColors.secondary, fontSize: 11.0),
            ),
            InkWell(
              onTap: isLocating ? null : onLocate,
              borderRadius: BorderRadius.circular(8.0),
              child: Padding(
                padding: const EdgeInsets.all(4.0),
                child: Row(
                  children: [
                    isLocating
                        ? const SizedBox(
                            width: 12, height: 12,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.logisticsRed),
                          )
                        : const Icon(Icons.my_location, size: 14.0, color: AppColors.logisticsRed),
                    const SizedBox(width: 4.0),
                    Text(
                      isLocating ? 'Dang lay vi tri...' : 'Lay vi tri hien tai',
                      style: AppTypography.labelMd.copyWith(color: AppColors.logisticsRed, fontSize: 11.0),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8.0),
        ClipRRect(
          borderRadius: AppStyles.roundedLg,
          child: SizedBox(
            height: 140.0,
            child: FlutterMap(
              mapController: mapController,
              options: MapOptions(
                initialCenter: LatLng(lat, lng),
                initialZoom: 14.0,
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag,
                ),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.velocity.mobile',
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: LatLng(lat, lng),
                      width: 32.0,
                      height: 32.0,
                      child: const Icon(
                        Icons.location_pin,
                        color: AppColors.logisticsRed,
                        size: 32.0,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
