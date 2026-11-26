import 'package:flutter_test/flutter_test.dart';
import 'package:velocity_mobile/core/constants/app_constants.dart';
import 'package:velocity_mobile/screens/driver/mappers/driver_route_mapper.dart';

void expectStop(
  Map<String, dynamic> stop, {
  required int index,
  required String status,
  required bool isActive,
  required bool isCheckedIn,
  required String title,
  required num codAmount,
  required num shippingFee,
  required num totalToCollect,
  required bool isDispatched,
  required int packages,
  required bool isFirstStop,
  required bool isLastStop,
  required bool isIntermediate,
}) {
  expect(stop['index'], index);
  expect(stop['status'], status);
  expect(stop['isActive'], isActive);
  expect(stop['isCheckedIn'], isCheckedIn);
  expect(stop['title'], title);
  expect(stop['codAmount'], codAmount);
  expect(stop['shippingFee'], shippingFee);
  expect(stop['totalToCollect'], totalToCollect);
  expect(stop['isDispatched'], isDispatched);
  expect(stop['packages'], packages);
  expect(stop['isFirstStop'], isFirstStop);
  expect(stop['isLastStop'], isLastStop);
  expect(stop['isIntermediate'], isIntermediate);
}

Map<String, dynamic> _buildLinehaul3StopsBase() {
  return {
    'firstRoute': {
      'id': 'route-lh-1',
      'routeCode': 'RT-LH-001',
      'status': 'ASSIGNED',
      'shipments': [
        {
          'id': '11111111-1111-1111-1111-111111111111',
          'shipmentCode': 'SHP-LH-001',
          'status': 'ASSIGNED',
          'shipmentPackages': [
            {'package': {'packageCode': 'PKG-01'}},
            {'package': {'packageCode': 'PKG-02'}},
          ],
          'warehouseScans': [
            {'toteBag': {'toteCode': 'TOTE-001'}},
          ],
        },
      ],
    },
    'stopsRaw': [
      {
        'id': 'stop-1',
        'stopType': 'HUB',
        'sequence': 1,
        'status': 'PENDING',
        'shipmentId': '11111111-1111-1111-1111-111111111111',
        'facility': {
          'facilityName': 'Kho HCM',
          'address': {
            'addressLine1': '123 Lê Lợi, Q1',
            'latitude': 10.77,
            'longitude': 106.70,
          },
        },
        'shipment': {
          'id': '11111111-1111-1111-1111-111111111111',
          'shipmentCode': 'SHP-LH-001',
          'status': 'ASSIGNED',
          'shipmentPackages': [
            {'package': {'packageCode': 'PKG-01'}},
          ],
          'warehouseScans': [
            {'toteBag': {'toteCode': 'TOTE-001'}},
            {'toteBag': {'toteCode': 'TOTE-002'}},
          ],
        },
      },
      {
        'id': 'stop-2',
        'stopType': 'HUB',
        'sequence': 2,
        'status': 'PENDING',
        'shipmentId': '11111111-1111-1111-1111-111111111111',
        'facility': {
          'facilityName': 'Kho Bình Dương',
          'address': {
            'addressLine1': '456 Đại lộ Bình Dương',
            'latitude': 10.98,
            'longitude': 106.65,
          },
        },
        'shipment': {
          'id': '11111111-1111-1111-1111-111111111111',
          'shipmentCode': 'SHP-LH-001',
          'status': 'ASSIGNED',
        },
      },
      {
        'id': 'stop-3',
        'stopType': 'HUB',
        'sequence': 3,
        'status': 'PENDING',
        'shipmentId': '11111111-1111-1111-1111-111111111111',
        'facility': {
          'facilityName': 'Kho Hà Nội',
          'address': {
            'addressLine1': '789 Giải Phóng',
            'latitude': 21.02,
            'longitude': 105.84,
          },
        },
        'shipment': {
          'id': '11111111-1111-1111-1111-111111111111',
          'shipmentCode': 'SHP-LH-001',
          'status': 'ASSIGNED',
        },
      },
    ],
  };
}

