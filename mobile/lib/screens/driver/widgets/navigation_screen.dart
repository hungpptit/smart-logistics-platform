import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../core/config/app_config.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' hide Path;
import 'package:wakelock_plus/wakelock_plus.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';
import '../../../navigation/nav_config.dart';
import '../../../navigation/navigation_engine.dart';
import '../../../navigation/route_model.dart';
import 'map_stop_pin.dart';
import 'floating_nav_btn.dart';
import 'nav_stat_item.dart';
import 'report_incident_dialog.dart';

class NavigationScreen extends StatefulWidget {
  final MapController navMapController;
  final NavigationEngine engine;
  final LatLng currentLocation;
  final List<Map<String, dynamic>> stops;
  final bool showTrafficAlert;
  final VoidCallback onStopNavigation;

  const NavigationScreen({
    super.key,
    required this.navMapController,
    required this.engine,
    required this.currentLocation,
    required this.stops,
    required this.showTrafficAlert,
    required this.onStopNavigation,
  });

  @override
  State<NavigationScreen> createState() => _NavigationScreenState();
}

class _NavigationScreenState extends State<NavigationScreen> {
  bool _isFollowing = true;
  int? _previewStepIndex;
  Timer? _previewTimer;

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
    // Keep screen awake while driving
    WakelockPlus.enable();
    widget.engine.addListener(_onEngineUpdate);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _recenter();
    });
  }

  @override
  void dispose() {
    WakelockPlus.disable();
    _previewTimer?.cancel();
    widget.engine.removeListener(_onEngineUpdate);
    super.dispose();
  }

  void _onEngineUpdate() {
    if (!mounted) return;
    final state = widget.engine.state;

    // Auto-follow camera logic
    if (_isFollowing) {
      final double bearingRad = state.bearing * (math.pi / 180.0);
      final double offsetM = NavConfig.cameraForwardOffsetMeters;
      final double latOffset = (offsetM / 111132.9) * math.cos(bearingRad);
      final double lngOffset = (offsetM / (111132.9 * math.cos(state.snappedPosition.latitude * (math.pi / 180.0)))) *
          math.sin(bearingRad);

      final center = state.isHeadUpMode
          ? LatLng(state.snappedPosition.latitude + latOffset, state.snappedPosition.longitude + lngOffset)
          : state.snappedPosition;

      final zoom = (17.2 - (state.speedKmh / 90.0)).clamp(NavConfig.minNavZoom, NavConfig.maxNavZoom);
      final rotation = state.isHeadUpMode ? -state.bearing : 0.0;

      try {
        widget.navMapController.moveAndRotate(center, zoom, rotation);
      } catch (_) {}
    }
    setState(() {});
  }

  void _recenter() {
    setState(() => _isFollowing = true);
    _onEngineUpdate();
  }

  IconData _getManeuverIcon(String maneuver) {
    final m = maneuver.toLowerCase();
    if (m.contains('left')) return Icons.turn_left;
    if (m.contains('right')) return Icons.turn_right;
    if (m.contains('uturn')) return Icons.u_turn_left;
    if (m.contains('straight')) return Icons.straight;
    return Icons.navigation;
  }

  void _previewNextStep() {
    final steps = widget.engine.route.steps;
    if (steps.isEmpty) return;

    final curIdx = _previewStepIndex ?? widget.engine.state.currentStepIndex;
    final nextIdx = (curIdx + 1) % steps.length;

    setState(() => _previewStepIndex = nextIdx);

    _previewTimer?.cancel();
    _previewTimer = Timer(const Duration(seconds: 6), () {
      if (mounted) setState(() => _previewStepIndex = null);
    });
  }

  @override
  Widget build(BuildContext context) {
    final navState = widget.engine.state;
    final activeStop = _activeStop;
    final String targetAddress = activeStop['address']?.toString() ?? 'Chưa xác định điểm dừng';
    final dynamic rawIndex = activeStop['index'] ?? activeStop['sequence'] ?? 1;
    final int targetIndex = rawIndex is int ? rawIndex : (int.tryParse(rawIndex.toString()) ?? 1);
    final String targetTitle = activeStop['title']?.toString() ?? 'Khách hàng';

    // Step to display (either preview or current live step)
    final NavStep? displayedStep = (_previewStepIndex != null && _previewStepIndex! < widget.engine.route.steps.length)
        ? widget.engine.route.steps[_previewStepIndex!]
        : navState.currentStep;

    final int stepDisplayIndex = _previewStepIndex ?? navState.currentStepIndex;
    final int totalSteps = widget.engine.route.steps.length;

    final double remainingKm = navState.remainingRouteMeters / 1000.0;
    final int navDurationMin = (remainingKm / 25.0 * 60.0).round().clamp(1, 180);

    return Scaffold(
      body: Stack(
        children: [
          // 1. Full Screen Map
          Positioned.fill(
            child: FlutterMap(
              mapController: widget.navMapController,
              options: MapOptions(
                initialCenter: navState.snappedPosition,
                initialZoom: 16.5,
                initialRotation: navState.isHeadUpMode ? -navState.bearing : 0.0,
                onPositionChanged: (cam, hasGesture) {
                  if (hasGesture && _isFollowing) {
                    setState(() => _isFollowing = false);
                  }
                },
              ),
              children: [
                TileLayer(
                  urlTemplate: AppConfig.mapTileUrl,
                  userAgentPackageName: 'com.velocity.slp.velocity_mobile',
                  maxZoom: 20.0,
                  maxNativeZoom: 18,
                ),

                // Polyline Layer
                PolylineLayer(
                  polylines: [
                    // Entire route background polyline (grey)
                    if (widget.engine.route.points.isNotEmpty)
                      Polyline(
                        points: widget.engine.route.points,
                        strokeWidth: 5.5,
                        color: Colors.grey.shade400.withValues(alpha: 0.6),
                      ),
                    // Remaining active route polyline (vibrant red)
                    if (navState.remainingPolyline.isNotEmpty)
                      Polyline(
                        points: navState.remainingPolyline,
                        strokeWidth: 6.0,
                        color: AppColors.logisticsRed,
                      ),
                  ],
                ),

                // Marker Layer
                MarkerLayer(
                  markers: [
                    // Delivery stops
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

                    // Driver Location with dynamic heading
                    Marker(
                      point: navState.snappedPosition,
                      width: 80.0,
                      height: 80.0,
                      rotate: true,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Pulsing radar ripple
                          TweenAnimationBuilder<double>(
                            tween: Tween(begin: 1.0, end: 2.0),
                            duration: const Duration(seconds: 2),
                            builder: (context, value, child) {
                              return Container(
                                width: 38.0 * value,
                                height: 38.0 * value,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AppColors.logisticsRed.withValues(alpha: 0.3 * (2.0 - value)),
                                ),
                              );
                            },
                          ),
                          // In Head-Up mode: map is rotated to travel direction, so vehicle points straight UP (0.0).
                          // In North-Up mode: map is fixed north (0), so vehicle rotates by +bearing.
                          Transform.rotate(
                            angle: navState.isHeadUpMode ? 0.0 : navState.bearing * (math.pi / 180.0),
                            child: Container(
                              width: 38.0,
                              height: 38.0,
                              decoration: BoxDecoration(
                                color: AppColors.logisticsRed,
                                shape: BoxShape.circle,
                                border: Border.all(color: AppColors.pureWhite, width: 2.5),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.35),
                                    blurRadius: 6.0,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Center(
                                child: CustomPaint(
                                  size: const Size(16.0, 18.0),
                                  painter: const NavArrowPainter(color: Colors.white),
                                ),
                              ),
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

          // 2. Top Turn-by-Turn Navigation Direction Banner
          Positioned(
            top: MediaQuery.of(context).padding.top + 12.0,
            left: 16.0,
            right: 16.0,
            child: GestureDetector(
              onTap: () {
                _previewNextStep();
                widget.engine.speakCurrentInstruction();
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                padding: const EdgeInsets.all(14.0),
                decoration: BoxDecoration(
                  color: navState.isRerouting
                      ? const Color(0xFFC2410C)
                      : (navState.isArrived ? const Color(0xFF15803D) : AppColors.deepOnyx),
                  borderRadius: AppStyles.roundedXl,
                  border: Border(
                    left: BorderSide(
                      color: navState.isRerouting ? Colors.amberAccent : AppColors.logisticsRed,
                      width: 5.0,
                    ),
                  ),
                  boxShadow: AppStyles.softShadow,
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10.0),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: AppStyles.roundedLg,
                      ),
                      child: Icon(
                        navState.isRerouting
                            ? Icons.sync
                            : (navState.isArrived
                                ? Icons.check_circle_outline
                                : _getManeuverIcon(displayedStep?.maneuver ?? 'straight')),
                        size: 30.0,
                        color: Colors.white,
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
                                  color: Colors.white.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  navState.isRerouting
                                      ? 'LỆCH TUYẾN'
                                      : (navState.isArrived ? 'ĐÃ ĐẾN NƠI' : 'ĐIỂM DỪNG #$targetIndex'),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8.0),
                              Expanded(
                                child: Text(
                                  navState.isRerouting
                                      ? 'ĐANG TÍNH LẠI LỘ TRÌNH...'
                                      : (_previewStepIndex != null
                                          ? 'XEM TRƯỚC (${stepDisplayIndex + 1}/$totalSteps)'
                                          : (displayedStep != null
                                              ? 'BƯỚC ${stepDisplayIndex + 1}/$totalSteps'
                                              : targetTitle.toUpperCase())),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppTypography.labelMd.copyWith(color: Colors.white70),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4.0),
                          Text(
                            navState.isRerouting
                                ? 'Đang tự động tìm đường mới phù hợp'
                                : (navState.isArrived
                                    ? 'Đã tới địa chỉ điểm giao nhận'
                                    : (displayedStep?.instruction ?? targetAddress)),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.headlineMd.copyWith(
                              color: AppColors.pureWhite,
                              fontSize: 13.5,
                              height: 1.25,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (!navState.isRerouting && !navState.isArrived && displayedStep != null) ...[
                            const SizedBox(height: 3.0),
                            Text(
                              _previewStepIndex != null
                                  ? 'Khoảng cách chặng: ${displayedStep.distanceText ?? ""} • Chạm để xem tiếp'
                                  : 'Còn ${navState.formattedDistanceToTurn} • Chạm xem trước bước tiếp',
                              style: const TextStyle(color: Colors.amberAccent, fontSize: 10.5, fontWeight: FontWeight.w600),
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
            top: 230.0,
            child: Column(
              children: [
                // Voice Mute Toggle
                FloatingNavBtn(
                  icon: widget.engine.voiceGuide.isEnabled ? Icons.volume_up : Icons.volume_off,
                  onPressed: () {
                    final willEnable = !widget.engine.voiceGuide.isEnabled;
                    widget.engine.setMute(!willEnable);
                    if (willEnable) {
                      widget.engine.speakCurrentInstruction();
                    }
                    setState(() {});
                  },
                  color: widget.engine.voiceGuide.isEnabled ? AppColors.deepOnyx : AppColors.secondary,
                ),
                const SizedBox(height: 12.0),

                // Compass Button: Head-Up vs North-Up Mode
                GestureDetector(
                  onTap: () {
                    widget.engine.toggleHeadUpMode();
                    _recenter();
                  },
                  child: Container(
                    width: 44.0,
                    height: 44.0,
                    decoration: BoxDecoration(
                      color: AppColors.pureWhite,
                      shape: BoxShape.circle,
                      boxShadow: AppStyles.softShadow,
                      border: Border.all(
                        color: navState.isHeadUpMode ? AppColors.logisticsRed : Colors.transparent,
                        width: 1.5,
                      ),
                    ),
                    child: Center(
                      child: Transform.rotate(
                        angle: -navState.bearing * (math.pi / 180.0),
                        child: const Icon(
                          Icons.explore,
                          size: 26.0,
                          color: AppColors.logisticsRed,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12.0),

                // Recenter Button (when user drags map away)
                if (!_isFollowing)
                  FloatingNavBtn(
                    icon: Icons.my_location,
                    onPressed: _recenter,
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
                    const Icon(Icons.warning_amber_rounded, color: Color(0xFFFF9800), size: 28.0),
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
                      border: const Border(bottom: BorderSide(color: AppColors.surfaceContainer)),
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
                        NavStatItem(
                          label: 'Thời gian',
                          value: '$navDurationMin',
                          unit: 'phút',
                          isRed: true,
                        ),
                        const SizedBox(
                          child: ColoredBox(
                            color: AppColors.surfaceContainer,
                            child: SizedBox(width: 1.0, height: 40.0),
                          ),
                        ),
                        NavStatItem(
                          label: 'Khoảng cách',
                          value: remainingKm.toStringAsFixed(1),
                          unit: 'km',
                        ),
                        const SizedBox(
                          child: ColoredBox(
                            color: AppColors.surfaceContainer,
                            child: SizedBox(width: 1.0, height: 40.0),
                          ),
                        ),
                        NavStatItem(
                          label: 'Vận tốc',
                          value: navState.speedKmh.toStringAsFixed(0),
                          unit: 'km/h',
                        ),
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
                          icon: const Icon(Icons.warning_amber_rounded, size: 16.0, color: AppColors.logisticsRed),
                          label: const Text('Báo sự cố', style: TextStyle(fontSize: 11.0, fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red.shade50,
                            foregroundColor: AppColors.logisticsRed,
                            padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 12.0),
                            shape: RoundedRectangleBorder(
                              borderRadius: AppStyles.roundedLg,
                              side: BorderSide(color: AppColors.logisticsRed.withValues(alpha: 0.3)),
                            ),
                            elevation: 0,
                          ),
                        ),
                        const SizedBox(width: 8.0),

                        Expanded(
                          child: SizedBox(
                            height: 44.0,
                            child: ElevatedButton.icon(
                              onPressed: widget.onStopNavigation,
                              icon: const Icon(Icons.stop_rounded, size: 20.0),
                              label: const Text(
                                'THOÁT DẪN ĐƯỜNG',
                                style: TextStyle(
                                  fontSize: 12.0,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.deepOnyx,
                                foregroundColor: AppColors.pureWhite,
                                shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
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
                            child: const Icon(Icons.close, color: AppColors.secondary, size: 22.0),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12.0),

                  // Route completion progress bar
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8.0),
                    child: LinearProgressIndicator(
                      value: widget.engine.route.totalMeters > 0
                          ? (navState.progressMeters / widget.engine.route.totalMeters).clamp(0.0, 1.0)
                          : 0.0,
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


/// Vector Chevron Arrow Painter for turn-by-turn navigation puck (points strictly 12 o'clock UP)
class NavArrowPainter extends CustomPainter {
  final Color color;
  const NavArrowPainter({this.color = Colors.white});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final path = Path()
      ..moveTo(size.width * 0.5, 0.0) // Apex top center
      ..lineTo(size.width, size.height) // Bottom right wing
      ..lineTo(size.width * 0.5, size.height * 0.72) // Notched tail center
      ..lineTo(0.0, size.height) // Bottom left wing
      ..close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
