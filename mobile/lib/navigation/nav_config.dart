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

  // Speed Processing & Quality Filter (Theo Plan Lấy tốc độ hiện tại)
  static const double maxGpsAccuracyMeters = 30.0;
  static const double maxSpeedAccuracyMps = 3.0;
  static const double maxSpeedJumpKmhPerSec = 54.0; // Gia tốc tối đa ~15 m/s² (~54 km/h mỗi giây)
  static const double minMovingSpeedKmh = 3.0; // Dưới 3 km/h coi như đứng yên (chống trôi GPS)
  static const int speedSmoothingWindow = 3; // Moving average 3 mẫu (~3 giây)
  static const int gpsSampleMaxAgeSeconds = 3; // Mẫu quá 3 giây coi như cũ
  static const int gpsWatchdogTimeoutSeconds = 4; // Quá 4s không có mẫu tốt báo mất GPS

  // Speed Alert (Hysteresis & Debounce)
  static const double speedAlertToleranceKmh = 1.0; // Vượt limit + 1 km/h
  static const int speedAlertHoldSeconds = 2; // Duy trì vượt tốc 2s liên tục mới báo
  static const int speedAlertRepeatSeconds = 10; // Giãn cách 10s nhắc lại 1 lần nếu vẫn quá tốc độ
  static const double speedLimitChangeAnnounceCooldown = 10.0; // Cooldown báo đổi biển tốc độ
}
