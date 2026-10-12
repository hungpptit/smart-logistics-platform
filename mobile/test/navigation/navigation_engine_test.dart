import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:velocity_mobile/navigation/navigation_engine.dart';
import 'package:velocity_mobile/navigation/polyline_codec.dart';
import 'package:velocity_mobile/navigation/route_model.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  group('NavigationEngine Unit Tests', () {
    late RouteModel route;

    setUpAll(() {
      final file = File('test/fixtures/goong_route.json');
      final fixtureJson = jsonDecode(file.readAsStringSync());
      route = PolylineCodec.parseGoongDirections(fixtureJson);
    });

    test('smoothAngle shortest path works across 359 -> 1 wrap-around', () {
      // Near 360 wrap-around
      final smoothed = NavigationEngine.smoothAngle(358.0, 2.0, 0.5);
      // Diff is +4 deg, half is +2 deg => 360 = 0.0 deg
      expect(smoothed, closeTo(0.0, 1.0));

      final smoothedReverse = NavigationEngine.smoothAngle(2.0, 358.0, 0.5);
      expect(smoothedReverse, closeTo(0.0, 1.0));
    });

    test('Engine advances through steps sequentially along route points', () {
      final engine = NavigationEngine(initialRoute: route);
      expect(engine.state.currentStepIndex, equals(0));

      int maxStepReached = 0;
      // Feed positions along the polyline
      for (int i = 0; i < route.points.length; i++) {
        final pt = route.points[i];
        final pos = Position(
          longitude: pt.longitude,
          latitude: pt.latitude,
          timestamp: DateTime.now().add(Duration(seconds: i)),
          accuracy: 5.0,
          altitude: 10.0,
          altitudeAccuracy: 1.0,
          heading: 90.0,
          headingAccuracy: 1.0,
          speed: 8.0, // ~30 km/h
          speedAccuracy: 1.0,
        );
        engine.processPosition(pos);
        if (engine.state.currentStepIndex > maxStepReached) {
          maxStepReached = engine.state.currentStepIndex;
        }
      }

      // Max step should have advanced significantly
      expect(maxStepReached, greaterThan(2));
      expect(engine.state.isArrived, isTrue);
    });

    test('Engine triggers onRerouteRequested when deviated off-route for duration', () async {
      bool rerouteCalled = false;
      final engine = NavigationEngine(
        initialRoute: route,
        destination: route.points.last,
        onRerouteRequested: (orig, dest) async {
          rerouteCalled = true;
          return null;
        },
      );

      final now = DateTime.now();
      // Feed 5 positions located 100m away from route at 1s intervals
      for (int i = 0; i < 5; i++) {
        final pos = Position(
          longitude: route.points.first.longitude + 0.003, // ~330m off
          latitude: route.points.first.latitude + 0.003,
          timestamp: now.add(Duration(seconds: i)),
          accuracy: 5.0,
          altitude: 10.0,
          altitudeAccuracy: 1.0,
          heading: 0.0,
          headingAccuracy: 1.0,
          speed: 5.0,
          speedAccuracy: 1.0,
        );
        engine.processPosition(pos);
      }

      expect(rerouteCalled, isTrue);
    });
  });
}
