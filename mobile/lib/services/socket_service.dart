import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/constants/api_constants.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? _socket;
  bool _isConnected = false;
  String? _currentToken;
  String? _joinedRouteId;
  bool _isChatScreenActive = false;

  // Registry callback lưu độc lập với vòng đời instance Socket để giữ qua reconnect / refresh token
  final List<VoidCallback> _routesUpdatedListeners = [];
  final List<void Function(int)> _chatUnreadListeners = [];
  final List<void Function(Map<String, dynamic>)> _chatNewMessageListeners = [];

  bool get isConnected => _isConnected;
  bool get isChatScreenActive => _isChatScreenActive;

  void _disposeCurrentSocket({bool resetSessionState = false}) {
    if (_socket != null) {
      _socket!.clearListeners();
      _socket!.disconnect();
      _socket!.dispose();
      _socket = null;
    }
    _isConnected = false;
    if (resetSessionState) {
      _currentToken = null;
      _joinedRouteId = null;
      _isChatScreenActive = false;
    }
  }

  void _dispatchRoutesUpdated() {
    for (final cb in List<VoidCallback>.from(_routesUpdatedListeners)) {
      cb();
    }
  }

  void _dispatchChatUnread(int unreadCount) {
    for (final cb in List<void Function(int)>.from(_chatUnreadListeners)) {
      cb(unreadCount);
    }
  }

  void _dispatchChatNewMessage(Map<String, dynamic> payload) {
    for (final cb in List<void Function(Map<String, dynamic>)>.from(_chatNewMessageListeners)) {
      cb(payload);
    }
  }

  void _bindSocketListeners(io.Socket socket) {
    socket.onConnect((_) {
      _isConnected = true;
      debugPrint('✅ [SocketService] Đã kết nối Socket thành công! ID: ${socket.id}');
      if (_joinedRouteId != null && _joinedRouteId!.isNotEmpty) {
        socket.emit('join:route', {'routeId': _joinedRouteId});
      }
      if (_isChatScreenActive) {
        socket.emit('chat:screen_opened', {'isOpen': true});
      }
    });

    socket.onDisconnect((_) {
      _isConnected = false;
      debugPrint('🔴 [SocketService] Đã ngắt kết nối Socket');
    });

    socket.onConnectError((data) {
      _isConnected = false;
      debugPrint('❌ [SocketService] Lỗi kết nối Socket: $data');
    });

    socket.onError((data) {
      debugPrint('⚠️ [SocketService] Socket error: $data');
    });

    socket.on('routes_updated', (_) => _dispatchRoutesUpdated());
    socket.on('route:assigned', (_) => _dispatchRoutesUpdated());
    socket.on('route:reset', (_) => _dispatchRoutesUpdated());

    socket.on('chat:unread_updated', (data) {
      int unread = 0;
      if (data is Map && data['unreadCount'] != null) {
        unread = int.tryParse(data['unreadCount'].toString()) ?? 0;
      } else if (data is num) {
        unread = data.toInt();
      }
      _dispatchChatUnread(unread);
    });

    socket.on('chat:new_message', (data) {
      if (data is Map) {
        _dispatchChatNewMessage(Map<String, dynamic>.from(data));
      }
    });
  }

  /// Connect to backend Socket.io Gateway
  void connect({String? token}) {
    final normalizedToken = (token != null && token.isNotEmpty) ? token : null;
    if (_socket != null && _socket!.connected && _currentToken == normalizedToken) {
      debugPrint('⚡ [SocketService] Đã kết nối sẵn.');
      return;
    }

    if (_socket != null) {
      _disposeCurrentSocket(resetSessionState: false);
    }

    _currentToken = normalizedToken;
    final serverUrl = ApiConstants.socketServerUrl;
    debugPrint('🔌 [SocketService] Đang kết nối tới Gateway Socket: $serverUrl');

    final builder = io.OptionBuilder()
        .setTransports(['websocket', 'polling'])
        .enableReconnection()
        .setExtraHeaders({
          'ngrok-skip-browser-warning': 'true',
          if (normalizedToken != null) 'Authorization': 'Bearer $normalizedToken',
        });

    if (normalizedToken != null) {
      builder.setAuth({'token': normalizedToken});
    }

    final socket = io.io(serverUrl, builder.build());
    _socket = socket;
    _bindSocketListeners(socket);
    socket.connect();
  }

  /// Khởi tạo lại kết nối Socket khi token vừa được refresh (giữ nguyên toàn bộ listener + room)
  void reconnectIfConnected(String newToken) {
    if (newToken.isEmpty) return;
    if (_socket == null) {
      _currentToken = newToken;
      return;
    }
    debugPrint('🔄 [SocketService] Reconnecting Socket với token mới...');
    connect(token: newToken);
  }

  /// Tham gia room lộ trình
  void joinRoute(String routeId) {
    _joinedRouteId = routeId;
    if (_socket != null && _socket!.connected) {
      _socket!.emit('join:route', {'routeId': routeId});
      debugPrint('📡 [SocketService] Đã tham gia theo dõi routeId: $routeId');
    }
  }

  /// Đồng bộ trạng thái đang mở màn hình chat để server không tăng nhầm badge
  void emitChatScreenActive(bool isOpen) {
    _isChatScreenActive = isOpen;
    if (_socket != null && _socket!.connected) {
      _socket!.emit('chat:screen_opened', {'isOpen': isOpen});
    }
  }

  /// Lắng nghe sự kiện cập nhật/phân công lộ trình mới từ máy chủ real-time
  void onRoutesUpdated(VoidCallback callback) {
    if (!_routesUpdatedListeners.contains(callback)) {
      _routesUpdatedListeners.add(callback);
    }
  }

  void removeRoutesUpdatedListener(VoidCallback callback) {
    _routesUpdatedListeners.remove(callback);
  }

  /// Lắng nghe sự kiện cập nhật số tin nhắn chưa đọc từ server
  void onChatUnreadUpdated(void Function(int) callback) {
    if (!_chatUnreadListeners.contains(callback)) {
      _chatUnreadListeners.add(callback);
    }
  }

  void removeChatUnreadUpdatedListener(void Function(int) callback) {
    _chatUnreadListeners.remove(callback);
  }

  /// Lắng nghe tin nhắn mới realtime khi đang mở màn chat
  void onChatNewMessage(void Function(Map<String, dynamic>) callback) {
    if (!_chatNewMessageListeners.contains(callback)) {
      _chatNewMessageListeners.add(callback);
    }
  }

  void removeChatNewMessageListener(void Function(Map<String, dynamic>) callback) {
    _chatNewMessageListeners.remove(callback);
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
      connect(token: _currentToken);
    }
  }

  /// Ngắt kết nối Socket
  void disconnect() {
    if (_socket != null) {
      _disposeCurrentSocket(resetSessionState: true);
      debugPrint('🔌 [SocketService] Đã đóng Socket');
    }
  }
}
