import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';
import 'map_stop_pin.dart';
import 'floating_nav_btn.dart';
import 'nav_stat_item.dart';
import 'report_incident_dialog.dart';

class NavigationScreen extends StatefulWidget {
  final MapController navMapController;
  final LatLng currentLocation;
  final List<Map<String, dynamic>> stops;
  final List<LatLng> roadPolylinePoints;
  final bool showTrafficAlert;
  final VoidCallback onStopNavigation;

  const NavigationScreen({
    super.key,
    required this.navMapController,
    required this.currentLocation,
    required this.stops,
    required this.roadPolylinePoints,
    required this.showTrafficAlert,
    required this.onStopNavigation,
  });

  @override
  State<NavigationScreen> createState() => _NavigationScreenState();
}

class _NavigationScreenState extends State<NavigationScreen> {
  bool _isVoiceOn = true;
  bool _isRouteExecuting = false;

  Map<String, dynamic> get _activeStop => widget.stops.firstWhere(
        (s) => s['isCheckedIn'] != true,
        orElse: () => widget.stops.isNotEmpty ? widget.stops.first : <String, dynamic>{},
      );

  @override
  Widget build(BuildContext context) {
    final activeStop = _activeStop;
    final String targetAddress = activeStop['address']?.toString() ?? 'Chua xac dinh diem dung';
    final dynamic rawIndex = activeStop['index'] ?? activeStop['sequence'] ?? 1;
    final int targetIndex = rawIndex is int ? rawIndex : (int.tryParse(rawIndex.toString()) ?? 1);
    final String targetTitle = activeStop['title']?.toString() ?? 'Khach hang';

    return Scaffold(
      body: Stack(
        children: [
          // 1. Full Screen Map
          Positioned.fill(
            child: FlutterMap(
              mapController: widget.navMapController,
              options: MapOptions(
                initialCenter: widget.currentLocation,
                initialZoom: 14.5,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.velocity.mobile',
                ),
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: widget.roadPolylinePoints.isNotEmpty
                          ? widget.roadPolylinePoints
                          : [
                              widget.currentLocation,
                              ...widget.stops.map((stop) {
                                final lat = double.tryParse(stop['latitude']?.toString() ?? '') ??
                                    widget.currentLocation.latitude;
                                final lng = double.tryParse(stop['longitude']?.toString() ?? '') ??
                                    widget.currentLocation.longitude;
                                return LatLng(lat, lng);
                              }),
                            ],
                      strokeWidth: 4.5,
                      color: AppColors.logisticsRed,
                    ),
                  ],
                ),
                MarkerLayer(
                  markers: [
                    ...widget.stops.map((stop) {
                      final lat = double.tryParse(stop['latitude']?.toString() ?? '') ??
                          widget.currentLocation.latitude;
                      final lng = double.tryParse(stop['longitude']?.toString() ?? '') ??
                          widget.currentLocation.longitude;
                      return Marker(
                        point: LatLng(lat, lng),
                        width: 40.0,
                        height: 50.0,
                        child: MapStopPin(label: '${stop['index']}'),
                      );
                    }),
                    // Driver Location with pulsing animation
                    Marker(
                      point: widget.currentLocation,
                      width: 80.0,
                      height: 80.0,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          TweenAnimationBuilder<double>(
                            tween: Tween(begin: 1.0, end: 2.0),
                            duration: const Duration(seconds: 2),
                            builder: (context, value, child) {
                              return Container(
                                width: 40.0 * value,
                                height: 40.0 * value,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AppColors.logisticsRed
                                      .withValues(alpha: 0.3 * (2.0 - value)),
                                ),
                              );
                            },
                          ),
                          Transform.rotate(
                            angle: 0.44,
                            child: Container(
                              width: 36.0,
                              height: 36.0,
                              decoration: BoxDecoration(
                                color: AppColors.logisticsRed,
                                shape: BoxShape.circle,
                                border: Border.all(color: AppColors.pureWhite, width: 2.0),
                                boxShadow: AppStyles.softShadow,
                              ),
                              child: const Icon(Icons.navigation,
                                  color: AppColors.pureWhite, size: 20.0),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // 2. Top Navigation Direction Banner
          Positioned(
            top: MediaQuery.of(context).padding.top + 12.0,
            left: 16.0,
            right: 16.0,
            child: Container(
              padding: const EdgeInsets.all(14.0),
              decoration: BoxDecoration(
                color: AppColors.deepOnyx,
                borderRadius: AppStyles.roundedXl,
                border: const Border(left: BorderSide(color: AppColors.logisticsRed, width: 4.0)),
                boxShadow: AppStyles.softShadow,
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10.0),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      borderRadius: AppStyles.roundedLg,
                    ),
                    child: const Icon(Icons.navigation,
                        size: 28.0, color: AppColors.logisticsRed),
                  ),
                  const SizedBox(width: 14.0),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.logisticsRed,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'DIEM DUNG #$targetIndex',
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 8.0),
                            Expanded(
                              child: Text(
                                targetTitle.toUpperCase(),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.labelMd.copyWith(color: Colors.white70),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4.0),
                        Text(
                          targetAddress,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.headlineMd.copyWith(
                            color: AppColors.pureWhite,
                            fontSize: 13.0,
                            height: 1.25,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 3. Floating action controls (right-side)
          Positioned(
            right: 16.0,
            top: 240.0,
            child: Column(
              children: [
                FloatingNavBtn(
                  icon: _isVoiceOn ? Icons.volume_up : Icons.volume_off,
                  onPressed: () => setState(() => _isVoiceOn = !_isVoiceOn),
                  color: _isVoiceOn ? AppColors.deepOnyx : AppColors.secondary,
                ),
                const SizedBox(height: 12.0),
                FloatingNavBtn(icon: Icons.search, onPressed: () {}),
                const SizedBox(height: 12.0),
                FloatingNavBtn(icon: Icons.layers, onPressed: () {}),
                const SizedBox(height: 12.0),
                FloatingNavBtn(
                  icon: Icons.my_location,
                  onPressed: () {},
                  color: AppColors.logisticsRed,
                ),
              ],
            ),
          ),

          // 4. Traffic alert notification
          if (widget.showTrafficAlert)
            Positioned(
              bottom: 220.0,
              left: 20.0,
              right: 20.0,
              child: AnimatedOpacity(
                opacity: widget.showTrafficAlert ? 1.0 : 0.0,
                duration: const Duration(milliseconds: 300),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF4E5),
                    borderRadius: AppStyles.roundedXl,
                    border: Border.all(color: const Color(0xFFFF9800)),
                    boxShadow: AppStyles.ambientShadow,
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning, color: Color(0xFFFF9800), size: 28.0),
                      const SizedBox(width: 12.0),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Ket xe phia truoc',
                              style: AppTypography.labelLg.copyWith(
                                color: const Color(0xFF663C00),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'Cham khoang 3 phut tren tuyen duong di chuyen.',
                              style: AppTypography.labelMd.copyWith(color: const Color(0xFF663C00)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // 5. Bottom GPS Stats Panel & Primary Control
          Positioned(
            bottom: 0.0,
            left: 0.0,
            right: 0.0,
            child: Container(
              padding: const EdgeInsets.only(left: 16.0, right: 16.0, bottom: 24.0),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Colors.white70, Colors.white],
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 16.0),
                    decoration: BoxDecoration(
                      color: AppColors.pureWhite,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(16.0),
                        topRight: Radius.circular(16.0),
                      ),
                      border: const Border(
                          bottom: BorderSide(color: AppColors.surfaceContainer)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 10.0,
                          offset: const Offset(0, -5),
                        )
                      ],
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        NavStatItem(label: 'Thoi gian', value: '5', unit: 'phut', isRed: true),
                        SizedBox(
                            child: ColoredBox(
                                color: AppColors.surfaceContainer,
                                child: SizedBox(width: 1.0, height: 40.0))),
                        NavStatItem(label: 'Khoang cach', value: '1.2', unit: 'km'),
                        SizedBox(
                            child: ColoredBox(
                                color: AppColors.surfaceContainer,
                                child: SizedBox(width: 1.0, height: 40.0))),
                        NavStatItem(label: 'Van toc', value: '35', unit: 'km/h'),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(10.0),
                    decoration: BoxDecoration(
                      color: AppColors.pureWhite,
                      borderRadius: const BorderRadius.only(
                        bottomLeft: Radius.circular(16.0),
                        bottomRight: Radius.circular(16.0),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 10.0,
                          offset: const Offset(0, 5),
                        )
                      ],
                    ),
                    child: Row(
                      children: [
                        ElevatedButton.icon(
                          onPressed: () => ReportIncidentDialog.show(context),
                          icon: const Icon(Icons.warning_amber_rounded,
                              size: 16.0, color: AppColors.logisticsRed),
                          label: const Text('Bao su co',
                              style:
                                  TextStyle(fontSize: 11.0, fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red.shade50,
                            foregroundColor: AppColors.logisticsRed,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10.0, vertical: 12.0),
                            shape: RoundedRectangleBorder(
                              borderRadius: AppStyles.roundedLg,
                              side: BorderSide(
                                  color: AppColors.logisticsRed.withValues(alpha: 0.3)),
                            ),
                            elevation: 0,
                          ),
                        ),
                        const SizedBox(width: 8.0),
                        Expanded(
                          child: SizedBox(
                            height: 44.0,
                            child: !_isRouteExecuting
                                ? ElevatedButton.icon(
                                    onPressed: () {
                                      setState(() => _isRouteExecuting = true);
                                      ScaffoldMessenger.of(context).clearSnackBars();
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: const Row(
                                            children: [
                                              Icon(Icons.navigation,
                                                  color: Colors.white, size: 20),
                                              SizedBox(width: 10),
                                              Column(
                                                mainAxisSize: MainAxisSize.min,
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text('Da bat dau hanh trinh',
                                                      style: TextStyle(
                                                          fontWeight: FontWeight.bold,
                                                          fontSize: 13,
                                                          color: Colors.white)),
                                                  Text(
                                                      'Dang truyen tin hieu dinh vi GPS thoi gian thuc',
                                                      style: TextStyle(
                                                          fontSize: 10,
                                                          color: Colors.white70)),
                                                ],
                                              ),
                                            ],
                                          ),
                                          backgroundColor: const Color(0xFF1E293B),
                                          behavior: SnackBarBehavior.floating,
                                          shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(10)),
                                          margin: const EdgeInsets.all(16),
                                          duration: const Duration(seconds: 2),
                                        ),
                                      );
                                    },
                                    icon: const Icon(Icons.play_arrow_rounded, size: 20.0),
                                    label: const Text('BAT DAU CHAY',
                                        style: TextStyle(
                                            fontSize: 12.0,
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: 0.5)),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.logisticsRed,
                                      foregroundColor: AppColors.pureWhite,
                                      shape: RoundedRectangleBorder(
                                          borderRadius: AppStyles.roundedLg),
                                      elevation: 2,
                                    ),
                                  )
                                : ElevatedButton.icon(
                                    onPressed: () {
                                      setState(() => _isRouteExecuting = false);
                                      ScaffoldMessenger.of(context).clearSnackBars();
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: const Row(
                                            children: [
                                              Icon(Icons.pause_circle_filled,
                                                  color: Colors.white, size: 20),
                                              SizedBox(width: 10),
                                              Column(
                                                mainAxisSize: MainAxisSize.min,
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text('Da dung hanh trinh',
                                                      style: TextStyle(
                                                          fontWeight: FontWeight.bold,
                                                          fontSize: 13,
                                                          color: Colors.white)),
                                                  Text('Tam ngat truyen tin hieu dinh vi GPS',
                                                      style: TextStyle(
                                                          fontSize: 10,
                                                          color: Colors.white70)),
                                                ],
                                              ),
                                            ],
                                          ),
                                          backgroundColor: const Color(0xFF334155),
                                          behavior: SnackBarBehavior.floating,
                                          shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(10)),
                                          margin: const EdgeInsets.all(16),
                                          duration: const Duration(seconds: 2),
                                        ),
                                      );
                                    },
                                    icon: const Icon(Icons.stop_rounded, size: 20.0),
                                    label: const Text('DUNG CHAY',
                                        style: TextStyle(
                                            fontSize: 12.0,
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: 0.5)),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.deepOnyx,
                                      foregroundColor: AppColors.pureWhite,
                                      shape: RoundedRectangleBorder(
                                          borderRadius: AppStyles.roundedLg),
                                      elevation: 2,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(width: 8.0),
                        GestureDetector(
                          onTap: widget.onStopNavigation,
                          child: Container(
                            width: 44.0,
                            height: 44.0,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceContainerHigh,
                              borderRadius: AppStyles.roundedLg,
                            ),
                            child: const Icon(Icons.close,
                                color: AppColors.secondary, size: 22.0),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12.0),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8.0),
                    child: LinearProgressIndicator(
                      value: widget.stops.isEmpty
                          ? 0.0
                          : (widget.stops
                                  .where((s) =>
                                      s['isCheckedIn'] == true ||
                                      s['status'] == 'DA GIAO' ||
                                      s['status'] == 'DA LAY HANG')
                                  .length /
                              widget.stops.length),
                      minHeight: 6.0,
                      backgroundColor: AppColors.surfaceContainerHighest,
                      color: AppColors.logisticsRed,
                      borderRadius: BorderRadius.circular(4.0),
                    ),
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
