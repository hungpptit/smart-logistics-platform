import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'nav_config.dart';
import 'off_route_detector.dart';
import 'polyline_codec.dart';
import 'route_model.dart';
import 'route_snapper.dart';
import 'voice_guide.dart';

/// State emitted by NavigationEngine on every position update or state transition
class NavState {
  final LatLng snappedPosition;
  final LatLng rawGpsPosition;
  final double bearing; // 0..360 deg
  final double progressMeters;
  final double totalRouteMeters;
  final double remainingRouteMeters;
  final int currentStepIndex;
  final NavStep? currentStep;
  final NavStep? nextStep;
  final double distanceToNextTurnMeters;
  final String formattedDistanceToTurn;
  final bool isArrived;
  final bool isOffRoute;
  final bool isRerouting;
  final double speedKmh;
  final List<LatLng> remainingPolyline;
  final bool isHeadUpMode;

  const NavState({
    required this.snappedPosition,
    required this.rawGpsPosition,
    required this.bearing,
    required this.progressMeters,
    required this.totalRouteMeters,
    required this.remainingRouteMeters,
    required this.currentStepIndex,
    this.currentStep,
    this.nextStep,
    required this.distanceToNextTurnMeters,
    required this.formattedDistanceToTurn,
    required this.isArrived,
    required this.isOffRoute,
    required this.isRerouting,
    required this.speedKmh,
    required this.remainingPolyline,
    required this.isHeadUpMode,
  });

  factory NavState.initial() => NavState(
        snappedPosition: const LatLng(10.7725, 106.6980),
        rawGpsPosition: const LatLng(10.7725, 106.6980),
        bearing: 0.0,
        progressMeters: 0.0,
        totalRouteMeters: 0.0,
        remainingRouteMeters: 0.0,
        currentStepIndex: 0,
        distanceToNextTurnMeters: 0.0,
        formattedDistanceToTurn: 'Đang chuẩn bị',
        isArrived: false,
        isOffRoute: false,
        isRerouting: false,
        speedKmh: 0.0,
        remainingPolyline: const [],
        isHeadUpMode: true,
      );
}

typedef RerouteCallback = Future<RouteModel?> Function(LatLng origin, LatLng destination);

/// Pure Dart Navigation Engine: Snapping, step progression, bearing smoothing, off-route & TTS
class NavigationEngine extends ChangeNotifier {
  RouteModel _route;
  final RouteSnapper _snapper = RouteSnapper();
  final OffRouteDetector _offRouteDetector = OffRouteDetector();
  final VoiceGuide _voiceGuide = VoiceGuide();

  RerouteCallback? onRerouteRequested;
  LatLng? destination;

  int _currentStepIndex = 0;
  double _currentBearing = 0.0;
  bool _isHeadUpMode = true;
  bool _isArrived = false;
  bool _isFirstPosition = true;

  Future<void> start() async {
    await _voiceGuide.init();
    if (_route.steps.isNotEmpty) {
      final firstStep = _route.steps.first;
      firstStep.announcedFar = true;
      await _voiceGuide.speakInstruction(firstStep.instruction, prefix: 'Bắt đầu điều hướng.');
    }
  }

  Future<void> speakCurrentInstruction() async {
    if (_currentStepIndex < _route.steps.length) {
      final step = _route.steps[_currentStepIndex];
      await _voiceGuide.speakInstruction(step.instruction);
    }
  }

  NavState _currentState = NavState.initial();
  NavState get state => _currentState;

  VoiceGuide get voiceGuide => _voiceGuide;
  bool get isHeadUpMode => _isHeadUpMode;
  RouteModel get route => _route;

  NavigationEngine({
    required RouteModel initialRoute,
    this.onRerouteRequested,
    this.destination,
  }) : _route = initialRoute {
    _voiceGuide.init();
    if (_route.isNotEmpty) {
      _initFromRoute();
    }
  }

  void setHeadUpMode(bool headUp) {
    _isHeadUpMode = headUp;
    _updateState(bearing: _currentBearing);
  }

  void toggleHeadUpMode() {
    setHeadUpMode(!_isHeadUpMode);
  }

  void setMute(bool muted) {
    _voiceGuide.isEnabled = !muted;
    if (muted) _voiceGuide.stop();
    notifyListeners();
  }

