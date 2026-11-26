import 'package:flutter/foundation.dart';
import '../../../core/constants/app_constants.dart';

const Set<String> kPickupHandedOverOrderStatuses = {
  'ARRIVED_ORIGIN_FACILITY',
  'AT_HUB',
  'READY_FOR_DISPATCH',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
};

const Set<String> kPickupExemptOrderStatuses = {
  'PICK_FAILED',
  'CANCELLED',
};

bool isPickupOrderHandedOver(String? orderStatus) {
  if (orderStatus == null || orderStatus.isEmpty) return false;
  return kPickupHandedOverOrderStatuses.contains(orderStatus.toUpperCase());
}

class PickupHandoverProgress {
  final int handedOverCount;
  final int requiredCount;
  final List<String> pendingOrderCodes;

  const PickupHandoverProgress({
    required this.handedOverCount,
    required this.requiredCount,
    required this.pendingOrderCodes,
  });

  bool get allHandedOver => requiredCount == 0 || handedOverCount >= requiredCount;
}

PickupHandoverProgress computePickupHandoverProgress(
  List<Map<String, dynamic>> stops,
) {
  int handedOver = 0;
  int required = 0;
  final List<String> pendingCodes = [];

  for (final stop in stops) {
    final bool isPickupStop =
        stop['stopType'] == 'PICKUP' || stop['isPickup'] == true;
    if (!isPickupStop) continue;

    final String rawStatus =
        (stop['orderStatus']?.toString() ?? '').trim().toUpperCase();
    if (kPickupExemptOrderStatuses.contains(rawStatus)) continue;

    required++;
    if (isPickupOrderHandedOver(rawStatus)) {
      handedOver++;
    } else {
      final String code = stop['orderCode']?.toString().trim() ?? '';
      if (code.isNotEmpty) {
        pendingCodes.add(code);
      } else {
        final String fallback = stop['title']?.toString().trim() ?? 'Đơn hàng';
        pendingCodes.add(fallback);
      }
    }
  }

  return PickupHandoverProgress(
    handedOverCount: handedOver,
    requiredCount: required,
    pendingOrderCodes: pendingCodes,
  );
}

class DriverRouteMapResult {
  final List<Map<String, dynamic>> mappedStops;
  final bool isLinehaul;
  final int loadedTotesCount;
  final List<String> loadedToteCodes;
  final int totalPkgCount;

  const DriverRouteMapResult({
    required this.mappedStops,
    required this.isLinehaul,
    required this.loadedTotesCount,
    required this.loadedToteCodes,
    required this.totalPkgCount,
  });
}

class _ToteAndPackages {
  final Set<String> toteCodes;
  final int totalPkgCount;
  final bool isLinehaul;

  const _ToteAndPackages({
    required this.toteCodes,
    required this.totalPkgCount,
    required this.isLinehaul,
  });
}

_ToteAndPackages _extractToteAndPackages(
  Map firstRoute,
  List stopsRaw,
  bool isLinehaulDriverProfile,
) {
  final Set<String> allToteCodes = {};
  int totalPkgCount = 0;

  // Chuyến có điểm dừng khách hàng Last-Mile (PICKUP/DELIVERY có orderId, không phải facility/HUB)
  // KHÔNG bao giờ được tự coi là chuyến TRUNG CHUYỂN chỉ vì đơn đó đã có WarehouseScan phân loại vào sọt.
  final bool isExplicitLastMileCustomerRoute = stopsRaw.isNotEmpty &&
      stopsRaw.every((s) {
        final st = (s['stopType']?.toString() ?? '').toUpperCase();
        final bool hasFacility = s['facilityId'] != null || s['facility'] != null;
        return !hasFacility && (st == 'PICKUP' || st == 'DELIVERY');
      });

  bool isLinehaul = isLinehaulDriverProfile;

  // 1. Accumulate from firstRoute shipments
  final routeShipments = firstRoute['shipments'] as List?;
  if (routeShipments != null) {
    for (final sh in routeShipments) {
      final pkgs = sh['shipmentPackages'] as List?;
      if (pkgs != null) totalPkgCount += pkgs.length;
      final scans = sh['warehouseScans'] as List?;
      if (scans != null) {
        for (final scan in scans) {
          final tote = scan['toteBag'];
          if (tote != null && tote['toteCode'] != null) {
            allToteCodes.add(tote['toteCode'].toString());
          }
        }
      }
    }
  }

  // 2. Accumulate from stop shipments
  for (final s in stopsRaw) {
    final shipment = s['shipment'];
    if (shipment != null) {
      final pkgs = shipment['shipmentPackages'] as List?;
      if (pkgs != null && pkgs.length > totalPkgCount) {
        totalPkgCount = pkgs.length;
      }
      final scans = shipment['warehouseScans'] as List?;
      if (scans != null) {
        for (final scan in scans) {
          final tote = scan['toteBag'];
          if (tote != null && tote['toteCode'] != null) {
            allToteCodes.add(tote['toteCode'].toString());
          }
        }
      }
    }
  }

  if (!isExplicitLastMileCustomerRoute && allToteCodes.isNotEmpty) {
    isLinehaul = true;
  }

  return _ToteAndPackages(
    toteCodes: allToteCodes,
    totalPkgCount: totalPkgCount,
    isLinehaul: isLinehaul,
  );
}

