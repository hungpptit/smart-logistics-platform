import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:velocity_mobile/screens/driver/mappers/driver_route_mapper.dart';

Map<String, dynamic> _loadFixture(String filename) {
  final direct = File('test/fixtures/$filename');
  final fromRepoRoot = File('mobile/test/fixtures/$filename');
  final file = direct.existsSync() ? direct : fromRepoRoot;
  return jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
}

void main() {
  group('Contract: captured real DELIVERY JSON vs mapRouteToStops', () {
    test('RT-23285603 (IN_PROGRESS): list & detail endpoints map identically', () {
      final listBody =
          _loadFixture('real_delivery_in_progress_list_captured.json');
      final detailBody =
          _loadFixture('real_delivery_in_progress_detail_captured.json');

      final listRoute = (listBody['data'] as List).first as Map<String, dynamic>;
      final detailRoute = detailBody['data'] as Map<String, dynamic>;

      final listResult = mapRouteToStops(
        firstRoute: listRoute,
        stopsRaw: listRoute['stops'] as List,
        isLinehaulDriverProfile: false,
        isRouteStarted: listRoute['status'] == 'IN_PROGRESS',
        prevLoadedTotesCount: 0,
      );
      final detailResult = mapRouteToStops(
        firstRoute: detailRoute,
        stopsRaw: detailRoute['stops'] as List,
        isLinehaulDriverProfile: false,
        isRouteStarted: detailRoute['status'] == 'IN_PROGRESS',
        prevLoadedTotesCount: 0,
      );

      expect(listResult.isLinehaul, false);
      expect(listResult.loadedTotesCount, 0);
      expect(listResult.totalPkgCount, 0);
      expect(listResult.mappedStops.length, 13);

      // Stop 1 (ORD-TD-012): IN_PROGRESS route -> ĐANG THỰC HIỆN, active
      expect(listResult.mappedStops[0]['orderCode'], 'ORD-TD-012');
      expect(listResult.mappedStops[0]['status'], 'ĐANG THỰC HIỆN');
      expect(listResult.mappedStops[0]['isActive'], true);
      expect(listResult.mappedStops[0]['totalToCollect'], 0);
      expect(listResult.mappedStops[0]['packages'], 1);

      // Stop 2 (ORD-TD-030): non-COD -> TIẾP THEO, inactive
      expect(listResult.mappedStops[1]['orderCode'], 'ORD-TD-030');
      expect(listResult.mappedStops[1]['status'], 'TIẾP THEO');
      expect(listResult.mappedStops[1]['isActive'], false);
      expect(listResult.mappedStops[1]['totalToCollect'], 0);
      expect(listResult.mappedStops[1]['packages'], 1);

      // Stop 3 (ORD-TD-013): COD "180000" -> totalToCollect 180000
      expect(listResult.mappedStops[2]['orderCode'], 'ORD-TD-013');
      expect(listResult.mappedStops[2]['status'], 'TIẾP THEO');
      expect(listResult.mappedStops[2]['isActive'], false);
      expect(listResult.mappedStops[2]['totalToCollect'], 180000);
      expect(listResult.mappedStops[2]['packages'], 1);

      // Stop 13 (ORD-TD-035): last stop
      expect(listResult.mappedStops[12]['orderCode'], 'ORD-TD-035');
      expect(listResult.mappedStops[12]['status'], 'TIẾP THEO');
      expect(listResult.mappedStops[12]['isActive'], false);
      expect(listResult.mappedStops[12]['totalToCollect'], 0);
      expect(listResult.mappedStops[12]['packages'], 1);

      // Detail endpoint preserves identical mapped contract
      expect(detailResult.isLinehaul, listResult.isLinehaul);
      expect(detailResult.mappedStops.length, listResult.mappedStops.length);
      for (int i = 0; i < listResult.mappedStops.length; i++) {
        expect(
          detailResult.mappedStops[i]['status'],
          listResult.mappedStops[i]['status'],
        );
        expect(
          detailResult.mappedStops[i]['isActive'],
          listResult.mappedStops[i]['isActive'],
        );
        expect(
          detailResult.mappedStops[i]['totalToCollect'],
          listResult.mappedStops[i]['totalToCollect'],
        );
        expect(
          detailResult.mappedStops[i]['packages'],
          listResult.mappedStops[i]['packages'],
        );
      }
    });

    test('RT-28317284 (PLANNED): all 16 stops stay CHỜ QUÉT NHẬN and inactive',
        () {
      final listBody = _loadFixture('real_delivery_planned_list_captured.json');
      final detailBody =
          _loadFixture('real_delivery_planned_detail_captured.json');

      final listRoute = (listBody['data'] as List).first as Map<String, dynamic>;
      final detailRoute = detailBody['data'] as Map<String, dynamic>;

      final result = mapRouteToStops(
        firstRoute: listRoute,
        stopsRaw: listRoute['stops'] as List,
        isLinehaulDriverProfile: false,
        isRouteStarted: listRoute['status'] == 'IN_PROGRESS',
        prevLoadedTotesCount: 0,
      );
      final detailResult = mapRouteToStops(
        firstRoute: detailRoute,
        stopsRaw: detailRoute['stops'] as List,
        isLinehaulDriverProfile: false,
        isRouteStarted: detailRoute['status'] == 'IN_PROGRESS',
        prevLoadedTotesCount: 0,
      );

      expect(result.isLinehaul, false);
      expect(result.mappedStops.length, 16);

      // Stop 1 (ORD-TD-022): COD "180000"
      expect(result.mappedStops[0]['orderCode'], 'ORD-TD-022');
      expect(result.mappedStops[0]['status'], 'CHỜ QUÉT NHẬN');
      expect(result.mappedStops[0]['isActive'], false);
      expect(result.mappedStops[0]['totalToCollect'], 180000);
      expect(result.mappedStops[0]['packages'], 1);

      // Stop 2 (ORD-TD-021): non-COD
      expect(result.mappedStops[1]['orderCode'], 'ORD-TD-021');
      expect(result.mappedStops[1]['status'], 'CHỜ QUÉT NHẬN');
      expect(result.mappedStops[1]['isActive'], false);
      expect(result.mappedStops[1]['totalToCollect'], 0);
      expect(result.mappedStops[1]['packages'], 1);

      // Stop 16 (ORD-TD-039)
      expect(result.mappedStops[15]['orderCode'], 'ORD-TD-039');
      expect(result.mappedStops[15]['status'], 'CHỜ QUÉT NHẬN');
      expect(result.mappedStops[15]['isActive'], false);
      expect(result.mappedStops[15]['totalToCollect'], 0);
      expect(result.mappedStops[15]['packages'], 1);

      expect(detailResult.mappedStops.length, result.mappedStops.length);
      expect(detailResult.mappedStops[0]['status'], 'CHỜ QUÉT NHẬN');
    });
  });

  group('Contract: derived PICKUP & Linehaul JSON vs mapRouteToStops', () {
    test('derived_pickup_route (derived, not captured): 3 PICKUP stops', () {
      final fixture = _loadFixture('derived_pickup_route.json');
      expect(fixture['_fixtureSource'], 'derived, not captured');

      final route = fixture['data'] as Map<String, dynamic>;
      final result = mapRouteToStops(
        firstRoute: route,
        stopsRaw: route['stops'] as List,
        isLinehaulDriverProfile: false,
        isRouteStarted: route['status'] == 'IN_PROGRESS',
        prevLoadedTotesCount: 0,
      );

      expect(result.isLinehaul, false);
      expect(result.totalPkgCount, 1);
      expect(result.mappedStops.length, 3);

      // Stop 1: COMPLETED + PICKED_UP + feePayer SENDER -> collects shipping 18000
      expect(result.mappedStops[0]['orderCode'], 'ORD-PU-DRV-001');
      expect(result.mappedStops[0]['status'], 'ĐÃ LẤY HÀNG');
      expect(result.mappedStops[0]['isActive'], false);
      expect(result.mappedStops[0]['totalToCollect'], 18000);
      expect(result.mappedStops[0]['packages'], 1);

      // Stop 2: first incomplete + feePayer RECEIVER -> collects 0 at pickup
      expect(result.mappedStops[1]['orderCode'], 'ORD-PU-DRV-002');
      expect(result.mappedStops[1]['status'], 'ĐANG THỰC HIỆN');
      expect(result.mappedStops[1]['isActive'], true);
      expect(result.mappedStops[1]['totalToCollect'], 0);
      expect(result.mappedStops[1]['packages'], 1);

      // Stop 3: next incomplete + payment null -> defaults SENDER -> 32000
      expect(result.mappedStops[2]['orderCode'], 'ORD-PU-DRV-003');
      expect(result.mappedStops[2]['status'], 'TIẾP THEO');
      expect(result.mappedStops[2]['isActive'], false);
      expect(result.mappedStops[2]['totalToCollect'], 32000);
      expect(result.mappedStops[2]['packages'], 1);
    });

    test('derived_linehaul_route (derived, not captured): 2 stops + totes', () {
      final fixture = _loadFixture('derived_linehaul_route.json');
      expect(fixture['_fixtureSource'], 'derived, not captured');

      final route = fixture['data'] as Map<String, dynamic>;
      final result = mapRouteToStops(
        firstRoute: route,
        stopsRaw: route['stops'] as List,
        isLinehaulDriverProfile: true,
        isRouteStarted: route['status'] == 'IN_PROGRESS',
        prevLoadedTotesCount: 0,
      );

      expect(result.isLinehaul, true);
      expect(result.loadedTotesCount, 1);
      expect(result.loadedToteCodes, ['TOTE-FAC_TD_TANGNHONPHU-ZONE-W-001']);
      expect(result.totalPkgCount, 2);
      expect(result.mappedStops.length, 2);

      // Stop 1 (PICKUP hub): CHỜ BỐC HÀNG, active, totalToCollect=22000 from first pkg order
      expect(result.mappedStops[0]['orderCode'], 'ORD-LH-DRV-001');
      expect(result.mappedStops[0]['status'], 'CHỜ BỐC HÀNG');
      expect(result.mappedStops[0]['isActive'], true);
      expect(result.mappedStops[0]['totalToCollect'], 22000);
      expect(result.mappedStops[0]['packages'], 2);

      // Stop 2 (DELIVERY dest hub): CHỜ THỰC HIỆN, inactive, totalToCollect=0
      expect(result.mappedStops[1]['orderCode'], 'ORD-LH-DRV-001');
      expect(result.mappedStops[1]['status'], 'CHỜ THỰC HIỆN');
      expect(result.mappedStops[1]['isActive'], false);
      expect(result.mappedStops[1]['totalToCollect'], 0);
      expect(result.mappedStops[1]['packages'], 2);
    });
  });

  group('Contract edge cases observed in real backend responses', () {
    test('order.payment == null in captured DELIVERY data (records current totalToCollect)', () {
      final detailBody =
          _loadFixture('real_delivery_in_progress_detail_captured.json');
      final route = detailBody['data'] as Map<String, dynamic>;
      final stopsRaw = route['stops'] as List;

      // Verify fixture really has payment == null on both non-COD and COD stops
      final nonCodOrder =
          (stopsRaw[0] as Map<String, dynamic>)['order'] as Map<String, dynamic>;
      final codOrder =
          (stopsRaw[2] as Map<String, dynamic>)['order'] as Map<String, dynamic>;
      expect(nonCodOrder['payment'], isNull);
      expect(nonCodOrder['estimatedCodAmount'], '0');
      expect(nonCodOrder['estimatedShippingFee'], '25000');
      expect(codOrder['payment'], isNull);
      expect(codOrder['estimatedCodAmount'], '180000');
      expect(codOrder['estimatedShippingFee'], '25000');

      final result = mapRouteToStops(
        firstRoute: route,
        stopsRaw: stopsRaw,
        isLinehaulDriverProfile: false,
        isRouteStarted: true,
        prevLoadedTotesCount: 0,
      );

      // HÀNH VI HIỆN TẠI CẦN XÁC NHẬN NGHIỆP VỤ:
      // Khi order.payment == null (thực tế tất cả đơn trong RT-23285603 và RT-28317284),
      // Order không có trường feePayer riêng nên _resolveStopMoney mặc định feePayer = 'SENDER'.
      // Vì vậy ở stop DELIVERY, estimatedShippingFee ("25000") KHÔNG được cộng vào totalToCollect:
      // - Đơn không COD (ORD-TD-012) -> totalToCollect = 0 (không phải 25000)
      // - Đơn có COD (ORD-TD-013) -> totalToCollect = 180000 (chỉ COD, không cộng 25000)
      expect(result.mappedStops[0]['feePayer'], 'SENDER');
      expect(result.mappedStops[0]['shippingFee'], 25000);
      expect(result.mappedStops[0]['totalToCollect'], 0);

      expect(result.mappedStops[2]['feePayer'], 'SENDER');
      expect(result.mappedStops[2]['shippingFee'], 25000);
      expect(result.mappedStops[2]['totalToCollect'], 180000);
    });

    test('firstRoute omits top-level "shipments" key without throwing', () {
      final realRoute =
          ((_loadFixture('real_delivery_in_progress_list_captured.json')['data'])
                  as List)
              .first as Map<String, dynamic>;
      final pickupRoute =
          _loadFixture('derived_pickup_route.json')['data'] as Map<String, dynamic>;
      final linehaulRoute =
          _loadFixture('derived_linehaul_route.json')['data']
              as Map<String, dynamic>;

      expect(realRoute.containsKey('shipments'), false);
      expect(pickupRoute.containsKey('shipments'), false);
      expect(linehaulRoute.containsKey('shipments'), false);

      expect(
        () => mapRouteToStops(
          firstRoute: realRoute,
          stopsRaw: realRoute['stops'] as List,
          isLinehaulDriverProfile: false,
          isRouteStarted: true,
          prevLoadedTotesCount: 0,
        ),
        returnsNormally,
      );
      expect(
        () => mapRouteToStops(
          firstRoute: pickupRoute,
          stopsRaw: pickupRoute['stops'] as List,
          isLinehaulDriverProfile: false,
          isRouteStarted: true,
          prevLoadedTotesCount: 0,
        ),
        returnsNormally,
      );

      // Even without top-level route['shipments'] and with profile flag false,
      // fallback extraction from stopsRaw[].shipment still detects Linehaul & totes.
      late DriverRouteMapResult lhFallback;
      expect(
        () {
          lhFallback = mapRouteToStops(
            firstRoute: linehaulRoute,
            stopsRaw: linehaulRoute['stops'] as List,
            isLinehaulDriverProfile: false,
            isRouteStarted: false,
            prevLoadedTotesCount: 0,
          );
        },
        returnsNormally,
      );
      expect(lhFallback.isLinehaul, true);
      expect(lhFallback.loadedTotesCount, 1);
      expect(lhFallback.totalPkgCount, 2);
      expect(lhFallback.mappedStops.length, 2);
    });
  });
}
