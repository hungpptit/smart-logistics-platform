import 'package:latlong2/latlong.dart';

/// Single turn-by-turn navigation instruction step
class NavStep {
  final int index;
  final String instruction;
  final String maneuver;
  final double startDist;
  final double endDist;
  final LatLng startLocation;
  final LatLng endLocation;
  final String? distanceText;
  final int? durationSeconds;

  bool announcedFar = false;
  bool announcedNear = false;

  NavStep({
    required this.index,
    required this.instruction,
    required this.maneuver,
    required this.startDist,
    required this.endDist,
    required this.startLocation,
    required this.endLocation,
    this.distanceText,
    this.durationSeconds,
  });

  double get stepLengthMeters => (endDist - startDist).clamp(0.0, double.infinity);

  void resetAnnouncements() {
    announcedFar = false;
    announcedNear = false;
  }

  Map<String, dynamic> toJson() => {
    'index': index,
    'instruction': instruction,
    'maneuver': maneuver,
    'startDist': startDist,
    'endDist': endDist,
    'startLocation': {'lat': startLocation.latitude, 'lng': startLocation.longitude},
    'endLocation': {'lat': endLocation.latitude, 'lng': endLocation.longitude},
    'distanceText': distanceText,
    'durationSeconds': durationSeconds,
  };
}

/// Representation of entire route geometry mapped to 1D cumulative distance axis
class RouteModel {
  final List<LatLng> points;
  final List<double> cumDist;
  final List<NavStep> steps;
  final String? overviewPolyline;

  RouteModel({
    required this.points,
    required this.cumDist,
    required this.steps,
    this.overviewPolyline,
  });

  double get totalMeters => cumDist.isEmpty ? 0.0 : cumDist.last;

  bool get isEmpty => points.isEmpty;
  bool get isNotEmpty => points.isNotEmpty;

  /// Helper to find approximate coordinate at a given distance along route
  LatLng getCoordinateAtDistance(double distanceMeters) {
    if (points.isEmpty) return const LatLng(0, 0);
    if (distanceMeters <= 0) return points.first;
    if (distanceMeters >= totalMeters) return points.last;

    // Binary search for segment
    int low = 0;
    int high = cumDist.length - 1;
    while (low < high - 1) {
      final mid = (low + high) ~/ 2;
      if (cumDist[mid] <= distanceMeters) {
        low = mid;
      } else {
        high = mid;
      }
    }

    final d0 = cumDist[low];
    final d1 = cumDist[high];
    final segLen = d1 - d0;
    if (segLen <= 0.0001) return points[low];

    final t = (distanceMeters - d0) / segLen;
    final p0 = points[low];
    final p1 = points[high];
    return LatLng(
      p0.latitude + (p1.latitude - p0.latitude) * t,
      p0.longitude + (p1.longitude - p0.longitude) * t,
    );
  }
}