void main() {
  group('Group A: Linehaul 3 stops with warehouseScans.toteBag', () {
    test('A1: first stop not dispatched, prevLoadedTotesCount = 0 -> CHỜ BỐC HÀNG & deduplicated totes', () {
      final base = _buildLinehaul3StopsBase();
      final result = mapRouteToStops(
        firstRoute: base['firstRoute'] as Map,
        stopsRaw: base['stopsRaw'] as List,
        isLinehaulDriverProfile: true,
        isRouteStarted: false,
        prevLoadedTotesCount: 0,
      );

      expect(result.isLinehaul, true);
      expect(result.loadedTotesCount, 2);
      expect(result.loadedToteCodes, ['TOTE-001', 'TOTE-002']);
      expect(result.totalPkgCount, 2);
      expect(result.mappedStops.length, 3);

      expectStop(
        result.mappedStops[0],
        index: 1,
        status: 'CHỜ BỐC HÀNG',
        isActive: true,
        isCheckedIn: false,
        title: 'Điểm xuất thùng trung chuyển',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: false,
        packages: 2,
        isFirstStop: true,
        isLastStop: false,
        isIntermediate: false,
      );
      expectStop(
        result.mappedStops[1],
        index: 2,
        status: 'CHỜ THỰC HIỆN',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm ghé trung chuyển (Bốc thêm hàng)',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: false,
        packages: 2,
        isFirstStop: false,
        isLastStop: false,
        isIntermediate: true,
      );
      expectStop(
        result.mappedStops[2],
        index: 3,
        status: 'CHỜ THỰC HIỆN',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm giao thùng kho đích',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: false,
        packages: 2,
        isFirstStop: false,
        isLastStop: true,
        isIntermediate: false,
      );
    });

    test('A2: first stop not dispatched, prevLoadedTotesCount = 5 -> ĐÃ BỐC 5 THÙNG (uses old state)', () {
      final base = _buildLinehaul3StopsBase();
      final result = mapRouteToStops(
        firstRoute: base['firstRoute'] as Map,
        stopsRaw: base['stopsRaw'] as List,
        isLinehaulDriverProfile: true,
        isRouteStarted: false,
        prevLoadedTotesCount: 5,
      );

      expect(result.isLinehaul, true);
      expect(result.loadedTotesCount, 2);
      expect(result.loadedToteCodes, ['TOTE-001', 'TOTE-002']);
      expect(result.totalPkgCount, 2);

      expectStop(
        result.mappedStops[0],
        index: 1,
        status: 'ĐÃ BỐC 5 THÙNG',
        isActive: true,
        isCheckedIn: false,
        title: 'Điểm xuất thùng trung chuyển',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: false,
        packages: 2,
        isFirstStop: true,
        isLastStop: false,
        isIntermediate: false,
      );
      expectStop(
        result.mappedStops[1],
        index: 2,
        status: 'CHỜ THỰC HIỆN',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm ghé trung chuyển (Bốc thêm hàng)',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: false,
        packages: 2,
        isFirstStop: false,
        isLastStop: false,
        isIntermediate: true,
      );
      expectStop(
        result.mappedStops[2],
        index: 3,
        status: 'CHỜ THỰC HIỆN',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm giao thùng kho đích',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: false,
        packages: 2,
        isFirstStop: false,
        isLastStop: true,
        isIntermediate: false,
      );
    });

    test('A3: first stop dispatched (IN_TRANSIT) & mid stop ARRIVED', () {
      final result = mapRouteToStops(
        firstRoute: {'id': 'route-lh-3', 'status': 'IN_PROGRESS'},
        stopsRaw: [
          {
            'id': 'stop-1',
            'stopType': 'HUB',
            'sequence': 1,
            'status': 'PENDING',
            'shipmentId': '22222222-2222-2222-2222-222222222222',
            'facility': {'facilityName': 'Kho HCM'},
            'shipment': {
              'shipmentCode': 'SHP-LH-003',
              'status': 'IN_TRANSIT',
              'warehouseScans': [{'toteBag': {'toteCode': 'TOTE-003'}}],
            },
          },
          {
            'id': 'stop-2',
            'stopType': 'HUB',
            'sequence': 2,
            'status': 'ARRIVED',
            'shipmentId': '22222222-2222-2222-2222-222222222222',
            'facility': {'facilityName': 'Kho Đà Nẵng'},
            'shipment': {'shipmentCode': 'SHP-LH-003', 'status': 'IN_TRANSIT'},
          },
          {
            'id': 'stop-3',
            'stopType': 'HUB',
            'sequence': 3,
            'status': 'PENDING',
            'shipmentId': '22222222-2222-2222-2222-222222222222',
            'facility': {'facilityName': 'Kho Hà Nội'},
            'shipment': {'shipmentCode': 'SHP-LH-003', 'status': 'IN_TRANSIT'},
          },
        ],
        isLinehaulDriverProfile: true,
        isRouteStarted: true,
        prevLoadedTotesCount: 1,
      );

      expect(result.isLinehaul, true);
      expect(result.loadedTotesCount, 1);
      expect(result.loadedToteCodes, ['TOTE-003']);
      expect(result.totalPkgCount, 0);

      expectStop(
        result.mappedStops[0],
        index: 1,
        status: 'ĐÃ XUẤT BƯU CỤC',
        isActive: false,
        isCheckedIn: true,
        title: 'Điểm xuất thùng trung chuyển',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: true,
        packages: 1,
        isFirstStop: true,
        isLastStop: false,
        isIntermediate: false,
      );
      expectStop(
        result.mappedStops[1],
        index: 2,
        status: 'ĐANG BỐC HÀNG TẠI TRẠM',
        isActive: true,
        isCheckedIn: false,
        title: 'Điểm ghé trung chuyển (Bốc thêm hàng)',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: true,
        packages: 1,
        isFirstStop: false,
        isLastStop: false,
        isIntermediate: true,
      );
      expectStop(
        result.mappedStops[2],
        index: 3,
        status: 'CHỜ THỰC HIỆN',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm giao thùng kho đích',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: true,
        packages: 1,
        isFirstStop: false,
        isLastStop: true,
        isIntermediate: false,
      );
    });

    test('A4: mid stop IN_PROGRESS -> ĐANG BỐC HÀNG TẠI TRẠM', () {
      final result = mapRouteToStops(
        firstRoute: {'id': 'route-lh-4', 'status': 'IN_PROGRESS'},
        stopsRaw: [
          {
            'id': 'stop-1',
            'stopType': 'HUB',
            'sequence': 1,
            'status': 'DEPARTED',
            'shipmentId': '33333333-3333-3333-3333-333333333333',
            'facility': {'facilityName': 'Kho HCM'},
            'shipment': {
              'shipmentCode': 'SHP-LH-004',
              'status': 'IN_TRANSIT',
              'warehouseScans': [{'toteBag': {'toteCode': 'TOTE-004'}}],
            },
          },
          {
            'id': 'stop-2',
            'stopType': 'HUB',
            'sequence': 2,
            'status': 'IN_PROGRESS',
            'shipmentId': '33333333-3333-3333-3333-333333333333',
            'facility': {'facilityName': 'Kho Huế'},
            'shipment': {'shipmentCode': 'SHP-LH-004', 'status': 'IN_TRANSIT'},
          },
          {
            'id': 'stop-3',
            'stopType': 'HUB',
            'sequence': 3,
            'status': 'PENDING',
            'shipmentId': '33333333-3333-3333-3333-333333333333',
            'facility': {'facilityName': 'Kho Hà Nội'},
            'shipment': {'shipmentCode': 'SHP-LH-004', 'status': 'IN_TRANSIT'},
          },
        ],
        isLinehaulDriverProfile: true,
        isRouteStarted: true,
        prevLoadedTotesCount: 1,
      );

      expectStop(
        result.mappedStops[0],
        index: 1,
        status: 'ĐÃ XUẤT BƯU CỤC',
        isActive: false,
        isCheckedIn: true,
        title: 'Điểm xuất thùng trung chuyển',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: true,
        packages: 1,
        isFirstStop: true,
        isLastStop: false,
        isIntermediate: false,
      );
      expectStop(
        result.mappedStops[1],
        index: 2,
        status: 'ĐANG BỐC HÀNG TẠI TRẠM',
        isActive: true,
        isCheckedIn: false,
        title: 'Điểm ghé trung chuyển (Bốc thêm hàng)',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: true,
        packages: 1,
        isFirstStop: false,
        isLastStop: false,
        isIntermediate: true,
      );
      expectStop(
        result.mappedStops[2],
        index: 3,
        status: 'CHỜ THỰC HIỆN',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm giao thùng kho đích',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: true,
        packages: 1,
        isFirstStop: false,
        isLastStop: true,
        isIntermediate: false,
      );
    });

    test('A5: mid stop DEPARTED & last stop dispatched -> last stop ĐANG THỰC HIỆN', () {
      final result = mapRouteToStops(
        firstRoute: {'id': 'route-lh-5', 'status': 'IN_PROGRESS'},
        stopsRaw: [
          {
            'id': 'stop-1',
            'stopType': 'HUB',
            'sequence': 1,
            'status': 'DEPARTED',
            'shipmentId': '44444444-4444-4444-4444-444444444444',
            'facility': {'facilityName': 'Kho HCM'},
            'shipment': {
              'shipmentCode': 'SHP-LH-005',
              'status': 'IN_TRANSIT',
              'warehouseScans': [{'toteBag': {'toteCode': 'TOTE-005'}}],
            },
          },
          {
            'id': 'stop-2',
            'stopType': 'HUB',
            'sequence': 2,
            'status': 'DEPARTED',
            'shipmentId': '44444444-4444-4444-4444-444444444444',
            'facility': {'facilityName': 'Kho Vinh'},
            'shipment': {'shipmentCode': 'SHP-LH-005', 'status': 'IN_TRANSIT'},
          },
          {
            'id': 'stop-3',
            'stopType': 'HUB',
            'sequence': 3,
            'status': 'PENDING',
            'shipmentId': '44444444-4444-4444-4444-444444444444',
            'facility': {'facilityName': 'Kho Hà Nội'},
            'shipment': {'shipmentCode': 'SHP-LH-005', 'status': 'IN_TRANSIT'},
          },
        ],
        isLinehaulDriverProfile: true,
        isRouteStarted: true,
        prevLoadedTotesCount: 1,
      );

      expectStop(
        result.mappedStops[0],
        index: 1,
        status: 'ĐÃ XUẤT BƯU CỤC',
        isActive: false,
        isCheckedIn: true,
        title: 'Điểm xuất thùng trung chuyển',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: true,
        packages: 1,
        isFirstStop: true,
        isLastStop: false,
        isIntermediate: false,
      );
      expectStop(
        result.mappedStops[1],
        index: 2,
        status: 'ĐÃ BỐC & RỜI TRẠM GHÉ',
        isActive: false,
        isCheckedIn: true,
        title: 'Điểm ghé trung chuyển (Bốc thêm hàng)',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: true,
        packages: 1,
        isFirstStop: false,
        isLastStop: false,
        isIntermediate: true,
      );
      expectStop(
        result.mappedStops[2],
        index: 3,
        status: 'ĐANG THỰC HIỆN',
        isActive: true,
        isCheckedIn: false,
        title: 'Điểm giao thùng kho đích',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: true,
        packages: 1,
        isFirstStop: false,
        isLastStop: true,
        isIntermediate: false,
      );
    });

    test('A6: mid stop PENDING + isDispatched -> ĐANG THỰC HIỆN; last stop AT_HUB -> ĐÃ TỚI KHO ĐÍCH', () {
      final result = mapRouteToStops(
        firstRoute: {'id': 'route-lh-6', 'status': 'IN_PROGRESS'},
        stopsRaw: [
          {
            'id': 'stop-1',
            'stopType': 'HUB',
            'sequence': 1,
            'status': 'DEPARTED',
            'shipmentId': '55555555-5555-5555-5555-555555555555',
            'facility': {'facilityName': 'Kho HCM'},
            'shipment': {
              'shipmentCode': 'SHP-LH-006',
              'status': 'AT_HUB',
              'warehouseScans': [{'toteBag': {'toteCode': 'TOTE-006'}}],
            },
          },
          {
            'id': 'stop-2',
            'stopType': 'HUB',
            'sequence': 2,
            'status': 'PENDING',
            'shipmentId': '55555555-5555-5555-5555-555555555555',
            'facility': {'facilityName': 'Kho Nha Trang'},
            'shipment': {'shipmentCode': 'SHP-LH-006', 'status': 'IN_TRANSIT'},
          },
          {
            'id': 'stop-3',
            'stopType': 'HUB',
            'sequence': 3,
            'status': 'PENDING',
            'shipmentId': '55555555-5555-5555-5555-555555555555',
            'facility': {'facilityName': 'Kho Hà Nội'},
            'shipment': {'shipmentCode': 'SHP-LH-006', 'status': 'AT_HUB'},
          },
        ],
        isLinehaulDriverProfile: true,
        isRouteStarted: true,
        prevLoadedTotesCount: 1,
      );

      expectStop(
        result.mappedStops[0],
        index: 1,
        status: 'ĐÃ XUẤT BƯU CỤC',
        isActive: false,
        isCheckedIn: true,
        title: 'Điểm xuất thùng trung chuyển',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: true,
        packages: 1,
        isFirstStop: true,
        isLastStop: false,
        isIntermediate: false,
      );
      expectStop(
        result.mappedStops[1],
        index: 2,
        status: 'ĐANG THỰC HIỆN',
        isActive: true,
        isCheckedIn: false,
        title: 'Điểm ghé trung chuyển (Bốc thêm hàng)',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: true,
        packages: 1,
        isFirstStop: false,
        isLastStop: false,
        isIntermediate: true,
      );
      expectStop(
        result.mappedStops[2],
        index: 3,
        status: 'ĐÃ TỚI KHO ĐÍCH',
        isActive: false,
        isCheckedIn: true,
        title: 'Điểm giao thùng kho đích',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: true,
        packages: 1,
        isFirstStop: false,
        isLastStop: true,
        isIntermediate: false,
      );
    });
  });

  group('Group B: Last-mile PICKUP', () {
    test('B1: isRouteStarted=false -> CHỜ XÁC NHẬN, isActive=false', () {
      final result = mapRouteToStops(
        firstRoute: {'id': 'route-lm-b1', 'status': 'ASSIGNED'},
        stopsRaw: [
          {
            'id': 'stop-b1',
            'stopType': 'PICKUP',
            'sequence': 1,
            'status': 'PENDING',
            'addressSnapshot': '10 Nguyễn Huệ, Q1',
            'latitude': 10.775,
            'longitude': 106.703,
            'order': {
              'orderCode': 'ORD-PK-001',
              'status': 'PICKUP_ASSIGNED',
              'receiverName': 'Nguyễn Văn A',
              'receiverPhone': '0901234567',
              'payment': {
                'feePayer': 'SENDER',
                'finalCodAmount': '0',
                'finalShippingFee': '25000',
                'finalInsuranceFee': '5000',
              },
            },
          },
        ],
        isLinehaulDriverProfile: false,
        isRouteStarted: false,
        prevLoadedTotesCount: 0,
      );

      expect(result.isLinehaul, false);
      expectStop(
        result.mappedStops[0],
        index: 1,
        status: 'CHỜ XÁC NHẬN',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm lấy hàng',
        codAmount: 0,
        shippingFee: 30000,
        totalToCollect: 30000,
        isDispatched: false,
        packages: 1,
        isFirstStop: true,
        isLastStop: true,
        isIntermediate: false,
      );
    });

    test('B2: PICKUP COMPLETED -> ĐÃ LẤY HÀNG', () {
      final result = mapRouteToStops(
        firstRoute: {'id': 'route-lm-b2', 'status': 'IN_PROGRESS'},
        stopsRaw: [
          {
            'id': 'stop-b2',
            'stopType': 'PICKUP',
            'sequence': 1,
            'status': 'DEPARTED',
            'addressSnapshot': '10 Nguyễn Huệ, Q1',
            'latitude': 10.775,
            'longitude': 106.703,
            'order': {
              'orderCode': 'ORD-PK-002',
              'status': 'PICKED_UP',
              'receiverName': 'Nguyễn Văn A',
              'receiverPhone': '0901234567',
              'payment': {
                'feePayer': 'SENDER',
                'finalCodAmount': '0',
                'finalShippingFee': '25000',
                'finalInsuranceFee': '5000',
              },
            },
          },
        ],
        isLinehaulDriverProfile: false,
        isRouteStarted: true,
        prevLoadedTotesCount: 0,
      );

      expect(result.isLinehaul, false);
      expectStop(
        result.mappedStops[0],
        index: 1,
        status: 'ĐÃ LẤY HÀNG',
        isActive: false,
        isCheckedIn: true,
        title: 'Điểm lấy hàng',
        codAmount: 0,
        shippingFee: 30000,
        totalToCollect: 30000,
        isDispatched: true,
        packages: 1,
        isFirstStop: true,
        isLastStop: true,
        isIntermediate: false,
      );
    });
  });

  group('Group C: Last-mile DELIVERY 3 stops', () {
    test('C1: stop 1 COMPLETED, stop 2-3 pending -> ĐÃ GIAO / ĐANG THỰC HIỆN / TIẾP THEO', () {
      final result = mapRouteToStops(
        firstRoute: {'id': 'route-lm-c1', 'status': 'IN_PROGRESS'},
        stopsRaw: [
          {
            'id': 'stop-c1',
            'stopType': 'DELIVERY',
            'sequence': 1,
            'status': 'DEPARTED',
            'shipmentId': '66666666-6666-6666-6666-666666666666',
            'addressSnapshot': '20 Hai Bà Trưng, Q1',
            'latitude': 10.78,
            'longitude': 106.70,
            'shipment': {
              'shipmentCode': 'SHP-DL-001',
              'status': 'DELIVERED',
              'shipmentPackages': [
                {
                  'package': {
                    'order': {
                      'orderCode': 'ORD-DL-001',
                      'status': 'DELIVERED',
                      'receiverName': 'Trần Thị B',
                      'receiverPhone': '0902222222',
                      'payment': {
                        'feePayer': 'RECEIVER',
                        'finalCodAmount': '150000',
                        'finalShippingFee': '20000',
                        'finalInsuranceFee': '0',
                      },
                    },
                  },
                },
              ],
            },
          },
          {
            'id': 'stop-c2',
            'stopType': 'DELIVERY',
            'sequence': 2,
            'status': 'PENDING',
            'shipmentId': '77777777-7777-7777-7777-777777777777',
            'addressSnapshot': '30 Lê Duẩn, Q1',
            'latitude': 10.781,
            'longitude': 106.701,
            'shipment': {
              'shipmentCode': 'SHP-DL-002',
              'status': 'OUT_FOR_DELIVERY',
              'shipmentPackages': [
                {
                  'package': {
                    'order': {
                      'orderCode': 'ORD-DL-002',
                      'status': 'OUT_FOR_DELIVERY',
                      'receiverName': 'Lê Văn C',
                      'receiverPhone': '0903333333',
                      'payment': {
                        'feePayer': 'SENDER',
                        'finalCodAmount': '200000',
                        'finalShippingFee': '20000',
                        'finalInsuranceFee': '0',
                      },
                    },
                  },
                },
              ],
            },
          },
          {
            'id': 'stop-c3',
            'stopType': 'DELIVERY',
            'sequence': 3,
            'status': 'PENDING',
            'shipmentId': '88888888-8888-8888-8888-888888888888',
            'addressSnapshot': '40 Đồng Khởi, Q1',
            'latitude': 10.776,
            'longitude': 106.704,
            'shipment': {
              'shipmentCode': 'SHP-DL-003',
              'status': 'OUT_FOR_DELIVERY',
              'shipmentPackages': [
                {
                  'package': {
                    'order': {
                      'orderCode': 'ORD-DL-003',
                      'status': 'OUT_FOR_DELIVERY',
                      'receiverName': 'Phạm Thị D',
                      'receiverPhone': '0904444444',
                      'payment': {
                        'feePayer': 'RECEIVER',
                        'finalCodAmount': '0',
                        'finalShippingFee': '25000',
                        'finalInsuranceFee': '5000',
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
        isLinehaulDriverProfile: false,
        isRouteStarted: true,
        prevLoadedTotesCount: 0,
      );

      expect(result.isLinehaul, false);
      expect(result.totalPkgCount, 1);

      expectStop(
        result.mappedStops[0],
        index: 1,
        status: 'ĐÃ GIAO',
        isActive: false,
        isCheckedIn: true,
        title: 'Điểm giao hàng',
        codAmount: 150000,
        shippingFee: 20000,
        totalToCollect: 170000,
        isDispatched: true,
        packages: 1,
        isFirstStop: true,
        isLastStop: false,
        isIntermediate: false,
      );
      expectStop(
        result.mappedStops[1],
        index: 2,
        status: 'ĐANG THỰC HIỆN',
        isActive: true,
        isCheckedIn: false,
        title: 'Điểm giao hàng',
        codAmount: 200000,
        shippingFee: 20000,
        totalToCollect: 200000,
        isDispatched: false,
        packages: 1,
        isFirstStop: false,
        isLastStop: false,
        isIntermediate: true,
      );
      expectStop(
        result.mappedStops[2],
        index: 3,
        status: 'TIẾP THEO',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm giao hàng',
        codAmount: 0,
        shippingFee: 30000,
        totalToCollect: 30000,
        isDispatched: false,
        packages: 1,
        isFirstStop: false,
        isLastStop: true,
        isIntermediate: false,
      );
    });
  });

  group('Group D: Money calculation (feePayer x stopType + defaultShippingFee)', () {
    test('D1: SENDER/RECEIVER x PICKUP/DELIVERY and baseFee=0 fallback', () {
      final result = mapRouteToStops(
        firstRoute: {'id': 'route-d1', 'status': 'IN_PROGRESS'},
        stopsRaw: [
          {
            'id': 'd1',
            'stopType': 'PICKUP',
            'status': 'PENDING',
            'addressSnapshot': 'Addr 1',
            'order': {
              'orderCode': 'ORD-D1',
              'status': 'PICKUP_ASSIGNED',
              'receiverName': 'U1',
              'payment': {'feePayer': 'SENDER', 'finalCodAmount': '100000', 'finalShippingFee': '25000', 'finalInsuranceFee': '5000'},
            },
          },
          {
            'id': 'd2',
            'stopType': 'PICKUP',
            'status': 'PENDING',
            'addressSnapshot': 'Addr 2',
            'order': {
              'orderCode': 'ORD-D2',
              'status': 'PICKUP_ASSIGNED',
              'receiverName': 'U2',
              'payment': {'feePayer': 'RECEIVER', 'finalCodAmount': '100000', 'finalShippingFee': '25000', 'finalInsuranceFee': '5000'},
            },
          },
          {
            'id': 'd3',
            'stopType': 'DELIVERY',
            'status': 'PENDING',
            'addressSnapshot': 'Addr 3',
            'order': {
              'orderCode': 'ORD-D3',
              'status': 'OUT_FOR_DELIVERY',
              'receiverName': 'U3',
              'payment': {'feePayer': 'RECEIVER', 'finalCodAmount': '100000', 'finalShippingFee': '25000', 'finalInsuranceFee': '5000'},
            },
          },
          {
            'id': 'd4',
            'stopType': 'DELIVERY',
            'status': 'PENDING',
            'addressSnapshot': 'Addr 4',
            'order': {
              'orderCode': 'ORD-D4',
              'status': 'OUT_FOR_DELIVERY',
              'receiverName': 'U4',
              'payment': {'feePayer': 'SENDER', 'finalCodAmount': '100000', 'finalShippingFee': '25000', 'finalInsuranceFee': '5000'},
            },
          },
          {
            'id': 'd5',
            'stopType': 'DELIVERY',
            'status': 'PENDING',
            'addressSnapshot': 'Addr 5',
            'order': {
              'orderCode': 'ORD-D5',
              'status': 'OUT_FOR_DELIVERY',
              'receiverName': 'U5',
              'payment': {'feePayer': 'RECEIVER', 'finalCodAmount': '50000', 'finalShippingFee': '0', 'finalInsuranceFee': '0'},
            },
          },
        ],
        isLinehaulDriverProfile: false,
        isRouteStarted: true,
        prevLoadedTotesCount: 0,
      );

      expectStop(
        result.mappedStops[0],
        index: 1,
        status: 'ĐANG THỰC HIỆN',
        isActive: true,
        isCheckedIn: false,
        title: 'Điểm lấy hàng',
        codAmount: 100000,
        shippingFee: 30000,
        totalToCollect: 30000,
        isDispatched: false,
        packages: 1,
        isFirstStop: true,
        isLastStop: false,
        isIntermediate: false,
      );
      expectStop(
        result.mappedStops[1],
        index: 2,
        status: 'TIẾP THEO',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm lấy hàng',
        codAmount: 100000,
        shippingFee: 30000,
        totalToCollect: 0,
        isDispatched: false,
        packages: 1,
        isFirstStop: false,
        isLastStop: false,
        isIntermediate: true,
      );
      expectStop(
        result.mappedStops[2],
        index: 3,
        status: 'TIẾP THEO',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm giao hàng',
        codAmount: 100000,
        shippingFee: 30000,
        totalToCollect: 130000,
        isDispatched: false,
        packages: 1,
        isFirstStop: false,
        isLastStop: false,
        isIntermediate: true,
      );
      expectStop(
        result.mappedStops[3],
        index: 4,
        status: 'TIẾP THEO',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm giao hàng',
        codAmount: 100000,
        shippingFee: 30000,
        totalToCollect: 100000,
        isDispatched: false,
        packages: 1,
        isFirstStop: false,
        isLastStop: false,
        isIntermediate: true,
      );
      expectStop(
        result.mappedStops[4],
        index: 5,
        status: 'TIẾP THEO',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm giao hàng',
        codAmount: 50000,
        shippingFee: AppConstants.defaultShippingFee,
        totalToCollect: 81000,
        isDispatched: false,
        packages: 1,
        isFirstStop: false,
        isLastStop: true,
        isIntermediate: false,
      );
    });
  });

  group('Group E: Fallbacks when fields are missing', () {
    test('E1: lat/lng, orderCode, address, receiverName, packages fallbacks', () {
      final result = mapRouteToStops(
        firstRoute: {'id': 'route-e1', 'status': 'ASSIGNED'},
        stopsRaw: [
          {'id': 'e1'},
          {'id': 'e2'},
        ],
        isLinehaulDriverProfile: false,
        isRouteStarted: false,
        prevLoadedTotesCount: 0,
      );

      expect(result.mappedStops.length, 2);

      expect(result.mappedStops[0]['latitude'], 10.762);
      expect(result.mappedStops[0]['longitude'], 106.682);
      expect(result.mappedStops[0]['orderCode'], 'ORD-66266482-01');
      expect(result.mappedStops[0]['address'], 'Địa điểm giao nhận Việt Nam');
      expect(result.mappedStops[0]['receiverName'], 'Chuyến xe trung chuyển');
      expectStop(
        result.mappedStops[0],
        index: 1,
        status: 'CHỜ QUÉT NHẬN',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm giao hàng',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: false,
        packages: 1,
        isFirstStop: true,
        isLastStop: false,
        isIntermediate: false,
      );

      expect(result.mappedStops[1]['latitude'], 10.766);
      expect(result.mappedStops[1]['longitude'], 106.686);
      expect(result.mappedStops[1]['orderCode'], 'ORD-66266482-02');
      expect(result.mappedStops[1]['address'], 'Địa điểm giao nhận Việt Nam');
      expect(result.mappedStops[1]['receiverName'], 'Chuyến xe trung chuyển');
      expectStop(
        result.mappedStops[1],
        index: 2,
        status: 'CHỜ QUÉT NHẬN',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm giao hàng',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: false,
        packages: 1,
        isFirstStop: false,
        isLastStop: true,
        isIntermediate: false,
      );
    });
  });

  group('Group F: PIN suspicious current behaviors', () {
    test('PIN: totalPkgCount sums step 1 (firstRoute.shipments) then takes max in step 2 (stopsRaw)', () {
      // Hành vi HIỆN TẠI, KHÔNG phải mong muốn:
      // Bước 1 cộng dồn 2 + 2 = 4; Bước 2 lấy max(4, 6) = 6 thay vì cộng dồn hoặc giữ tổng nhất quán.
      final result = mapRouteToStops(
        firstRoute: {
          'id': 'route-f1',
          'status': 'ASSIGNED',
          'shipments': [
            {'shipmentPackages': [{}, {}]},
            {'shipmentPackages': [{}, {}]},
          ],
        },
        stopsRaw: [
          {
            'id': 'f1-s1',
            'stopType': 'DELIVERY',
            'status': 'PENDING',
            'shipmentId': '99999999-9999-9999-9999-999999999999',
            'shipment': {
              'shipmentCode': 'SHP-F1',
              'status': 'ASSIGNED',
              'shipmentPackages': [{}, {}, {}, {}, {}, {}],
            },
          },
        ],
        isLinehaulDriverProfile: false,
        isRouteStarted: false,
        prevLoadedTotesCount: 0,
      );

      expect(result.totalPkgCount, 6);
      expectStop(
        result.mappedStops[0],
        index: 1,
        status: 'CHỜ QUÉT NHẬN',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm giao hàng',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: false,
        packages: 6,
        isFirstStop: true,
        isLastStop: true,
        isIntermediate: false,
      );
    });

    test('shipmentId shorter than 8 chars keeps stop and builds safe SHP-<id> orderCode', () {
      final result = mapRouteToStops(
        firstRoute: {'id': 'route-f2', 'status': 'ASSIGNED'},
        stopsRaw: [
          {
            'id': 'f2-short',
            'stopType': 'DELIVERY',
            'status': 'PENDING',
            'shipmentId': 'SHORT1',
          },
          {
            'id': 'f2-ok',
            'stopType': 'DELIVERY',
            'status': 'PENDING',
            'shipmentId': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          },
        ],
        isLinehaulDriverProfile: false,
        isRouteStarted: false,
        prevLoadedTotesCount: 0,
      );

      expect(result.mappedStops.length, 2);
      expect(result.mappedStops[0]['id'], 'f2-short');
      expect(result.mappedStops[0]['orderCode'], 'SHP-SHORT1');
      expectStop(
        result.mappedStops[0],
        index: 1,
        status: 'CHỜ QUÉT NHẬN',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm giao hàng',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: false,
        packages: 1,
        isFirstStop: true,
        isLastStop: false,
        isIntermediate: false,
      );

      expect(result.mappedStops[1]['id'], 'f2-ok');
      expect(result.mappedStops[1]['orderCode'], 'SHP-AAAAAAAA');
      expectStop(
        result.mappedStops[1],
        index: 2,
        status: 'CHỜ QUÉT NHẬN',
        isActive: false,
        isCheckedIn: false,
        title: 'Điểm giao hàng',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: false,
        packages: 1,
        isFirstStop: false,
        isLastStop: true,
        isIntermediate: false,
      );
    });

    test('PIN: linehaul 4+ stops only checks stopsRaw[1] for last stop prevStopsDone', () {
      // Hành vi HIỆN TẠI, KHÔNG phải mong muốn:
      // Stop 3 (index 2) vẫn PENDING nhưng stop 4 (last stop) chỉ kiểm tra stopsRaw[1] (DEPARTED)
      // nên stop 4 vẫn chuyển sang ĐANG THỰC HIỆN (isActive: true).
      final result = mapRouteToStops(
        firstRoute: {'id': 'route-f3', 'status': 'IN_PROGRESS'},
        stopsRaw: [
          {
            'id': 'f3-1',
            'stopType': 'HUB',
            'sequence': 1,
            'status': 'DEPARTED',
            'shipmentId': 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            'facility': {'facilityName': 'Kho 1'},
            'shipment': {
              'shipmentCode': 'SHP-F3',
              'status': 'IN_TRANSIT',
              'warehouseScans': [{'toteBag': {'toteCode': 'TOTE-F3'}}],
            },
          },
          {
            'id': 'f3-2',
            'stopType': 'HUB',
            'sequence': 2,
            'status': 'DEPARTED',
            'shipmentId': 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            'facility': {'facilityName': 'Kho 2'},
            'shipment': {'shipmentCode': 'SHP-F3', 'status': 'IN_TRANSIT'},
          },
          {
            'id': 'f3-3',
            'stopType': 'HUB',
            'sequence': 3,
            'status': 'PENDING',
            'shipmentId': 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            'facility': {'facilityName': 'Kho 3'},
            'shipment': {'shipmentCode': 'SHP-F3', 'status': 'IN_TRANSIT'},
          },
          {
            'id': 'f3-4',
            'stopType': 'HUB',
            'sequence': 4,
            'status': 'PENDING',
            'shipmentId': 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            'facility': {'facilityName': 'Kho 4'},
            'shipment': {'shipmentCode': 'SHP-F3', 'status': 'IN_TRANSIT'},
          },
        ],
        isLinehaulDriverProfile: true,
        isRouteStarted: true,
        prevLoadedTotesCount: 1,
      );

      expect(result.mappedStops.length, 4);
      expectStop(
        result.mappedStops[0],
        index: 1,
        status: 'ĐÃ XUẤT BƯU CỤC',
        isActive: false,
        isCheckedIn: true,
        title: 'Điểm xuất thùng trung chuyển',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: true,
        packages: 1,
        isFirstStop: true,
        isLastStop: false,
        isIntermediate: false,
      );
      expectStop(
        result.mappedStops[1],
        index: 2,
        status: 'ĐÃ BỐC & RỜI TRẠM GHÉ',
        isActive: false,
        isCheckedIn: true,
        title: 'Điểm ghé trung chuyển (Bốc thêm hàng)',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: true,
        packages: 1,
        isFirstStop: false,
        isLastStop: false,
        isIntermediate: true,
      );
      expectStop(
        result.mappedStops[2],
        index: 3,
        status: 'ĐANG THỰC HIỆN',
        isActive: true,
        isCheckedIn: false,
        title: 'Điểm ghé trung chuyển (Bốc thêm hàng)',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: true,
        packages: 1,
        isFirstStop: false,
        isLastStop: false,
        isIntermediate: true,
      );
      expectStop(
        result.mappedStops[3],
        index: 4,
        status: 'ĐANG THỰC HIỆN',
        isActive: true,
        isCheckedIn: false,
        title: 'Điểm giao thùng kho đích',
        codAmount: 0,
        shippingFee: 31000,
        totalToCollect: 0,
        isDispatched: true,
        packages: 1,
        isFirstStop: false,
        isLastStop: true,
        isIntermediate: false,
      );
    });
  });
}
