import 'dart:math' as math;
import 'package:latlong2/latlong.dart';
import 'nav_config.dart';
import 'polyline_codec.dart';
import 'route_model.dart';

/// Result of snapping a raw GPS coordinate onto the route polyline
class SnapResult {
  final LatLng point;
  final int segmentIndex;
  final double progressMeters;
  final double offRouteMeters;

  const SnapResult({
    required this.point,
    required this.segmentIndex,
    required this.progressMeters,
    required this.offRouteMeters,
  });
}

/// Snaps GPS locations to the nearest road segment on the active route
class RouteSnapper {
  int _lastSegmentIndex = 0;
  double _lastProgressMeters = 0.0;

  void reset({double initialProgress = 0.0, int initialSegment = 0}) {
    _lastProgressMeters = initialProgress;
    _lastSegmentIndex = initialSegment;
  }

  double get lastProgressMeters => _lastProgressMeters;
  int get lastSegmentIndex => _lastSegmentIndex;

  /// Snap raw GPS position onto route
  SnapResult snap(LatLng rawGps, RouteModel route) {
    if (route.points.isEmpty) {
      return SnapResult(
        point: rawGps,
        segmentIndex: 0,
        progressMeters: 0.0,
        offRouteMeters: 0.0,
      );
    }

    if (route.points.length == 1) {
      final d = PolylineCodec.fastDistanceMeters(rawGps, route.points.first);
      return SnapResult(
        point: route.points.first,
        segmentIndex: 0,
        progressMeters: 0.0,
        offRouteMeters: d,
      );
    }

    final int totalSegments = route.points.length - 1;
    int searchStart = math.max(0, _lastSegmentIndex - 2);
    int searchEnd = math.min(totalSegments, _lastSegmentIndex + NavConfig.snapSearchWindowSize);

    // Pass 1: Local window search
    SnapResult? bestSnap = _searchWindow(rawGps, route, searchStart, searchEnd);

    // Pass 2: If off-route in local window is too high, expand search to entire route
    if (bestSnap == null || bestSnap.offRouteMeters > NavConfig.maxSnapDistanceMeters) {
      final fullSnap = _searchWindow(rawGps, route, 0, totalSegments);
      if (fullSnap != null && (bestSnap == null || fullSnap.offRouteMeters < bestSnap.offRouteMeters)) {
        bestSnap = fullSnap;
      }
    }

    if (bestSnap == null) {
      return SnapResult(
        point: rawGps,
        segmentIndex: _lastSegmentIndex,
        progressMeters: _lastProgressMeters,
        offRouteMeters: 999.0,
      );
    }

    // Monotonic forward progress constraint (unless confirmed U-turn / reroute)
    double progress = bestSnap.progressMeters;
    if (progress < _lastProgressMeters) {
      // Don't regress progress backwards on small GPS jitter
      progress = _lastProgressMeters;
    } else if (progress > _lastProgressMeters + NavConfig.maxForwardJumpMeters) {
      // Prevent crazy forward jumping across parallel loops
      progress = _lastProgressMeters + NavConfig.maxForwardJumpMeters;
    }

    _lastProgressMeters = progress;
    _lastSegmentIndex = bestSnap.segmentIndex;

    return SnapResult(
      point: bestSnap.point,
      segmentIndex: bestSnap.segmentIndex,
      progressMeters: progress,
      offRouteMeters: bestSnap.offRouteMeters,
    );
  }

  SnapResult? _searchWindow(LatLng rawGps, RouteModel route, int start, int end) {
    double minDistance = double.infinity;
    SnapResult? best;

    for (int i = start; i < end; i++) {
      final pA = route.points[i];
      final pB = route.points[i + 1];

      final proj = _projectOntoSegment(rawGps, pA, pB, route.cumDist[i]);
      if (proj.offRouteMeters < minDistance) {
        minDistance = proj.offRouteMeters;
        best = SnapResult(
          point: proj.point,
          segmentIndex: i,
          progressMeters: proj.progressMeters,
          offRouteMeters: proj.offRouteMeters,
        );
      }
    }
    return best;
  }

  _Projection _projectOntoSegment(LatLng p, LatLng a, LatLng b, double cumDistA) {
    final double midLatRad = ((a.latitude + b.latitude) / 2.0) * PolylineCodec.degToRad;
    final double cosMid = math.cos(midLatRad);

    // Vector AB in meters
    final double abX = (b.longitude - a.longitude) * PolylineCodec.degToRad * PolylineCodec.earthRadiusMeters * cosMid;
    final double abY = (b.latitude - a.latitude) * PolylineCodec.degToRad * PolylineCodec.earthRadiusMeters;
    final double abLenSq = abX * abX + abY * abY;

    if (abLenSq <= 0.0001) {
      final d = PolylineCodec.fastDistanceMeters(p, a);
      return _Projection(point: a, progressMeters: cumDistA, offRouteMeters: d);
    }

    // Vector AP in meters
    final double apX = (p.longitude - a.longitude) * PolylineCodec.degToRad * PolylineCodec.earthRadiusMeters * cosMid;
    final double apY = (p.latitude - a.latitude) * PolylineCodec.degToRad * PolylineCodec.earthRadiusMeters;

    // t projection scalar
    double t = (apX * abX + apY * abY) / abLenSq;
    t = t.clamp(0.0, 1.0);

    // Projected point S
    final double sLat = a.latitude + t * (b.latitude - a.latitude);
    final double sLng = a.longitude + t * (b.longitude - a.longitude);
    final sPoint = LatLng(sLat, sLng);

    // Distance PS
    final double psX = apX - t * abX;
    final double psY = apY - t * abY;
    final double offRouteDist = math.sqrt(psX * psX + psY * psY);

    final double segLen = math.sqrt(abLenSq);
    final double progress = cumDistA + t * segLen;

    return _Projection(
      point: sPoint,
      progressMeters: progress,
      offRouteMeters: offRouteDist,
    );
  }
}

class _Projection {
  final LatLng point;
  final double progressMeters;
  final double offRouteMeters;

  _Projection({
    required this.point,
    required this.progressMeters,
    required this.offRouteMeters,
  });
}
