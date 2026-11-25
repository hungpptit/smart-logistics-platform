import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/theme/app_styles.dart';
import '../../core/utils/app_snackbar.dart';
import '../../core/constants/app_constants.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../services/socket_service.dart';
import 'widgets/dashboard/ai_assistant_fab.dart';
import 'widgets/dashboard/dashboard_app_bar.dart';
import 'widgets/dashboard/delivery_scan_banner.dart';
import 'widgets/dashboard/driver_drawer.dart';
import 'widgets/dashboard/empty_routes_placeholder.dart';
import 'widgets/dashboard/finish_route_success_dialog.dart';
import 'widgets/dashboard/location_permission_dialog.dart';
import 'widgets/dashboard/location_service_dialog.dart';
import 'widgets/dashboard/pickup_assignment_banner.dart';
import 'widgets/dashboard/route_scan_reminder_dialog.dart';
import 'widgets/dashboard/tote_scan_button.dart';
import 'widgets/duty_status_card.dart';
import 'widgets/stats_bento_card.dart';
import 'widgets/map_preview_card.dart';
import 'widgets/finish_route_card.dart';
import 'widgets/stop_card.dart';
import 'widgets/navigation_screen.dart';
import '../../navigation/navigation_engine.dart';
import '../../navigation/route_model.dart';
import '../../navigation/polyline_codec.dart';
import '../../services/speed_limit_service.dart';
import 'widgets/stop_details_dialog.dart';
import 'widgets/qr_scanner_dialog.dart';
import 'widgets/shipment_qr_modal.dart';
import 'widgets/tote_detail_dialog.dart';
import 'widgets/pickup_assignment_dialog.dart';
import 'widgets/reject_route_dialog.dart';
import 'driver_chat_screen.dart';

/// Driver Dashboard - Main screen for drivers.
/// All UI widgets extracted to screens/driver/widgets/ directory.
/// This file only contains: State, data-fetching logic, business callbacks.
class DriverDashboard extends StatefulWidget {
  const DriverDashboard({super.key});

  @override
  State<DriverDashboard> createState() => _DriverDashboardState();
}

class _DriverDashboardState extends State<DriverDashboard> {
  // ------ State ------
  bool _isDutyActive = true;
  bool _isDutyLoading = false;
  bool _isRouteFinished = false;
  bool _isRouteStarted = false;
  bool _isNavigating = false;
  Timer? _routeRefreshTimer;
  bool _isFetchingRoutes = false;

  bool _isLinehaulRoute = false;
  bool _isLinehaulDriverProfile = false;
  int _loadedTotesCount = 0;
  int _totalPackageCount = 0;
  List<String> _loadedTotes = [];

  final List<Map<String, dynamic>> _driverStops = [];
  String _driverName = 'Tài xế';
  String _driverEmail = 'driver@velocity.vn';
  String? _activeRouteId;
  String? _activeRouteCode;
  String? _lastShownPickupDialogRouteId;
  List<LatLng> _roadPolylinePoints = [];

  // GPS
  StreamSubscription<Position>? _positionSubscription;
  LatLng _currentLocation = AppConstants.defaultHcmLocation;
  final MapController _mapController = MapController();
  final MapController _navMapController = MapController();
  NavigationEngine? _navigationEngine;

  // ------ Helpers ------
  String _formatCurrency(num amount) {
    final int value = amount.round();
    final String str = value.toString();
    final RegExp reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    final String result = str.replaceAllMapped(reg, (Match m) => '${m[1]}.');
    return '$result d';
  }

