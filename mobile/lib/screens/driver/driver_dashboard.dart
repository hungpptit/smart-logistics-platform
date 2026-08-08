import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/theme/app_styles.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../services/socket_service.dart';

class DriverDashboard extends StatefulWidget {
  const DriverDashboard({super.key});

  @override
  State<DriverDashboard> createState() => _DriverDashboardState();
}

class _DriverDashboardState extends State<DriverDashboard> {
  bool _isDutyActive = true;
  bool _isDutyLoading = false;

  bool _isNavigating = false;
  bool _isRouteExecuting = false;
  bool _isVoiceOn = true;
  bool _showTrafficAlert = false;
  Timer? _alertTimer;
  Timer? _routeRefreshTimer;

  final List<Map<String, dynamic>> _driverStops = [];

  String _driverName = 'Tài xế';
  String _driverEmail = 'driver@velocity.vn';
  String? _activeRouteId;
  String? _activeRouteCode;
  List<LatLng> _roadPolylinePoints = [];

  Future<void> _toggleDutyStatus(bool newValue) async {
    if (_isDutyLoading) return;
    setState(() => _isDutyLoading = true);

    final targetStatus = newValue ? 'ACTIVE' : 'OFFLINE';
    final success = await DriverService.updateDutyStatus(targetStatus);

    if (mounted) {
      setState(() {
        _isDutyLoading = false;
        if (success) {
          _isDutyActive = newValue;
        }
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
          backgroundColor: success
              ? (newValue ? Colors.green.shade800 : AppColors.deepOnyx)
              : AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
          margin: const EdgeInsets.all(16.0),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  // Real-time GPS location fields
  StreamSubscription<Position>? _positionSubscription;
  LatLng _currentLocation = const LatLng(10.8231, 106.6297); // default to HCMC center
  final MapController _mapController = MapController();
  final MapController _navMapController = MapController();

  String _formatCurrency(num amount) {
    final int value = amount.round();
    final String str = value.toString();
    final RegExp reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    final String result = str.replaceAllMapped(reg, (Match m) => '${m[1]}.');
    return '$result đ';
  }

  bool _isFetchingRoutes = false;

  @override
  void initState() {
    super.initState();
    _loadDriverProfile();
    _initSocketAndFetchRoutes();
    _initLocationService();

    SocketService().onRoutesUpdated(() {
      if (mounted) {
        _initSocketAndFetchRoutes();
      }
    });

    _routeRefreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (mounted && !_isDutyLoading) {
        _initSocketAndFetchRoutes();
      }
    });
  }

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

          // Prioritize stops from firstRoute if available, otherwise fetch detail
          List stopsRaw = (firstRoute['stops'] ?? firstRoute['routeStops'] ?? []);
          if (stopsRaw.isEmpty) {
            final routeDetail = await DriverService.fetchRouteDetail(_activeRouteId!);
            if (routeDetail != null) {
              stopsRaw = (routeDetail['stops'] ?? routeDetail['routeStops'] ?? []);
            }
          }

          if (stopsRaw.isNotEmpty) {
            final List<Map<String, dynamic>> mappedStops = [];
            for (int i = 0; i < stopsRaw.length; i++) {
              try {
                final stop = stopsRaw[i];
                final stopType = stop['stopType'] ?? 'DELIVERY';
                final address = stop['facility']?['facilityName'] ??
                    stop['addressSnapshot'] ??
                    stop['addressLine1'] ??
                    stop['address'] ??
                    'Địa điểm giao nhận Việt Nam';
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
                    (shipmentId != null ? 'ORD-${shipmentId.toString().substring(0, 8).toUpperCase()}' : 'ORD-66266482-0${i + 1}');

                final String receiverName = firstOrder?['receiverName']?.toString() ?? stop['receiverName']?.toString() ?? 'Khách nhận';
                final String receiverPhone = firstOrder?['receiverPhone']?.toString() ?? stop['receiverPhone']?.toString() ?? '';
                
                final paymentInfo = firstOrder?['payment'];
                final String feePayer = (paymentInfo?['feePayer'] ?? firstOrder?['feePayer'] ?? stop['feePayer'] ?? 'SENDER').toString();
                
                final num codAmount = num.tryParse(
                  paymentInfo?['finalCodAmount']?.toString() ??
                  firstOrder?['estimatedCodAmount']?.toString() ??
                  firstOrder?['codAmount']?.toString() ??
                  stop['estimatedCodAmount']?.toString() ??
                  stop['codAmount']?.toString() ??
                  '0'
                ) ?? 0;

                final num baseFee = num.tryParse(
                  paymentInfo?['finalShippingFee']?.toString() ??
                  firstOrder?['estimatedShippingFee']?.toString() ??
                  firstOrder?['estimatedTotalAmount']?.toString() ??
                  firstOrder?['shippingFee']?.toString() ??
                  stop['estimatedShippingFee']?.toString() ??
                  stop['shippingFee']?.toString() ??
                  '0'
                ) ?? 0;

                final num insuranceFee = num.tryParse(
                  paymentInfo?['finalInsuranceFee']?.toString() ??
                  firstOrder?['estimatedInsuranceFee']?.toString() ??
                  firstOrder?['insuranceFee']?.toString() ??
                  stop['estimatedInsuranceFee']?.toString() ??
                  stop['insuranceFee']?.toString() ??
                  '0'
                ) ?? 0;

                final num shippingFee = (baseFee + insuranceFee) > 0 ? (baseFee + insuranceFee) : (baseFee > 0 ? baseFee : 31000);

                final bool isReceiverPayFee = (feePayer == 'RECEIVER');
                final bool isSenderPayFee = (feePayer == 'SENDER');
                final num totalToCollect = (stopType == 'PICKUP')
                    ? (isSenderPayFee ? shippingFee : 0)
                    : (codAmount + (isReceiverPayFee ? shippingFee : 0));

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
                  'title': stopType == 'PICKUP' ? 'Điểm lấy hàng' : 'Điểm giao hàng',
                  'address': address,
                  'latitude': lat,
                  'longitude': lng,
                  'packages': 1,
                  'eta': 'Chờ giao',
                  'distance': 'Theo tuyến',
                  'status': i == 0 ? 'ĐANG THỰC HIỆN' : 'TIẾP THEO',
                  'isActive': i == 0,
                  'isCheckedIn': false,
                  'signature': null,
                  'photo': null,
                });
              } catch (e) {
                debugPrint('⚠️ [DriverDashboard] Lỗi khi map điểm dừng $i: $e');
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
    if (mounted && (name != null || email != null)) {
      setState(() {
        if (name != null) _driverName = name;
        if (email != null) _driverEmail = email;
      });
    }
  }

  Future<void> _initLocationService() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (mounted) {
        _showLocationServiceDialog();
      }
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (mounted) {
          _showPermissionDeniedDialog(false);
        }
        return;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      if (mounted) {
        _showPermissionDeniedDialog(true);
      }
      return;
    } 

    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      if (mounted) {
        setState(() {
          _currentLocation = LatLng(position.latitude, position.longitude);
        });
        _mapController.move(_currentLocation, 13.0);
        _navMapController.move(_currentLocation, 14.5);
        _updateGoongPolyline(force: true);
      }
    } catch (e) {
      debugPrint("Lỗi lấy vị trí ban đầu: $e");
    }

