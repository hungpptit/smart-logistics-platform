import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:velocity_mobile/navigation/polyline_codec.dart';
import 'package:velocity_mobile/navigation/route_snapper.dart';

void main() {
  group('RouteModel & PolylineCodec Tests', () {
    late Map<String, dynamic> fixtureJson;

    setUpAll(() {
      final file = File('test/fixtures/goong_route.json');
      expect(file.existsSync(), isTrue, reason: 'goong_route.json fixture must exist');
      fixtureJson = jsonDecode(file.readAsStringSync());
    });

    test('parseGoongDirections correctly loads route geometry and steps', () {
      final route = PolylineCodec.parseGoongDirections(fixtureJson);

      expect(route.isNotEmpty, isTrue);
      expect(route.points.length, greaterThan(10));
      expect(route.cumDist.length, equals(route.points.length));
      expect(route.cumDist.first, equals(0.0));
      expect(route.totalMeters, greaterThan(1500.0));
      expect(route.steps.length, greaterThan(3));

      // Steps are in ascending distance order
      for (int i = 0; i < route.steps.length - 1; i++) {
        expect(route.steps[i].startDist, lessThanOrEqualTo(route.steps[i].endDist));
        expect(route.steps[i].endDist, lessThanOrEqualTo(route.steps[i + 1].endDist));
      }
    });

    test('RouteSnapper projects on-route coordinate with near 0 offRoute distance', () {
      final route = PolylineCodec.parseGoongDirections(fixtureJson);
      final snapper = RouteSnapper();

      // Test with first point
      final firstPoint = route.points.first;
      final snap1 = snapper.snap(firstPoint, route);
      expect(snap1.offRouteMeters, lessThan(1.0));
      expect(snap1.progressMeters, lessThan(5.0));

      // Test with midpoint
      final midPoint = route.points[route.points.length ~/ 2];
      final snapMid = snapper.snap(midPoint, route);
      expect(snapMid.offRouteMeters, lessThan(1.0));
      expect(snapMid.progressMeters, greaterThan(100.0));
    });

    test('RouteSnapper calculates offRoute distance accurately for shifted coordinate', () {
      final route = PolylineCodec.parseGoongDirections(fixtureJson);
      final snapper = RouteSnapper();

      final point = route.points[10];
      // Shift coordinate by ~20m (0.00018 deg lat)
      final shifted = LatLng(point.latitude + 0.00018, point.longitude);
      final snap = snapper.snap(shifted, route);

      expect(snap.offRouteMeters, greaterThan(15.0));
      expect(snap.offRouteMeters, lessThan(30.0));
    });

    test('RouteSnapper enforces monotonic forward progress on minor jitter', () {
      final route = PolylineCodec.parseGoongDirections(fixtureJson);
      final snapper = RouteSnapper();

      final point20 = route.points[20];
      final snap1 = snapper.snap(point20, route);
      final progress1 = snap1.progressMeters;

      // Jitter slightly backwards
      final pointPrev = route.points[18];
      final snap2 = snapper.snap(pointPrev, route);
      // Progress must not regress
      expect(snap2.progressMeters, greaterThanOrEqualTo(progress1));
    });
  });
}