class _StopMoney {
  final String feePayer;
  final num codAmount;
  final num shippingFee;
  final bool isReceiverPayFee;
  final num totalToCollect;

  const _StopMoney({
    required this.feePayer,
    required this.codAmount,
    required this.shippingFee,
    required this.isReceiverPayFee,
    required this.totalToCollect,
  });
}

_StopMoney _resolveStopMoney(
  dynamic firstOrder,
  dynamic stop,
  dynamic stopType,
) {
  final paymentInfo = firstOrder?['payment'] ?? stop['payment'];
  final String feePayer = (paymentInfo?['feePayer'] ?? firstOrder?['feePayer'] ?? stop['feePayer'] ?? 'SENDER').toString().toUpperCase();
  final num codAmount = num.tryParse(paymentInfo?['finalCodAmount']?.toString() ?? firstOrder?['estimatedCodAmount']?.toString() ?? firstOrder?['codAmount']?.toString() ?? stop['estimatedCodAmount']?.toString() ?? stop['codAmount']?.toString() ?? '0') ?? 0;
  final num baseFee = num.tryParse(paymentInfo?['finalShippingFee']?.toString() ?? firstOrder?['estimatedShippingFee']?.toString() ?? firstOrder?['estimatedTotalAmount']?.toString() ?? firstOrder?['shippingFee']?.toString() ?? stop['estimatedShippingFee']?.toString() ?? stop['shippingFee']?.toString() ?? '0') ?? 0;
  final num insuranceFee = num.tryParse(paymentInfo?['finalInsuranceFee']?.toString() ?? firstOrder?['estimatedInsuranceFee']?.toString() ?? firstOrder?['insuranceFee']?.toString() ?? stop['estimatedInsuranceFee']?.toString() ?? stop['insuranceFee']?.toString() ?? '0') ?? 0;
  final num shippingFee = (baseFee + insuranceFee) > 0 ? (baseFee + insuranceFee) : (baseFee > 0 ? baseFee : AppConstants.defaultShippingFee);
  final bool isReceiverPayFee = (feePayer == 'RECEIVER');
  final bool isSenderPayFee = (feePayer == 'SENDER');
  final num totalToCollect = (stopType == 'PICKUP')
      ? (isSenderPayFee ? shippingFee : 0)
      : (codAmount + (isReceiverPayFee ? shippingFee : 0));

  return _StopMoney(
    feePayer: feePayer,
    codAmount: codAmount,
    shippingFee: shippingFee,
    isReceiverPayFee: isReceiverPayFee,
    totalToCollect: totalToCollect,
  );
}

bool _resolveIsDispatched(
  List? transfers,
  String rawShipmentStatus,
  String rawStopStatus,
) {
  bool isDispatched = false;
  if (transfers != null && transfers.isNotEmpty) {
    if (transfers.any((t) => t['status'] == 'IN_TRANSIT' || t['status'] == 'ARRIVED' || t['status'] == 'COMPLETED')) {
      isDispatched = true;
    }
  }
  if (!isDispatched && (rawShipmentStatus == 'IN_TRANSIT' || rawShipmentStatus == 'AT_HUB' || rawShipmentStatus == 'ARRIVED_DEST_FACILITY' || rawShipmentStatus == 'DELIVERED')) {
    isDispatched = true;
  }
  if (!isDispatched && (rawStopStatus == 'DEPARTED' || rawStopStatus == 'COMPLETED')) {
    isDispatched = true;
  }
  return isDispatched;
}

class _StopStatus {
  final bool isCompleted;
  final String displayStatus;
  final bool isActive;

