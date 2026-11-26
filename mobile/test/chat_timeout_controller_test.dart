import 'dart:async';

// fake_async đã được flutter_test kéo sẵn trong pubspec.lock; không sửa pubspec.yaml ở bước này.
// ignore: depend_on_referenced_packages
import 'package:fake_async/fake_async.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:velocity_mobile/screens/driver/controllers/chat_timeout_controller.dart';

void main() {
  group('ChatTimeoutController', () {
    test('uses default debug/release thresholds (30s/60s in debug, 180s/300s otherwise)', () {
      fakeAsync((async) {
        final baseTime = DateTime(2026, 11, 26, 10, 0, 0);
        final actions = <String>[];

        final controller = ChatTimeoutController(
          now: () => baseTime.add(async.elapsed),
          timeoutCheck: ({required conversationId, required action}) async {
            actions.add(action);
            return {'success': true, 'action': 'NOOP'};
          },
        );

        controller.syncState(
          conversationId: 'conv-default',
          isClosed: false,
          lastAiReplyTimestamp: baseTime,
        );
        controller.scheduleTimers();

        const remindSec = kDebugMode ? 30 : 180;
        const closeSec = kDebugMode ? 60 : 300;

        async.elapse(const Duration(seconds: remindSec - 1));
        expect(actions, isEmpty);

        async.elapse(const Duration(seconds: 1));
        expect(actions, ['REMINDER_3M']);

        async.elapse(Duration(seconds: closeSec - remindSec - 1));
        expect(actions, ['REMINDER_3M']);

        async.elapse(const Duration(seconds: 1));
        expect(actions, ['REMINDER_3M', 'CLOSE_5M']);

        controller.dispose();
      });
    });

    test('triggers reminder at exact 3m mark and closes at exact 5m mark', () {
      fakeAsync((async) {
        final baseTime = DateTime(2026, 11, 26, 10, 0, 0);
        final calls = <({String conversationId, String action})>[];
        final reminders = <String>[];
        final closedMessages = <String>[];

        final controller = ChatTimeoutController(
          now: () => baseTime.add(async.elapsed),
          remindAfter: const Duration(seconds: 180),
          closeAfter: const Duration(seconds: 300),
          timeoutCheck: ({required conversationId, required action}) async {
            calls.add((conversationId: conversationId, action: action));
            if (action == 'REMINDER_3M') {
              return {
                'success': true,
                'action': 'REMINDED',
                'isClosed': false,
                'message': {'text': 'Nhắc từ server'},
              };
            }
            return {
              'success': true,
              'action': 'CLOSED',
              'isClosed': true,
              'message': {'text': 'Đóng từ server'},
            };
          },
          onReminder: reminders.add,
          onClosed: closedMessages.add,
        );

        controller.syncState(
          conversationId: 'conv-1',
          isClosed: false,
          lastAiReplyTimestamp: baseTime,
        );
        controller.scheduleTimers();

        expect(controller.hasReminderTimer, isTrue);
        expect(controller.hasCloseTimer, isTrue);

        // Chưa tới 3 phút (179s)
        async.elapse(const Duration(seconds: 179));
        expect(calls, isEmpty);
        expect(reminders, isEmpty);

        // Đúng mốc 3 phút (180s)
        async.elapse(const Duration(seconds: 1));
        expect(calls, [(conversationId: 'conv-1', action: 'REMINDER_3M')]);
        expect(reminders, ['Nhắc từ server']);
        expect(closedMessages, isEmpty);
        expect(controller.isClosed, isFalse);

        // Chưa tới 5 phút (299s)
        async.elapse(const Duration(seconds: 119));
        expect(calls.length, 1);
        expect(closedMessages, isEmpty);

        // Đúng mốc 5 phút (300s)
        async.elapse(const Duration(seconds: 1));
        expect(calls, [
          (conversationId: 'conv-1', action: 'REMINDER_3M'),
          (conversationId: 'conv-1', action: 'CLOSE_5M'),
        ]);
        expect(closedMessages, ['Đóng từ server']);
        expect(controller.isClosed, isTrue);
        expect(controller.hasReminderTimer, isFalse);
        expect(controller.hasCloseTimer, isFalse);

        controller.dispose();
      });
    });

    test('checkBackgroundTimeout triggers REMINDER_3M when resumed past 3m and under 5m', () {
      fakeAsync((async) {
        final baseTime = DateTime(2026, 11, 26, 10, 0, 0);
        final calls = <String>[];
        final reminders = <String>[];
        final closedMessages = <String>[];

        final controller = ChatTimeoutController(
          now: () => baseTime.add(async.elapsed),
          remindAfter: const Duration(seconds: 180),
          closeAfter: const Duration(seconds: 300),
          timeoutCheck: ({required conversationId, required action}) async {
            calls.add(action);
            return {
              'success': true,
              'action': 'REMINDED',
              'isClosed': false,
              'message': null,
            };
          },
          onReminder: reminders.add,
          onClosed: closedMessages.add,
        );

        controller.syncState(
          conversationId: 'conv-bg-1',
          isClosed: false,
          lastAiReplyTimestamp: baseTime,
        );

        // Dưới 3 phút -> không gọi
        async.elapse(const Duration(seconds: 179));
        controller.checkBackgroundTimeout();
        async.flushMicrotasks();
        expect(calls, isEmpty);

        // Quá 3 phút (200s < 300s) -> gọi REMINDER_3M và dùng text mặc định
        async.elapse(const Duration(seconds: 21));
        controller.checkBackgroundTimeout();
        async.flushMicrotasks();

        expect(calls, ['REMINDER_3M']);
        expect(reminders, [
          'Bác tài ơi, bác có còn cần Trợ lý AI hỗ trợ thêm thông tin gì trên tuyến đường nữa không ạ?',
        ]);
        expect(closedMessages, isEmpty);
        expect(controller.isClosed, isFalse);

        controller.dispose();
      });
    });

    test('checkBackgroundTimeout triggers CLOSE_5M when resumed past 5m', () {
      fakeAsync((async) {
        final baseTime = DateTime(2026, 11, 26, 10, 0, 0);
        final calls = <String>[];
        final reminders = <String>[];
        final closedMessages = <String>[];

        final controller = ChatTimeoutController(
          now: () => baseTime.add(async.elapsed),
          remindAfter: const Duration(seconds: 180),
          closeAfter: const Duration(seconds: 300),
          timeoutCheck: ({required conversationId, required action}) async {
            calls.add(action);
            return {
              'success': true,
              'action': 'CLOSED',
              'isClosed': true,
              'message': null,
            };
          },
          onReminder: reminders.add,
          onClosed: closedMessages.add,
        );

        controller.syncState(
          conversationId: 'conv-bg-2',
          isClosed: false,
          lastAiReplyTimestamp: baseTime,
        );

        async.elapse(const Duration(seconds: 320));
        controller.checkBackgroundTimeout();
        async.flushMicrotasks();

        expect(calls, ['CLOSE_5M']);
        expect(reminders, isEmpty);
        expect(closedMessages, [
          'Do không nhận được phản hồi, Trợ lý AI xin phép tạm đóng phiên hỗ trợ. Chúc bác tài vạn dặm bình an!',
        ]);
        expect(controller.isClosed, isTrue);

        // Gọi lại khi đã đóng -> không gọi API nữa
        controller.checkBackgroundTimeout();
        async.flushMicrotasks();
        expect(calls.length, 1);

        controller.dispose();
      });
    });

    test('handles NOOP and failed timeoutCheck responses without invoking callbacks', () {
      fakeAsync((async) {
        final baseTime = DateTime(2026, 11, 26, 10, 0, 0);
        final responses = <Map<String, dynamic>>[
          {'success': true, 'action': 'NOOP', 'isClosed': false},
          {'success': false, 'statusCode': 500, 'message': 'Server error'},
        ];
        var index = 0;
        final reminders = <String>[];
        final closedMessages = <String>[];

        final controller = ChatTimeoutController(
          now: () => baseTime.add(async.elapsed),
          remindAfter: const Duration(seconds: 180),
          closeAfter: const Duration(seconds: 300),
          timeoutCheck: ({required conversationId, required action}) async {
            return responses[index++];
          },
          onReminder: reminders.add,
          onClosed: closedMessages.add,
        );

        controller.syncState(
          conversationId: 'conv-other',
          isClosed: false,
          lastAiReplyTimestamp: baseTime,
        );
        controller.scheduleTimers();

        // Mốc 180s -> NOOP
        async.elapse(const Duration(seconds: 180));
        expect(reminders, isEmpty);
        expect(closedMessages, isEmpty);
        expect(controller.isClosed, isFalse);

        // Mốc 300s -> success: false
        async.elapse(const Duration(seconds: 120));
        expect(reminders, isEmpty);
        expect(closedMessages, isEmpty);
        expect(controller.isClosed, isFalse);

        controller.dispose();
      });
    });

    test('cancels timers when driver sends a message and reschedules after new AI reply', () {
      fakeAsync((async) {
        final baseTime = DateTime(2026, 11, 26, 10, 0, 0);
        final calls = <String>[];

        final controller = ChatTimeoutController(
          now: () => baseTime.add(async.elapsed),
          remindAfter: const Duration(seconds: 180),
          closeAfter: const Duration(seconds: 300),
          timeoutCheck: ({required conversationId, required action}) async {
            calls.add(action);
            return {'success': true, 'action': 'REMINDED'};
          },
        );

        controller.syncState(
          conversationId: 'conv-send',
          isClosed: false,
          lastAiReplyTimestamp: baseTime,
        );
        controller.scheduleTimers();
        expect(controller.hasReminderTimer, isTrue);
        expect(controller.hasCloseTimer, isTrue);

        // Tài xế gửi tin ở giây 100 -> hủy hết timer
        async.elapse(const Duration(seconds: 100));
        controller.cancelTimers();
        expect(controller.hasReminderTimer, isFalse);
        expect(controller.hasCloseTimer, isFalse);

        // Trôi qua 300s vẫn không kích hoạt timer cũ
        async.elapse(const Duration(seconds: 300));
        expect(calls, isEmpty);

        // AI trả lời ở giây 400 -> lên lịch lại từ mốc mới (thời điểm 400s)
        controller.syncState(
          conversationId: 'conv-send',
          isClosed: false,
          lastAiReplyTimestamp: baseTime.add(async.elapsed),
        );
        controller.scheduleTimers();

        async.elapse(const Duration(seconds: 179));
        expect(calls, isEmpty);
        async.elapse(const Duration(seconds: 1));
        expect(calls, ['REMINDER_3M']);

        controller.dispose();
      });
    });

    test('dispose cancels active timers and blocks callbacks from firing after dispose', () {
      fakeAsync((async) {
        final baseTime = DateTime(2026, 11, 26, 10, 0, 0);
        final pending = Completer<Map<String, dynamic>>();
        var apiCalls = 0;
        final reminders = <String>[];
        final closedMessages = <String>[];

        final controller = ChatTimeoutController(
          now: () => baseTime.add(async.elapsed),
          remindAfter: const Duration(seconds: 180),
          closeAfter: const Duration(seconds: 300),
          timeoutCheck: ({required conversationId, required action}) {
            apiCalls++;
            return pending.future;
          },
          onReminder: reminders.add,
          onClosed: closedMessages.add,
        );

        controller.syncState(
          conversationId: 'conv-dispose',
          isClosed: false,
          lastAiReplyTimestamp: baseTime,
        );
        controller.scheduleTimers();

        // Chưa hết 3p mà dispose -> timer bị hủy
        async.elapse(const Duration(seconds: 50));
        controller.dispose();
        expect(controller.isDisposed, isTrue);
        expect(controller.hasReminderTimer, isFalse);
        expect(controller.hasCloseTimer, isFalse);

        async.elapse(const Duration(seconds: 400));
        expect(apiCalls, 0);
        expect(reminders, isEmpty);
        expect(closedMessages, isEmpty);

        // Trường hợp dispose khi request đang await dở
        final controllerInFlight = ChatTimeoutController(
          now: () => baseTime.add(async.elapsed),
          remindAfter: const Duration(seconds: 180),
          closeAfter: const Duration(seconds: 300),
          timeoutCheck: ({required conversationId, required action}) {
            apiCalls++;
            return pending.future;
          },
          onReminder: reminders.add,
          onClosed: closedMessages.add,
        );
        controllerInFlight.syncState(
          conversationId: 'conv-dispose-2',
          isClosed: false,
          lastAiReplyTimestamp: baseTime.add(async.elapsed),
        );
        controllerInFlight.scheduleTimers();

        async.elapse(const Duration(seconds: 180));
        expect(apiCalls, 1);

        controllerInFlight.dispose();
        pending.complete({
          'success': true,
          'action': 'REMINDED',
          'message': {'text': 'Late reminder'},
        });
        async.flushMicrotasks();

        expect(reminders, isEmpty);
        expect(closedMessages, isEmpty);
        expect(controllerInFlight.isClosed, isFalse);
      });
    });
  });
}
