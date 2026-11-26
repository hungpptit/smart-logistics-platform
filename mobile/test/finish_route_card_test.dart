import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:velocity_mobile/screens/driver/widgets/finish_route_card.dart';
import 'package:velocity_mobile/screens/driver/widgets/route_handover_qr_dialog.dart';

void main() {
  group('FinishRouteCard Delivery vs Pickup Handover separation', () {
    testWidgets('DELIVERY mode keeps CHỐT HOÀN THÀNH CHUYẾN ĐI and triggers onFinish',
        (tester) async {
      bool finishedCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FinishRouteCard(
              isDutyLoading: false,
              isFinished: false,
              isPickupHandover: false,
              onFinish: () => finishedCalled = true,
            ),
          ),
        ),
      );

      expect(find.text('CHỐT HOÀN THÀNH CHUYẾN ĐI'), findsOneWidget);
      expect(find.text('CHỜ KHO KIỂM ĐẾM BÀN GIAO'), findsNothing);

      await tester.tap(find.text('CHỐT HOÀN THÀNH CHUYẾN ĐI'));
      expect(finishedCalled, isTrue);
    });

    testWidgets(
        'PICKUP waiting handover hides complete button, renders text-only pending orders, and opens single route QR dialog',
        (tester) async {
      bool refreshCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => FinishRouteCard(
                isDutyLoading: false,
                isFinished: false,
                isPickupHandover: true,
                handedOverCount: 1,
                requiredHandoverCount: 2,
                pendingOrderCodes: const ['ORD-PICK-002'],
                onFinish: () {},
                onRefreshStatus: () => refreshCalled = true,
                onShowRouteQr: () => RouteHandoverQrDialog.show(
                  context,
                  routeCode: 'RT-PICK-999',
                  handedOverCount: 1,
                  requiredHandoverCount: 2,
                  pendingOrderCodes: const ['ORD-PICK-002'],
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.text('CHỜ KHO KIỂM ĐẾM BÀN GIAO'), findsOneWidget);
      expect(find.text('1 / 2 kiện đã nhập kho'), findsOneWidget);
      expect(find.text('ORD-PICK-002'), findsOneWidget);
      expect(find.text('CHỐT HOÀN THÀNH CHUYẾN ĐI'), findsNothing);
      // Không render QR cho từng kiện hàng trực tiếp trên thẻ của app Shipper
      expect(find.byType(QrImageView), findsNothing);

      await tester.tap(find.text('Cập nhật'));
      expect(refreshCalled, isTrue);

      await tester.tap(find.text('HIỆN MÃ QR CHUYẾN'));
      await tester.pumpAndSettle();

      // Dialog mở lên chỉ chứa duy nhất 1 mã QR của chuyến (RT-PICK-999)
      expect(find.text('MÃ QR BÀN GIAO VỀ KHO'), findsOneWidget);
      expect(find.text('RT-PICK-999'), findsOneWidget);
      expect(find.byType(QrImageView), findsOneWidget);
    });

    testWidgets('PICKUP when all N/N handed over falls back to complete button',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FinishRouteCard(
              isDutyLoading: false,
              isFinished: false,
              isPickupHandover: true,
              handedOverCount: 2,
              requiredHandoverCount: 2,
              pendingOrderCodes: const [],
              onFinish: () {},
            ),
          ),
        ),
      );

      expect(find.text('CHỐT HOÀN THÀNH CHUYẾN ĐI'), findsOneWidget);
      expect(find.text('CHỜ KHO KIỂM ĐẾM BÀN GIAO'), findsNothing);
    });
  });
}