  const _StopStatus({
    required this.isCompleted,
    required this.displayStatus,
    required this.isActive,
  });
}

_StopStatus _resolveLinehaulStatus({
  required bool isFirstStop,
  required bool isIntermediateStop,
  required String rawStopStatus,
  required String rawShipmentStatus,
  required bool isDispatched,
  required List? transfers,
  required List stopsRaw,
  required int prevLoadedTotesCount,
}) {
  bool isCompleted = false;
  String displayStatus = 'CHỜ THỰC HIỆN';
  bool isActive = false;

  if (isFirstStop) {
    if (rawStopStatus == 'DEPARTED' || rawStopStatus == 'COMPLETED' || isDispatched) {
      isCompleted = true;
      displayStatus = 'ĐÃ XUẤT BƯU CỤC';
      isActive = false;
    } else {
      isCompleted = false;
      displayStatus = prevLoadedTotesCount > 0 ? 'ĐÃ BỐC $prevLoadedTotesCount THÙNG' : 'CHỜ BỐC HÀNG';
      isActive = true;
    }
  } else if (isIntermediateStop) {
    if (rawStopStatus == 'DEPARTED' || rawStopStatus == 'COMPLETED') {
      isCompleted = true;
      displayStatus = 'ĐÃ BỐC & RỜI TRẠM GHÉ';
      isActive = false;
    } else if (rawStopStatus == 'ARRIVED' || rawStopStatus == 'IN_PROGRESS') {
      isCompleted = false;
      displayStatus = 'ĐANG BỐC HÀNG TẠI TRẠM';
      isActive = true;
    } else if (isDispatched) {
      isCompleted = false;
      displayStatus = 'ĐANG THỰC HIỆN';
      isActive = true;
    } else {
      isCompleted = false;
      displayStatus = 'CHỜ THỰC HIỆN';
      isActive = false;
    }
  } else {
    // Last Destination Stop
    final bool isDestInbounded = rawShipmentStatus == 'AT_HUB' ||
        rawShipmentStatus == 'ARRIVED_DEST_FACILITY' ||
        rawShipmentStatus == 'DELIVERED' ||
        rawStopStatus == 'COMPLETED' ||
        rawStopStatus == 'DEPARTED' ||
        (transfers != null && transfers.any((t) => t['status'] == 'COMPLETED'));
    if (isDestInbounded) {
      isCompleted = true;
      displayStatus = 'ĐÃ TỚI KHO ĐÍCH';
      isActive = false;
    } else {
      final bool prevStopsDone = (stopsRaw.length > 2)
          ? stopsRaw
              .sublist(1, stopsRaw.length - 1)
              .every((s) => s['status'] == 'DEPARTED' || s['status'] == 'COMPLETED')
          : isDispatched;
      if (prevStopsDone && isDispatched) {
        isCompleted = false;
        displayStatus = 'ĐANG THỰC HIỆN';
        isActive = true;
      } else {
        isCompleted = false;
        displayStatus = 'CHỜ THỰC HIỆN';
        isActive = false;
      }
    }
  }

  return _StopStatus(
    isCompleted: isCompleted,
    displayStatus: displayStatus,
    isActive: isActive,
  );
}

class _LastMileStatus {
  final bool isCompleted;
  final String displayStatus;
  final bool isActive;
  final bool foundActiveIncomplete;

  const _LastMileStatus({
    required this.isCompleted,
    required this.displayStatus,
    required this.isActive,
    required this.foundActiveIncomplete,
  });
}

