import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:velocity_mobile/screens/driver/widgets/dashboard/ai_assistant_fab.dart';
import 'package:velocity_mobile/screens/driver/widgets/dashboard/delivery_scan_banner.dart';
import 'package:velocity_mobile/screens/driver/widgets/dashboard/driver_drawer.dart';
import 'package:velocity_mobile/screens/driver/widgets/dashboard/empty_routes_placeholder.dart';
import 'package:velocity_mobile/screens/driver/widgets/dashboard/finish_route_success_dialog.dart';
import 'package:velocity_mobile/screens/driver/widgets/dashboard/pickup_assignment_banner.dart';
import 'package:velocity_mobile/screens/driver/widgets/dashboard/route_scan_reminder_dialog.dart';
import 'package:velocity_mobile/screens/driver/widgets/dashboard/tote_scan_button.dart';

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

class _FakeHttpHeaders implements HttpHeaders {
  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _FakeHttpClientResponse extends Stream<List<int>> implements HttpClientResponse {
  @override
  int get statusCode => HttpStatus.ok;

  @override
  int get contentLength => _kTransparentPng.length;

  @override
  HttpClientResponseCompressionState get compressionState =>
      HttpClientResponseCompressionState.notCompressed;

  @override
  StreamSubscription<List<int>> listen(
    void Function(List<int> event)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) {
    return Stream<List<int>>.value(_kTransparentPng).listen(
      onData,
      onError: onError,
      onDone: onDone,
      cancelOnError: cancelOnError,
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _FakeHttpClientRequest implements HttpClientRequest {
  final _FakeHttpHeaders _headers = _FakeHttpHeaders();

  @override
  HttpHeaders get headers => _headers;

  @override
  Future<HttpClientResponse> close() async => _FakeHttpClientResponse();

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _FakePngHttpClient implements HttpClient {
  @override
  bool autoUncompress = true;

  @override
  Future<HttpClientRequest> getUrl(Uri url) async => _FakeHttpClientRequest();

  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) async =>
      _FakeHttpClientRequest();

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _FakePngHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) => _FakePngHttpClient();
}

Widget _wrapWithScaffold(Widget child) {
  return MaterialApp(
    home: Scaffold(body: child),
  );
}

void main() {
  group('EmptyRoutesPlaceholder', () {
    testWidgets('renders title and description text', (tester) async {
      await tester.pumpWidget(_wrapWithScaffold(const EmptyRoutesPlaceholder()));

      expect(find.text('Chưa Có Chuyến Xe Nào'), findsOneWidget);
      expect(
        find.text(
          'Hiện tại bạn chưa có chuyến xe nào được điều phối. Hãy duy trì trạng thái Trực tuyến để sẵn sàng nhận chuyến mới từ Bưu cục!',
        ),
        findsOneWidget,
      );
    });
  });

  group('PickupAssignmentBanner', () {
    testWidgets('renders routeCode, stopCount, and invokes onReject / onView', (tester) async {
      int rejectCount = 0;
      int viewCount = 0;

      await tester.pumpWidget(
        _wrapWithScaffold(
          PickupAssignmentBanner(
            routeCode: 'RT-PK-009',
            stopCount: 5,
            onReject: () => rejectCount++,
            onView: () => viewCount++,
          ),
        ),
      );

      expect(find.text('Bưu cục điều phối Lộ Trình Gom Hàng [RT-PK-009]'), findsOneWidget);
      expect(find.textContaining('Có 5 điểm lấy hàng'), findsOneWidget);

      await tester.tap(find.text('TỪ CHỐI'));
      await tester.pump();
      expect(rejectCount, 1);
      expect(viewCount, 0);

      await tester.tap(find.text('XEM & NHẬN LỘ TRÌNH'));
      await tester.pump();
      expect(rejectCount, 1);
      expect(viewCount, 1);
    });
  });

  group('DeliveryScanBanner', () {
    testWidgets('renders routeCode and scan button triggers onScan', (tester) async {
      int scanCount = 0;

      await tester.pumpWidget(
        _wrapWithScaffold(
          DeliveryScanBanner(
            routeCode: 'RT-DL-012',
            onScan: () => scanCount++,
          ),
        ),
      );

      expect(find.text('Bưu cục đã phân công Chuyến Xe [RT-DL-012]'), findsOneWidget);

      await tester.tap(find.text('QUÉT NHẬN CHUYẾN XE NGAY'));
      await tester.pump();
      expect(scanCount, 1);
    });
  });

  group('ToteScanButton & AiAssistantFab', () {
    testWidgets('ToteScanButton invokes onPressed when tapped', (tester) async {
      int tapCount = 0;

      await tester.pumpWidget(
        _wrapWithScaffold(ToteScanButton(onPressed: () => tapCount++)),
      );

      expect(find.text('Quét Nhận Thùng Hàng Lên Xe Tải'), findsOneWidget);

      await tester.tap(find.text('Quét Nhận Thùng Hàng Lên Xe Tải'));
      await tester.pump();
      expect(tapCount, 1);
    });

    testWidgets('AiAssistantFab has tooltip and invokes onPressed without badge when unreadCount == 0', (tester) async {
      int tapCount = 0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            floatingActionButton: AiAssistantFab(onPressed: () => tapCount++),
          ),
        ),
      );

      final fabFinder = find.byTooltip('Trợ lý Tài xế AI');
      expect(fabFinder, findsOneWidget);
      expect(find.byType(Badge), findsNothing);
      expect(find.byIcon(Icons.smart_toy_rounded), findsOneWidget);

      await tester.tap(fabFinder);
      await tester.pump();
      expect(tapCount, 1);
    });

    testWidgets('AiAssistantFab displays Material Badge with exact count and 99+ cap', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            floatingActionButton: AiAssistantFab(unreadCount: 3, onPressed: () {}),
          ),
        ),
      );

