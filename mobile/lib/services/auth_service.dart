import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/config/app_config.dart';

class AuthService {
  static const _storage = FlutterSecureStorage();

  // Save authentication details
  static Future<void> saveAuthData(String token, String role, String email, String username, String phone) async {
    await _storage.write(key: 'token', value: token);
    await _storage.write(key: 'role', value: role);
    await _storage.write(key: 'email', value: email);
    await _storage.write(key: 'username', value: username);
    await _storage.write(key: 'phone', value: phone);
  }

  // Clear authentication details (Logout)
  static Future<void> clearAuthData() async {
    await _storage.delete(key: 'token');
    await _storage.delete(key: 'role');
    await _storage.delete(key: 'email');
    await _storage.delete(key: 'username');
    await _storage.delete(key: 'phone');
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

  // Get stored phone
  static Future<String?> getStoredPhone() async {
    return await _storage.read(key: 'phone');
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
        final token = data['accessToken'] ?? data['token'];
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

        if (token == null) {
          throw Exception('Token không được trả về từ máy chủ');
        }

        await saveAuthData(
          token,
          role,
          user['email'] ?? '',
          user['username'] ?? '',
          user['phone'] ?? '',
        );
        
        return {
          'success': true,
          'message': responseData['message'] ?? 'Đăng nhập thành công',
          'role': role,
        };
      } else {
        return {
          'success': false,
          'message': _extractErrorMessage(responseData, 'Đăng nhập thất bại'),
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
          'message': _extractErrorMessage(responseData, 'Đăng ký thất bại'),
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.',
      };
    }
  }

  // Verify OTP API Call
  static Future<Map<String, dynamic>> verifyOtp({
    required String email,
    required String otp,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConfig.baseUrl}/auth/verify-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'otp': otp,
        }),
      );

      final responseData = jsonDecode(response.body);

      if (response.statusCode == 200 && responseData['success'] == true) {
        final data = responseData['data'];
        final token = data['accessToken'] ?? data['token'];
        final user = data['user'];
        final List<dynamic> roles = user['roles'];

        String role = 'CUSTOMER';
        if (roles.contains('ADMIN')) {
          role = 'ADMIN';
        } else if (roles.contains('STAFF')) {
          role = 'STAFF';
        } else if (roles.contains('SHIPPER')) {
          role = 'SHIPPER';
        }

        if (token == null) {
          throw Exception('Token không được trả về từ máy chủ');
        }

        await saveAuthData(
          token,
          role,
          user['email'] ?? '',
          user['username'] ?? '',
          user['phone'] ?? '',
        );

        return {
          'success': true,
          'message': responseData['message'] ?? 'Kích hoạt tài khoản thành công',
          'role': role,
        };
      } else {
        return {
          'success': false,
          'message': _extractErrorMessage(responseData, 'Mã xác thực OTP không chính xác hoặc đã hết hạn'),
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.',
      };
    }
  }

  // Forgot Password API Call
  static Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConfig.baseUrl}/auth/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      );

      final responseData = jsonDecode(response.body);

      if (response.statusCode == 200 && responseData['success'] == true) {
        return {
          'success': true,
          'message': responseData['message'] ?? 'Đã gửi liên kết khôi phục mật khẩu thành công!',
        };
      } else {
        return {
          'success': false,
          'message': _extractErrorMessage(responseData, 'Gửi yêu cầu khôi phục thất bại'),
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.',
      };
    }
  }

  // Reset Password API Call (with OTP verification)
  static Future<Map<String, dynamic>> resetPassword({
    required String email,
    required String otp,
    required String newPassword,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConfig.baseUrl}/auth/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'otp': otp, 'newPassword': newPassword}),
      );

      final responseData = jsonDecode(response.body);

      if (response.statusCode == 200 && responseData['success'] == true) {
        return {
          'success': true,
          'message': responseData['message'] ?? 'Đặt lại mật khẩu thành công!',
        };
      } else {
        return {
          'success': false,
          'message': _extractErrorMessage(responseData, 'Đặt lại mật khẩu thất bại'),
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.',
      };
    }
  }

  // Add address to customer address book
  static Future<Map<String, dynamic>> addAddress({
    required String addressLine1,
    required String ward,
    required String province,
    required String addressType,
    required bool isDefault,
  }) async {
    try {
      final token = await getToken();
      if (token == null || token.isEmpty) {
        return {'success': false, 'message': 'Yêu cầu đăng nhập'};
      }

      final response = await http.post(
        Uri.parse('${AppConfig.baseUrl}/customers/me/addresses'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'addressLine1': addressLine1,
          'ward': ward,
          'province': province,
          'addressType': addressType,
          'isDefault': isDefault,
          'latitude': 10.7725, // default HCM city center coords
          'longitude': 106.6980,
        }),
      );

      final responseData = jsonDecode(response.body);
      if ((response.statusCode == 200 || response.statusCode == 201) && responseData['success'] == true) {
        return {
          'success': true,
          'message': responseData['message'] ?? 'Thêm địa chỉ thành công',
        };
      } else {
        return {
          'success': false,
          'message': _extractErrorMessage(responseData, 'Thêm địa chỉ thất bại'),
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.',
      };
    }
  }

  // Fetch addresses of current logged-in customer
  static Future<List<Map<String, dynamic>>> fetchAddresses() async {
    try {
      final token = await getToken();
      if (token == null || token.isEmpty) return [];

      final response = await http.get(
        Uri.parse('${AppConfig.baseUrl}/customers/me/addresses'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      final responseData = jsonDecode(response.body);
      if (response.statusCode == 200 && responseData['success'] == true && responseData['data'] != null) {
        return List<Map<String, dynamic>>.from(responseData['data']);
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  static String _extractErrorMessage(Map<String, dynamic> responseData, String defaultMsg) {
    String msg = responseData['message'] ?? defaultMsg;
    if (responseData['errors'] != null && responseData['errors'] is List) {
      final List errs = responseData['errors'];
      if (errs.isNotEmpty) {
        final firstErr = errs.first;
        if (firstErr['constraints'] != null && firstErr['constraints'] is List) {
          msg = (firstErr['constraints'] as List).join(', ');
        }
      }
    }
    return msg;
  }
}
