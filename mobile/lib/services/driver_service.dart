import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import '../core/constants/api_constants.dart';
import 'auth_service.dart';

class DriverService {
  static const String goongApiKey = ApiConstants.goongApiKey;

  /// Fetch list of active/assigned routes for the logged in driver
  static Future<List<Map<String, dynamic>>> fetchMyRoutes() async {
    final token = await AuthService.getToken();
    if (token == null || token.isEmpty) {
      debugPrint('⚠️ [DriverService] Token rỗng hoặc hết hạn.');
      return [];
    }

    final url = Uri.parse(ApiConstants.routes);

    for (int attempt = 1; attempt <= 2; attempt++) {
      try {
        debugPrint('📡 [DriverService] Gọi GET $url (lần $attempt)');
        final response = await http.get(
          url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
            'ngrok-skip-browser-warning': 'true',
          },
        ).timeout(const Duration(seconds: 8));

        debugPrint('📨 [DriverService] Status: ${response.statusCode}');

        if (response.statusCode == 401) {
          debugPrint('⚠️ [DriverService] Token 401. Đang thử làm mới token...');
          final refreshed = await AuthService.tryRefreshToken();
          if (refreshed != null) continue;
          return [];
        }
        if (response.statusCode == 200) {
          final body = jsonDecode(response.body);
          if (body['success'] == true && body['data'] != null) {
            if (body['data'] is List) {
              final list = List<Map<String, dynamic>>.from(body['data']);
              debugPrint('✅ [DriverService] Nhận được ${list.length} lộ trình từ backend');
              return list;
            } else if (body['data'] is Map) {
              debugPrint('✅ [DriverService] Nhận được 1 lộ trình (Map) từ backend');
              return [Map<String, dynamic>.from(body['data'])];
            }
          }
        }
      } catch (e) {
        debugPrint('💥 [DriverService] Lỗi fetchMyRoutes (lần $attempt): $e');
        if (attempt == 1) {
          await Future.delayed(const Duration(milliseconds: 400));
        }
      }
    }
    return [];
  }

  /// Fetch full route detail with stops and assigned shipment
  static Future<Map<String, dynamic>?> fetchRouteDetail(String routeId) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) return null;

      final url = Uri.parse(ApiConstants.routeDetail(routeId));
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'ngrok-skip-browser-warning': 'true',
        },
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true && body['data'] != null) {
          return Map<String, dynamic>.from(body['data']);
        }
      }
    } catch (e) {
      debugPrint('💥 [DriverService] Lỗi fetchRouteDetail: $e');
    }
    return null;
  }

  /// Update shipment status (e.g. OUT_FOR_DELIVERY, DELIVERED)
  static Future<bool> updateShipmentStatus(String shipmentId, String status, {String? notes}) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) return false;

      final url = Uri.parse(ApiConstants.shipmentStatus(shipmentId));
      final Map<String, dynamic> payload = {'status': status};
      if (notes != null) payload['notes'] = notes;

      final response = await http.patch(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'ngrok-skip-browser-warning': 'true',
        },
        body: jsonEncode(payload),
      );

      if (response.statusCode == 200) {
        debugPrint('✅ [DriverService] Đã cập nhật trạng thái Shipment $shipmentId -> $status');
        return true;
      }
    } catch (e) {
      debugPrint('💥 [DriverService] Lỗi updateShipmentStatus: $e');
    }
    return false;
  }

  /// Update order status directly by orderId or orderCode
  static Future<bool> updateOrderStatus(String orderIdOrCode, String status, {String? reason}) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) return false;

      final url = Uri.parse(ApiConstants.orderStatus(orderIdOrCode));
      final Map<String, dynamic> payload = {
        'status': status,
        if (reason != null) 'reason': reason,
      };

      final response = await http.put(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'ngrok-skip-browser-warning': 'true',
        },
        body: jsonEncode(payload),
      );

      if (response.statusCode == 200) {
        debugPrint('✅ [DriverService] Đã cập nhật trạng thái Đơn hàng $orderIdOrCode -> $status');
        return true;
      } else {
        debugPrint('⚠️ [DriverService] Lỗi response updateOrderStatus: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      debugPrint('💥 [DriverService] Lỗi updateOrderStatus: $e');
    }
    return false;
  }

  /// Update driver duty status (ACTIVE / OFFLINE)
  static Future<bool> updateDutyStatus(String status) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) return false;

      final url = Uri.parse(ApiConstants.dutyStatus);
      final response = await http.patch(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'ngrok-skip-browser-warning': 'true',
        },
        body: jsonEncode({'status': status}),
      );

      debugPrint('📡 [DriverService] Duty status update ($status): ${response.statusCode}');
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        return body['success'] == true;
      }
    } catch (e) {
      debugPrint('💥 [DriverService] Error updating duty status: $e');
    }
    return false;
  }

  /// Confirm Tote Scan & Start Route (POST /routes/:id/start)
  static Future<bool> startRoute(String routeId) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) return false;

      final url = Uri.parse(ApiConstants.routeStart(routeId));
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'ngrok-skip-browser-warning': 'true',
        },
      );

      debugPrint('📡 [DriverService] Confirm start route ($routeId): ${response.statusCode}');
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        return body['success'] == true;
      }
    } catch (e) {
      debugPrint('💥 [DriverService] Lỗi startRoute: $e');
    }
    return false;
  }

  /// Confirm Route Complete & Finish Shift (POST /routes/:id/complete)
  static Future<bool> completeRoute(String routeId) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) return false;

      final url = Uri.parse(ApiConstants.routeComplete(routeId));
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'ngrok-skip-browser-warning': 'true',
        },
      );

      debugPrint('📡 [DriverService] Confirm complete route ($routeId): ${response.statusCode}');
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        return body['success'] == true;
      }
    } catch (e) {
      debugPrint('💥 [DriverService] Lỗi completeRoute: $e');
    }
    return false;
  }

  /// Reject Assigned Route with reason (POST /routes/:id/reject)
  static Future<bool> rejectRoute(String routeId, String reason) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) return false;

      final url = Uri.parse(ApiConstants.routeReject(routeId));
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'ngrok-skip-browser-warning': 'true',
        },
        body: jsonEncode({'reason': reason}),
      );

      debugPrint('📡 [DriverService] Reject route ($routeId): ${response.statusCode}');
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        return body['success'] == true;
      }
    } catch (e) {
      debugPrint('💥 [DriverService] Lỗi rejectRoute: $e');
    }
    return false;
  }

  /// Load Tote Bag into Shipment and confirm transit (POST /shipments/load-tote)
  static Future<Map<String, dynamic>?> loadToteIntoShipment(String toteCode) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) return null;

      final url = Uri.parse(ApiConstants.loadTote);
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'ngrok-skip-browser-warning': 'true',
        },
        body: jsonEncode({'toteCode': toteCode}),
      );

      debugPrint('📡 [DriverService] Load tote ($toteCode): ${response.statusCode} - ${response.body}');
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true && body['data'] != null) {
          return Map<String, dynamic>.from(body['data']);
        }
      }
    } catch (e) {
      debugPrint('💥 [DriverService] Lỗi loadToteIntoShipment: $e');
    }
    return null;
  }

  /// Fetch actual road navigation geometry from OSRM connecting all route stops sequentially (matching Web App)
  static Future<List<LatLng>> fetchRouteOSRM({
    required List<LatLng> stops,
  }) async {
    if (stops.length < 2) return stops;
    try {
      final coordsString = stops.map((p) => '${p.longitude},${p.latitude}').join(';');
      final urlStr = ApiConstants.osrmRoutingUrl(coordsString);

      debugPrint('🗺️ [OSRM API Mobile] Requesting direction: $urlStr');
      final response = await http.get(Uri.parse(urlStr)).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['code'] == 'Ok' && body['routes'] != null && (body['routes'] as List).isNotEmpty) {
          final List rawCoords = body['routes'][0]['geometry']['coordinates'];
          final List<LatLng> decoded = rawCoords
              .map<LatLng>((c) => LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble()))
              .toList();
          debugPrint('🗺️ [OSRM API Mobile] Decoded ${decoded.length} road polyline points');
          return decoded;
        }
      }
    } catch (e) {
      debugPrint('⚠️ [OSRM API Mobile] Exception: $e');
    }
    return [];
  }

  /// Fetch complete road polyline starting from driver current location to Stop 1, Stop 2, ... Stop N
  /// Uses Goong Maps API as primary road navigation engine, with OSRM / straight lines fallback.
  static Future<List<LatLng>> fetchFullSequentialRoute({
    required LatLng driverLocation,
    required List<LatLng> stopLatLngs,
  }) async {
    if (stopLatLngs.isEmpty) return [driverLocation];

    final List<LatLng> allWaypoints = [driverLocation, ...stopLatLngs];

    // Attempt 1: Goong Maps Direction API (PRIMARY ENGINE)
    try {
      final List<Future<List<LatLng>>> segmentFutures = [];
      for (int i = 0; i < allWaypoints.length - 1; i++) {
        segmentFutures.add(_fetchGoongSegment(allWaypoints[i], allWaypoints[i + 1]));
      }

      final List<List<LatLng>> segments = await Future.wait(segmentFutures);
      final List<LatLng> fullPolyline = [];
      for (final seg in segments) {
        if (seg.isNotEmpty) {
          if (fullPolyline.isNotEmpty) {
            fullPolyline.addAll(seg.skip(1));
          } else {
            fullPolyline.addAll(seg);
          }
        }
      }

      if (fullPolyline.length >= 2) {
        debugPrint('🗺️ [Goong API Primary] Successfully fetched ${fullPolyline.length} road polyline points across ${segments.length} segments!');
        return fullPolyline;
      }
    } catch (e) {
      debugPrint('⚠️ [Goong API Primary] Exception: $e');
    }

    // Attempt 2: OSRM fallback if Goong API failed
    try {
      final osrmPoints = await fetchRouteOSRM(stops: allWaypoints);
      if (osrmPoints.length >= 2) {
        debugPrint('🗺️ [OSRM Fallback] Successfully fetched full route with ${osrmPoints.length} points!');
        return osrmPoints;
      }
    } catch (e) {
      debugPrint('⚠️ [OSRM Fallback] Error: $e');
    }

    // Attempt 3: Straight lines fallback through all points (Driver -> Stop 1 -> Stop 2 -> ... -> Stop N)
    return allWaypoints;
  }

  /// Helper to fetch Goong Direction API between 2 coordinates (origin -> destination)
  static Future<List<LatLng>> _fetchGoongSegment(LatLng origin, LatLng destination) async {
    try {
      final String originStr = '${origin.latitude},${origin.longitude}';
      final String destStr = '${destination.latitude},${destination.longitude}';
      final String urlStr = 'https://rsapi.goong.io/Direction?origin=$originStr&destination=$destStr&vehicle=bike&api_key=$goongApiKey';

      final response = await http.get(Uri.parse(urlStr)).timeout(const Duration(seconds: 4));
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['routes'] != null && (body['routes'] as List).isNotEmpty) {
          final String polylineStr = body['routes'][0]['overview_polyline']['points'];
          final decoded = decodePolyline(polylineStr);
          if (decoded.isNotEmpty) return decoded;
        }
      }
    } catch (e) {
      debugPrint('⚠️ [Goong Segment API] Error: $e');
    }
    return [origin, destination];
  }

  /// Fetch actual road navigation geometry from Goong Maps Direction API
  static Future<List<LatLng>> fetchGoongRoutePolyline({
    required LatLng origin,
    required LatLng destination,
    List<LatLng>? waypoints,
  }) async {
    try {
      final String originStr = '${origin.latitude},${origin.longitude}';
      final String destStr = '${destination.latitude},${destination.longitude}';

      String waypointsStr = '';
      if (waypoints != null && waypoints.isNotEmpty) {
        // Take up to 5 waypoints to stay within API limit
        waypointsStr = waypoints.take(5).map((w) => '${w.latitude},${w.longitude}').join('|');
      }

      final String urlStr = waypointsStr.isNotEmpty
          ? 'https://rsapi.goong.io/Direction?origin=$originStr&destination=$destStr&waypoints=$waypointsStr&vehicle=bike&api_key=$goongApiKey'
          : 'https://rsapi.goong.io/Direction?origin=$originStr&destination=$destStr&vehicle=bike&api_key=$goongApiKey';

      debugPrint('🗺️ [Goong API] Requesting direction: $urlStr');
      final response = await http.get(Uri.parse(urlStr)).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['routes'] != null && (body['routes'] as List).isNotEmpty) {
          final String polylineStr = body['routes'][0]['overview_polyline']['points'];
          final decoded = decodePolyline(polylineStr);
          debugPrint('🗺️ [Goong API] Decoded ${decoded.length} road polyline points');
          return decoded;
        }
      }
    } catch (e) {
      debugPrint('⚠️ [Goong API] Exception fetching direction: $e');
    }
    return [];
  }

  /// Pure Dart Google/Goong Polyline Decoder
  static List<LatLng> decodePolyline(String encoded) {
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

  /// Fetch turn-by-turn navigation steps from Goong Maps Direction API
  static Future<List<Map<String, String>>> fetchGoongNavigationSteps({
    required LatLng origin,
    required LatLng destination,
  }) async {
    try {
      final String originStr = '${origin.latitude},${origin.longitude}';
      final String destStr = '${destination.latitude},${destination.longitude}';
      final String urlStr =
          'https://rsapi.goong.io/Direction?origin=$originStr&destination=$destStr&vehicle=bike&api_key=$goongApiKey';

      final response = await http.get(Uri.parse(urlStr)).timeout(const Duration(seconds: 4));
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['routes'] != null && (body['routes'] as List).isNotEmpty) {
          final legs = body['routes'][0]['legs'];
          if (legs != null && (legs as List).isNotEmpty) {
            final steps = legs[0]['steps'];
            if (steps is List) {
              final List<Map<String, String>> result = [];
              for (final s in steps) {
                final rawHtml = s['html_instructions']?.toString() ?? '';
                final cleanText = rawHtml
                    .replaceAll(RegExp(r'<[^>]*>'), '')
                    .replaceAll('&nbsp;', ' ')
                    .trim();
                final distText = s['distance']?['text']?.toString() ?? '';
                final maneuver = s['maneuver']?.toString() ?? 'straight';
                if (cleanText.isNotEmpty) {
                  result.add({
                    'instruction': cleanText,
                    'distance': distText,
                    'maneuver': maneuver,
                  });
                }
              }
              if (result.isNotEmpty) return result;
            }
          }
        }
      }
    } catch (e) {
      debugPrint('⚠️ [Goong Steps API] Error: $e');
    }
    return [];
  }
}
