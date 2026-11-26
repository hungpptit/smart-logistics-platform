import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../../services/driver_chat_service.dart';

typedef TimeoutCheckCallback = Future<Map<String, dynamic>> Function({
  required String conversationId,
  required String action,
});

/// Điều phối timeout không hoạt động (3 phút nhắc nhở / 5 phút đóng phiên)
/// cho màn hình trợ lý tài xế, tách hoàn toàn khỏi BuildContext.
class ChatTimeoutController {
  ChatTimeoutController({
    TimeoutCheckCallback? timeoutCheck,
    DateTime Function()? now,
    Duration? remindAfter,
    Duration? closeAfter,
    this.onReminder,
    this.onClosed,
  }) : _timeoutCheck = timeoutCheck ?? DriverChatService.timeoutCheck,
       _now = now ?? DateTime.now,
       // Ngưỡng thời gian: Khi debug = 30s & 60s để test nhanh; Khi production/báo cáo = 180s (3p) & 300s (5p)
       _remindAfter =
           remindAfter ?? const Duration(seconds: kDebugMode ? 30 : 180),
       _closeAfter =
           closeAfter ?? const Duration(seconds: kDebugMode ? 60 : 300);

  final TimeoutCheckCallback _timeoutCheck;
  final DateTime Function() _now;
  final Duration _remindAfter;
  final Duration _closeAfter;
  final void Function(String text)? onReminder;
  final void Function(String text)? onClosed;

  String? conversationId;
  bool isClosed = false;
  DateTime? lastAiReplyTimestamp;

  bool _isDisposed = false;
  Timer? _reminderTimer;
  Timer? _closeTimer;

  bool get isDisposed => _isDisposed;
  bool get hasReminderTimer => _reminderTimer?.isActive ?? false;
  bool get hasCloseTimer => _closeTimer?.isActive ?? false;

  void syncState({
    required String? conversationId,
    required bool isClosed,
    required DateTime? lastAiReplyTimestamp,
  }) {
    this.conversationId = conversationId;
    this.isClosed = isClosed;
    this.lastAiReplyTimestamp = lastAiReplyTimestamp;
  }

  void cancelTimers() {
    _reminderTimer?.cancel();
    _closeTimer?.cancel();
    _reminderTimer = null;
    _closeTimer = null;
  }

  void scheduleTimers() {
    cancelTimers();
    if (_isDisposed || isClosed || lastAiReplyTimestamp == null) return;

    final elapsed = _now().difference(lastAiReplyTimestamp!).inSeconds;

    // Timer nhắc nhở (3 phút)
    final remainingRemind = _remindAfter.inSeconds - elapsed;
    if (remainingRemind > 0) {
      _reminderTimer = Timer(Duration(seconds: remainingRemind), () {
        handleTimeoutEvent('REMINDER_3M');
      });
    }

    // Timer đóng phiên (5 phút)
    final remainingClose = _closeAfter.inSeconds - elapsed;
    if (remainingClose > 0) {
      _closeTimer = Timer(Duration(seconds: remainingClose), () {
        handleTimeoutEvent('CLOSE_5M');
      });
    }
  }

  void checkBackgroundTimeout() {
    if (_isDisposed ||
        isClosed ||
        lastAiReplyTimestamp == null ||
        conversationId == null) {
      return;
    }

    final elapsed = _now().difference(lastAiReplyTimestamp!).inSeconds;

    if (elapsed >= _closeAfter.inSeconds) {
      handleTimeoutEvent('CLOSE_5M');
    } else if (elapsed >= _remindAfter.inSeconds) {
      handleTimeoutEvent('REMINDER_3M');
    }
  }

  Future<void> handleTimeoutEvent(String action) async {
    if (_isDisposed || conversationId == null || isClosed) return;

    final res = await _timeoutCheck(
      conversationId: conversationId!,
      action: action,
    );
    if (_isDisposed) return;

    if (res['success'] == true) {
      final act = res['action'];
      if (act == 'REMINDED') {
        final String reminderText =
            res['message']?['text']?.toString() ??
            'Bác tài ơi, bác có còn cần Trợ lý AI hỗ trợ thêm thông tin gì trên tuyến đường nữa không ạ?';

        onReminder?.call(reminderText);
      } else if (act == 'CLOSED') {
        final String closingText =
            res['message']?['text']?.toString() ??
            'Do không nhận được phản hồi, Trợ lý AI xin phép tạm đóng phiên hỗ trợ. Chúc bác tài vạn dặm bình an!';

        isClosed = true;
        onClosed?.call(closingText);
        cancelTimers();
      }
    }
  }

  void dispose() {
    _isDisposed = true;
    cancelTimers();
  }
}
