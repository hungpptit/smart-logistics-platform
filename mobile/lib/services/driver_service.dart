import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import '../core/config/app_config.dart';
import 'auth_service.dart';

class DriverService {
  static const String goongApiKey = 'eTwacoQyptGn7akdN8psZ68iNvMGD4xFd45Vu4X9';

  /// Fetch list of active/assigned routes for the logged in driver
  static Future<List<Map<String, dynamic>>> fetchMyRoutes() async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) {
        debugPrint('⚠️ [DriverService] Token rỗng hoặc hết hạn.');
        return [];
      }

      final url = Uri.parse('${AppConfig.baseUrl}/routes');
      debugPrint('📡 [DriverService] Gọi GET $url');

      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'ngrok-skip-browser-warning': 'true',
        },
      ).timeout(const Duration(seconds: 8));

      debugPrint('📨 [DriverService] Status: ${response.statusCode}');

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
      debugPrint('💥 [DriverService] Lỗi fetchMyRoutes: $e');
    }
    return [];
  }

  /// Fetch full route detail with stops and assigned shipment
  static Future<Map<String, dynamic>?> fetchRouteDetail(String routeId) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) return null;

      final url = Uri.parse('${AppConfig.baseUrl}/routes/$routeId');
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

      final url = Uri.parse('${AppConfig.baseUrl}/shipments/$shipmentId/status');
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
}