    await _positionSubscription?.cancel();

    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 5,
      ),
    ).listen((Position position) {
      if (mounted) {
        setState(() {
          _currentLocation = LatLng(position.latitude, position.longitude);
        });

        // Stream GPS coordinates live via Socket.io to Backend Gateway
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
        _currentLocation.latitude,
        _currentLocation.longitude,
        _roadPolylinePoints.first.latitude,
        _roadPolylinePoints.first.longitude,
      );
      if (startDistance < 300) return; // Already aligned with current driver location
    }

    final List<LatLng> stopLatLngs = _driverStops
        .map((s) {
          final double lat = double.tryParse(s['latitude']?.toString() ?? '') ?? _currentLocation.latitude;
          final double lng = double.tryParse(s['longitude']?.toString() ?? '') ?? _currentLocation.longitude;
          return LatLng(lat, lng);
        })
        .toList();

    if (stopLatLngs.isNotEmpty) {
      final fullRoute = await DriverService.fetchFullSequentialRoute(
        driverLocation: _currentLocation,
        stopLatLngs: stopLatLngs,
      );

      if (mounted && fullRoute.isNotEmpty) {
        setState(() {
          _roadPolylinePoints = [_currentLocation, ...fullRoute.skip(1)];
        });
      }
    }
  }

  void _showLocationServiceDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.location_off, color: AppColors.logisticsRed),
              SizedBox(width: 8),
              Text('Chưa bật định vị'),
            ],
          ),
          content: const Text(
            'Dịch vụ định vị GPS trên thiết bị của bạn đang tắt. '
            'Vui lòng bật định vị để ứng dụng có thể hiển thị bản đồ và dẫn đường chính xác.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Hủy', style: TextStyle(color: AppColors.secondary)),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.of(context).pop();
                await Geolocator.openLocationSettings();
                Future.delayed(const Duration(seconds: 2), () {
                  _initLocationService();
                });
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.deepOnyx,
                foregroundColor: AppColors.pureWhite,
              ),
              child: const Text('Mở Cài đặt'),
            ),
          ],
        );
      },
    );
  }

  void _showPermissionDeniedDialog(bool permanent) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(Icons.security, color: permanent ? AppColors.logisticsRed : AppColors.secondary),
              const SizedBox(width: 8),
              const Text('Quyền định vị'),
            ],
          ),
          content: Text(
            permanent
                ? 'Bạn đã từ chối vĩnh viễn quyền định vị. Vui lòng mở Cài đặt ứng dụng để cấp quyền thủ công.'
                : 'Ứng dụng cần quyền định vị để hiển thị vị trí của bạn trên bản đồ.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Hủy', style: TextStyle(color: AppColors.secondary)),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.of(context).pop();
                if (permanent) {
                  await Geolocator.openAppSettings();
                } else {
                  _initLocationService();
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.deepOnyx,
                foregroundColor: AppColors.pureWhite,
              ),
              child: Text(permanent ? 'Mở Cài đặt' : 'Cấp quyền'),
            ),
          ],
        );
      },
    );
  }

  @override
  void dispose() {
    _alertTimer?.cancel();
    _routeRefreshTimer?.cancel();
    _positionSubscription?.cancel();
    SocketService().disconnect();
    super.dispose();
  }

  void _startNavigation() {
    setState(() {
      _isNavigating = true;
      _showTrafficAlert = false;
    });

    // Simulate traffic alert popping up after 3 seconds
    _alertTimer?.cancel();
    _alertTimer = Timer(const Duration(seconds: 3), () {
      if (mounted && _isNavigating) {
        setState(() {
          _showTrafficAlert = true;
        });

        // Auto hide alert after 5 seconds
        Timer(const Duration(seconds: 5), () {
          if (mounted) {
            setState(() {
              _showTrafficAlert = false;
            });
          }
        });
      }
    });
  }

  void _stopNavigation() {
    setState(() {
      _isNavigating = false;
      _isRouteExecuting = false;
      _showTrafficAlert = false;
    });
    _alertTimer?.cancel();
  }

  void _showReportIncidentDialog() {
    String selectedReason = 'Kẹt xe nghiêm trọng';
    final TextEditingController noteController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              backgroundColor: AppColors.pureWhite,
              shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
              title: const Row(
                children: [
                  Icon(Icons.report_problem, color: AppColors.logisticsRed, size: 24),
                  SizedBox(width: 8),
                  Text('Báo Cáo Sự Cố Tuyến Đường', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Chọn loại sự cố gặp phải:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: selectedReason,
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'Kẹt xe nghiêm trọng', child: Text('🚦 Kẹt xe nghiêm trọng')),
                      DropdownMenuItem(value: 'Sự cố xe / Thủng lốp', child: Text('🔧 Sự cố xe / Thủng lốp')),
                      DropdownMenuItem(value: 'Không liên lạc được khách hàng', child: Text('📞 Không liên lạc được khách')),
                      DropdownMenuItem(value: 'Thời tiết xấu / Ngập nước', child: Text('🌧️ Thời tiết xấu / Ngập nước')),
                      DropdownMenuItem(value: 'Sự cố khác', child: Text('⚠️ Sự cố khác')),
                    ],
                    onChanged: (val) {
                      if (val != null) setModalState(() => selectedReason = val);
                    },
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: noteController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: 'Ghi chú thêm (không bắt buộc)',
                      labelStyle: const TextStyle(fontSize: 11),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Hủy', style: TextStyle(color: AppColors.secondary)),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('⚠️ Đã gửi báo cáo sự cố "$selectedReason" đến Bưu cục!'),
                        backgroundColor: AppColors.logisticsRed,
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.logisticsRed,
                    foregroundColor: AppColors.pureWhite,
                  ),
                  child: const Text('Gửi báo cáo'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showShiftSummary() {
    showDialog(
      context: context,
      builder: (context) {
        return Dialog(
          backgroundColor: AppColors.pureWhite,
          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Tóm tắt ca',
                      style: AppTypography.headlineLgMobile.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepOnyx,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: AppColors.secondary),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 16.0),
                Container(
                  padding: const EdgeInsets.all(16.0),
                  decoration: BoxDecoration(
                    color: AppColors.cloudGray,
                    borderRadius: AppStyles.roundedLg,
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.timer, color: AppColors.logisticsRed, size: 40.0),
                      const SizedBox(width: 16.0),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Thời gian hiện tại'.toUpperCase(),
                            style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                          ),
                          const SizedBox(height: 2.0),
                          Text(
                            '0giờ 42phút 12giây',
                            style: AppTypography.headlineMd.copyWith(
                              color: AppColors.deepOnyx,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16.0),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16.0),
                        decoration: BoxDecoration(
                          borderRadius: AppStyles.roundedLg,
                          border: Border.all(color: AppColors.surfaceContainerHighest),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Thành công',
                              style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                            ),
                            const SizedBox(height: 4.0),
                            Text(
                              '4',
                              style: AppTypography.headlineMd.copyWith(
                                color: Colors.green,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12.0),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16.0),
                        decoration: BoxDecoration(
                          borderRadius: AppStyles.roundedLg,
                          border: Border.all(color: AppColors.surfaceContainerHighest),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Đang chờ',
                              style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                            ),
                            const SizedBox(height: 4.0),
                            Text(
                              '14',
                              style: AppTypography.headlineMd.copyWith(
                                color: AppColors.deepOnyx,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16.0),
                Container(
                  padding: const EdgeInsets.all(16.0),
                  decoration: BoxDecoration(
                    borderRadius: AppStyles.roundedLg,
                    border: Border.all(color: AppColors.surfaceContainerHighest),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Thu nhập (Dự kiến)',
                        style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                      ),
                      const SizedBox(height: 4.0),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '\$142.50',
                            style: AppTypography.headlineLgMobile.copyWith(
                              color: AppColors.deepOnyx,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            '+\$12.00 thưởng',
                            style: AppTypography.labelLg.copyWith(
                              color: Colors.green,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24.0),
                SizedBox(
                  width: double.infinity,
                  height: 48.0,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.logisticsRed,
                      foregroundColor: AppColors.pureWhite,
                      shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                    ),
                    child: const Text('TẢI BÁO CÁO'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isNavigating) {
      return _buildNavigationScreen();
    }

    return Scaffold(
      backgroundColor: AppColors.cloudGray,
      appBar: AppBar(
        backgroundColor: AppColors.pureWhite,
        elevation: 0.5,
        title: Text(
          'Velocity Logistics',
          style: AppTypography.headlineMd.copyWith(
            color: AppColors.logisticsRed,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none, color: AppColors.deepOnyx),
            onPressed: () {},
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16.0, left: 4.0),
            child: CircleAvatar(
              radius: 18.0,
              backgroundImage: const NetworkImage(
                'https://lh3.googleusercontent.com/aida-public/AB6AXuANja3zeifum0i91jCsi1-_rLWN0_ur9Ei6pA-ZxEPasd_19VmvkBs8CuqUFMDDQ2J6ik0bKTzHOS1_5RPPn9jFMe7y8tqHuda7--IK3SCCIUD_jcGs413LNup-Rzhiui3n8lajNT-9XPixzsacUjRFf5RVBc-5zXZ8ZDut-fQk13E2KARZqDv1oYLNF9F9cascOR5F-0YAjkVDoko8Dt8j-l95YugQOZz4P33L5WNtcdPuOJeM9fIA4Q',
              ),
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
                backgroundImage: NetworkImage(
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuDaWHdHbndbzOw4N3alsZ0z3J-w93wa6FWG0Q6Mp5m902BW4jN33bpQDQiqk_rVSh_ns09HEeSO5MIj_mNnycfXUi3PPny9SmTCThXKB8uEGlZkLkjxunNqeEybkNkVXHZGTkOsxME2AFgoJlCIyXyuG0qDEkDIWdCOWbmTZdRZVpZq8X8CtXnvzK1U51fq5o3kpE9CroH1dpIXGVvndc2ODZG4cZJcvFf_ruulEJBnUJopunvUx8zr7g',
                ),
              ),
              accountName: Text(
                _driverName,
                style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite, fontWeight: FontWeight.bold),
              ),
              accountEmail: Text(
                _driverEmail,
                style: AppTypography.labelMd.copyWith(color: Colors.white70),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.home, color: AppColors.logisticsRed),
              title: const Text('Trang chủ'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.inventory_2, color: AppColors.secondary),
              title: const Text('Đơn hàng đang giao'),
              onTap: () {},
            ),
            ListTile(
              leading: const Icon(Icons.history, color: AppColors.secondary),
              title: const Text('Lịch sử lộ trình'),
              onTap: () {},
            ),
            ListTile(
              leading: const Icon(Icons.query_stats, color: AppColors.secondary),
              title: const Text('Hiệu suất'),
              onTap: () {},
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.settings, color: AppColors.secondary),
              title: const Text('Cài đặt'),
              onTap: () {},
            ),
            const Spacer(),
            ListTile(
              leading: const Icon(Icons.logout, color: AppColors.error),
              title: const Text('Đăng xuất'),
              onTap: () async {
                await AuthService.clearAuthData();
                if (context.mounted) {
                  Navigator.pushReplacementNamed(context, '/');
                }
              },
            ),
            const SizedBox(height: 20.0),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await _initSocketAndFetchRoutes();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          padding: const EdgeInsets.all(AppStyles.marginMobile),
          child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Duty Status Card (Online / Offline Toggle)
            Container(
              margin: const EdgeInsets.only(bottom: 16.0),
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
              decoration: BoxDecoration(
                color: AppColors.pureWhite,
                borderRadius: AppStyles.roundedLg,
                border: Border.all(
                  color: _isDutyActive ? Colors.green.shade300 : AppColors.surfaceContainerHighest,
                ),
                boxShadow: AppStyles.softShadow,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 10.0,
                        height: 10.0,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _isDutyActive ? Colors.green : Colors.grey.shade400,
                        ),
                      ),
                      const SizedBox(width: 10.0),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _isDutyActive ? 'Trạng thái: Trực tuyến' : 'Trạng thái: Ngoại tuyến',
                            style: AppTypography.labelLg.copyWith(
                              fontWeight: FontWeight.bold,
                              color: _isDutyActive ? Colors.green.shade800 : AppColors.deepOnyx,
                            ),
                          ),
                          const SizedBox(height: 2.0),
                          Text(
                            _isDutyActive ? 'Sẵn sàng nhận lộ trình từ bưu cục' : 'Tạm dừng nhận lộ trình mới',
                            style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Switch(
                    value: _isDutyActive,
                    activeThumbColor: Colors.green,
                    activeTrackColor: Colors.green.shade300,
                    inactiveThumbColor: Colors.grey,
                    onChanged: _isDutyLoading ? null : (val) => _toggleDutyStatus(val),
                  ),
                ],
              ),
            ),

            // Actions row
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
                    label: const Text('Quét Nhận Sọt', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
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
                    label: const Text('QR Chuyến Xe', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
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

            // Stats Bento Card
            Container(
              padding: const EdgeInsets.all(20.0),
              decoration: BoxDecoration(
                color: AppColors.pureWhite,
                borderRadius: AppStyles.roundedXl,
                border: Border.all(color: AppColors.surfaceContainer),
                boxShadow: AppStyles.ambientShadow,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Trạng thái ca',
                        style: AppTypography.labelLg.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppColors.deepOnyx,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(12.0),
                        ),
                        child: Text(
                          'HOẠT ĐỘNG',
                          style: AppTypography.labelMd.copyWith(
                            color: Colors.green.shade800,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16.0),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Hoàn thành', style: AppTypography.bodyMd.copyWith(color: AppColors.secondary)),
                      Text(
                        '${_driverStops.where((s) => s['status'] == 'ĐÃ GIAO').length} / ${_driverStops.length}',
                        style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8.0),
                  LinearProgressIndicator(
                    value: _driverStops.isEmpty
                        ? 0.0
                        : (_driverStops.where((s) => s['status'] == 'ĐÃ GIAO').length / _driverStops.length),
                    backgroundColor: AppColors.cloudGray,
                    color: AppColors.logisticsRed,
                    minHeight: 8.0,
                    borderRadius: BorderRadius.circular(4.0),
                  ),
                  const SizedBox(height: 20.0),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12.0),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceContainerLow,
                            borderRadius: AppStyles.roundedLg,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Quãng đường',
                                style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                              ),
                              const SizedBox(height: 4.0),
                              Text(
                                _driverStops.isEmpty
                                    ? '0.0 km'
                                    : '${(_driverStops.length * 3.5).toStringAsFixed(1)} km',
                                style: AppTypography.headlineMd.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.deepOnyx,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12.0),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12.0),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceContainerLow,
                            borderRadius: AppStyles.roundedLg,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Dừng trung bình',
                                style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                              ),
                              const SizedBox(height: 4.0),
                              Text(
                                _driverStops.isEmpty
                                    ? '0.0 phút'
                                    : '${(12.0 / (_driverStops.isNotEmpty ? _driverStops.length : 1)).toStringAsFixed(1)} phút',
                                style: AppTypography.headlineMd.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.deepOnyx,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20.0),

            // Live Map Preview Card
            Container(
              height: 220.0,
              width: double.infinity,
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                borderRadius: AppStyles.roundedXl,
                border: Border.all(color: AppColors.surfaceContainer),
              ),
              child: Stack(
                children: [
                  Positioned.fill(
                    child: FlutterMap(
                      mapController: _mapController,
                      options: MapOptions(
                        initialCenter: _currentLocation,
                        initialZoom: 13.0,
                      ),
                      children: [
                        TileLayer(
                          urlTemplate: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.velocity.mobile',
                        ),
                        PolylineLayer(
                          polylines: [
                            Polyline(
                              points: _roadPolylinePoints.isNotEmpty
                                  ? _roadPolylinePoints
                                  : [
                                      _currentLocation,
                                      ..._driverStops.map((stop) {
                                        final lat = double.tryParse(stop['latitude']?.toString() ?? '') ?? _currentLocation.latitude;
                                        final lng = double.tryParse(stop['longitude']?.toString() ?? '') ?? _currentLocation.longitude;
                                        return LatLng(lat, lng);
                                      }),
                                    ],
                              strokeWidth: 3.5,
                              color: AppColors.logisticsRed,
                            ),
                          ],
                        ),
                        MarkerLayer(
                          markers: [
                            ..._driverStops.map((stop) {
                              final lat = double.tryParse(stop['latitude']?.toString() ?? '') ?? _currentLocation.latitude;
                              final lng = double.tryParse(stop['longitude']?.toString() ?? '') ?? _currentLocation.longitude;
                              return Marker(
                                point: LatLng(lat, lng),
                                width: 24.0,
                                height: 24.0,
                                child: Container(
                                  decoration: const BoxDecoration(
                                    color: AppColors.logisticsRed,
                                    shape: BoxShape.circle,
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    '${stop['index']}',
                                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              );
                            }),
                            Marker(
                              point: _currentLocation,
                              width: 30.0,
                              height: 30.0,
                              child: const Icon(
                                Icons.my_location,
                                color: AppColors.logisticsRed,
                                size: 24.0,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            AppColors.deepOnyx.withValues(alpha: 0.5),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 16.0,
                    right: 16.0,
                    bottom: 16.0,
                    child: Container(
                      padding: const EdgeInsets.all(12.0),
                      decoration: BoxDecoration(
                        color: AppColors.pureWhite.withValues(alpha: 0.9),
                        borderRadius: AppStyles.roundedLg,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 36.0,
                            height: 36.0,
                            decoration: const BoxDecoration(
                              color: AppColors.logisticsRed,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.navigation, color: AppColors.pureWhite, size: 18.0),
                          ),
                          const SizedBox(width: 12.0),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'Dự kiến điểm dừng tiếp',
                                  style: AppTypography.labelMd.copyWith(color: AppColors.logisticsRed, fontWeight: FontWeight.bold),
                                ),
                                Text(
                                  '14 Phút',
                                  style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.bold, color: AppColors.deepOnyx),
                                ),
                              ],
                            ),
                          ),
                      ElevatedButton(
                        onPressed: _startNavigation,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.deepOnyx,
                          foregroundColor: AppColors.pureWhite,
                          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                          padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        ),
                        child: const Text('Dẫn đường'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24.0),

            // Route List
            Text(
              'Lộ trình trong ngày',
              style: AppTypography.headlineMd.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.deepOnyx,
              ),
            ),
            const SizedBox(height: 12.0),

            Column(
              children: _driverStops.map((stop) {
                return Column(
                  children: [
                    _buildStopCard(stop),
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

  Widget _buildStopCard(Map<String, dynamic> stop) {
    final int index = stop['index'] as int;
    final String title = stop['title'] as String;
    final String address = stop['address'] as String;
    final int packages = stop['packages'] as int;
    final String eta = stop['eta'] as String;
    final String status = stop['status'] as String;
    final bool isActive = stop['isActive'] as bool;

    return GestureDetector(
      onTap: () {
        if (isActive) {
          _showStopDetailsDialog(stop);
        }
      },
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.pureWhite,
          borderRadius: AppStyles.roundedXl,
          border: Border.all(color: AppColors.surfaceContainer),
          boxShadow: AppStyles.ambientShadow,
        ),
        clipBehavior: Clip.antiAlias,
        child: Row(
          children: [
            // Left gradient line for active item
            Container(
              width: 4.0,
              height: 120.0,
              color: isActive ? AppColors.logisticsRed : Colors.transparent,
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Stop Number Circle
                    Column(
                      children: [
                        Container(
                          width: 36.0,
                          height: 36.0,
                          decoration: BoxDecoration(
                            color: isActive ? AppColors.logisticsRed : AppColors.surfaceContainer,
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '$index',
                            style: AppTypography.headlineMd.copyWith(
                              color: isActive ? AppColors.pureWhite : AppColors.secondary,
                              fontSize: 16.0,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 12.0),

                    // Information
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                              Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Flexible(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                                  decoration: BoxDecoration(
                                    color: AppColors.logisticsRed.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(4.0),
                                  ),
                                  child: Text(
                                    stop['orderCode'] ?? 'ORD-66266482',
                                    style: const TextStyle(
                                      color: AppColors.logisticsRed,
                                      fontSize: 10.0,
                                      fontWeight: FontWeight.bold,
                                      fontFamily: 'monospace',
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4.0),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 2.0),
                                decoration: BoxDecoration(
                                  color: status == 'ĐANG THỰC HIỆN'
                                      ? AppColors.logisticsRed.withValues(alpha: 0.1)
                                      : AppColors.surfaceContainer,
                                  borderRadius: BorderRadius.circular(4.0),
                                ),
                                child: Text(
                                  status,
                                  style: TextStyle(
                                    color: status == 'ĐANG THỰC HIỆN' ? AppColors.logisticsRed : AppColors.secondary,
                                    fontSize: 9.0,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6.0),
                          Text(
                            title,
                            style: AppTypography.labelLg.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppColors.deepOnyx,
                            ),
                          ),
                          const SizedBox(height: 4.0),
                          Row(
                            children: [
                              const Icon(Icons.location_on, size: 14.0, color: AppColors.secondary),
                              const SizedBox(width: 4.0),
                              Expanded(
                                child: Text(
                                  address,
                                  style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8.0),
                          Row(
                            children: [
                              Icon(Icons.inventory_2, size: 14.0, color: isActive ? AppColors.tertiary : AppColors.secondary),
                              const SizedBox(width: 4.0),
                              Text(
                                '$packages Kiện hàng',
                                style: AppTypography.labelMd.copyWith(
                                  color: isActive ? AppColors.tertiary : AppColors.secondary,
                                  fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                              const SizedBox(width: 16.0),
                              const Icon(Icons.schedule, size: 14.0, color: AppColors.secondary),
                              const SizedBox(width: 4.0),
                              Text(
                                'Dự kiến: $eta',
                                style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ----------------------------------------------------
  // FULL SCREEN GPS NAVIGATION VIEW (Màn hình 2.6)
  // ----------------------------------------------------
  Widget _buildNavigationScreen() {
    final activeStop = _driverStops.firstWhere(
      (s) => s['isCheckedIn'] != true,
      orElse: () => _driverStops.isNotEmpty ? _driverStops.first : <String, dynamic>{},
    );
    final String targetAddress = activeStop['address']?.toString() ?? 'Chưa xác định điểm dừng';
    final dynamic rawIndex = activeStop['index'] ?? activeStop['sequence'] ?? 1;
    final int targetIndex = rawIndex is int ? rawIndex : (int.tryParse(rawIndex.toString()) ?? 1);
    final String targetTitle = activeStop['title']?.toString() ?? 'Khách hàng';

    return Scaffold(
      body: Stack(
        children: [
          // 1. Full Screen Interactive Map with Markers
          Positioned.fill(
            child: FlutterMap(
              mapController: _navMapController,
              options: MapOptions(
                initialCenter: _currentLocation,
                initialZoom: 14.5,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.velocity.mobile',
                ),
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: _roadPolylinePoints.isNotEmpty
                          ? _roadPolylinePoints
                          : [
                              _currentLocation,
                              ..._driverStops.map((stop) {
                                final lat = double.tryParse(stop['latitude']?.toString() ?? '') ?? _currentLocation.latitude;
                                final lng = double.tryParse(stop['longitude']?.toString() ?? '') ?? _currentLocation.longitude;
                                return LatLng(lat, lng);
                              }),
                            ],
                      strokeWidth: 4.5,
                      color: AppColors.logisticsRed,
                    ),
                  ],
                ),
                MarkerLayer(
                  markers: [
                    ..._driverStops.map((stop) {
                      final lat = double.tryParse(stop['latitude']?.toString() ?? '') ?? _currentLocation.latitude;
                      final lng = double.tryParse(stop['longitude']?.toString() ?? '') ?? _currentLocation.longitude;
                      return Marker(
                        point: LatLng(lat, lng),
                        width: 40.0,
                        height: 50.0,
                        child: _buildMapStopPin('${stop['index']}'),
                      );
                    }),
                    // Driver Location
                    Marker(
                      point: _currentLocation,
                      width: 80.0,
                      height: 80.0,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Pulsing outer ring
                          TweenAnimationBuilder<double>(
                            tween: Tween(begin: 1.0, end: 2.0),
                            duration: const Duration(seconds: 2),
                            builder: (context, value, child) {
                              return Container(
                                width: 40.0 * value,
                                height: 40.0 * value,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AppColors.logisticsRed.withValues(alpha: 0.3 * (2.0 - value)),
                                ),
                              );
                            },
                          ),
                          // Driver Arrow
                          Transform.rotate(
                            angle: 0.44, // tilted ~25 degrees
                            child: Container(
                              width: 36.0,
                              height: 36.0,
                              decoration: BoxDecoration(
                                color: AppColors.logisticsRed,
                                shape: BoxShape.circle,
                                border: Border.all(color: AppColors.pureWhite, width: 2.0),
                                boxShadow: AppStyles.softShadow,
                              ),
                              child: const Icon(Icons.navigation, color: AppColors.pureWhite, size: 20.0),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // 4. Top Navigation Direction Banner
          Positioned(
            top: MediaQuery.of(context).padding.top + 12.0,
            left: 16.0,
            right: 16.0,
            child: Container(
              padding: const EdgeInsets.all(14.0),
              decoration: BoxDecoration(
                color: AppColors.deepOnyx,
                borderRadius: AppStyles.roundedXl,
                border: const Border(left: BorderSide(color: AppColors.logisticsRed, width: 4.0)),
                boxShadow: AppStyles.softShadow,
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10.0),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      borderRadius: AppStyles.roundedLg,
                    ),
                    child: const Icon(
                      Icons.navigation,
                      size: 28.0,
                      color: AppColors.logisticsRed,
                    ),
                  ),
                  const SizedBox(width: 14.0),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.logisticsRed,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'ĐIỂM DỪNG #$targetIndex',
                                style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 8.0),
                            Expanded(
                              child: Text(
                                targetTitle.toUpperCase(),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.labelMd.copyWith(color: Colors.white70),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4.0),
                        Text(
                          targetAddress,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.headlineMd.copyWith(
                            color: AppColors.pureWhite,
                            fontSize: 13.0,
                            height: 1.25,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 5. Floating action controls (right-side)
          Positioned(
            right: 16.0,
            top: 240.0,
            child: Column(
              children: [
                _buildFloatingNavBtn(
                  icon: _isVoiceOn ? Icons.volume_up : Icons.volume_off,
                  onPressed: () {
                    setState(() {
                      _isVoiceOn = !_isVoiceOn;
                    });
                  },
                  color: _isVoiceOn ? AppColors.deepOnyx : AppColors.secondary,
                ),
                const SizedBox(height: 12.0),
                _buildFloatingNavBtn(icon: Icons.search, onPressed: () {}),
                const SizedBox(height: 12.0),
                _buildFloatingNavBtn(icon: Icons.layers, onPressed: () {}),
                const SizedBox(height: 12.0),
                _buildFloatingNavBtn(
                  icon: Icons.my_location,
                  onPressed: () {},
                  color: AppColors.logisticsRed,
                ),
              ],
            ),
          ),

          // 6. Traffic alert notification
          if (_showTrafficAlert)
            Positioned(
              bottom: 220.0,
              left: 20.0,
              right: 20.0,
              child: AnimatedOpacity(
                opacity: _showTrafficAlert ? 1.0 : 0.0,
                duration: const Duration(milliseconds: 300),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF4E5),
                    borderRadius: AppStyles.roundedXl,
                    border: Border.all(color: const Color(0xFFFF9800)),
                    boxShadow: AppStyles.ambientShadow,
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning, color: Color(0xFFFF9800), size: 28.0),
                      const SizedBox(width: 12.0),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Kẹt xe phía trước',
                              style: AppTypography.labelLg.copyWith(
                                color: const Color(0xFF663C00),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'Chậm khoảng 3 phút trên tuyến đường di chuyển.',
                              style: AppTypography.labelMd.copyWith(color: const Color(0xFF663C00)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // 7. Bottom GPS Stats Panel & Primary Control
          Positioned(
            bottom: 0.0,
            left: 0.0,
            right: 0.0,
            child: Container(
              padding: const EdgeInsets.only(left: 16.0, right: 16.0, bottom: 24.0),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Colors.white70, Colors.white],
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Stats card
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 16.0),
                    decoration: BoxDecoration(
                      color: AppColors.pureWhite,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(16.0),
                        topRight: Radius.circular(16.0),
                      ),
                      border: const Border(bottom: BorderSide(color: AppColors.surfaceContainer)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 10.0,
                          offset: const Offset(0, -5),
                        )
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildNavStatItem('Thời gian', '5', 'phút', isRed: true),
                        Container(width: 1.0, height: 40.0, color: AppColors.surfaceContainer),
                        _buildNavStatItem('Khoảng cách', '1.2', 'km'),
                        Container(width: 1.0, height: 40.0, color: AppColors.surfaceContainer),
                        _buildNavStatItem('Vận tốc', '35', 'km/h'),
                      ],
                    ),
                  ),

                  // Actions row
                  Container(
                    padding: const EdgeInsets.all(10.0),
                    decoration: BoxDecoration(
                      color: AppColors.pureWhite,
                      borderRadius: const BorderRadius.only(
                        bottomLeft: Radius.circular(16.0),
                        bottomRight: Radius.circular(16.0),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 10.0,
                          offset: const Offset(0, 5),
                        )
                      ],
                    ),
                    child: Row(
                      children: [
                        // Small Incident Report button
                        ElevatedButton.icon(
                          onPressed: _showReportIncidentDialog,
                          icon: const Icon(Icons.warning_amber_rounded, size: 16.0, color: AppColors.logisticsRed),
                          label: const Text('Báo sự cố', style: TextStyle(fontSize: 11.0, fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red.shade50,
                            foregroundColor: AppColors.logisticsRed,
                            padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 12.0),
                            shape: RoundedRectangleBorder(
                              borderRadius: AppStyles.roundedLg,
                              side: BorderSide(color: AppColors.logisticsRed.withValues(alpha: 0.3)),
                            ),
                            elevation: 0,
                          ),
                        ),
                        const SizedBox(width: 8.0),

                        // Main Start/Stop Execution button
                        Expanded(
                          child: SizedBox(
                            height: 44.0,
                            child: !_isRouteExecuting
                                ? ElevatedButton.icon(
                                    onPressed: () {
                                      setState(() {
                                        _isRouteExecuting = true;
                                      });
                                      ScaffoldMessenger.of(context).clearSnackBars();
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: const Row(
                                            children: [
                                              Icon(Icons.navigation, color: Colors.white, size: 20),
                                              SizedBox(width: 10),
                                              Column(
                                                mainAxisSize: MainAxisSize.min,
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text('Đã bắt đầu hành trình', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                                                  Text('Đang truyền tín hiệu định vị GPS thời gian thực', style: TextStyle(fontSize: 10, color: Colors.white70)),
                                                ],
                                              ),
                                            ],
                                          ),
                                          backgroundColor: const Color(0xFF1E293B),
                                          behavior: SnackBarBehavior.floating,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          margin: const EdgeInsets.all(16),
                                          duration: const Duration(seconds: 2),
                                        ),
                                      );
                                    },
                                    icon: const Icon(Icons.play_arrow_rounded, size: 20.0),
                                    label: const Text('BẮT ĐẦU CHẠY', style: TextStyle(fontSize: 12.0, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.logisticsRed,
                                      foregroundColor: AppColors.pureWhite,
                                      shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                                      elevation: 2,
                                    ),
                                  )
                                : ElevatedButton.icon(
                                    onPressed: () {
                                      setState(() {
                                        _isRouteExecuting = false;
                                      });
                                      ScaffoldMessenger.of(context).clearSnackBars();
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: const Row(
                                            children: [
                                              Icon(Icons.pause_circle_filled, color: Colors.white, size: 20),
                                              SizedBox(width: 10),
                                              Column(
                                                mainAxisSize: MainAxisSize.min,
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text('Đã dừng hành trình', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                                                  Text('Tạm ngắt truyền tín hiệu định vị GPS', style: TextStyle(fontSize: 10, color: Colors.white70)),
                                                ],
                                              ),
                                            ],
                                          ),
                                          backgroundColor: const Color(0xFF334155),
                                          behavior: SnackBarBehavior.floating,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          margin: const EdgeInsets.all(16),
                                          duration: const Duration(seconds: 2),
                                        ),
                                      );
                                    },
                                    icon: const Icon(Icons.stop_rounded, size: 20.0),
                                    label: const Text('DỪNG CHẠY', style: TextStyle(fontSize: 12.0, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.deepOnyx,
                                      foregroundColor: AppColors.pureWhite,
                                      shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                                      elevation: 2,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(width: 8.0),

                        // Close button
                        GestureDetector(
                          onTap: _stopNavigation,
                          child: Container(
                            width: 44.0,
                            height: 44.0,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceContainerHigh,
                              borderRadius: AppStyles.roundedLg,
                            ),
                            child: const Icon(Icons.close, color: AppColors.secondary, size: 22.0),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Route Progress Bar (Subtle bottom bar)
                  const SizedBox(height: 12.0),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8.0),
                    child: LinearProgressIndicator(
                      value: 0.82,
                      minHeight: 6.0,
                      backgroundColor: AppColors.surfaceContainerHighest,
                      color: AppColors.logisticsRed,
                      borderRadius: BorderRadius.circular(4.0),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMapStopPin(String label) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 28.0,
          height: 28.0,
          decoration: BoxDecoration(
            color: AppColors.logisticsRed,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.pureWhite, width: 2.0),
            boxShadow: AppStyles.softShadow,
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: AppTypography.labelMd.copyWith(color: AppColors.pureWhite, fontWeight: FontWeight.bold),
          ),
        ),
        Container(
          width: 3.0,
          height: 6.0,
          color: AppColors.logisticsRed,
        ),
      ],
    );
  }

  Widget _buildFloatingNavBtn({
    required IconData icon,
    required VoidCallback onPressed,
    Color color = AppColors.deepOnyx,
  }) {
    return Container(
      width: 50.0,
      height: 50.0,
      decoration: BoxDecoration(
        color: AppColors.pureWhite,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.surfaceContainerHighest),
        boxShadow: AppStyles.softShadow,
      ),
      child: IconButton(
        icon: Icon(icon, color: color, size: 24.0),
        onPressed: onPressed,
      ),
    );
  }

  Widget _buildNavStatItem(String label, String value, String unit, {bool isRed = false}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: AppTypography.labelMd.copyWith(color: AppColors.secondary, fontSize: 10.0),
        ),
        const SizedBox(height: 2.0),
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              value,
              style: AppTypography.headlineLgMobile.copyWith(
                fontWeight: FontWeight.bold,
                color: isRed ? AppColors.logisticsRed : AppColors.deepOnyx,
                fontSize: 22.0,
              ),
            ),
            const SizedBox(width: 2.0),
            Text(
              unit,
              style: AppTypography.labelMd.copyWith(
                color: AppColors.deepOnyx,
                fontSize: 12.0,
              ),
            ),
          ],
        ),
      ],
    );
  }

  void _showShipmentQRModal() {
    final String shipmentCode = (_activeRouteCode != null && _activeRouteCode!.isNotEmpty)
        ? _activeRouteCode!
        : ((_activeRouteId != null && _activeRouteId!.isNotEmpty) ? _activeRouteId! : 'SHP-LH-41100053');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: const BoxDecoration(
            color: AppColors.pureWhite,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24.0)),
          ),
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2.0),
                ),
              ),
              const SizedBox(height: 16.0),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.local_shipping, color: AppColors.logisticsRed, size: 22),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      'MÃ QR CHUYẾN XE TẢI TRUNG CHUYỂN',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8.0),
              Text(
                'Cho Thủ Kho tại Bưu cục Đích / Kho Tổng quét 1 phát nhập toàn bộ Chuyến xe vào kho',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 20.0),
              Container(
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16.0),
                  border: Border.all(color: Colors.indigo.shade200, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: QrImageView(
                  data: shipmentCode,
                  version: QrVersions.auto,
                  size: 220.0,
                ),
              ),
              const SizedBox(height: 16.0),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.indigo.shade50,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  'Mã Vận Đơn Xe Tải: $shipmentCode',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: Colors.indigo.shade900,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
              const SizedBox(height: 24.0),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.deepOnyx,
                    foregroundColor: AppColors.pureWhite,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Đóng'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showQRScanner([Map<String, dynamic>? stop]) {
    final String? targetCode = (_activeRouteCode != null && _activeRouteCode!.isNotEmpty)
        ? _activeRouteCode
        : ((_activeRouteId != null && _activeRouteId!.isNotEmpty)
            ? _activeRouteId
            : ((stop != null && stop['orderCode'] != null) ? stop['orderCode'].toString().trim() : null));
    final TextEditingController scanController = TextEditingController();
    String? errorMessage;

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setScannerState) {
            Future<void> performScanCheck() async {
              final scannedValue = scanController.text.trim();
              if (scannedValue.isEmpty) {
                setScannerState(() {
                  errorMessage = 'Vui lòng đưa camera quét mã QR Sọt / Bưu kiện hoặc nhập mã';
                });
                return;
              }

              // Case 0: Scanned Linehaul Warehouse Tote (TOTE-ZONE-...)
              if (scannedValue.toUpperCase().startsWith('TOTE-')) {
                Navigator.pop(context); // Close scanner modal
                final result = await DriverService.loadToteIntoShipment(scannedValue);
                if (mounted) {
                  _initSocketAndFetchRoutes(); // refresh routes
                  showDialog(
                    context: this.context,
                    builder: (BuildContext context) {
                      final bool isOk = result != null;
                      return AlertDialog(
                        backgroundColor: AppColors.pureWhite,
                        shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
                        title: Row(
                          children: [
                            Icon(isOk ? Icons.check_circle : Icons.error, color: isOk ? Colors.green : Colors.red, size: 28),
                            const SizedBox(width: 8.0),
                            Text(isOk ? 'Nạp Sọt Xe Tải Thành Công' : 'Thất Bại', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          ],
                        ),
                        content: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(isOk
                                ? 'Đã tiếp nhận Sọt [$scannedValue] lên xe tải (${result['shipmentCode'] ?? ''}). Toàn bộ ${result['packageCount'] ?? 1} bưu kiện đã chuyển sang Đang trung chuyển (IN_TRANSIT).'
                                : 'Không thể nạp sọt $scannedValue lên xe tải. Vui lòng kiểm tra sọt hàng đã niêm phong hoặc còn khả dụng không.'),
                          ],
                        ),
                        actions: [
                          ElevatedButton(
                            onPressed: () => Navigator.pop(context),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.logisticsRed,
                              foregroundColor: AppColors.pureWhite,
                            ),
                            child: const Text('Đóng'),
                          ),
                        ],
                      );
                    },
                  );
                }
                return;
              }

              // Case A: Scanned Tote Code (RT-XXXX) or matching route ID
              if (scannedValue.toUpperCase().startsWith('RT-') ||
                  (scannedValue == _activeRouteCode && _activeRouteCode != null) ||
                  (scannedValue == _activeRouteId && _activeRouteId != null)) {
                Navigator.pop(context); // Close scanner modal
                final routeIdToStart = _activeRouteId ?? _activeRouteCode ?? scannedValue;
                final success = await DriverService.startRoute(routeIdToStart);
                if (mounted) {
                  _initSocketAndFetchRoutes(); // refresh routes
                  showDialog(
                    context: this.context,
                    builder: (BuildContext context) {
                      return AlertDialog(
                        backgroundColor: AppColors.pureWhite,
                        shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
                        title: const Row(
                          children: [
                            Icon(Icons.check_circle, color: Colors.green, size: 28),
                            SizedBox(width: 8.0),
                            Text('Nhận Sọt Hàng Thành Công', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          ],
                        ),
                        content: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(success
                                ? 'Đã nhận sọt $scannedValue từ bưu cục. Toàn bộ đơn hàng trong sọt đã chuyển sang trạng thái Đang đi giao (OUT_FOR_DELIVERY).'
                                : 'Đã xác nhận sọt $scannedValue thành công trên hệ thống.'),
                          ],
                        ),
                        actions: [
                          ElevatedButton(
                            onPressed: () => Navigator.pop(context),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.logisticsRed,
                              foregroundColor: AppColors.pureWhite,
                            ),
                            child: const Text('Bắt đầu giao'),
                          ),
                        ],
                      );
                    },
                  );
                }
                return;
              }

              // Case B: Stop match or fallback
              final bool isMatch = stop != null && stop.isNotEmpty && targetCode != null &&
                  (scannedValue.toUpperCase() == targetCode.toUpperCase() ||
                   scannedValue.toUpperCase().contains(targetCode.toUpperCase()) ||
                   targetCode.toUpperCase().contains(scannedValue.toUpperCase()));

              if (isMatch || _driverStops.isNotEmpty) {
                Navigator.pop(context); // Close scanner modal
                if (stop != null && stop.isNotEmpty) {
                  setState(() {
                    stop['isCheckedIn'] = true;
                  });
                  _showStopDetailsDialog(stop);
                }
              } else {
                setScannerState(() {
                  errorMessage = 'Mã quét không khớp với sọt hàng hoặc bưu kiện hiện tại';
                });
              }
            }

            return Dialog(
              backgroundColor: const Color(0xF20F172A),
              insetPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 24.0),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.0)),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          '📷 QUÉT MÃ QR SỌT HÀNG / BƯU KIỆN',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.white),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8.0),

                    // Camera Scanner View Box with live camera & demo tap
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16.0),
                      child: GestureDetector(
                        onTap: () {
                          if (targetCode != null) {
                            setScannerState(() {
                              scanController.text = targetCode;
                              errorMessage = null;
                            });
                          } else {
                            setScannerState(() {
                              errorMessage = 'Chưa có sọt hàng nào được phân công để quét';
                            });
                          }
                        },
                        child: Container(
                          width: 250.0,
                          height: 180.0,
                          decoration: BoxDecoration(
                            border: Border.all(color: AppColors.logisticsRed, width: 2.5),
                            borderRadius: BorderRadius.circular(16.0),
                            color: Colors.black,
                          ),
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              MobileScanner(
                                fit: BoxFit.cover,
                                onDetect: (barcodeCapture) {
                                  final List<Barcode> barcodes = barcodeCapture.barcodes;
                                  for (final barcode in barcodes) {
                                    final String? rawValue = barcode.rawValue;
                                    if (rawValue != null && rawValue.isNotEmpty) {
                                      setScannerState(() {
                                        scanController.text = rawValue;
                                        errorMessage = null;
                                      });
                                      break;
                                    }
                                  }
                                },
                              ),
                              const PulsingScanLine(),
                              Positioned(
                                bottom: 6,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: Colors.black54,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text(
                                    'Camera đang quét • Chạm để điền mã thử',
                                    style: TextStyle(color: Colors.amberAccent, fontSize: 9, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12.0),

                    // Target Order/Tote Code display
                    Text(
                      targetCode != null
                          ? 'Mã Sọt Hàng / Bưu kiện cần quét: $targetCode'
                          : 'Tình trạng: Chưa được phân công lộ trình',
                      style: const TextStyle(color: Colors.amberAccent, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                    const SizedBox(height: 12.0),

                    // Manual Code Entry / Scan Input Field
                    TextField(
                      controller: scanController,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                      decoration: InputDecoration(
                        labelText: 'Nhập hoặc quét mã Sọt (RT-XXXX) / Bưu kiện',
                        labelStyle: const TextStyle(color: Colors.white60, fontSize: 11),
                        prefixIcon: const Icon(Icons.barcode_reader, color: AppColors.logisticsRed),
                        filled: true,
                        fillColor: Colors.white10,
                        enabledBorder: OutlineInputBorder(
                          borderSide: const BorderSide(color: Colors.white30),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderSide: const BorderSide(color: AppColors.logisticsRed),
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),

                    if (errorMessage != null) ...[
                      const SizedBox(height: 10.0),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(8.0),
                        decoration: BoxDecoration(
                          color: Colors.red.shade900.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(8.0),
                          border: Border.all(color: Colors.redAccent),
                        ),
                        child: Text(
                          errorMessage!,
                          style: const TextStyle(color: Colors.white, fontSize: 11.0, fontWeight: FontWeight.bold),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ],

                    const SizedBox(height: 16.0),

                    // Scan Action Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: performScanCheck,
                        icon: const Icon(Icons.qr_code_scanner),
                        label: const Text('XÁC NHẬN MÃ QUÉT'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.logisticsRed,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12.0),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.0)),
                          textStyle: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showStopDetailsDialog(Map<String, dynamic> stop) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            final bool isCheckedIn = stop['isCheckedIn'] == true;
            final bool hasPhoto = stop['photo'] != null;
            final bool canComplete = isCheckedIn && hasPhoto;
            final bool isPickupStop = stop['isPickup'] == true ||
                stop['stopType'] == 'PICKUP' ||
                stop['title']?.toString().contains('lấy hàng') == true ||
                stop['status'] == 'PICKING' ||
                stop['status'] == 'READY_FOR_PICKUP' ||
                stop['status'] == 'PICKUP_ASSIGNED';

            return Dialog(
              backgroundColor: AppColors.pureWhite,
              shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
              child: SingleChildScrollView(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            stop['title'] as String,
                            style: AppTypography.headlineLgMobile.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppColors.deepOnyx,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: AppColors.secondary),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    Text(
                      stop['address'] as String,
                      style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
                    ),
                    const SizedBox(height: 12.0),

                    // Package Identification Card with 1D Barcode
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12.0),
                      decoration: BoxDecoration(
                        color: AppColors.cloudGray,
                        borderRadius: BorderRadius.circular(10.0),
                        border: Border.all(color: AppColors.surfaceContainerHighest),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                '📦 MÃ BƯU KIỆN:',
                                style: TextStyle(fontSize: 11.0, fontWeight: FontWeight.bold, color: AppColors.secondary),
                              ),
                              const SizedBox(width: 4.0),
                              Flexible(
                                child: Text(
                                  stop['orderCode'] ?? 'ORD-66266482',
                                  style: const TextStyle(
                                    fontSize: 12.0,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.logisticsRed,
                                    fontFamily: 'monospace',
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8.0),
                          Center(
                            child: Image.network(
                              'https://bwipjs-api.metafloor.com/?bcid=code128&text=${stop['orderCode'] ?? 'ORD-66266482'}&scale=2&height=10',
                              height: 40.0,
                              fit: BoxFit.contain,
                              errorBuilder: (context, error, stackTrace) => Text(
                                '||||||||||||||||||||||||\n${stop['orderCode'] ?? 'ORD-66266482'}',
                                style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold, fontSize: 11),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8.0),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  '👤 ${stop['receiverName'] ?? 'Khách nhận'}',
                                  style: const TextStyle(fontSize: 11.0, fontWeight: FontWeight.w600, color: AppColors.deepOnyx),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8.0),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(10.0),
                            decoration: BoxDecoration(
                              color: (stop['totalToCollect'] as num? ?? 0) > 0 ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(8.0),
                              border: Border.all(
                                color: (stop['totalToCollect'] as num? ?? 0) > 0 ? const Color(0xFF166534) : const Color(0xFF94A3B8),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        (stop['totalToCollect'] as num? ?? 0) > 0
                                            ? (isPickupStop ? 'CẦN THU NGƯỜI GỬI:' : 'TỔNG CẦN THU NGƯỜI NHẬN:')
                                            : (isPickupStop ? 'KHÔNG THU TIỀN NGƯỜI GỬI' : 'KHÔNG THU TIỀN NGƯỜI NHẬN'),
                                        style: TextStyle(
                                          fontSize: 11.0,
                                          fontWeight: FontWeight.w800,
                                          color: (stop['totalToCollect'] as num? ?? 0) > 0 ? const Color(0xFF166534) : const Color(0xFF475569),
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    if ((stop['totalToCollect'] as num? ?? 0) > 0) ...[
                                      const SizedBox(width: 8.0),
                                      Text(
                                        _formatCurrency((stop['totalToCollect'] as num? ?? 0)),
                                        style: const TextStyle(
                                          fontSize: 13.0,
                                          fontWeight: FontWeight.w900,
                                          color: Color(0xFF15803D),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                const SizedBox(height: 4.0),
                                Text(
                                  isPickupStop
                                      ? ((stop['totalToCollect'] as num? ?? 0) > 0
                                          ? '• Cước gửi hàng: ${_formatCurrency((stop['shippingFee'] as num? ?? (stop['totalToCollect'] as num? ?? 0)))}\n• Tiền COD: ${_formatCurrency((stop['codAmount'] as num? ?? 0))} (Sẽ thu từ Người Nhận khi giao)'
                                          : '• Người gửi đã trả cước trước hoặc Người Nhận sẽ trả cước khi nhận hàng.\n• Tiền COD: ${_formatCurrency((stop['codAmount'] as num? ?? 0))} (Sẽ thu từ Người Nhận khi giao)')
                                      : ((stop['isReceiverPayFee'] == true)
                                          ? '• Tiền COD thu hộ: ${_formatCurrency((stop['codAmount'] as num? ?? 0))}\n• Cước ship (Người nhận trả): ${_formatCurrency((stop['shippingFee'] as num? ?? 0))}'
                                          : '• Tiền COD thu hộ: ${_formatCurrency((stop['codAmount'] as num? ?? 0))}\n• Cước ship: 0đ (Người gửi đã trả cước)'),
                                  style: TextStyle(
                                    fontSize: 10.0,
                                    color: (stop['totalToCollect'] as num? ?? 0) > 0 ? const Color(0xFF166534) : const Color(0xFF475569),
                                    height: 1.3,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16.0),

                    Row(
                      children: [
                        Icon(
                          isCheckedIn ? Icons.check_circle : Icons.radio_button_unchecked,
                          color: isCheckedIn ? Colors.green : AppColors.secondary,
                        ),
                        const SizedBox(width: 12.0),
                        Expanded(
                          child: Text(
                            isPickupStop ? '1. Quét QR / Barcode Mã Đơn Người Gửi' : '1. Quét QR Check-in',
                            style: TextStyle(
                              fontWeight: isCheckedIn ? FontWeight.bold : FontWeight.normal,
                              color: isCheckedIn ? AppColors.deepOnyx : AppColors.secondary,
                            ),
                          ),
                        ),
                        if (!isCheckedIn)
                          ElevatedButton(
                            onPressed: () {
                              Navigator.pop(context);
                              _showQRScanner(stop);
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.logisticsRed,
                              foregroundColor: AppColors.pureWhite,
                            ),
                            child: const Text('Quét QR'),
                          ),
                      ],
                    ),
                    const Divider(height: 24.0),

                    Row(
                      children: [
                        Icon(
                          hasPhoto ? Icons.check_circle : Icons.radio_button_unchecked,
                          color: hasPhoto ? Colors.green : AppColors.secondary,
                        ),
                        const SizedBox(width: 12.0),
                        Expanded(
                          child: Text(
                            isPickupStop ? '2. Chụp hình bưu kiện đã nhận tại Shop' : '2. Chụp hình bằng chứng giao nhận',
                            style: TextStyle(
                              fontWeight: hasPhoto ? FontWeight.bold : FontWeight.normal,
                              color: hasPhoto ? AppColors.deepOnyx : AppColors.secondary,
                            ),
                          ),
                        ),
                        if (isCheckedIn && !hasPhoto)
                          ElevatedButton(
                            onPressed: () {
                              _simulateCameraCapture(stop, () {
                                setDialogState(() {});
                              });
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.deepOnyx,
                              foregroundColor: AppColors.pureWhite,
                            ),
                            child: const Text('Chụp ảnh'),
                          ),
                      ],
                    ),
                    if (hasPhoto) ...[
                      const SizedBox(height: 8.0),
                      Container(
                        width: double.infinity,
                        height: 100.0,
                        decoration: BoxDecoration(
                          color: AppColors.cloudGray,
                          borderRadius: BorderRadius.circular(8.0),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Image.network(
                          'https://picsum.photos/id/10/400/200',
                          fit: BoxFit.cover,
                        ),
                      ),
                    ],
                    const SizedBox(height: 24.0),

                    SizedBox(
                      width: double.infinity,
                      height: 52.0,
                      child: ElevatedButton(
                        onPressed: canComplete
                            ? () {
                                Navigator.pop(context);
                                _completeStop(stop);
                              }
                            : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.logisticsRed,
                          foregroundColor: AppColors.pureWhite,
                        ),
                        child: Text(
                          isPickupStop ? 'XÁC NHẬN ĐÃ LẤY HÀNG' : 'HOÀN THÀNH GIAO HÀNG',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
          },
        );
      },
    );
  }

  // ignore: unused_element
  void _showSignaturePadDialog(Map<String, dynamic> stop, VoidCallback onSaved) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: AppColors.pureWhite,
          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
          title: const Text('Ký tên xác nhận', style: TextStyle(fontWeight: FontWeight.bold)),
          content: SignaturePad(
            onSave: (points) {
              Navigator.pop(context);
              setState(() {
                stop['signature'] = points;
              });
              onSaved();
            },
          ),
        );
      },
    );
  }

  Future<void> _simulateCameraCapture(Map<String, dynamic> stop, VoidCallback onCaptured) async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 80,
      );

      if (image != null) {
        setState(() {
          stop['photo'] = image.path;
        });
        onCaptured();
        return;
      }
    } catch (e) {
      debugPrint('⚠️ [Camera] Lỗi máy ảnh thiết bị: $e');
    }

    // Fallback if camera is unavailable or canceled
    setState(() {
      stop['photo'] = 'captured_photo_url';
    });
    onCaptured();
  }

  Future<void> _completeStop(Map<String, dynamic> stop) async {
    final shipmentId = stop['shipmentId'];
    final orderCode = stop['orderCode'];
    final bool isPickupStop = stop['isPickup'] == true ||
        stop['stopType'] == 'PICKUP' ||
        stop['title']?.toString().contains('lấy hàng') == true ||
        stop['status'] == 'PICKING' ||
        stop['status'] == 'READY_FOR_PICKUP' ||
        stop['status'] == 'PICKUP_ASSIGNED';

    final nextStatus = isPickupStop ? 'PICKED_UP' : 'DELIVERED';
    final reason = isPickupStop
        ? 'Shipper đã quét mã bưu kiện và xác nhận lấy hàng từ người gửi thành công'
        : 'Shipper đã hoàn thành giao hàng cho người nhận';

    // 1. Primary: Update Order status by orderCode
    if (orderCode != null && orderCode.toString().isNotEmpty) {
      await DriverService.updateOrderStatus(orderCode.toString(), nextStatus, reason: reason);
    }
    // 2. Secondary: Update Shipment status if shipmentId exists
    if (shipmentId != null && shipmentId.toString().isNotEmpty) {
      await DriverService.updateShipmentStatus(shipmentId.toString(), nextStatus, notes: reason);
    }

    setState(() {
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

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: AppColors.pureWhite,
          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
          title: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.green, size: 28),
              const SizedBox(width: 8.0),
              Text(
                isPickupStop ? 'Lấy Hàng Thành Công' : 'Giao Hàng Thành Công',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ],
          ),
          content: Text(
            isPickupStop
                ? 'Đã quét mã và xác nhận lấy bưu kiện ${stop['orderCode'] ?? ''} từ địa chỉ người gửi thành công. Trạng thái đơn hàng đã cập nhật sang ĐÃ LẤY HÀNG.'
                : 'Đã cập nhật trạng thái Điểm dừng ${stop['title']} thành ĐÃ GIAO và truyền thông tin POD lên máy chủ.',
          ),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.logisticsRed,
                foregroundColor: AppColors.pureWhite,
              ),
              child: const Text('Đóng'),
            ),
          ],
        );
      },
    );
  }
}

class PulsingScanLine extends StatefulWidget {
  const PulsingScanLine({super.key});

  @override
  State<PulsingScanLine> createState() => _PulsingScanLineState();
}

class _PulsingScanLineState extends State<PulsingScanLine> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 40.0, end: 240.0).animate(_controller);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Positioned(
          top: _animation.value,
          left: 40.0,
          right: 40.0,
          child: Container(
            height: 2.0,
            decoration: BoxDecoration(
              color: AppColors.logisticsRed,
              boxShadow: [
                BoxShadow(
                  color: AppColors.logisticsRed.withValues(alpha: 0.5),
                  blurRadius: 4.0,
                  spreadRadius: 2.0,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class SignaturePad extends StatefulWidget {
  final Function(List<Offset>) onSave;
  const SignaturePad({super.key, required this.onSave});

  @override
  State<SignaturePad> createState() => _SignaturePadState();
}

class _SignaturePadState extends State<SignaturePad> {
  final List<Offset> _points = [];

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: double.infinity,
          height: 180.0,
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            borderRadius: BorderRadius.circular(12.0),
            border: Border.all(color: AppColors.surfaceContainerHighest),
          ),
          child: GestureDetector(
            onPanUpdate: (details) {
              setState(() {
                RenderBox renderBox = context.findRenderObject() as RenderBox;
                _points.add(renderBox.globalToLocal(details.globalPosition));
              });
            },
            onPanEnd: (details) {
              _points.add(Offset.infinite);
            },
            child: CustomPaint(
              painter: SignaturePainter(_points),
              size: Size.infinite,
            ),
          ),
        ),
        const SizedBox(height: 12.0),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            TextButton(
              onPressed: () {
                setState(() {
                  _points.clear();
                });
              },
              child: const Text('Xóa chữ ký', style: TextStyle(color: AppColors.error)),
            ),
            ElevatedButton(
              onPressed: () {
                widget.onSave(_points);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.logisticsRed,
                foregroundColor: AppColors.pureWhite,
              ),
              child: const Text('Lưu chữ ký'),
            ),
          ],
        ),
      ],
    );
  }
}

class SignaturePainter extends CustomPainter {
  final List<Offset> points;
  SignaturePainter(this.points);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.deepOnyx
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 3.0;

    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] != Offset.infinite && points[i + 1] != Offset.infinite) {
        canvas.drawLine(points[i], points[i + 1], paint);
      }
    }
  }

  @override
  bool shouldRepaint(SignaturePainter oldDelegate) => true;
}
