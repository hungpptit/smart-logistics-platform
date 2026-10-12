/// Centralized configuration and thresholds for navigation engine
class NavConfig {
  // GPS filtering
  static const double maxValidAccuracyMeters = 40.0;
  static const double maxReasonableSpeedMps = 45.0; // ~160 km/h

  // Snap to route
  static const int snapSearchWindowSize = 50;
  static const double maxForwardJumpMeters = 300.0;
  static const double maxSnapDistanceMeters = 80.0;

  // Bearing & Smoothing
  static const double bearingLookAheadMeters = 20.0;
  static const double smoothAngleFactor = 0.12;
  static const double minSpeedForGpsHeadingMps = 1.5;

  // Camera & Map
  static const double cameraForwardOffsetMeters = 100.0;
  static const double defaultNavZoom = 17.0;
  static const double minNavZoom = 15.0;
  static const double maxNavZoom = 18.0;

  // Step Auto-Advance
  static const double minStepTurnThresholdMeters = 20.0;
  static const double arrivalDistanceMeters = 25.0;
  static const double shortNextStepThresholdMeters = 50.0;

  // Off-route Detection & Reroute
  static const double offRouteMinDistanceMeters = 35.0;
  static const double offRouteAccuracyMultiplier = 1.5;
  static const double offRouteMinSpeedMps = 1.0;
  static const int offRouteConsecutiveSamples = 3;
  static const double offRouteConsecutiveSeconds = 4.0;
  static const double minRerouteIntervalSeconds = 18.0;
  static const double uTurnDetectionSeconds = 3.5;

  // Voice Guidance (TTS)
  static const double voiceFarThresholdBaseMeters = 250.0;
  static const double voiceFarSpeedMultiplier = 10.0;
  static const double voiceNearThresholdBaseMeters = 60.0;
  static const double voiceNearSpeedMultiplier = 4.0;
}
