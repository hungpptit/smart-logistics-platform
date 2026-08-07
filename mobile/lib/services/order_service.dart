import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../core/config/app_config.dart';
import 'auth_service.dart';

class OrderService {
  /// Gọi API POST /api/v1/orders để tạo đơn hàng vận chuyển mới vào CSDL PostgreSQL
  static Future<Map<String, dynamic>> createOrder(Map<String, dynamic> orderData) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) {
        return {
          'success': false,
          'message': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        };
      }

      final url = Uri.parse('${AppConfig.baseUrl}/orders');
      debugPrint('📦 [OrderService] Đang gửi POST $url');

      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(orderData),
      );

      final body = jsonDecode(response.body);
      debugPrint('📦 [OrderService] Status: ${response.statusCode}');

      if (response.statusCode == 201 && body['success'] == true) {
        return {
          'success': true,
          'message': body['message'] ?? 'Tạo đơn hàng thành công!',
          'data': body['data'],
        };
      } else {
        if (response.statusCode == 401) {
          await AuthService.clearAuthData();
        }
        return {
          'success': false,
          'message': body['message'] ?? 'Không thể tạo đơn hàng (Lỗi ${response.statusCode})',
        };
      }
    } catch (e) {
      debugPrint('❌ [OrderService] Lỗi createOrder: $e');
      return {
        'success': false,
        'message': 'Lỗi kết nối đến máy chủ. Vui lòng kiểm tra mạng.',
      };
    }
  }

  /// Gọi API POST /api/v1/orders/calculate-pricing để tính cước phí ước tính
  static Future<Map<String, dynamic>> calculatePricing({
    required String serviceCode,
    required double distanceKm,
    required double totalWeightKg,
    bool isFragile = false,
    double codAmount = 0.0,
  }) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) {
        return {
          'success': false,
          'message': 'Phiên đăng nhập đã hết hạn.',
        };
      }

      final url = Uri.parse('${AppConfig.baseUrl}/orders/calculate-pricing');
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'serviceCode': serviceCode,
          'distanceKm': distanceKm,
          'totalWeightKg': totalWeightKg,
          'isFragile': isFragile,
          'codAmount': codAmount,
        }),
      );

      final body = jsonDecode(response.body);
      if (response.statusCode == 200 && body['success'] == true) {
        return {
          'success': true,
          'data': body['data'],
        };
      } else {
        return {
          'success': false,
          'message': body['message'] ?? 'Không thể tính toán cước phí.',
        };
      }
    } catch (e) {
      debugPrint('❌ [OrderService] Lỗi calculatePricing: $e');
      return {
        'success': false,
        'message': 'Không thể kết nối đến máy chủ.',
      };
    }
  }

  /// Gọi API GET /api/v1/orders để lấy danh sách đơn hàng thực tế của người dùng
  static Future<List<Map<String, dynamic>>> fetchOrders() async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) return [];

      final url = Uri.parse('${AppConfig.baseUrl}/orders');
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true && body['data'] != null) {
          return List<Map<String, dynamic>>.from(body['data']);
        }
      }
    } catch (e) {
      debugPrint('❌ [OrderService] Lỗi fetchOrders: $e');
    }
    return [];
  }

  /// Tra cứu nhanh thông tin đơn hàng theo mã vận đơn thật
  static Future<Map<String, dynamic>?> trackOrder(String code) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) return null;

      final url = Uri.parse('${AppConfig.baseUrl}/orders/by-code/$code');
      debugPrint('📦 [OrderService] Đang gửi GET $url');

      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      final body = jsonDecode(response.body);
      if (response.statusCode == 200 && body['success'] == true && body['data'] != null) {
        return Map<String, dynamic>.from(body['data']);
      }
    } catch (e) {
      debugPrint('❌ [OrderService] Lỗi trackOrder: $e');
    }
    return null;
  }

  /// Lấy thông tin chi tiết một đơn hàng theo ID
  static Future<Map<String, dynamic>?> fetchOrderDetail(String id) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) return null;

      final url = Uri.parse('${AppConfig.baseUrl}/orders/$id');
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true && body['data'] != null) {
          return Map<String, dynamic>.from(body['data']);
        }
      }
    } catch (e) {
      debugPrint('❌ [OrderService] Lỗi fetchOrderDetail: $e');
    }
    return null;
  }

  /// Gọi API POST /orders/:id/cancel để khách hàng chủ động hủy đơn
  static Future<Map<String, dynamic>> cancelOrder(String orderId) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) {
        return {
          'success': false,
          'message': 'Phiên đăng nhập đã hết hạn.',
        };
      }

      final url = Uri.parse('${AppConfig.baseUrl}/orders/$orderId/cancel');
      debugPrint('📦 [OrderService] Đang gửi POST $url');

      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      final body = jsonDecode(response.body);
      if (response.statusCode == 200 && body['success'] == true) {
        return {
          'success': true,
          'message': body['message'] ?? 'Hủy đơn hàng thành công!',
        };
      } else {
        return {
          'success': false,
          'message': body['message'] ?? 'Không thể hủy đơn hàng.',
        };
      }
    } catch (e) {
      debugPrint('❌ [OrderService] Lỗi cancelOrder: $e');
      return {
        'success': false,
        'message': 'Lỗi kết nối máy chủ.',
      };
    }
  }

  /// Gọi API PUT /orders/:id/status để cập nhật trạng thái đơn hàng (ví dụ: READY_FOR_PICKUP)
  static Future<Map<String, dynamic>> updateOrderStatus(String orderId, String status) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) {
        return {
          'success': false,
          'message': 'Phiên đăng nhập đã hết hạn.',
        };
      }

      final url = Uri.parse('${AppConfig.baseUrl}/orders/$orderId/status');
      debugPrint('📦 [OrderService] Đang gửi PUT $url ($status)');

      final response = await http.put(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'status': status,
          'reason': 'Xác nhận sẵn sàng lấy hàng'
        }),
      );

      final body = jsonDecode(response.body);
      if (response.statusCode == 200 && body['success'] == true) {
        return {
          'success': true,
          'message': body['message'] ?? 'Cập nhật trạng thái thành công!',
        };
      } else {
        return {
          'success': false,
          'message': body['message'] ?? 'Không thể cập nhật trạng thái.',
        };
      }
    } catch (e) {
      debugPrint('❌ [OrderService] Lỗi updateOrderStatus: $e');
      return {
        'success': false,
        'message': 'Lỗi kết nối máy chủ.',
      };
    }
  }
}
