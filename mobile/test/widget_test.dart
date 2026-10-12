import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:velocity_mobile/main.dart';

class _FakeHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) => _FakeHttpClient();
}

class _FakeHttpClient implements HttpClient {
  @override
  dynamic noSuchMethod(Invocation invocation) {
    // Return empty / no-op for any network request in tests
    return null;
  }
}

void main() {
  testWidgets('App initializes smoke test', (WidgetTester tester) async {
    HttpOverrides.runWithHttpOverrides(() async {
      await tester.pumpWidget(const MyApp());
      expect(find.byType(MyApp), findsOneWidget);
    }, _FakeHttpOverrides());
  });
}