  void _initFromRoute() {
    _isFirstPosition = true;
    _snapper.reset();
    _offRouteDetector.reset();
    _currentStepIndex = 0;
    _isArrived = false;

    for (final s in _route.steps) {
      s.resetAnnouncements();
    }

    if (_route.points.length >= 2) {
      _currentBearing = _calculateLookAheadBearing(0.0);
    }

    _updateState(
      snapped: _route.points.isNotEmpty ? _route.points.first : const LatLng(0, 0),
      raw: _route.points.isNotEmpty ? _route.points.first : const LatLng(0, 0),
      bearing: _currentBearing,
      progress: 0.0,
    );
  }

  /// Update active route (e.g. after successful reroute)
  void updateRoute(RouteModel newRoute) {
    _route = newRoute;
    _offRouteDetector.onRerouteSuccess();
    _initFromRoute();
    _voiceGuide.speakRerouting();
  }

  /// Main processing entry point: processes each incoming GPS position
  void processPosition(Position position) {
    if (_route.isEmpty) return;

    // 1. Filter out bad GPS accuracy
    if (position.accuracy > NavConfig.maxValidAccuracyMeters) {
      return;
    }

    final rawGps = LatLng(position.latitude, position.longitude);
    final speedMps = position.speed >= 0 ? position.speed : 0.0;
    final speedKmh = speedMps * 3.6;

    // 2. Snap to route
    final snap = _snapper.snap(rawGps, _route);

    // 3. Evaluate Off-route
    final isOffRouteNow = _offRouteDetector.evaluate(
      offRouteMeters: snap.offRouteMeters,
      accuracyMeters: position.accuracy,
      speedMps: speedMps,
      progressMeters: snap.progressMeters,
      timestamp: position.timestamp,
    );

    if (isOffRouteNow && !_offRouteDetector.isRerouting) {
      _triggerReroute(rawGps);
    }

    // 4. Calculate Bearing
    double targetBearing = _currentBearing;
    if (snap.offRouteMeters > NavConfig.offRouteMinDistanceMeters) {
      // Off-route: Use GPS heading if moving
      if (speedMps > NavConfig.minSpeedForGpsHeadingMps && position.heading >= 0) {
        targetBearing = position.heading;
      }
    } else {
      // On-route: Look ahead on polyline for smooth bearing
      targetBearing = _calculateLookAheadBearing(snap.progressMeters);
    }
    if (_isFirstPosition) {
      _isFirstPosition = false;
      _currentBearing = targetBearing;
    } else {
      _currentBearing = smoothAngle(_currentBearing, targetBearing, NavConfig.smoothAngleFactor);
    }

    // 5. Advance Steps
    _evaluateStepProgress(snap.progressMeters, speedMps);

    // 6. Voice Guidance
    if (_currentStepIndex < _route.steps.length) {
      final currentStep = _route.steps[_currentStepIndex];
      final nextStep = (_currentStepIndex + 1 < _route.steps.length) ? _route.steps[_currentStepIndex + 1] : null;
      final distToTurn = (currentStep.endDist - snap.progressMeters).clamp(0.0, double.infinity);

      _voiceGuide.evaluateAndSpeak(
        currentStep: currentStep,
        nextStep: nextStep,
        distanceToTurnMeters: distToTurn,
        speedMps: speedMps,
      );
    }

    // 7. Check Arrival
    final remaining = math.max(0.0, _route.totalMeters - snap.progressMeters);
    if (!_isArrived && remaining <= NavConfig.arrivalDistanceMeters && _currentStepIndex >= _route.steps.length - 1) {
      _isArrived = true;
      _voiceGuide.speakArrival();
    }

    // 8. Emit State
    _updateState(
      snapped: snap.point,
      raw: rawGps,
      bearing: _currentBearing,
      progress: snap.progressMeters,
      speedKmh: speedKmh,
      isOffRoute: snap.offRouteMeters > NavConfig.offRouteMinDistanceMeters,
    );
  }

  void _evaluateStepProgress(double progressMeters, double speedMps) {
    if (_route.steps.isEmpty) return;

    final double turnThreshold = math.max(
      NavConfig.minStepTurnThresholdMeters,
      speedMps * 2.0,
    );

    while (_currentStepIndex < _route.steps.length - 1) {
      final step = _route.steps[_currentStepIndex];
      if (progressMeters >= step.endDist - turnThreshold) {
        // Advance at most 1 step per cycle
        _currentStepIndex++;
        break;
      } else {
        break;
      }
    }
  }

