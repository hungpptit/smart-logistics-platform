import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/constants/api_constants.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? _socket;
  bool _isConnected = false;

  bool get isConnected => _isConnected;

  /// Connect to backend Socket.io Gateway
  void connect({String? token}) {
    if (_socket != null && _socket!.connected) {
      debugPrint('⚡ [SocketService] Đã kết nối sẵn.');
      return;
    }

    final serverUrl = ApiConstants.socketServerUrl;
    debugPrint('🔌 [SocketService] Đang kết nối tới Gateway Socket: $serverUrl');

    _socket = io.io(
      serverUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableReconnection()
          .setExtraHeaders({
            'ngrok-skip-browser-warning': 'true',
            if (token != null) 'Authorization': 'Bearer $token',
          })
          .build(),
    );

    _socket!.onConnect((_) {
      _isConnected = true;
      debugPrint('✅ [SocketService] Đã kết nối Socket thành công! ID: ${_socket!.id}');
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      debugPrint('🔴 [SocketService] Đã ngắt kết nối Socket');
    });

    _socket!.onConnectError((data) {
      _isConnected = false;
      debugPrint('❌ [SocketService] Lỗi kết nối Socket: $data');
    });

    _socket!.onError((data) {
      debugPrint('⚠️ [SocketService] Socket error: $data');
    });

    _socket!.connect();
  }

  /// Tham gia room lộ trình
  void joinRoute(String routeId) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('join:route', {'routeId': routeId});
      debugPrint('📡 [SocketService] Đã tham gia theo dõi routeId: $routeId');
    }
  }

  /// Lắng nghe sự kiện cập nhật/phân công lộ trình mới từ máy chủ real-time
  void onRoutesUpdated(VoidCallback callback) {
    if (_socket != null) {
      _socket!.on('routes_updated', (_) => callback());
      _socket!.on('route:assigned', (_) => callback());
      _socket!.on('route:reset', (_) => callback());
    }
  }

  /// Phát tín hiệu tọa độ GPS từ thiết bị di động lên máy chủ
  void emitLocation({
    required String routeId,
    required double latitude,
    required double longitude,
    double? speedMps,
    double? headingDegrees,
    double? accuracyMeters,
  }) {
    if (_socket != null && _socket!.connected) {
      final payload = {
        'routeId': routeId,
        'latitude': latitude,
        'longitude': longitude,
        'speedMps': speedMps ?? 0.0,
        'headingDegrees': headingDegrees ?? 0.0,
        'accuracyMeters': accuracyMeters ?? 5.0,
      };
      _socket!.emit('driver:update_location', payload);
      debugPrint('🛰️ [SocketService] Đã phát GPS [route: $routeId]: lat=$latitude, lng=$longitude');
    } else {
      debugPrint('⚠️ [SocketService] Socket chưa kết nối, thử kết nối lại...');
      connect();
    }
  }

  /// Ngắt kết nối Socket
  void disconnect() {
    if (_socket != null) {
      _socket!.disconnect();
      _socket!.dispose();
      _socket = null;
      _isConnected = false;
      debugPrint('🔌 [SocketService] Đã đóng Socket');
    }
  }
}