_LastMileStatus _resolveLastMileStatus({
  required dynamic stopType,
  required String rawStopStatus,
  required String rawOrderStatus,
  required bool isRouteStarted,
  required bool foundActiveIncomplete,
}) {
  bool isCompleted = false;
  String displayStatus = 'CHỜ THỰC HIỆN';
  bool isActive = false;

  // Last-mile Shipper logic
  if (stopType == 'PICKUP') {
    if (rawOrderStatus == 'CANCELLED') {
      isCompleted = true;
      displayStatus = 'ĐÃ HỦY';
      isActive = false;
    } else if (rawStopStatus == 'FAILED' || rawOrderStatus == 'PICK_FAILED') {
      isCompleted = true;
      displayStatus = 'LẤY THẤT BẠI';
      isActive = false;
    } else {
      isCompleted = (rawStopStatus == 'COMPLETED' ||
          rawStopStatus == 'DEPARTED' ||
          rawOrderStatus == 'PICKED_UP' ||
          isPickupOrderHandedOver(rawOrderStatus));
      if (isCompleted) {
        displayStatus = 'ĐÃ LẤY HÀNG';
        isActive = false;
      }
    }
  } else {
    isCompleted = (rawStopStatus == 'COMPLETED' ||
        rawStopStatus == 'DEPARTED' ||
        rawOrderStatus == 'DELIVERED' ||
        rawOrderStatus == 'COMPLETED');
    if (isCompleted) {
      displayStatus = 'ĐÃ GIAO';
      isActive = false;
    }
  }

  if (!isCompleted) {
    if (!isRouteStarted) {
      displayStatus = (stopType == 'PICKUP') ? 'CHỜ XÁC NHẬN' : 'CHỜ QUÉT NHẬN';
      isActive = false;
    } else if (!foundActiveIncomplete) {
      displayStatus = 'ĐANG THỰC HIỆN';
      isActive = true;
      foundActiveIncomplete = true;
    } else {
      displayStatus = 'TIẾP THEO';
      isActive = false;
    }
  }

  return _LastMileStatus(
    isCompleted: isCompleted,
    displayStatus: displayStatus,
    isActive: isActive,
    foundActiveIncomplete: foundActiveIncomplete,
  );
}

