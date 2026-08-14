import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';
import '../../../services/driver_service.dart';
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
  List<Map<String, String>> _navSteps = [];
  int _currentStepIndex = 0;

  Map<String, dynamic> get _activeStop {
    final incomplete = widget.stops.where((s) => s['isCheckedIn'] != true);
    if (incomplete.isNotEmpty) {
      return incomplete.first;
    }
    return {
      'title': 'Bưu cục Tăng Nhơn Phú',
      'address': '120 Đường Tăng Nhơn Phú, Phường Tăng Nhơn Phú B, TP. Thủ Đức',
      'latitude': 10.8460,
      'longitude': 106.7860,
      'orderCode': 'KHO-TANGNHONPHU',
      'stopType': 'HUB',
      'isCheckedIn': false,
    };
  }

  @override
  void initState() {
    super.initState();
    _fetchNavSteps();
  }

  Future<void> _fetchNavSteps() async {
    final activeStop = _activeStop;
    if (activeStop.isEmpty) return;
    final double targetLat = double.tryParse(activeStop['latitude']?.toString() ?? '') ?? widget.currentLocation.latitude;
    final double targetLng = double.tryParse(activeStop['longitude']?.toString() ?? '') ?? widget.currentLocation.longitude;
    final steps = await DriverService.fetchGoongNavigationSteps(
      origin: widget.currentLocation,
      destination: LatLng(targetLat, targetLng),
    );
    if (mounted && steps.isNotEmpty) {
      setState(() {
        _navSteps = steps;
        _currentStepIndex = 0;
      });
    }
  }

  IconData _getManeuverIcon(String maneuver) {
    final m = maneuver.toLowerCase();
    if (m.contains('left')) return Icons.turn_left;
    if (m.contains('right')) return Icons.turn_right;
    if (m.contains('uturn')) return Icons.u_turn_left;
    if (m.contains('straight')) return Icons.straight;
    return Icons.navigation;
  }

  @override
  Widget build(BuildContext context) {
    final activeStop = _activeStop;
    final String targetAddress = activeStop['address']?.toString() ?? 'Chưa xác định điểm dừng';
    final dynamic rawIndex = activeStop['index'] ?? activeStop['sequence'] ?? 1;
    final int targetIndex = rawIndex is int ? rawIndex : (int.tryParse(rawIndex.toString()) ?? 1);
    final String targetTitle = activeStop['title']?.toString() ?? 'Khách hàng';

    final double targetLat = double.tryParse(activeStop['latitude']?.toString() ?? '') ?? widget.currentLocation.latitude;
    final double targetLng = double.tryParse(activeStop['longitude']?.toString() ?? '') ?? widget.currentLocation.longitude;
    final double distMeters = Geolocator.distanceBetween(
      widget.currentLocation.latitude, widget.currentLocation.longitude, targetLat, targetLng,
    );
    final double navDistanceKm = distMeters / 1000.0;
    final int navDurationMin = (navDistanceKm / 25 * 60).round().clamp(2, 120);

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
          // 2. Top Navigation Direction Banner (Turn-by-Turn Goong Maps)
          Positioned(
            top: MediaQuery.of(context).padding.top + 12.0,
            left: 16.0,
            right: 16.0,
            child: GestureDetector(
              onTap: () {
                if (_navSteps.isNotEmpty) {
                  setState(() {
                    _currentStepIndex = (_currentStepIndex + 1) % _navSteps.length;
                  });
                }
              },
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
                      child: Icon(
                        _navSteps.isNotEmpty
                            ? _getManeuverIcon(_navSteps[_currentStepIndex]['maneuver'] ?? '')
                            : Icons.navigation,
                        size: 28.0,
                        color: AppColors.logisticsRed,
                      ),
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
                                  'ĐIỂM DỪNG #$targetIndex',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold),
                                ),
                              ),
                              const SizedBox(width: 8.0),
                              Expanded(
                                child: Text(
                                  _navSteps.isNotEmpty
                                      ? 'HƯỚNG DẪN RẼ (${_currentStepIndex + 1}/${_navSteps.length})'
                                      : targetTitle.toUpperCase(),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppTypography.labelMd.copyWith(color: Colors.white70),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4.0),
                          Text(
                            _navSteps.isNotEmpty
                                ? _navSteps[_currentStepIndex]['instruction'] ?? targetAddress
                                : targetAddress,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.headlineMd.copyWith(
                              color: AppColors.pureWhite,
                              fontSize: 13.0,
                              height: 1.25,
                            ),
                          ),
                          if (_navSteps.isNotEmpty) ...[
                            const SizedBox(height: 2.0),
                            Text(
                              'Trong ${_navSteps[_currentStepIndex]['distance']} • Nhấn để xem bước tiếp',
                              style: const TextStyle(color: Colors.amberAccent, fontSize: 10.0),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
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
                              'Kẹt xe phía trước',
                              style: AppTypography.labelLg.copyWith(
                                color: const Color(0xFF663C00),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'Chậm khoảng 3 phút trên tuyến đường di chuyển.',
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
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        NavStatItem(label: 'Thời gian', value: '$navDurationMin', unit: 'phút', isRed: true),
                        const SizedBox(
                            child: ColoredBox(
                                color: AppColors.surfaceContainer,
                                child: SizedBox(width: 1.0, height: 40.0))),
                        NavStatItem(label: 'Khoảng cách', value: navDistanceKm.toStringAsFixed(1), unit: 'km'),
                        const SizedBox(
                            child: ColoredBox(
                                color: AppColors.surfaceContainer,
                                child: SizedBox(width: 1.0, height: 40.0))),
                        NavStatItem(label: 'Vận tốc', value: _isRouteExecuting ? '32' : '0', unit: 'km/h'),
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
                          label: const Text('Báo sự cố',
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
                                                  Text('Đã bắt đầu hành trình',
                                                      style: TextStyle(
                                                          fontWeight: FontWeight.bold,
                                                          fontSize: 13,
                                                          color: Colors.white)),
                                                  Text(
                                                      'Đang truyền tín hiệu định vị GPS thời gian thực',
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
                                    label: const Text('BẮT ĐẦU CHẠY',
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
                                                  Text('Đã dừng hành trình',
                                                      style: TextStyle(
                                                          fontWeight: FontWeight.bold,
                                                          fontSize: 13,
                                                          color: Colors.white)),
                                                  Text('Tạm ngắt truyền tín hiệu định vị GPS',
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
                                    label: const Text('DỪNG CHẠY',
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
                                      s['status'] == 'ĐÃ GIAO' ||
                                      s['status'] == 'DA LAY HANG' ||
                                      s['status'] == 'ĐÃ LẤY HÀNG')
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
