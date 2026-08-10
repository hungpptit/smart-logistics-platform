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
import 'widgets/shift_summary_dialog.dart';

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
  bool _isNavigating = false;
  bool _showTrafficAlert = false;
  Timer? _alertTimer;
  Timer? _routeRefreshTimer;
  bool _isFetchingRoutes = false;

  final List<Map<String, dynamic>> _driverStops = [];
  String _driverName = 'Tai xe';
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
  Future<void> _initSocketAndFetchRoutes() async {
    if (_isFetchingRoutes) return;
    _isFetchingRoutes = true;
    try {
      final token = await AuthService.getToken();
      if (token != null && token.isNotEmpty) {
        SocketService().connect(token: token);
      }
      final routes = await DriverService.fetchMyRoutes();
      if (routes.isNotEmpty && mounted) {
        final firstRoute = routes.first;
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
            final List<Map<String, dynamic>> mappedStops = [];
            bool foundActiveIncomplete = false;
            for (int i = 0; i < stopsRaw.length; i++) {
              try {
                final stop = stopsRaw[i];
                final stopType = stop['stopType'] ?? 'DELIVERY';
                final address = stop['facility']?['facilityName'] ??
                    stop['addressSnapshot'] ??
                    stop['addressLine1'] ??
                    stop['address'] ??
                    'Dia diem giao nhan Viet Nam';
                final shipmentId = stop['shipmentId'];
                final double lat = double.tryParse(stop['latitude']?.toString() ?? '') ?? (10.762 + i * 0.004);
                final double lng = double.tryParse(stop['longitude']?.toString() ?? '') ?? (106.682 + i * 0.004);

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
                        ? 'ORD-${shipmentId.toString().substring(0, 8).toUpperCase()}'
                        : 'ORD-66266482-0${i + 1}');
                final String receiverName = firstOrder?['receiverName']?.toString() ?? stop['receiverName']?.toString() ?? 'Khach nhan';
                final String receiverPhone = firstOrder?['receiverPhone']?.toString() ?? stop['receiverPhone']?.toString() ?? '';
                final paymentInfo = firstOrder?['payment'];
                final String feePayer = (paymentInfo?['feePayer'] ?? firstOrder?['feePayer'] ?? stop['feePayer'] ?? 'SENDER').toString();
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
                final bool isCompleted = (rawStopStatus == 'COMPLETED') ||
                    (rawOrderStatus == 'PICKED_UP') ||
                    (rawOrderStatus == 'ARRIVED_ORIGIN_FACILITY') ||
                    (rawOrderStatus == 'AT_HUB') ||
                    (rawOrderStatus == 'DELIVERED') ||
                    (rawOrderStatus == 'COMPLETED');
                String displayStatus;
                bool isActive = false;
                if (isCompleted) {
                  displayStatus = (stopType == 'PICKUP') ? 'DA LAY HANG' : 'DA GIAO';
                } else if (!foundActiveIncomplete) {
                  displayStatus = 'DANG THUC HIEN';
                  isActive = true;
                  foundActiveIncomplete = true;
                } else {
                  displayStatus = 'TIEP THEO';
                }
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
                  'title': stopType == 'PICKUP' ? 'Diem lay hang' : 'Diem giao hang',
                  'address': address,
                  'latitude': lat,
                  'longitude': lng,
                  'packages': 1,
                  'eta': 'Cho giao',
                  'distance': 'Theo tuyen',
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
              });
              _roadPolylinePoints.clear();
              _updateGoongPolyline(force: true);
            }
          }
        }
      } else if (mounted) {
        setState(() {
          if (_activeRouteCode == null || !_activeRouteCode!.startsWith('SHP-')) {
            _activeRouteId = null;
            _activeRouteCode = null;
          }
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
    if (mounted && (name != null || email != null)) {
      setState(() {
        if (name != null) _driverName = name;
        if (email != null) _driverEmail = email;
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
      final fullRoute = await DriverService.fetchFullSequentialRoute(
        driverLocation: _currentLocation, stopLatLngs: stopLatLngs,
      );
      if (mounted && fullRoute.isNotEmpty) {
        setState(() => _roadPolylinePoints = [_currentLocation, ...fullRoute.skip(1)]);
      }
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
                ? (newValue ? 'Da bat ca lam viec' : 'Da ket thuc ca lam viec')
                : 'Khong the thay doi trang thai ca lam viec',
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
    StopDetailsDialog.show(
      context,
      stop: stop,
      formatCurrency: _formatCurrency,
      onCapturePhoto: _simulateCameraCapture,
      onCompleteStop: _completeStop,
      onShowQRScanner: () => _showQRScanner(stop),
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
              content: Text('Da bao THAT BAI don hang ${stop['orderCode']}!'),
              backgroundColor: AppColors.logisticsRed,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      },
    );
  }

  void _showQRScanner([Map<String, dynamic>? stop]) {
    QrScannerDialog.show(
      context,
      stop: stop,
      activeRouteCode: _activeRouteCode,
      activeRouteId: _activeRouteId,
      onRouteCodeUpdated: (newCode) {
        if (newCode != null) {
          setState(() { _activeRouteCode = newCode; _activeRouteId = newCode; });
        }
      },
      onRefreshRoutes: _initSocketAndFetchRoutes,
      onStopCheckedIn: (stop) {
        setState(() => stop['isCheckedIn'] = true);
        _showStopDetailsDialog(stop);
      },
    );
  }

  void _showShipmentQRModal() {
    ShipmentQrModal.show(context, activeRouteCode: _activeRouteCode, activeRouteId: _activeRouteId);
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
    final shipmentId = stop['shipmentId'];
    final orderCode = stop['orderCode'];
    final bool isPickupStop = stop['isPickup'] == true ||
        stop['stopType'] == 'PICKUP' ||
        stop['title']?.toString().contains('lay hang') == true ||
        stop['status'] == 'PICKING' ||
        stop['status'] == 'READY_FOR_PICKUP' ||
        stop['status'] == 'PICKUP_ASSIGNED';
    final nextStatus = isPickupStop ? 'PICKED_UP' : 'DELIVERED';
    final reason = isPickupStop
        ? 'Shipper da quet ma buu kien va xac nhan lay hang tu nguoi gui thanh cong'
        : 'Shipper da hoan thanh giao hang cho nguoi nhan';

    if (orderCode != null && orderCode.toString().isNotEmpty) {
      await DriverService.updateOrderStatus(orderCode.toString(), nextStatus, reason: reason);
    }
    if (shipmentId != null && shipmentId.toString().isNotEmpty) {
      await DriverService.updateShipmentStatus(shipmentId.toString(), nextStatus, notes: reason);
    }

    setState(() {
      stop['status'] = isPickupStop ? 'DA LAY HANG' : 'DA GIAO';
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

    if (!mounted) return;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.pureWhite,
        shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
        title: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.green, size: 28),
            const SizedBox(width: 8.0),
            Text(
              isPickupStop ? 'Lay Hang Thanh Cong' : 'Giao Hang Thanh Cong',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ],
        ),
        content: Text(isPickupStop
            ? 'Da quet ma va xac nhan lay buu kien ${stop['orderCode'] ?? ''} thanh cong. Trang thai cap nhat sang DA LAY HANG.'
            : 'Da cap nhat trang thai Diem dung ${stop['title']} thanh DA GIAO va truyen thong tin POD len may chu.'),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.logisticsRed, foregroundColor: AppColors.pureWhite),
            child: const Text('Dong'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleFinishRouteAndShift() async {
    if (_activeRouteId == null && _activeRouteCode == null) return;
    final routeIdToComplete = _activeRouteId ?? _activeRouteCode!;
    setState(() => _isDutyLoading = true);
    final success = await DriverService.completeRoute(routeIdToComplete);
    if (mounted) setState(() => _isDutyLoading = false);
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
              Text('Chot Thanh Cong!',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF166534))),
            ],
          ),
          content: Text(success
              ? 'Ban da chot hoan thanh 100% chuyen di tren he thong! Tai xe chuyen sang San sang nhan chuyen tiep theo.'
              : 'Da gui yeu cau chot chuyen di thanh cong den may chu.'),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                _initSocketAndFetchRoutes();
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF166534), foregroundColor: AppColors.pureWhite),
              child: const Text('Dong y'),
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
            Text('Chua bat dinh vi'),
          ],
        ),
        content: const Text('Dich vu dinh vi GPS tren thiet bi cua ban dang tat. Vui long bat dinh vi de ung dung co the hien thi ban do va dan duong chinh xac.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Huy', style: TextStyle(color: AppColors.secondary))),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              await Geolocator.openLocationSettings();
              Future.delayed(const Duration(seconds: 2), _initLocationService);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.deepOnyx, foregroundColor: AppColors.pureWhite),
            child: const Text('Mo Cai dat'),
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
            const Text('Quyen dinh vi'),
          ],
        ),
        content: Text(permanent
            ? 'Ban da tu choi vinh vien quyen dinh vi. Vui long mo Cai dat ung dung de cap quyen thu cong.'
            : 'Ung dung can quyen dinh vi de hien thi vi tri cua ban tren ban do.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Huy', style: TextStyle(color: AppColors.secondary))),
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
            child: Text(permanent ? 'Mo Cai dat' : 'Cap quyen'),
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
        _driverStops.where((s) =>
            s['isCheckedIn'] == true ||
            s['status'] == 'DA GIAO' ||
            s['status'] == 'DA LAY HANG').length == _driverStops.length;

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
            ListTile(leading: const Icon(Icons.home, color: AppColors.logisticsRed), title: const Text('Trang chu'), onTap: () => Navigator.pop(context)),
            ListTile(leading: const Icon(Icons.inventory_2, color: AppColors.secondary), title: const Text('Don hang dang giao'), onTap: () {}),
            ListTile(leading: const Icon(Icons.history, color: AppColors.secondary), title: const Text('Lich su lo trinh'), onTap: () {}),
            ListTile(leading: const Icon(Icons.query_stats, color: AppColors.secondary), title: const Text('Hieu suat'), onTap: () {}),
            const Divider(),
            ListTile(leading: const Icon(Icons.settings, color: AppColors.secondary), title: const Text('Cai dat'), onTap: () {}),
            const Spacer(),
            ListTile(
              leading: const Icon(Icons.logout, color: AppColors.error),
              title: const Text('Dang xuat'),
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
              // 1. Duty Status Toggle Card
              DutyStatusCard(
                isDutyActive: _isDutyActive,
                isDutyLoading: _isDutyLoading,
                onToggle: _toggleDutyStatus,
              ),

              // 2. Quick Actions Row
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        final activeStop = _driverStops.firstWhere(
                          (s) => s['isCheckedIn'] != true,
                          orElse: () => _driverStops.isNotEmpty ? _driverStops.first : <String, dynamic>{},
                        );
                        _showQRScanner(activeStop);
                      },
                      icon: const Icon(Icons.inventory_2, size: 18.0),
                      label: const Text('Quet Nhan Sot', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.logisticsRed,
                        foregroundColor: AppColors.pureWhite,
                        padding: const EdgeInsets.symmetric(vertical: 14.0),
                        shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12.0),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _showShipmentQRModal,
                      icon: const Icon(Icons.qr_code_2, size: 18.0),
                      label: const Text('QR Chuyen Xe', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.indigo.shade700,
                        foregroundColor: AppColors.pureWhite,
                        padding: const EdgeInsets.symmetric(vertical: 14.0),
                        shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24.0),

              // 3. Stats Bento Card
              StatsBentoCard(stops: _driverStops),
              const SizedBox(height: 16.0),

              // 4. Finish Route Card (visible when all stops done = 100%)
              if (allCompleted)
                FinishRouteCard(
                  isDutyLoading: _isDutyLoading,
                  onFinish: _handleFinishRouteAndShift,
                ),

              // 5. Live Map Preview Card
              MapPreviewCard(
                mapController: _mapController,
                currentLocation: _currentLocation,
                stops: _driverStops,
                roadPolylinePoints: _roadPolylinePoints,
                onStartNavigation: _startNavigation,
              ),
              const SizedBox(height: 24.0),

              // 6. Route List
              Text(
                'Lo trinh trong ngay',
                style: AppTypography.headlineMd.copyWith(fontWeight: FontWeight.bold, color: AppColors.deepOnyx),
              ),
              const SizedBox(height: 12.0),
              Column(
                children: _driverStops.map((stop) {
                  return Column(
                    children: [
                      StopCard(stop: stop, onTap: () => _showStopDetailsDialog(stop)),
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