      expect(find.byType(Badge), findsOneWidget);
      expect(find.text('3'), findsOneWidget);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            floatingActionButton: AiAssistantFab(unreadCount: 120, onPressed: () {}),
          ),
        ),
      );

      expect(find.byType(Badge), findsOneWidget);
      expect(find.text('99+'), findsOneWidget);
    });
  });

  group('DriverDrawer', () {
    testWidgets('renders name/email and calls onOpenChat / onLogout without HTTP errors', (tester) async {
      // DriverDrawer uses a non-scrollable Column + Spacer which overflows by 21px at 600px test height.
      tester.view.physicalSize = const Size(800, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      int openChatCount = 0;
      int logoutCount = 0;

      await HttpOverrides.runWithHttpOverrides(() async {
        await tester.pumpWidget(
          _wrapWithScaffold(
            DriverDrawer(
              name: 'Nguyễn Văn Tài',
              email: 'tai@velocity.vn',
              onOpenChat: () => openChatCount++,
              onLogout: () => logoutCount++,
            ),
          ),
        );
        await tester.pump();

        expect(find.text('Nguyễn Văn Tài'), findsOneWidget);
        expect(find.text('tai@velocity.vn'), findsOneWidget);

        await tester.tap(find.text('Trợ lý Tài xế AI'));
        await tester.pump();
        expect(openChatCount, 1);
        expect(logoutCount, 0);

        await tester.tap(find.text('Đăng xuất'));
        await tester.pump();
        expect(openChatCount, 1);
        expect(logoutCount, 1);
      }, _FakePngHttpOverrides());
    });
  });

  group('RouteScanReminderDialog', () {
    testWidgets('show() opens dialog and QUÉT NHẬN NGAY closes it and calls onScanNow', (tester) async {
      int scanNowCount = 0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => RouteScanReminderDialog.show(
                  context,
                  onScanNow: () => scanNowCount++,
                ),
                child: const Text('OPEN_REMINDER'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('OPEN_REMINDER'));
      await tester.pumpAndSettle();

      expect(find.byType(RouteScanReminderDialog), findsOneWidget);
      expect(find.text('Chưa Quét Nhận Chuyến Xe'), findsOneWidget);

      await tester.tap(find.text('QUÉT NHẬN NGAY'));
      await tester.pumpAndSettle();

      expect(find.byType(RouteScanReminderDialog), findsNothing);
      expect(scanNowCount, 1);
    });
  });

  group('FinishRouteSuccessDialog', () {
    testWidgets('success=true shows full completion message, closes and calls onConfirm', (tester) async {
      int confirmCount = 0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => FinishRouteSuccessDialog.show(
                  context,
                  success: true,
                  onConfirm: () => confirmCount++,
                ),
                child: const Text('OPEN_FINISH_TRUE'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('OPEN_FINISH_TRUE'));
      await tester.pumpAndSettle();

      expect(find.byType(FinishRouteSuccessDialog), findsOneWidget);
      expect(
        find.text(
          'Bạn đã chốt hoàn thành 100% chuyến đi trên hệ thống! Tài xế chuyển sang Sẵn sàng nhận chuyến tiếp theo.',
        ),
        findsOneWidget,
      );

      await tester.tap(find.text('Đồng ý'));
      await tester.pumpAndSettle();

      expect(find.byType(FinishRouteSuccessDialog), findsNothing);
      expect(confirmCount, 1);
    });

    testWidgets('success=false shows fallback submission message, closes and calls onConfirm', (tester) async {
      int confirmCount = 0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => FinishRouteSuccessDialog.show(
                  context,
                  success: false,
                  onConfirm: () => confirmCount++,
                ),
                child: const Text('OPEN_FINISH_FALSE'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('OPEN_FINISH_FALSE'));
      await tester.pumpAndSettle();

      expect(find.byType(FinishRouteSuccessDialog), findsOneWidget);
      expect(
        find.text('Đã gửi yêu cầu chốt chuyến đi thành công đến máy chủ.'),
        findsOneWidget,
      );

      await tester.tap(find.text('Đồng ý'));
      await tester.pumpAndSettle();

      expect(find.byType(FinishRouteSuccessDialog), findsNothing);
      expect(confirmCount, 1);
    });
  });
}
