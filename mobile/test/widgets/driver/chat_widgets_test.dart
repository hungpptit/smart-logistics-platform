import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:velocity_mobile/models/chat_message.dart';
import 'package:velocity_mobile/screens/driver/widgets/chat/ai_message_bubble.dart';
import 'package:velocity_mobile/screens/driver/widgets/chat/attached_image_bar.dart';
import 'package:velocity_mobile/screens/driver/widgets/chat/chat_app_bar_title.dart';
import 'package:velocity_mobile/screens/driver/widgets/chat/chat_input_bar.dart';
import 'package:velocity_mobile/screens/driver/widgets/chat/quick_chips_bar.dart';
import 'package:velocity_mobile/screens/driver/widgets/chat/typing_indicator.dart';
import 'package:velocity_mobile/screens/driver/widgets/chat/user_message_bubble.dart';

const List<int> _kTransparentPng = <int>[
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
  0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
  0x42, 0x60, 0x82,
];

Widget _wrapWithScaffold(Widget child) {
  return MaterialApp(
    home: Scaffold(body: child),
  );
}

void main() {
  group('UserMessageBubble', () {
    testWidgets('status sent: hides failure text/retry, shows time and markdown text', (tester) async {
      int retryCount = 0;
      final msg = ChatMessage(
        id: 'u1',
        text: 'Tôi đã tới điểm giao',
        isUser: true,
        time: '10:30',
        status: MessageStatus.sent,
      );

      await tester.pumpWidget(
        _wrapWithScaffold(
          UserMessageBubble(msg: msg, onRetry: () => retryCount++),
        ),
      );

      expect(find.text('10:30'), findsOneWidget);
      expect(find.byType(MarkdownBody), findsOneWidget);
      expect(find.textContaining('Tôi đã tới điểm giao', findRichText: true), findsOneWidget);
      expect(find.text('Gửi thất bại'), findsNothing);
      expect(find.text('Thử lại'), findsNothing);
      expect(retryCount, 0);
    });

    testWidgets('status failed: shows failure label and retry calls onRetry once', (tester) async {
      int retryCount = 0;
      final msg = ChatMessage(
        id: 'u2',
        text: 'Tin nhắn lỗi mạng',
        isUser: true,
        time: '10:31',
        status: MessageStatus.failed,
      );

      await tester.pumpWidget(
        _wrapWithScaffold(
          UserMessageBubble(msg: msg, onRetry: () => retryCount++),
        ),
      );

      expect(find.text('10:31'), findsOneWidget);
      expect(find.text('Gửi thất bại'), findsOneWidget);
      expect(find.text('Thử lại'), findsOneWidget);

      await tester.tap(find.text('Thử lại'));
      await tester.pump();
      expect(retryCount, 1);
    });

    testWidgets('empty msg.text: omits MarkdownBody and still shows msg.time', (tester) async {
      final msg = ChatMessage(
        id: 'u3',
        text: '',
        isUser: true,
        time: '10:32',
        status: MessageStatus.sent,
      );

      await tester.pumpWidget(
        _wrapWithScaffold(
          UserMessageBubble(msg: msg, onRetry: () {}),
        ),
      );

      expect(find.byType(MarkdownBody), findsNothing);
      expect(find.text('10:32'), findsOneWidget);
    });
  });

  group('AiMessageBubble', () {
    testWidgets('renders markdown text and msg.time', (tester) async {
      final msg = ChatMessage(
        id: 'a1',
        text: 'Xin chào bác tài.\nBước 1: Kiểm tra thùng hàng.',
        isUser: false,
        time: '10:35',
      );

      await tester.pumpWidget(
        _wrapWithScaffold(AiMessageBubble(msg: msg)),
      );

      expect(find.byType(MarkdownBody), findsOneWidget);
      expect(find.textContaining('Xin chào bác tài.', findRichText: true), findsOneWidget);
      expect(find.textContaining('Bước 1: Kiểm tra thùng hàng.', findRichText: true), findsOneWidget);
      expect(find.text('10:35'), findsOneWidget);
      expect(find.byIcon(Icons.smart_toy_rounded), findsOneWidget);
    });

    testWidgets('renders STAFF_SUPPORT header and support_agent icon distinctly from AI', (tester) async {
      final msg = ChatMessage(
        id: 's1',
        text: 'Anh ghé cổng B lấy thêm thùng hàng nhé.',
        isUser: false,
        time: '11:02',
        toolName: 'STAFF_SUPPORT',
        senderName: 'Điều phối An',
      );

      await tester.pumpWidget(
        _wrapWithScaffold(AiMessageBubble(msg: msg)),
      );

      expect(find.text('Điều phối / Kho • Điều phối An'), findsOneWidget);
      expect(find.byIcon(Icons.support_agent_rounded), findsOneWidget);
      expect(find.byIcon(Icons.headset_mic_rounded), findsOneWidget);
      expect(find.byIcon(Icons.smart_toy_rounded), findsNothing);
      expect(find.text('11:02'), findsOneWidget);
    });
  });

  group('ChatInputBar', () {
    testWidgets('isBusy=false: TextField enabled and mic/camera/send invoke callbacks', (tester) async {
      final controller = TextEditingController();
      addTearDown(controller.dispose);
      int micCount = 0;
      int cameraCount = 0;
      int sendCount = 0;

      await tester.pumpWidget(
        _wrapWithScaffold(
          ChatInputBar(
            controller: controller,
            isListening: false,
            isBusy: false,
            onMic: () => micCount++,
            onCamera: () => cameraCount++,
            onSend: () => sendCount++,
          ),
        ),
      );

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.enabled, isTrue);
      expect(find.text('Nói hoặc nhập câu hỏi...'), findsOneWidget);

      final micBtn = tester.widget<IconButton>(
        find.widgetWithIcon(IconButton, Icons.mic_none_rounded),
      );
      final camBtn = tester.widget<IconButton>(
        find.widgetWithIcon(IconButton, Icons.camera_alt_outlined),
      );
      expect(micBtn.onPressed, isNotNull);
      expect(camBtn.onPressed, isNotNull);

      await tester.tap(find.byIcon(Icons.mic_none_rounded));
      await tester.tap(find.byIcon(Icons.camera_alt_outlined));
      await tester.tap(find.byIcon(Icons.send_rounded));
      await tester.pump();

      expect(micCount, 1);
      expect(cameraCount, 1);
      expect(sendCount, 1);
    });

    testWidgets('isBusy=true: TextField disabled and buttons have null callbacks', (tester) async {
      final controller = TextEditingController();
      addTearDown(controller.dispose);
      int micCount = 0;
      int cameraCount = 0;
      int sendCount = 0;

      await tester.pumpWidget(
        _wrapWithScaffold(
          ChatInputBar(
            controller: controller,
            isListening: false,
            isBusy: true,
            onMic: () => micCount++,
            onCamera: () => cameraCount++,
            onSend: () => sendCount++,
          ),
        ),
      );

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.enabled, isFalse);

      final micBtn = tester.widget<IconButton>(
        find.widgetWithIcon(IconButton, Icons.mic_none_rounded),
      );
      final camBtn = tester.widget<IconButton>(
        find.widgetWithIcon(IconButton, Icons.camera_alt_outlined),
      );
      final sendInkWell = tester.widget<InkWell>(
        find.ancestor(of: find.byIcon(Icons.send_rounded), matching: find.byType(InkWell)),
      );
      expect(micBtn.onPressed, isNull);
      expect(camBtn.onPressed, isNull);
      expect(sendInkWell.onTap, isNull);

      await tester.tap(find.byIcon(Icons.mic_none_rounded));
      await tester.tap(find.byIcon(Icons.camera_alt_outlined));
      await tester.tap(find.byIcon(Icons.send_rounded));
      await tester.pump();

      expect(micCount, 0);
      expect(cameraCount, 0);
      expect(sendCount, 0);
    });

    testWidgets('isListening=true: shows listening hint text', (tester) async {
      final controller = TextEditingController();
      addTearDown(controller.dispose);

      await tester.pumpWidget(
        _wrapWithScaffold(
          ChatInputBar(
            controller: controller,
            isListening: true,
            isBusy: false,
            onMic: () {},
            onCamera: () {},
            onSend: () {},
          ),
        ),
      );

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.decoration?.hintText, 'Đang lắng nghe bác tài...');
      expect(find.text('Đang lắng nghe bác tài...'), findsOneWidget);
    });
  });

  group('QuickChipsBar', () {
    testWidgets('renders all chips and tapping calls onChipTap with chip string', (tester) async {
      final tapped = <String>[];
      const chips = ['Tối ưu lộ trình', 'Báo kẹt xe', 'Liên hệ điều phối'];

      await tester.pumpWidget(
        _wrapWithScaffold(
          QuickChipsBar(
            chips: chips,
            onChipTap: tapped.add,
          ),
        ),
      );

      for (final label in chips) {
        expect(find.text(label), findsOneWidget);
      }

      await tester.tap(find.text('Báo kẹt xe'));
      await tester.pump();

      expect(tapped, ['Báo kẹt xe']);
    });

    testWidgets('isDisabled=true: tapping chip does not invoke onChipTap', (tester) async {
      final tapped = <String>[];
      const chips = ['Tối ưu lộ trình', 'Báo kẹt xe'];

      await tester.pumpWidget(
        _wrapWithScaffold(
          QuickChipsBar(
            chips: chips,
            onChipTap: tapped.add,
            isDisabled: true,
          ),
        ),
      );

      await tester.tap(find.text('Tối ưu lộ trình'));
      await tester.pump();

      expect(tapped, isEmpty);
    });
  });

  group('ChatAppBarTitle', () {
    testWidgets('shows 3 status labels for ready / typing / closed', (tester) async {
      await tester.pumpWidget(
        _wrapWithScaffold(const ChatAppBarTitle(isClosed: false, isAITyping: false)),
      );
      expect(find.text('Trợ lý Điều phối AI'), findsOneWidget);
      expect(find.text('Sẵn sàng hỗ trợ'), findsOneWidget);

      await tester.pumpWidget(
        _wrapWithScaffold(const ChatAppBarTitle(isClosed: false, isAITyping: true)),
      );
      expect(find.text('Đang trả lời...'), findsOneWidget);

      await tester.pumpWidget(
        _wrapWithScaffold(const ChatAppBarTitle(isClosed: true, isAITyping: false)),
      );
      expect(find.text('Phiên đã đóng'), findsOneWidget);
    });
  });

  group('TypingIndicator & AttachedImageBar', () {
    testWidgets('TypingIndicator displays processing text', (tester) async {
      await tester.pumpWidget(_wrapWithScaffold(const TypingIndicator()));

      expect(find.text('Trợ lý AI đang xử lý...'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('AttachedImageBar renders text and close button calls onClear', (tester) async {
      final tempDir = Directory.systemTemp.createTempSync('attached_image_test_');
      final tempFile = File('${tempDir.path}/sample.png')..writeAsBytesSync(_kTransparentPng);
      addTearDown(() {
        if (tempDir.existsSync()) {
          tempDir.deleteSync(recursive: true);
        }
      });

      int clearCount = 0;
      await tester.pumpWidget(
        _wrapWithScaffold(
          AttachedImageBar(
            imageFile: tempFile,
            onClear: () => clearCount++,
          ),
        ),
      );

      expect(find.text('Đã đính kèm ảnh sự cố'), findsOneWidget);
      expect(find.byType(Image), findsOneWidget);

      await tester.tap(find.byIcon(Icons.close));
      await tester.pump();
      expect(clearCount, 1);
    });
  });
}