DriverRouteMapResult mapRouteToStops({
  required Map firstRoute,
  required List stopsRaw,
  required bool isLinehaulDriverProfile,
  required bool isRouteStarted,
  required int prevLoadedTotesCount,
}) {
  final extracted = _extractToteAndPackages(
    firstRoute,
    stopsRaw,
    isLinehaulDriverProfile,
  );
  final Set<String> allToteCodes = extracted.toteCodes;
  final int totalPkgCount = extracted.totalPkgCount;
  final bool isLinehaul = extracted.isLinehaul;

  final int loadedTotesCount = allToteCodes.length;
  final List<String> loadedToteCodes = allToteCodes.toList();

  final List<Map<String, dynamic>> mappedStops = [];
  bool foundActiveIncomplete = false;
  for (int i = 0; i < stopsRaw.length; i++) {
    try {
      final stop = stopsRaw[i];
      final stopType = stop['stopType'] ?? 'DELIVERY';
      final facilityObj = stop['facility'];
      final String address = (facilityObj != null && facilityObj['facilityName'] != null)
          ? '${facilityObj['facilityName']}${facilityObj['address'] != null && facilityObj['address']['addressLine1'] != null ? " - ${facilityObj['address']['addressLine1']}" : ""}'
          : (stop['addressSnapshot'] ??
              stop['addressLine1'] ??
              stop['address'] ??
              'Địa điểm giao nhận Việt Nam');
      final shipmentId = stop['shipmentId'];
      final double lat = double.tryParse(stop['latitude']?.toString() ?? facilityObj?['address']?['latitude']?.toString() ?? '') ?? (10.762 + i * 0.004);
      final double lng = double.tryParse(stop['longitude']?.toString() ?? facilityObj?['address']?['longitude']?.toString() ?? '') ?? (106.682 + i * 0.004);

      dynamic firstOrder;
      try {
        final shipment = stop['shipment'];
        if (shipment != null) {
          final pkgs = shipment['shipmentPackages'];
          if (pkgs is List && pkgs.isNotEmpty) {
            final firstPkg = pkgs.first;
            if (firstPkg != null && firstPkg['package'] != null) {
              firstOrder = firstPkg['package']['order'];
            }
          }
          firstOrder ??= shipment['order'];
        }
        firstOrder ??= stop['order'];
      } catch (_) {}

      final String? shipmentIdStr = shipmentId?.toString();
      final String orderCode = firstOrder?['orderCode']?.toString() ??
          stop['shipment']?['trackingNumber']?.toString() ??
          stop['shipment']?['shipmentCode']?.toString() ??
          (shipmentIdStr != null
              ? 'SHP-${(shipmentIdStr.length >= 8 ? shipmentIdStr.substring(0, 8) : shipmentIdStr).toUpperCase()}'
              : 'ORD-66266482-0${i + 1}');
      final String receiverName = firstOrder?['receiverName']?.toString() ??
          stop['receiverName']?.toString() ??
          (facilityObj?['facilityName'] != null ? 'Bưu cục: ${facilityObj['facilityName']}' : 'Chuyến xe trung chuyển');
      final String receiverPhone = firstOrder?['receiverPhone']?.toString() ?? stop['receiverPhone']?.toString() ?? '';
      final money = _resolveStopMoney(firstOrder, stop, stopType);
      final String feePayer = money.feePayer;
      final num codAmount = money.codAmount;
      final num shippingFee = money.shippingFee;
      final bool isReceiverPayFee = money.isReceiverPayFee;
      final num totalToCollect = money.totalToCollect;
      final String rawStopStatus = (stop['status']?.toString() ?? '').toUpperCase();
      final String rawOrderStatus = (firstOrder?['status']?.toString() ?? '').toUpperCase();
      final shipmentObj = stop['shipment'];
      final String rawShipmentStatus = (shipmentObj?['status']?.toString() ?? '').toUpperCase();
      final transfers = shipmentObj?['shipmentTransfers'] as List?;

      final bool isDispatched = _resolveIsDispatched(transfers, rawShipmentStatus, rawStopStatus);

      final bool isFirstStop = (i == 0);
      final bool isLastStop = (i == stopsRaw.length - 1);
      final bool isIntermediateStop = !isFirstStop && !isLastStop;

      bool isCompleted = false;
      String displayStatus = 'CHỜ THỰC HIỆN';
      bool isActive = false;

      if (isLinehaul) {
        final stopStatus = _resolveLinehaulStatus(
          isFirstStop: isFirstStop,
          isIntermediateStop: isIntermediateStop,
          rawStopStatus: rawStopStatus,
          rawShipmentStatus: rawShipmentStatus,
          isDispatched: isDispatched,
          transfers: transfers,
          stopsRaw: stopsRaw,
          prevLoadedTotesCount: prevLoadedTotesCount,
        );
        isCompleted = stopStatus.isCompleted;
        displayStatus = stopStatus.displayStatus;
        isActive = stopStatus.isActive;
      } else {
        final stopStatus = _resolveLastMileStatus(
          stopType: stopType,
          rawStopStatus: rawStopStatus,
          rawOrderStatus: rawOrderStatus,
          isRouteStarted: isRouteStarted,
          foundActiveIncomplete: foundActiveIncomplete,
        );
        isCompleted = stopStatus.isCompleted;
        displayStatus = stopStatus.displayStatus;
        isActive = stopStatus.isActive;
        foundActiveIncomplete = stopStatus.foundActiveIncomplete;
      }

      final String stopTitle = isLinehaul
          ? (isFirstStop
              ? 'Điểm xuất thùng trung chuyển'
              : isIntermediateStop
                  ? 'Điểm ghé trung chuyển (Bốc thêm hàng)'
                  : 'Điểm giao thùng kho đích')
          : (stopType == 'PICKUP' ? 'Điểm lấy hàng' : 'Điểm giao hàng');

      mappedStops.add({
        'index': i + 1,
        'id': stop['id'] ?? '$i',
        'shipmentId': shipmentId,
        'orderCode': orderCode,
        'receiverName': receiverPhone.isNotEmpty ? '$receiverName ($receiverPhone)' : receiverName,
        'codAmount': codAmount,
        'shippingFee': shippingFee,
        'feePayer': feePayer,
        'isReceiverPayFee': isReceiverPayFee,
        'totalToCollect': totalToCollect,
        'stopType': stopType,
        'isPickup': (stopType == 'PICKUP'),
        'isFirstStop': isFirstStop,
        'isLastStop': isLastStop,
        'isIntermediate': isIntermediateStop,
        'title': stopTitle,
        'address': address,
        'latitude': lat,
        'longitude': lng,
        'packages': totalPkgCount > 0 ? totalPkgCount : 1,
        'loadedTotesCount': loadedTotesCount,
        'loadedTotes': loadedToteCodes,
        'isLinehaul': isLinehaul,
        'isDispatched': isDispatched,
        'eta': 'Chờ giao',
        'distance': 'Theo tuyến',
        'status': displayStatus,
        'orderStatus': rawOrderStatus,
        'isActive': isActive,
        'isCheckedIn': isCompleted,
        'signature': null,
        'photo': null,
      });
    } catch (e) {
      debugPrint('[DriverDashboard] Loi khi map diem dung $i: $e');
    }
  }

  return DriverRouteMapResult(
    mappedStops: mappedStops,
    isLinehaul: isLinehaul,
    loadedTotesCount: loadedTotesCount,
    loadedToteCodes: loadedToteCodes,
    totalPkgCount: totalPkgCount,
  );
}