  double _calculateLookAheadBearing(double currentProgressMeters) {
    final p0 = _route.getCoordinateAtDistance(currentProgressMeters);
    final p1 = _route.getCoordinateAtDistance(currentProgressMeters + NavConfig.bearingLookAheadMeters);
    return _calculateBearingBetween(p0, p1);
  }

  static double _calculateBearingBetween(LatLng start, LatLng end) {
    final lat1 = start.latitude * PolylineCodec.degToRad;
    final lat2 = end.latitude * PolylineCodec.degToRad;
    final dLon = (end.longitude - start.longitude) * PolylineCodec.degToRad;

    final y = math.sin(dLon) * math.cos(lat2);
    final x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dLon);
    final rad = math.atan2(y, x);
    return (rad * (180.0 / math.pi) + 360.0) % 360.0;
  }

  /// Shortest-path angle smoothing to avoid full 360 spinning at 359 -> 1
  static double smoothAngle(double current, double target, double factor) {
    final diff = ((target - current + 540) % 360) - 180;
    return (current + diff * factor + 360) % 360;
  }

  static String formatDistance(double meters) {
    if (meters >= 1000) {
      return '${(meters / 1000.0).toStringAsFixed(1)} km';
    } else if (meters >= 200) {
      final rounded = ((meters / 50.0).round() * 50).toInt();
      return '$rounded m';
    } else {
      final rounded = ((meters / 10.0).round() * 10).toInt();
      return '$rounded m';
    }
  }

  Future<void> _triggerReroute(LatLng currentGps) async {
    if (onRerouteRequested == null || destination == null) return;
    _offRouteDetector.setRerouting(true);
    _voiceGuide.speakRerouting();
    notifyListeners();

    try {
      final newRoute = await onRerouteRequested!(currentGps, destination!);
      if (newRoute != null && newRoute.isNotEmpty) {
        updateRoute(newRoute);
      } else {
        _offRouteDetector.onRerouteFailed();
      }
    } catch (_) {
      _offRouteDetector.onRerouteFailed();
    }
    notifyListeners();
  }

  void _updateState({
    LatLng? snapped,
    LatLng? raw,
    double? bearing,
    double? progress,
    double? speedKmh,
    bool? isOffRoute,
  }) {
    final pSnapped = snapped ?? _currentState.snappedPosition;
    final pRaw = raw ?? _currentState.rawGpsPosition;
    final curBearing = bearing ?? _currentState.bearing;
    final curProgress = progress ?? _currentState.progressMeters;
    final curSpeed = speedKmh ?? _currentState.speedKmh;
    final curOffRoute = isOffRoute ?? _currentState.isOffRoute;

    final curStep = (_currentStepIndex < _route.steps.length) ? _route.steps[_currentStepIndex] : null;
    final nextSt = (_currentStepIndex + 1 < _route.steps.length) ? _route.steps[_currentStepIndex + 1] : null;

    final distToTurn = curStep != null ? math.max(0.0, curStep.endDist - curProgress) : 0.0;
    final remainingRoute = math.max(0.0, _route.totalMeters - curProgress);

    // Remaining points from current progress
    List<LatLng> remainingPoly = [];
    if (_route.points.isNotEmpty) {
      final segIdx = _snapper.lastSegmentIndex.clamp(0, _route.points.length - 1);
      remainingPoly = [pSnapped, ..._route.points.skip(segIdx + 1)];
    }

    _currentState = NavState(
      snappedPosition: pSnapped,
      rawGpsPosition: pRaw,
      bearing: curBearing,
      progressMeters: curProgress,
      totalRouteMeters: _route.totalMeters,
      remainingRouteMeters: remainingRoute,
      currentStepIndex: _currentStepIndex,
      currentStep: curStep,
      nextStep: nextSt,
      distanceToNextTurnMeters: distToTurn,
      formattedDistanceToTurn: formatDistance(distToTurn),
      isArrived: _isArrived,
      isOffRoute: curOffRoute,
      isRerouting: _offRouteDetector.isRerouting,
      speedKmh: curSpeed,
      remainingPolyline: remainingPoly,
      isHeadUpMode: _isHeadUpMode,
    );

    notifyListeners();
  }

  @override
  void dispose() {
    _voiceGuide.stop();
    super.dispose();
  }
}