  // ------ Lifecycle ------
  @override
  void initState() {
    super.initState();
    _loadDriverProfile();
    _initSocketAndFetchRoutes();
    _initLocationService();
    SocketService().onRoutesUpdated(() {
      if (mounted) _initSocketAndFetchRoutes();
    });
    _routeRefreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (mounted && !_isDutyLoading) _initSocketAndFetchRoutes();
    });
  }

  @override
  void dispose() {
    _routeRefreshTimer?.cancel();
    _positionSubscription?.cancel();
    _navigationEngine?.dispose();
    SocketService().disconnect();
    super.dispose();
  }

  // ------ Data Fetching ------
  Future<void> _initSocketAndFetchRoutes({bool force = false}) async {
    if (_isFetchingRoutes && !force) return;
    _isFetchingRoutes = true;
    try {
      final token = await AuthService.getToken();
      if (token != null && token.isNotEmpty) {
        SocketService().connect(token: token);
      }
      final routes = await DriverService.fetchMyRoutes();
      if (routes.isNotEmpty && mounted) {
        final activeRoutes = routes.where((r) {
          final st = (r['status']?.toString() ?? '').toUpperCase();
          return st == 'IN_PROGRESS' || st == 'ASSIGNED' || st == 'PLANNED' || st == 'PENDING';
        }).toList();

        if (activeRoutes.isEmpty) {
          // Tài xế đã chốt xong toàn bộ chuyến đi và không còn chuyến nào đang chạy!
          setState(() {
            _activeRouteId = null;
            _activeRouteCode = null;
            _driverStops.clear();
            _roadPolylinePoints.clear();
            _isRouteFinished = false;
            _isRouteStarted = false;
            _loadedTotesCount = 0;
            _totalPackageCount = 0;
            _loadedTotes.clear();
          });
          return;
        }

        final firstRoute = activeRoutes.firstWhere(
          (r) => (r['status']?.toString() ?? '').toUpperCase() == 'IN_PROGRESS',
          orElse: () => activeRoutes.first,
        );
        final firstStatus = (firstRoute['status']?.toString() ?? '').toUpperCase();
        _isRouteFinished = false;
        _isRouteStarted = (firstStatus == 'IN_PROGRESS');
        _activeRouteId = firstRoute['id']?.toString();
        _activeRouteCode = firstRoute['routeCode']?.toString() ?? _activeRouteId;
        if (_activeRouteId != null) {
          SocketService().joinRoute(_activeRouteId!);
          List stopsRaw = (firstRoute['stops'] ?? firstRoute['routeStops'] ?? []);
          if (stopsRaw.isEmpty) {
            final routeDetail = await DriverService.fetchRouteDetail(_activeRouteId!);
            if (routeDetail != null) {
              stopsRaw = (routeDetail['stops'] ?? routeDetail['routeStops'] ?? []);
            }
          }
          if (stopsRaw.isNotEmpty) {
            final Set<String> allToteCodes = {};
            int totalPkgCount = 0;
            bool isLinehaul = _isLinehaulDriverProfile;

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
                      isLinehaul = true;
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
                      isLinehaul = true;
                    }
                  }
                }
              }
            }

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

                final String orderCode = firstOrder?['orderCode']?.toString() ??
                    stop['shipment']?['trackingNumber']?.toString() ??
                    stop['shipment']?['shipmentCode']?.toString() ??
                    (shipmentId != null
                        ? 'SHP-${shipmentId.toString().substring(0, 8).toUpperCase()}'
                        : 'ORD-66266482-0${i + 1}');
                final String receiverName = firstOrder?['receiverName']?.toString() ??
                    stop['receiverName']?.toString() ??
                    (facilityObj?['facilityName'] != null ? 'Bưu cục: ${facilityObj['facilityName']}' : 'Chuyến xe trung chuyển');
                final String receiverPhone = firstOrder?['receiverPhone']?.toString() ?? stop['receiverPhone']?.toString() ?? '';
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
                final String rawStopStatus = (stop['status']?.toString() ?? '').toUpperCase();
                final String rawOrderStatus = (firstOrder?['status']?.toString() ?? '').toUpperCase();
                final shipmentObj = stop['shipment'];
                final String rawShipmentStatus = (shipmentObj?['status']?.toString() ?? '').toUpperCase();
                final transfers = shipmentObj?['shipmentTransfers'] as List?;

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

                final bool isFirstStop = (i == 0);
                final bool isLastStop = (i == stopsRaw.length - 1);
                final bool isIntermediateStop = !isFirstStop && !isLastStop;

                bool isCompleted = false;
                String displayStatus = 'CHỜ THỰC HIỆN';
                bool isActive = false;

                if (isLinehaul) {
                  if (isFirstStop) {
                    if (rawStopStatus == 'DEPARTED' || rawStopStatus == 'COMPLETED' || isDispatched) {
                      isCompleted = true;
                      displayStatus = 'ĐÃ XUẤT BƯU CỤC';
                      isActive = false;
                    } else {
                      isCompleted = false;
                      displayStatus = _loadedTotesCount > 0 ? 'ĐÃ BỐC $_loadedTotesCount THÙNG' : 'CHỜ BỐC HÀNG';
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
                          ? (stopsRaw[1]['status'] == 'DEPARTED' || stopsRaw[1]['status'] == 'COMPLETED')
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
                } else {
                  // Last-mile Shipper logic
                  if (stopType == 'PICKUP') {
                    isCompleted = (rawStopStatus == 'COMPLETED' ||
                        rawStopStatus == 'DEPARTED' ||
                        rawOrderStatus == 'PICKED_UP' ||
                        rawOrderStatus == 'ARRIVED_ORIGIN_FACILITY');
                    if (isCompleted) {
                      displayStatus = 'ĐÃ LẤY HÀNG';
                      isActive = false;
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
                    if (!_isRouteStarted) {
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
                  'isActive': isActive,
                  'isCheckedIn': isCompleted,
                  'signature': null,
                  'photo': null,
                });
              } catch (e) {
                debugPrint('[DriverDashboard] Loi khi map diem dung $i: $e');
              }
            }
            if (mappedStops.isNotEmpty && mounted) {
              setState(() {
                _driverStops.clear();
                _driverStops.addAll(mappedStops);
                _isLinehaulRoute = isLinehaul;
                _loadedTotesCount = loadedTotesCount;
                _totalPackageCount = totalPkgCount;
                _loadedTotes = loadedToteCodes;
              });
              _roadPolylinePoints.clear();
              Future.microtask(() => _updateGoongPolyline(force: true));

              // Tự động bật Popup phân công lộ trình lấy hàng nếu ĐÚNG LÀ TÀI XẾ CHẶNG CUỐI và có điểm dừng PICKUP
              final bool hasPickup = mappedStops.any((s) => s['stopType'] == 'PICKUP' || s['isPickup'] == true);
              if (!_isLinehaulDriverProfile &&
                  !isLinehaul &&
                  hasPickup &&
                  !_isRouteStarted &&
                  _activeRouteId != null &&
                  _lastShownPickupDialogRouteId != _activeRouteId) {
                _lastShownPickupDialogRouteId = _activeRouteId;
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (mounted && !_isRouteStarted && _activeRouteId != null && !_isLinehaulDriverProfile && !_isLinehaulRoute) {
                    _showPickupAssignmentDialog();
                  }
                });
              }
            }
          }
        }
      } else if (mounted) {
        setState(() {
          _activeRouteId = null;
          _activeRouteCode = null;
          _driverStops.clear();
          _roadPolylinePoints.clear();
          _lastShownPickupDialogRouteId = null;
        });
      }
    } finally {
      _isFetchingRoutes = false;
    }
  }

  Future<void> _loadDriverProfile() async {
    final name = await AuthService.getStoredUsername();
    final email = await AuthService.getStoredEmail();
    final isLinehaul = await AuthService.isLinehaulDriver();
    if (mounted) {
      setState(() {
        if (name != null) _driverName = name;
        if (email != null) _driverEmail = email;
        _isLinehaulDriverProfile = isLinehaul;
      });
    }
  }

  // ------ Location Service ------
  Future<void> _initLocationService() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (mounted) LocationServiceDialog.show(context, onRetryInit: _initLocationService);
      return;
    }
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (mounted) LocationPermissionDialog.show(context, permanent: false, onRetryInit: _initLocationService);
        return;
      }
    }
    if (permission == LocationPermission.deniedForever) {
      if (mounted) LocationPermissionDialog.show(context, permanent: true, onRetryInit: _initLocationService);
      return;
    }
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      if (mounted) {
        setState(() => _currentLocation = LatLng(position.latitude, position.longitude));
        _mapController.move(_currentLocation, 13.0);
        _navMapController.move(_currentLocation, 14.5);
        _updateGoongPolyline(force: true);
      }
    } catch (e) {
      debugPrint('Loi lay vi tri ban dau: $e');
    }
    await _positionSubscription?.cancel();
    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.bestForNavigation,
        distanceFilter: 0,
      ),
    ).listen((Position position) {
      if (mounted) {
        setState(() => _currentLocation = LatLng(position.latitude, position.longitude));
        if (_activeRouteId != null && _activeRouteId!.isNotEmpty) {
          SocketService().emitLocation(
            routeId: _activeRouteId!,
            latitude: position.latitude,
            longitude: position.longitude,
            speedMps: position.speed,
            headingDegrees: position.heading,
            accuracyMeters: position.accuracy,
          );
        }
        if (_isNavigating && _navigationEngine != null) {
          _navigationEngine!.processPosition(position);
        } else {
          _mapController.move(_currentLocation, 13.0);
        }
      }
    });
  }

  Future<void> _updateGoongPolyline({bool force = false}) async {
    if (_driverStops.isEmpty) return;
    if (!force && _roadPolylinePoints.isNotEmpty) {
      final double startDistance = Geolocator.distanceBetween(
        _currentLocation.latitude, _currentLocation.longitude,
        _roadPolylinePoints.first.latitude, _roadPolylinePoints.first.longitude,
      );
      if (startDistance < 300) return;
    }
    final List<LatLng> stopLatLngs = _driverStops.map((s) {
      final double lat = double.tryParse(s['latitude']?.toString() ?? '') ?? _currentLocation.latitude;
      final double lng = double.tryParse(s['longitude']?.toString() ?? '') ?? _currentLocation.longitude;
      return LatLng(lat, lng);
    }).toList();
    if (stopLatLngs.isNotEmpty) {
      try {
        final fullRoute = await DriverService.fetchFullSequentialRoute(
          driverLocation: _currentLocation,
          stopLatLngs: stopLatLngs,
        ).timeout(const Duration(milliseconds: 1500));
        if (mounted && fullRoute.isNotEmpty) {
          setState(() => _roadPolylinePoints = [_currentLocation, ...fullRoute.skip(1)]);
        }
      } catch (_) {}
    }
  }

  // ------ Duty Status ------
  Future<void> _toggleDutyStatus(bool newValue) async {
    if (_isDutyLoading) return;
    setState(() => _isDutyLoading = true);
    final targetStatus = newValue ? 'ACTIVE' : 'OFFLINE';
    final success = await DriverService.updateDutyStatus(targetStatus);
    if (mounted) {
      setState(() {
        _isDutyLoading = false;
        if (success) _isDutyActive = newValue;
      });
      ScaffoldMessenger.of(context).clearSnackBars();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success
                ? (newValue ? 'Đã bật ca làm việc' : 'Đã kết thúc ca làm việc')
                : 'Không thể thay đổi trạng thái ca làm việc',
            style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite),
          ),
          backgroundColor: success ? (newValue ? Colors.green.shade800 : AppColors.deepOnyx) : AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
          margin: const EdgeInsets.all(16.0),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  // ------ Navigation ------
  Future<void> _startNavigation() async {
    final bool allCompleted = _driverStops.isNotEmpty &&
        _driverStops.every((s) {
          final isPickup = s['stopType'] == 'PICKUP' ||
              s['title']?.toString().contains('lấy') == true ||
              s['title']?.toString().contains('xuất') == true;
          if (isPickup) {
            return s['isCheckedIn'] == true ||
                s['status'] == 'DA LAY HANG' ||
                s['status'] == 'ĐÃ LẤY HÀNG' ||
                s['status'] == 'COMPLETED';
          }
          return s['isCheckedIn'] == true ||
              s['status'] == 'DA GIAO' ||
              s['status'] == 'ĐÃ GIAO' ||
              s['status'] == 'COMPLETED';
        });

    final bool effectiveRouteStarted = _isRouteStarted ||
        allCompleted ||
        _isLinehaulDriverProfile ||
        _isLinehaulRoute ||
        _driverStops.any((s) => s['isCheckedIn'] == true);

    if (!effectiveRouteStarted) {
      final bool isPickup = _driverStops.any((s) => s['stopType'] == 'PICKUP' || s['isPickup'] == true);
      if (isPickup) {
        _showPickupAssignmentDialog();
        return;
      }

      RouteScanReminderDialog.show(
        context,
        onScanNow: () => _showQRScanner(null, 'ROUTE'),
      );
      return;
    }

    // Determine target destination stop
    final incomplete = _driverStops.where((s) => s['isCheckedIn'] != true);
    final activeStop = incomplete.isNotEmpty ? incomplete.first : (_driverStops.isNotEmpty ? _driverStops.first : null);

    LatLng dest = _currentLocation;
    if (activeStop != null) {
      final double targetLat = double.tryParse(activeStop['latitude']?.toString() ?? '') ?? _currentLocation.latitude;
      final double targetLng = double.tryParse(activeStop['longitude']?.toString() ?? '') ?? _currentLocation.longitude;
      dest = LatLng(targetLat, targetLng);
    }

    // Fetch full Goong RouteModel
    RouteModel? routeModel;
    try {
      routeModel = await DriverService.fetchGoongRouteModel(
        origin: _currentLocation,
        destination: dest,
      );
    } catch (_) {}

    // Fallback if Goong API failed or offline: build basic route from polyline points
    if (routeModel == null || routeModel.isEmpty) {
      final pts = _roadPolylinePoints.isNotEmpty ? _roadPolylinePoints : [_currentLocation, dest];
      final cum = PolylineCodec.computeCumulativeDistances(pts);
      routeModel = RouteModel(
        points: pts,
        cumDist: cum,
        steps: [
          NavStep(
            index: 0,
            instruction: activeStop?['address']?.toString() ?? 'Tiếp tục di chuyển đến điểm dừng',
            maneuver: 'straight',
            startDist: 0.0,
            endDist: cum.isNotEmpty ? cum.last : 100.0,
            startLocation: _currentLocation,
            endLocation: dest,
          ),
        ],
      );
    }

    _navigationEngine?.dispose();
    _navigationEngine = NavigationEngine(
      initialRoute: routeModel,
      destination: dest,
      vehicleType: (_isLinehaulDriverProfile || _isLinehaulRoute) ? 'TRUCK' : 'MOTORCYCLE',
      onRerouteRequested: (orig, target) async {
        return await DriverService.fetchGoongRouteModel(origin: orig, destination: target);
      },
    );

    // Kích hoạt động cơ điều hướng, tải camera và phát âm thanh mở đầu
    _navigationEngine!.start();

    if (mounted) {
      setState(() {
        _isNavigating = true;
      });
    }
  }

  void _stopNavigation() {
    _navigationEngine?.dispose();
    _navigationEngine = null;
    setState(() {
      _isNavigating = false;
    });
  }

  // ------ Stop Actions ------
  void _showStopDetailsDialog(Map<String, dynamic> stop) {
    if (_isLinehaulDriverProfile) {
      // Đối với tài xế trung chuyển: Bấm vào stop là mở trực tiếp Mã QR Chuyến xe cho kho quét
      _showShipmentQRModal();
      return;
    }

    StopDetailsDialog.show(
      context,
      stop: stop,
      formatCurrency: _formatCurrency,
      onCapturePhoto: _simulateCameraCapture,
      onCompleteStop: _completeStop,
      onShowQRScanner: () => _showQRScanner(stop),
      onShowShipmentQR: _showShipmentQRModal,
      onFailureConfirmed: () {
        setState(() {
          stop['status'] = 'THAT BAI';
          stop['isActive'] = false;
          final currentIndex = stop['index'] as int;
          final nextStop = _driverStops.firstWhere(
            (s) => s['index'] == currentIndex + 1,
            orElse: () => <String, dynamic>{},
          );
          if (nextStop.isNotEmpty) {
            nextStop['isActive'] = true;
            nextStop['status'] = 'DANG THUC HIEN';
          }
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Đã báo THẤT BẠI đơn hàng ${stop['orderCode']}!'),
              backgroundColor: AppColors.logisticsRed,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      },
    );
  }

  void _showQRScanner([Map<String, dynamic>? stop, String scanMode = 'ROUTE']) {
    final isLinehaul = _isLinehaulDriverProfile || _isLinehaulRoute || scanMode == 'TOTE';
    if (scanMode == 'TOTE' && !isLinehaul) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Chỉ Tài xế trung chuyển (Linehaul) mới có quyền quét nhận Thùng hàng!'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    QrScannerDialog.show(
      context,
      stop: isLinehaul ? null : stop,
      activeRouteCode: _activeRouteCode,
      activeRouteId: _activeRouteId,
      scanMode: scanMode,
      isLinehaulRoute: isLinehaul,
      onRouteCodeUpdated: (newCode) {
        if (newCode != null && newCode.isNotEmpty) {
          setState(() {
            _activeRouteCode = newCode;
            _activeRouteId = newCode;
            _isRouteStarted = true;
          });
        }
      },
      onRefreshRoutes: () => _initSocketAndFetchRoutes(force: true),
      onStopCheckedIn: (stop) {
        _completeStop(stop);
      },
    );
  }

  void _showShipmentQRModal() {
    ShipmentQrModal.show(context, activeRouteCode: _activeRouteCode, activeRouteId: _activeRouteId);
  }

  void _showToteDetailDialog() {
    if (!_isLinehaulDriverProfile) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Chức năng này chỉ dành cho Tài xế trung chuyển thùng hàng!'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    ToteDetailDialog.show(
      context,
      loadedTotes: _loadedTotes,
      totalPackageCount: _totalPackageCount,
    );
  }

  Future<void> _simulateCameraCapture(Map<String, dynamic> stop, VoidCallback onCaptured) async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.camera, maxWidth: 1024, maxHeight: 1024, imageQuality: 80,
      );
      if (image != null) {
        setState(() => stop['photo'] = image.path);
        onCaptured();
        return;
      }
    } catch (e) {
      debugPrint('[Camera] Loi may anh thiet bi: $e');
    }
    setState(() => stop['photo'] = 'captured_photo_url');
    onCaptured();
  }

  Future<void> _completeStop(Map<String, dynamic> stop) async {
    final bool isLinehaul = _isLinehaulDriverProfile;
    if (isLinehaul) {
      // Tài xế trung chuyển: Bật Mã QR chuyến xe để nhân viên kho quét duyệt trên Web
      _showShipmentQRModal();
      return;
    }

    // Luồng Shipper Chặng Cuối (Last-Mile)
    final orderCode = stop['orderCode'];
    final bool isPickupStop = stop['isPickup'] == true ||
        stop['stopType'] == 'PICKUP' ||
        stop['title']?.toString().toLowerCase().contains('lay hang') == true ||
        stop['status'] == 'PICKING' ||
        stop['status'] == 'READY_FOR_PICKUP' ||
        stop['status'] == 'PICKUP_ASSIGNED';

    final String nextStatus = isPickupStop ? 'PICKED_UP' : 'DELIVERED';
    final String reason = isPickupStop
        ? 'Shipper đã quét mã bưu kiện và xác nhận lấy hàng từ người gửi thành công'
        : 'Shipper đã hoàn thành giao hàng cho người nhận';

    setState(() {
      stop['isCheckedIn'] = true;
      stop['status'] = isPickupStop ? 'ĐÃ LẤY HÀNG' : 'ĐÃ GIAO';
      stop['isActive'] = false;
      final currentIndex = stop['index'] as int;
      final nextStop = _driverStops.firstWhere(
        (s) => s['index'] == currentIndex + 1,
        orElse: () => <String, dynamic>{},
      );
      if (nextStop.isNotEmpty) {
        nextStop['isActive'] = true;
        nextStop['status'] = 'ĐANG THỰC HIỆN';
      }
    });

    if (orderCode != null && orderCode.toString().isNotEmpty) {
      DriverService.updateOrderStatus(orderCode.toString(), nextStatus, reason: reason);
    }

    if (!mounted) return;
    _updateGoongPolyline(force: true);

    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white, size: 22),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                isPickupStop
                    ? 'Đã lấy hàng [${stop['orderCode'] ?? ''}] thành công!'
                    : 'Đã giao hàng [${stop['orderCode'] ?? ''}] thành công!',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF15803D),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _handleFinishRouteAndShift() async {
    if (_activeRouteId == null && _activeRouteCode == null) return;
    if (_isRouteFinished) return;
    final routeIdToComplete = _activeRouteId ?? _activeRouteCode!;
    setState(() => _isDutyLoading = true);
    final success = await DriverService.completeRoute(routeIdToComplete);
    if (mounted) {
      setState(() {
        _isDutyLoading = false;
        if (success) {
          _activeRouteId = null;
          _activeRouteCode = null;
          _driverStops.clear();
          _roadPolylinePoints.clear();
          _loadedTotesCount = 0;
          _totalPackageCount = 0;
          _loadedTotes.clear();
          _isRouteFinished = false;
          _isRouteStarted = false;
          _lastShownPickupDialogRouteId = null;
        }
      });
    }
    if (mounted) {
      FinishRouteSuccessDialog.show(
        context,
        success: success,
        onConfirm: () => _initSocketAndFetchRoutes(force: true),
      );
    }
  }

  // ------ Last-Mile Pickup Route Assignment Handlers ------
  void _showPickupAssignmentDialog() {
    // CHẶN BẢO VỆ: Chỉ áp dụng cho tài xế giao hàng chặng cuối (Last-Mile Shipper), tuyệt đối không hiển thị cho Linehaul
    if (_isLinehaulDriverProfile || _isLinehaulRoute) return;
    if (_activeRouteCode == null && _activeRouteId == null) return;
    if (_driverStops.isEmpty) return;

    PickupAssignmentDialog.show(
      context,
      routeCode: _activeRouteCode ?? _activeRouteId ?? '',
      stops: _driverStops,
      onAccept: _handleAcceptPickupRoute,
      onReject: _showRejectPickupRouteDialog,
    );
  }

  Future<void> _handleAcceptPickupRoute() async {
    if (_activeRouteId == null && _activeRouteCode == null) return;
    final routeIdToStart = _activeRouteId ?? _activeRouteCode!;

    setState(() => _isDutyLoading = true);
    final success = await DriverService.startRoute(routeIdToStart);
    if (mounted) {
      setState(() {
        _isDutyLoading = false;
        if (success) {
          _isRouteStarted = true;
        }
      });
      _initSocketAndFetchRoutes(force: true);

      AppSnackBar.show(
        context,
        immediateClear: true,
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white, size: 22),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Đã nhận Lộ trình gom hàng [$routeIdToStart] thành công! Đang bắt đầu chuyến...',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF15803D),
      );
    }
  }

  void _showRejectPickupRouteDialog() {
    if (_activeRouteCode == null && _activeRouteId == null) return;
    final routeId = _activeRouteId ?? _activeRouteCode!;

    RejectRouteDialog.show(
      context,
      routeCode: _activeRouteCode ?? routeId,
      onConfirmReject: (reason) async {
        setState(() => _isDutyLoading = true);
        final success = await DriverService.rejectRoute(routeId, reason);
        if (mounted) {
          setState(() {
            _isDutyLoading = false;
            if (success) {
              _activeRouteId = null;
              _activeRouteCode = null;
              _driverStops.clear();
              _roadPolylinePoints.clear();
              _isRouteStarted = false;
              _isRouteFinished = false;
              _lastShownPickupDialogRouteId = null;
            }
          });
          _initSocketAndFetchRoutes(force: true);

          AppSnackBar.show(
            context,
            immediateClear: true,
            content: Row(
              children: [
                const Icon(Icons.info_outline, color: Colors.white, size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    success
                        ? 'Đã từ chối lộ trình [$routeId] và gửi báo cáo về bưu cục điều phối.'
                        : 'Không thể gửi yêu cầu từ chối lộ trình. Vui lòng thử lại.',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
              ],
            ),
            backgroundColor: success ? AppColors.deepOnyx : AppColors.error,
          );
        }
      },
    );
  }

  // ------ Build ------
  @override
  Widget build(BuildContext context) {
    // If navigating: show full-screen GPS navigation
    if (_isNavigating && _navigationEngine != null) {
      return NavigationScreen(
        navMapController: _navMapController,
        engine: _navigationEngine!,
        currentLocation: _currentLocation,
        stops: _driverStops,
        onStopNavigation: _stopNavigation,
      );
    }

    final bool allCompleted = _driverStops.isNotEmpty &&
        _driverStops.every((s) {
          final isPickup = s['stopType'] == 'PICKUP' ||
              s['title']?.toString().contains('lấy') == true ||
              s['title']?.toString().contains('xuất') == true;
          if (isPickup) {
            return s['isCheckedIn'] == true ||
                s['status'] == 'DA LAY HANG' ||
                s['status'] == 'ĐÃ LẤY HÀNG' ||
                s['status'] == 'COMPLETED';
          }
          return s['isCheckedIn'] == true ||
              s['status'] == 'DA GIAO' ||
              s['status'] == 'ĐÃ GIAO' ||
              s['status'] == 'COMPLETED';
        });

    final bool effectiveRouteStarted = _isRouteStarted ||
        allCompleted ||
        _driverStops.any((s) =>
            s['isCheckedIn'] == true ||
            s['status'] == 'DA GIAO' ||
            s['status'] == 'ĐÃ GIAO' ||
            s['status'] == 'DA LAY HANG' ||
            s['status'] == 'ĐÃ LẤY HÀNG' ||
            s['status'] == 'COMPLETED');

    final bool isPickupRoute = _driverStops.isNotEmpty &&
        _driverStops.any((s) => s['stopType'] == 'PICKUP' || s['isPickup'] == true);

    final bool showPickupAssignmentBanner = !effectiveRouteStarted &&
        _activeRouteCode != null &&
        !_isRouteFinished &&
        _driverStops.isNotEmpty &&
        !allCompleted &&
        !_isLinehaulDriverProfile &&
        !_isLinehaulRoute &&
        isPickupRoute;

    final bool showDeliveryScanBanner = !effectiveRouteStarted &&
        _activeRouteCode != null &&
        !_isRouteFinished &&
        _driverStops.isNotEmpty &&
        !allCompleted &&
        !_isLinehaulDriverProfile &&
        !_isLinehaulRoute &&
        !isPickupRoute;

    final bool showToteActions = _isLinehaulDriverProfile || _isLinehaulRoute;

    return Scaffold(
      backgroundColor: AppColors.cloudGray,
      appBar: const DashboardAppBar(),
      drawer: DriverDrawer(
        name: _driverName,
        email: _driverEmail,
        onOpenChat: () {
          Navigator.pop(context);
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const DriverChatScreen()),
          );
        },
        onLogout: () async {
          SpeedLimitService().clearCache();
          await AuthService.clearAuthData();
          if (context.mounted) Navigator.pushReplacementNamed(context, '/');
        },
      ),
      body: RefreshIndicator(
        onRefresh: () async => _initSocketAndFetchRoutes(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          padding: const EdgeInsets.all(AppStyles.marginMobile),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Duty Status Toggle Card ("Trạng thái: Trực tuyến")
              DutyStatusCard(
                isDutyActive: _isDutyActive,
                isDutyLoading: _isDutyLoading,
                onToggle: _toggleDutyStatus,
              ),
              // 2. Quick Action ("Quét Nhận Thùng Hàng") - Only for Linehaul Driver
              if (showToteActions) ...[
                ToteScanButton(
                  onPressed: () {
                    final activeStop = _driverStops.firstWhere(
                      (s) => s['isCheckedIn'] != true,
                      orElse: () => _driverStops.isNotEmpty ? _driverStops.first : <String, dynamic>{},
                    );
                    _showQRScanner(activeStop, 'TOTE');
                  },
                ),
                const SizedBox(height: 20.0),
              ],

              // 3A. Pickup Assignment Banner (when a Pickup route is assigned to Last-mile driver)
              if (showPickupAssignmentBanner)
                PickupAssignmentBanner(
                  routeCode: _activeRouteCode ?? '',
                  stopCount: _driverStops.length,
                  onReject: _showRejectPickupRouteDialog,
                  onView: _showPickupAssignmentDialog,
                ),

              // 3B. Delivery Scan Banner (when a Hub Delivery route is assigned with Hub Tote)
              if (showDeliveryScanBanner)
                DeliveryScanBanner(
                  routeCode: _activeRouteCode ?? '',
                  onScan: () => _showQRScanner(null, 'ROUTE'),
                ),

              // 4. Stats Bento Card
              StatsBentoCard(
                stops: _driverStops,
                isRouteStarted: effectiveRouteStarted,
                currentLocation: _currentLocation,
                isLinehaul: _isLinehaulDriverProfile || _isLinehaulRoute,
                loadedTotesCount: _loadedTotesCount,
                totalPackageCount: _totalPackageCount,
              ),
              const SizedBox(height: 16.0),

              // 4. Finish Route Card (visible when all stops done = 100%)
              if (allCompleted)
                FinishRouteCard(
                  isDutyLoading: _isDutyLoading,
                  isFinished: _isRouteFinished,
                  onFinish: _handleFinishRouteAndShift,
                ),

              // 5. Live Map Preview Card
              MapPreviewCard(
                mapController: _mapController,
                currentLocation: _currentLocation,
                stops: _driverStops,
                roadPolylinePoints: _roadPolylinePoints,
                onStartNavigation: _startNavigation,
                isRouteStarted: effectiveRouteStarted,
                isLinehaul: _isLinehaulDriverProfile || _isLinehaulRoute,
              ),
              const SizedBox(height: 24.0),

              // 6. Route List
              Text(
                'Lộ trình trong ngày',
                style: AppTypography.headlineMd.copyWith(fontWeight: FontWeight.bold, color: AppColors.deepOnyx),
              ),
              const SizedBox(height: 12.0),
              if (_driverStops.isEmpty)
                const EmptyRoutesPlaceholder()
              else
                Column(
                  children: _driverStops.map((stop) {
                    return Column(
                      children: [
                        StopCard(
                          stop: stop,
                          onTap: () => _showStopDetailsDialog(stop),
                          onShowToteDetails: _showToteDetailDialog,
                        ),
                        const SizedBox(height: 12.0),
                      ],
                    );
                  }).toList(),
                ),
            ],
          ),
        ),
      ),
      floatingActionButton: AiAssistantFab(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const DriverChatScreen()),
          );
        },
      ),
    );
  }
}
