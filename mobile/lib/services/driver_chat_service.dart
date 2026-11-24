import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../core/constants/api_constants.dart';
import 'auth_service.dart';

class DriverChatService {
  /// Lấy danh sách tin nhắn của cuộc hội thoại đang hoạt động gần nhất
  static Future<Map<String, dynamic>> getActiveMessages() async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) {
        return {'success': false, 'statusCode': 401, 'message': 'Chưa đăng nhập'};
      }

      final url = Uri.parse(ApiConstants.driverChatMessages);
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return {
          'success': true,
          'conversationId': data['data']?['id'] ?? data['data']?['conversationId'],
          'status': data['data']?['status'] ?? 'ACTIVE',
          'messages': data['data']?['messages'] ?? [],
        };
      }

      return {
        'success': false,
        'statusCode': response.statusCode,
        'message': data['message'] ?? 'Không thể tải lịch sử trò chuyện',
      };
    } catch (e) {
      debugPrint('⚠️ [DriverChatService] Lỗi getActiveMessages: $e');
      return {'success': false, 'message': 'Lỗi kết nối máy chủ: $e'};
    }
  }

  /// Gửi tin nhắn văn bản và hình ảnh Base64 lên Trợ lý AI Tài xế
  static Future<Map<String, dynamic>> sendMessage({
    required String message,
    String? imageBase64,
    String? conversationId,
  }) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) {
        return {'success': false, 'statusCode': 401, 'message': 'Chưa đăng nhập'};
      }

      final url = Uri.parse(ApiConstants.driverChat);
      final payload = <String, dynamic>{
        'message': message,
      };
      if (imageBase64 != null && imageBase64.isNotEmpty) {
        payload['image'] = imageBase64;
      }
      if (conversationId != null && conversationId.isNotEmpty) {
        payload['conversationId'] = conversationId;
      }

      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 45)); // NVIDIA LLM có thể mất 5-15s

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return {
          'success': true,
          'data': data['data'],
        };
      }

      return {
        'success': false,
        'statusCode': response.statusCode,
        'message': data['message'] ?? 'Máy chủ xử lý câu hỏi thất bại',
      };
    } catch (e) {
      debugPrint('⚠️ [DriverChatService] Lỗi sendMessage: $e');
      return {'success': false, 'message': 'Lỗi kết nối máy chủ: $e'};
    }
  }

  /// Bắt đầu một cuộc trò chuyện mới
  static Future<Map<String, dynamic>> createNewConversation() async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) {
        return {'success': false, 'statusCode': 401, 'message': 'Chưa đăng nhập'};
      }

      final url = Uri.parse(ApiConstants.driverChatNew);
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return {
          'success': true,
          'conversationId': data['data']?['conversationId'] ?? data['data']?['id'],
        };
      }

      return {
        'success': false,
        'statusCode': response.statusCode,
        'message': data['message'] ?? 'Không thể tạo cuộc trò chuyện mới',
      };
    } catch (e) {
      debugPrint('⚠️ [DriverChatService] Lỗi createNewConversation: $e');
      return {'success': false, 'message': 'Lỗi kết nối máy chủ: $e'};
    }
  }

  /// Gửi sự kiện kiểm tra timeout (REMINDER_3M hoặc CLOSE_5M)
  static Future<Map<String, dynamic>> timeoutCheck({
    required String conversationId,
    required String action,
  }) async {
    try {
      final token = await AuthService.getToken();
      if (token == null || token.isEmpty) {
        return {'success': false, 'statusCode': 401, 'message': 'Chưa đăng nhập'};
      }

      final url = Uri.parse(ApiConstants.driverChatTimeoutCheck);
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'conversationId': conversationId,
          'action': action,
        }),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return {
          'success': true,
          'action': data['action'],
          'isClosed': data['isClosed'] ?? false,
          'message': data['message'],
        };
      }

      return {
        'success': false,
        'statusCode': response.statusCode,
        'message': data['message'] ?? 'Không thể kiểm tra timeout',
      };
    } catch (e) {
      debugPrint('⚠️ [DriverChatService] Lỗi timeoutCheck: $e');
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }
}
