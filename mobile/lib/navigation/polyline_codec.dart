import 'dart:math' as math;
import 'package:latlong2/latlong.dart';
import 'route_model.dart';

/// Pure Dart Polyline codec & equirectangular projection distance utilities
class PolylineCodec {
  static const double earthRadiusMeters = 6371000.0;
  static const double degToRad = math.pi / 180.0;

  /// Decode Google/Goong Encoded Polyline String (Precision 5)
  static List<LatLng> decode(String encoded) {
    if (encoded.isEmpty) return [];
    List<LatLng> points = [];
    int index = 0, len = encoded.length;
    int lat = 0, lng = 0;

    while (index < len) {
      int b, shift = 0, result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.add(LatLng(lat / 1E5, lng / 1E5));
    }
    return points;
  }

  /// Fast Equirectangular projection distance in meters for short geographic segments
  static double fastDistanceMeters(LatLng p1, LatLng p2) {
    final double midLatRad = ((p1.latitude + p2.latitude) / 2.0) * degToRad;
    final double x = (p2.longitude - p1.longitude) * degToRad * math.cos(midLatRad);
    final double y = (p2.latitude - p1.latitude) * degToRad;
    return math.sqrt(x * x + y * y) * earthRadiusMeters;
  }

  /// Build cumulative distance list where cumDist[i] = meters from start to points[i]
  static List<double> computeCumulativeDistances(List<LatLng> points) {
    if (points.isEmpty) return [];
    final List<double> cumDist = List<double>.filled(points.length, 0.0);
    double accumulated = 0.0;
    for (int i = 1; i < points.length; i++) {
      accumulated += fastDistanceMeters(points[i - 1], points[i]);
      cumDist[i] = accumulated;
    }
    return cumDist;
  }

  /// Parse Goong Directions API JSON response into full RouteModel
  static RouteModel parseGoongDirections(Map<String, dynamic> json) {
    final routes = json['routes'] as List?;
    if (routes == null || routes.isEmpty) {
      return RouteModel(points: [], cumDist: [], steps: []);
    }

    final firstRoute = routes[0] as Map<String, dynamic>;
    final overviewEncoded = firstRoute['overview_polyline']?['points']?.toString() ?? '';
    List<LatLng> polylinePoints = decode(overviewEncoded);

    // If overview_polyline is empty, stitch together polylines from steps
    final legs = firstRoute['legs'] as List?;
    final List<Map<String, dynamic>> rawSteps = [];
    if (legs != null && legs.isNotEmpty) {
      final firstLeg = legs[0] as Map<String, dynamic>;
      final st = firstLeg['steps'] as List?;
      if (st != null) {
        for (final item in st) {
          if (item is Map<String, dynamic>) rawSteps.add(item);
        }
      }
    }

    if (polylinePoints.isEmpty && rawSteps.isNotEmpty) {
      for (final s in rawSteps) {
        final stepPoly = s['polyline']?['points']?.toString() ?? '';
        if (stepPoly.isNotEmpty) {
          final pts = decode(stepPoly);
          if (pts.isNotEmpty) {
            if (polylinePoints.isNotEmpty && polylinePoints.last == pts.first) {
              polylinePoints.addAll(pts.skip(1));
            } else {
              polylinePoints.addAll(pts);
            }
          }
        }
      }
    }

    if (polylinePoints.isEmpty) {
      return RouteModel(points: [], cumDist: [], steps: []);
    }

    final cumDist = computeCumulativeDistances(polylinePoints);

    // Parse Steps with startDist and endDist
    final List<NavStep> parsedSteps = [];
    double currentProgressDist = 0.0;

    for (int i = 0; i < rawSteps.length; i++) {
      final s = rawSteps[i];
      final rawHtml = s['html_instructions']?.toString() ?? '';
      final cleanText = rawHtml
          .replaceAll(RegExp(r'<[^>]*>'), '')
          .replaceAll('&nbsp;', ' ')
          .replaceAll(RegExp(r'\s+'), ' ')
          .trim();

      final maneuver = s['maneuver']?.toString() ?? 'straight';
      final distValue = (s['distance']?['value'] as num?)?.toDouble() ?? 0.0;
      final distText = s['distance']?['text']?.toString();
      final durationVal = (s['duration']?['value'] as num?)?.toInt();

      final sLoc = s['start_location'];
      final startLat = (sLoc?['lat'] as num?)?.toDouble() ?? polylinePoints.first.latitude;
      final startLng = (sLoc?['lng'] as num?)?.toDouble() ?? polylinePoints.first.longitude;

      final eLoc = s['end_location'];
      final endLat = (eLoc?['lat'] as num?)?.toDouble() ?? polylinePoints.last.latitude;
      final endLng = (eLoc?['lng'] as num?)?.toDouble() ?? polylinePoints.last.longitude;

      final startCoord = LatLng(startLat, startLng);
      final endCoord = LatLng(endLat, endLng);

      // Map endCoord to closest point on polyline to get exact endDist
      double stepEndDist = currentProgressDist + distValue;
      int closestIdx = _findClosestPointIndex(polylinePoints, endCoord, cumDist, currentProgressDist);
      if (closestIdx >= 0) {
        stepEndDist = cumDist[closestIdx];
      }

      parsedSteps.add(NavStep(
        index: i,
        instruction: cleanText.isNotEmpty ? cleanText : 'Tiếp tục đi thẳng',
        maneuver: maneuver,
        startDist: currentProgressDist,
        endDist: math.max(currentProgressDist + 5.0, stepEndDist),
        startLocation: startCoord,
        endLocation: endCoord,
        distanceText: distText,
        durationSeconds: durationVal,
      ));

      currentProgressDist = stepEndDist;
    }

    return RouteModel(
      points: polylinePoints,
      cumDist: cumDist,
      steps: parsedSteps,
      overviewPolyline: overviewEncoded,
    );
  }

  static int _findClosestPointIndex(
    List<LatLng> points,
    LatLng target,
    List<double> cumDist,
    double minCumDist,
  ) {
    int bestIdx = -1;
    double bestDist = double.infinity;
    for (int i = 0; i < points.length; i++) {
      if (cumDist[i] < minCumDist - 10.0) continue;
      final d = fastDistanceMeters(points[i], target);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
        if (d < 5.0) break; // close enough
      }
    }
    return bestIdx;
  }
}
