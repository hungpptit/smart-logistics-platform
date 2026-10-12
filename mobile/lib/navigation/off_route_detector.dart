import 'dart:math' as math;
import 'nav_config.dart';

enum RerouteReason {
  deviatedOffRoute,
  uTurnDetected,
}

/// Detects when driver has deviated from the intended route with debouncing
class OffRouteDetector {
  int _consecutiveOffRouteSamples = 0;
  DateTime? _offRouteStartTime;
  DateTime? _lastRerouteRequestTime;
  bool _isRerouting = false;
  int _failedRerouteAttempts = 0;

  DateTime? _lastSuccessfulProgressTime;
  double _lastKnownProgress = 0.0;

  void reset() {
    _consecutiveOffRouteSamples = 0;
    _offRouteStartTime = null;
    _isRerouting = false;
    _failedRerouteAttempts = 0;
    _lastSuccessfulProgressTime = null;
    _lastKnownProgress = 0.0;
  }

  bool get isRerouting => _isRerouting;

  void setRerouting(bool rerouting) {
    _isRerouting = rerouting;
    if (rerouting) {
      _lastRerouteRequestTime = DateTime.now();
    }
  }

  void onRerouteSuccess() {
    _isRerouting = false;
    _failedRerouteAttempts = 0;
    _consecutiveOffRouteSamples = 0;
    _offRouteStartTime = null;
  }

  void onRerouteFailed() {
    _isRerouting = false;
    _failedRerouteAttempts++;
  }

  /// Check whether conditions are met to trigger a reroute calculation
  bool evaluate({
    required double offRouteMeters,
    required double accuracyMeters,
    required double speedMps,
    required double progressMeters,
    required DateTime timestamp,
  }) {
    if (_isRerouting) return false;

    // Check minimum interval since last reroute
    if (_lastRerouteRequestTime != null) {
      double backoffSeconds = NavConfig.minRerouteIntervalSeconds;
      if (_failedRerouteAttempts == 1) backoffSeconds = 30.0;
      if (_failedRerouteAttempts >= 2) backoffSeconds = 60.0;

      final diffSec = timestamp.difference(_lastRerouteRequestTime!).inMilliseconds / 1000.0;
      if (diffSec < backoffSeconds) {
        return false;
      }
    }

    // Dynamic deviation threshold based on GPS accuracy
    final double threshold = math.max(
      NavConfig.offRouteMinDistanceMeters,
      accuracyMeters * NavConfig.offRouteAccuracyMultiplier,
    );

    // 1. Condition: Off-route deviation
    if (offRouteMeters > threshold && speedMps >= NavConfig.offRouteMinSpeedMps) {
      _consecutiveOffRouteSamples++;
      _offRouteStartTime ??= timestamp;

      final elapsedSec = timestamp.difference(_offRouteStartTime!).inMilliseconds / 1000.0;
      if (_consecutiveOffRouteSamples >= NavConfig.offRouteConsecutiveSamples &&
          elapsedSec >= NavConfig.offRouteConsecutiveSeconds) {
        return true;
      }
    } else {
      // Snapped back on route within debounce window -> reset!
      _consecutiveOffRouteSamples = 0;
      _offRouteStartTime = null;
    }

    // 2. Condition: U-turn / driving backwards
    if (speedMps > 2.0) {
      if (progressMeters < _lastKnownProgress - 5.0) {
        _lastSuccessfulProgressTime ??= timestamp;
        final regressSec = timestamp.difference(_lastSuccessfulProgressTime!).inMilliseconds / 1000.0;
        if (regressSec >= NavConfig.uTurnDetectionSeconds) {
          return true;
        }
      } else {
        _lastKnownProgress = progressMeters;
        _lastSuccessfulProgressTime = null;
      }
    }

    return false;
  }
}
