import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/theme/app_styles.dart';
import '../../core/constants/app_constants.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../services/socket_service.dart';
import 'widgets/duty_status_card.dart';
import 'widgets/stats_bento_card.dart';
import 'widgets/map_preview_card.dart';
import 'widgets/finish_route_card.dart';
import 'widgets/stop_card.dart';
import 'widgets/navigation_screen.dart';
import 'widgets/stop_details_dialog.dart';
import 'widgets/qr_scanner_dialog.dart';
import 'widgets/shipment_qr_modal.dart';
import 'widgets/tote_detail_dialog.dart';

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
  bool _showTrafficAlert = false;
  Timer? _alertTimer;
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
  List<LatLng> _roadPolylinePoints = [];

  // GPS
  StreamSubscription<Position>? _positionSubscription;
  LatLng _currentLocation = AppConstants.defaultHcmLocation;
  final MapController _mapController = MapController();
  final MapController _navMapController = MapController();

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
    _alertTimer?.cancel();
    _routeRefreshTimer?.cancel();
    _positionSubscription?.cancel();
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
            int loadedTotesCount = 0;
            int totalPkgCount = 0;
            List<String> loadedToteCodes = [];
            bool isLinehaul = _isLinehaulDriverProfile;

            for (final s in stopsRaw) {
              final shipment = s['shipment'];
              if (shipment != null) {
                final pkgs = shipment['shipmentPackages'] as List?;
                if (pkgs != null && pkgs.length > totalPkgCount) {
                  totalPkgCount = pkgs.length;
                }
                final scans = shipment['warehouseScans'] as List?;
                if (scans != null) {
                  final Set<String> toteSet = {};
                  for (final scan in scans) {
                    final tote = scan['toteBag'];
                    if (tote != null && tote['toteCode'] != null) {
                      toteSet.add(tote['toteCode'].toString());
                    }
                  }
                  if (toteSet.isNotEmpty) {
                    loadedToteCodes = toteSet.toList();
                    loadedTotesCount = toteSet.length;
                    isLinehaul = true;
                  }
                }
              }
            }

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

                bool isCompleted = false;
                String displayStatus = 'CHỜ THỰC HIỆN';
                bool isActive = false;

                if (isLinehaul) {
                  if (stopType == 'PICKUP') {
                    if (isDispatched || rawStopStatus == 'DEPARTED' || rawStopStatus == 'COMPLETED') {
                      isCompleted = true;
                      displayStatus = 'ĐÃ XUẤT BƯU CỤC';
                      isActive = false;
                    } else {
                      isCompleted = false;
                      displayStatus = _loadedTotesCount > 0 ? 'ĐÃ BỐC $_loadedTotesCount THÙNG' : 'CHỜ BỐC HÀNG';
                      isActive = true;
                    }
                  } else {
                    final bool isDestInbounded = rawShipmentStatus == 'AT_HUB' ||
                        rawShipmentStatus == 'ARRIVED_DEST_FACILITY' ||
                        rawShipmentStatus == 'DELIVERED' ||
                        rawStopStatus == 'COMPLETED' ||
                        (transfers != null && transfers.any((t) => t['status'] == 'COMPLETED'));
                    if (isDestInbounded) {
                      isCompleted = true;
                      displayStatus = 'ĐÃ TỚI KHO ĐÍCH';
                      isActive = false;
                    } else if (isDispatched) {
                      isCompleted = false;
                      displayStatus = 'ĐANG THỰC HIỆN';
                      isActive = true;
                    } else {
                      isCompleted = false;
                      displayStatus = 'CHỜ THỰC HIỆN';
                      isActive = false;
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
                      displayStatus = 'CHỜ QUÉT NHẬN';
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
                    ? (stopType == 'PICKUP' ? 'Điểm xuất thùng trung chuyển' : 'Điểm giao thùng kho đích')
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
            }
          }
        }
      } else if (mounted) {
        setState(() {
          _activeRouteId = null;
          _activeRouteCode = null;
          _driverStops.clear();
          _roadPolylinePoints.clear();
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
      if (mounted) _showLocationServiceDialog();
      return;
    }
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (mounted) _showPermissionDeniedDialog(false);
        return;
      }
    }
    if (permission == LocationPermission.deniedForever) {
      if (mounted) _showPermissionDeniedDialog(true);
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
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 5),
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
        if (_isNavigating) {
          _navMapController.move(_currentLocation, 14.5);
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
  void _startNavigation() {
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
      final activeStop = _driverStops.firstWhere(
        (s) => s['isCheckedIn'] != true,
        orElse: () => _driverStops.isNotEmpty ? _driverStops.first : <String, dynamic>{},
      );
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.pureWhite,
          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Color(0xFFD97706), size: 28),
              SizedBox(width: 8),
              Text('Chưa Quét Nhận Chuyến Xe',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFFB45309))),
            ],
          ),
          content: const Text(
              'Tài xế chưa quét nhận chuyến xe tại bưu cục. Vui lòng quét mã QR Thùng hàng / Chuyến xe để nhận chuyến trước khi bật Dẫn đường!'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Để sau', style: TextStyle(color: AppColors.secondary)),
            ),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.pop(ctx);
                _showQRScanner(null, 'ROUTE');
              },
              icon: const Icon(Icons.qr_code_scanner, size: 18),
              label: const Text('QUÉT NHẬN NGAY', style: TextStyle(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD97706),
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      );
      return;
    }
    setState(() { _isNavigating = true; _showTrafficAlert = false; });
    _alertTimer?.cancel();
    _alertTimer = Timer(const Duration(seconds: 3), () {
      if (mounted && _isNavigating) {
        setState(() => _showTrafficAlert = true);
        Timer(const Duration(seconds: 5), () {
          if (mounted) setState(() => _showTrafficAlert = false);
        });
      }
    });
  }

  void _stopNavigation() {
    setState(() { _isNavigating = false; _showTrafficAlert = false; });
    _alertTimer?.cancel();
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
    if (scanMode == 'TOTE' && !_isLinehaulDriverProfile) {
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
      stop: stop,
      activeRouteCode: _activeRouteCode,
      activeRouteId: _activeRouteId,
      scanMode: scanMode,
      isLinehaulRoute: _isLinehaulDriverProfile,
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
        }
      });
    }
    if (mounted) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.pureWhite,
          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
          title: const Row(
            children: [
              Icon(Icons.stars, color: Color(0xFF166534), size: 28),
              SizedBox(width: 8.0),
              Text('Chốt Thành Công!',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF166534))),
            ],
          ),
          content: Text(success
              ? 'Bạn đã chốt hoàn thành 100% chuyến đi trên hệ thống! Tài xế chuyển sang Sẵn sàng nhận chuyến tiếp theo.'
              : 'Đã gửi yêu cầu chốt chuyến đi thành công đến máy chủ.'),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                _initSocketAndFetchRoutes(force: true);
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF166534), foregroundColor: AppColors.pureWhite),
              child: const Text('Đồng ý'),
            ),
          ],
        ),
      );
    }
  }

  // ------ Location Permission Dialogs ------
  void _showLocationServiceDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.location_off, color: AppColors.logisticsRed),
            SizedBox(width: 8),
            Text('Chưa bật định vị'),
          ],
        ),
        content: const Text('Dịch vụ định vị GPS trên thiết bị của bạn đang tắt. Vui lòng bật định vị để ứng dụng có thể hiển thị bản đồ và dẫn đường chính xác.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Hủy', style: TextStyle(color: AppColors.secondary))),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              await Geolocator.openLocationSettings();
              Future.delayed(const Duration(seconds: 2), _initLocationService);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.deepOnyx, foregroundColor: AppColors.pureWhite),
            child: const Text('Mở Cài đặt'),
          ),
        ],
      ),
    );
  }

  void _showPermissionDeniedDialog(bool permanent) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.security, color: permanent ? AppColors.logisticsRed : AppColors.secondary),
            const SizedBox(width: 8),
            const Text('Quyền định vị'),
          ],
        ),
        content: Text(permanent
            ? 'Bạn đã từ chối vĩnh viễn quyền định vị. Vui lòng mở Cài đặt ứng dụng để cấp quyền thủ công.'
            : 'Ứng dụng cần quyền định vị để hiển thị vị trí của bạn trên bản đồ.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Hủy', style: TextStyle(color: AppColors.secondary))),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              if (permanent) {
                await Geolocator.openAppSettings();
              } else {
                _initLocationService();
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.deepOnyx, foregroundColor: AppColors.pureWhite),
            child: Text(permanent ? 'Mở Cài đặt' : 'Cấp quyền'),
          ),
        ],
      ),
    );
  }

  // ------ Build ------
  @override
  Widget build(BuildContext context) {
    // If navigating: show full-screen GPS navigation
    if (_isNavigating) {
      return NavigationScreen(
        navMapController: _navMapController,
        currentLocation: _currentLocation,
        stops: _driverStops,
        roadPolylinePoints: _roadPolylinePoints,
        showTrafficAlert: _showTrafficAlert,
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

    final bool showPendingScanBanner = !effectiveRouteStarted &&
        _activeRouteCode != null &&
        !_isRouteFinished &&
        _driverStops.isNotEmpty &&
        !allCompleted &&
        !_isLinehaulDriverProfile &&
        !_isLinehaulRoute;

    final bool showToteActions = _isLinehaulDriverProfile || _isLinehaulRoute;

    return Scaffold(
      backgroundColor: AppColors.cloudGray,
      appBar: AppBar(
        backgroundColor: AppColors.pureWhite,
        elevation: 0.5,
        title: Text(
          'Velocity Logistics',
          style: AppTypography.headlineMd.copyWith(color: AppColors.logisticsRed, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(icon: const Icon(Icons.notifications_none, color: AppColors.deepOnyx), onPressed: () {}),
          Padding(
            padding: const EdgeInsets.only(right: 16.0, left: 4.0),
            child: CircleAvatar(
              radius: 18.0,
              backgroundImage: const NetworkImage(AppConstants.defaultAvatarUrl),
              backgroundColor: AppColors.surfaceContainerHighest,
            ),
          ),
        ],
      ),
      drawer: Drawer(
        backgroundColor: AppColors.pureWhite,
        child: Column(
          children: [
            UserAccountsDrawerHeader(
              decoration: const BoxDecoration(color: AppColors.deepOnyx),
              currentAccountPicture: const CircleAvatar(
                backgroundImage: NetworkImage(AppConstants.drawerHeaderAvatarUrl),
              ),
              accountName: Text(_driverName, style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite, fontWeight: FontWeight.bold)),
              accountEmail: Text(_driverEmail, style: AppTypography.labelMd.copyWith(color: Colors.white70)),
            ),
            ListTile(leading: const Icon(Icons.home, color: AppColors.logisticsRed), title: const Text('Trang chủ'), onTap: () => Navigator.pop(context)),
            ListTile(leading: const Icon(Icons.inventory_2, color: AppColors.secondary), title: const Text('Đơn hàng đang giao'), onTap: () {}),
            ListTile(leading: const Icon(Icons.history, color: AppColors.secondary), title: const Text('Lịch sử lộ trình'), onTap: () {}),
            ListTile(leading: const Icon(Icons.query_stats, color: AppColors.secondary), title: const Text('Hiệu suất'), onTap: () {}),
            const Divider(),
            ListTile(leading: const Icon(Icons.settings, color: AppColors.secondary), title: const Text('Cài đặt'), onTap: () {}),
            const Spacer(),
            ListTile(
              leading: const Icon(Icons.logout, color: AppColors.error),
              title: const Text('Đăng xuất'),
              onTap: () async {
                await AuthService.clearAuthData();
                if (context.mounted) Navigator.pushReplacementNamed(context, '/');
              },
            ),
            const SizedBox(height: 20.0),
          ],
        ),
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
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      final activeStop = _driverStops.firstWhere(
                        (s) => s['isCheckedIn'] != true,
                        orElse: () => _driverStops.isNotEmpty ? _driverStops.first : <String, dynamic>{},
                      );
                      _showQRScanner(activeStop, 'TOTE');
                    },
                    icon: const Icon(Icons.inventory_2, size: 20.0),
                    label: const Text(
                      'Quét Nhận Thùng Hàng Lên Xe Tải',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.logisticsRed,
                      foregroundColor: AppColors.pureWhite,
                      padding: const EdgeInsets.symmetric(vertical: 14.0),
                      elevation: 2,
                      shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                    ),
                  ),
                ),
                const SizedBox(height: 20.0),
              ],

              // 3. Pending Scan Banner (when route is assigned but not yet scanned/started)
              if (showPendingScanBanner)
                Container(
                  margin: const EdgeInsets.only(bottom: 20.0),
                  padding: const EdgeInsets.all(14.0),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(12.0),
                    border: Border.all(color: const Color(0xFFF59E0B), width: 1.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.qr_code_scanner, color: Color(0xFFB45309), size: 22),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Bưu cục đã phân công Chuyến Xe [$_activeRouteCode]',
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFFB45309)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Tài xế chưa quét nhận chuyến xe. Vui lòng bấm nút bên dưới để quét mã QR Thùng hàng / Chuyến xe tại bưu cục trước khi bắt đầu lộ trình!',
                        style: TextStyle(fontSize: 11, color: Color(0xFF92400E)),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            _showQRScanner(null, 'ROUTE');
                          },
                          icon: const Icon(Icons.qr_code_scanner, size: 18),
                          label: const Text('QUÉT NHẬN CHUYẾN XE NGAY', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFD97706),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ),
                    ],
                  ),
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
              ),
              const SizedBox(height: 24.0),

              // 6. Route List
              Text(
                'Lộ trình trong ngày',
                style: AppTypography.headlineMd.copyWith(fontWeight: FontWeight.bold, color: AppColors.deepOnyx),
              ),
              const SizedBox(height: 12.0),
              if (_driverStops.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 32.0, horizontal: 20.0),
                  margin: const EdgeInsets.only(bottom: 20.0),
                  decoration: BoxDecoration(
                    color: AppColors.pureWhite,
                    borderRadius: BorderRadius.circular(16.0),
                    border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
                    boxShadow: AppStyles.ambientShadow,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16.0),
                        decoration: const BoxDecoration(
                          color: Color(0xFFF1F5F9),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.assignment_outlined, size: 36, color: Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        'Chưa Có Chuyến Xe Nào',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: AppColors.deepOnyx,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Hiện tại bạn chưa có chuyến xe nào được điều phối. Hãy duy trì trạng thái Trực tuyến để sẵn sàng nhận chuyến mới từ Bưu cục!',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: AppColors.secondary, height: 1.4),
                      ),
                    ],
                  ),
                )
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
    );
  }
}
