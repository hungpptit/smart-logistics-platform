import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/config/app_config.dart';

class AuthService {
  static const _storage = FlutterSecureStorage();

  // Save authentication details
  static Future<void> saveAuthData(String token, String role, String email, String username) async {
    await _storage.write(key: 'token', value: token);
    await _storage.write(key: 'role', value: role);
    await _storage.write(key: 'email', value: email);
    await _storage.write(key: 'username', value: username);
  }

  // Clear authentication details (Logout)
  static Future<void> clearAuthData() async {
    await _storage.delete(key: 'token');
    await _storage.delete(key: 'role');
    await _storage.delete(key: 'email');
    await _storage.delete(key: 'username');
  }

  // Check if token exists
  static Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: 'token');
    return token != null;
  }

  // Get stored role
  static Future<String?> getStoredRole() async {
    return await _storage.read(key: 'role');
  }

  // Get stored token
  static Future<String?> getToken() async {
    return await _storage.read(key: 'token');
  }

  // Get stored email
  static Future<String?> getStoredEmail() async {
    return await _storage.read(key: 'email');
  }

  // Get stored username
  static Future<String?> getStoredUsername() async {
    return await _storage.read(key: 'username');
  }

  // Login API Call
  static Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConfig.baseUrl}/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      final responseData = jsonDecode(response.body);
      
      if (response.statusCode == 200 && responseData['success'] == true) {
        final data = responseData['data'];
        final token = data['token'];
        final user = data['user'];
        final List<dynamic> roles = user['roles'];
        
        // Pick primary role from roles list
        String role = 'CUSTOMER';
        if (roles.contains('ADMIN')) {
          role = 'ADMIN';
        } else if (roles.contains('STAFF')) {
          role = 'STAFF';
        } else if (roles.contains('SHIPPER')) {
          role = 'SHIPPER';
        }

        await saveAuthData(token, role, user['email'], user['username']);
        
        return {
          'success': true,
          'message': responseData['message'] ?? 'Đăng nhập thành công',
          'role': role,
        };
      } else {
        return {
          'success': false,
          'message': responseData['message'] ?? 'Đăng nhập thất bại',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc cấu hình IP.',
      };
    }
  }

  // Register API Call
  static Future<Map<String, dynamic>> register({
    required String username,
    required String email,
    required String password,
    required String phone,
    String roleCode = 'CUSTOMER',
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConfig.baseUrl}/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'email': email,
          'password': password,
          'phone': phone,
          'roleCode': roleCode,
        }),
      );

      final responseData = jsonDecode(response.body);

      if (response.statusCode == 201 && responseData['success'] == true) {
        return {
          'success': true,
          'message': responseData['message'] ?? 'Đăng ký thành công',
        };
      } else {
        return {
          'success': false,
          'message': responseData['message'] ?? 'Đăng ký thất bại',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.',
      };
    }
  }
}
