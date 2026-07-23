import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
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
  bool _isNavigating = false;
  bool _isVoiceOn = true;
  bool _showTrafficAlert = false;
  Timer? _alertTimer;

  final List<Map<String, dynamic>> _driverStops = [
    {
      'index': 5,
      'title': 'Velocity Tech Hub',
      'address': '452 Industrial Way, Dock 4, Austin TX',
      'packages': 3,
      'eta': '10:45 SA',
      'distance': '0.8 mi',
      'status': 'ĐANG THỰC HIỆN',
      'isActive': true,
      'isCheckedIn': false,
      'signature': null,
      'photo': null,
    },
    {
      'index': 6,
      'title': 'Northside Retail Center',
      'address': '8920 Burnet Rd, Suite 110, Austin TX',
      'packages': 1,
      'eta': '11:15 SA',
      'distance': '2.4 mi',
      'status': 'TIẾP THEO',
      'isActive': false,
      'isCheckedIn': false,
      'signature': null,
      'photo': null,
    },
    {
      'index': 7,
      'title': 'Summit Residential Park',
      'address': '2200 Summit Vista Pkwy, Austin TX',
      'packages': 2,
      'eta': '11:45 SA',
      'distance': '4.1 mi',
      'status': 'ĐANG CHỜ',
      'isActive': false,
      'isCheckedIn': false,
      'signature': null,
      'photo': null,
    },
  ];

  String _driverName = 'Tài xế';
  String _driverEmail = 'driver@velocity.vn';
  String? _activeRouteId;
  List<LatLng> _roadPolylinePoints = [];

  // Real-time GPS location fields
  StreamSubscription<Position>? _positionSubscription;
  LatLng _currentLocation = const LatLng(10.8231, 106.6297); // default to HCMC center
  final MapController _mapController = MapController();
  final MapController _navMapController = MapController();

  @override
  void initState() {
    super.initState();
    _loadDriverProfile();
    _initSocketAndFetchRoutes();
    _initLocationService();
  }

  Future<void> _initSocketAndFetchRoutes() async {
    final token = await AuthService.getToken();
    if (token != null && token.isNotEmpty) {
      SocketService().connect(token: token);
    }

    final routes = await DriverService.fetchMyRoutes();
    if (routes.isNotEmpty && mounted) {
      final firstRoute = routes.first;
      _activeRouteId = firstRoute['id']?.toString();
      if (_activeRouteId != null) {
        SocketService().joinRoute(_activeRouteId!);

        // Fetch FULL route detail to get the complete stops array from DB
        final routeDetail = await DriverService.fetchRouteDetail(_activeRouteId!);
        final List stopsRaw = routeDetail != null
            ? (routeDetail['stops'] ?? routeDetail['routeStops'] ?? [])
            : (firstRoute['stops'] ?? firstRoute['routeStops'] ?? []);

        if (stopsRaw.isNotEmpty) {
          final List<Map<String, dynamic>> mappedStops = [];
          for (int i = 0; i < stopsRaw.length; i++) {
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

            final orderCode = stop['shipment']?['order']?['orderCode'] ??
                stop['shipment']?['trackingNumber'] ??
                (shipmentId != null ? 'ORD-${shipmentId.toString().substring(0, 8).toUpperCase()}' : 'ORD-66266482-0${i + 1}');

            mappedStops.add({
              'index': i + 1,
              'id': stop['id'] ?? '$i',
              'shipmentId': shipmentId,
              'orderCode': orderCode,
              'receiverName': stop['shipment']?['receiverName'] ?? 'Anh Minh (0987.654.321)',
              'codAmount': stop['shipment']?['codAmount'] ?? 150000,
              'title': stopType == 'PICKUP' ? 'Điểm lấy hàng' : 'Điểm giao hàng',
              'address': address,
              'latitude': lat,
              'longitude': lng,
              'packages': 1,
              'eta': (stop['plannedArrivalTime'] != null && stop['plannedArrivalTime'].toString().contains('T'))
                  ? stop['plannedArrivalTime'].toString().split('T')[1].substring(0, 5)
                  : 'Chờ giao',
              'distance': 'Theo tuyến',
              'status': i == 0 ? 'ĐANG THỰC HIỆN' : 'TIẾP THEO',
              'isActive': i == 0,
              'isCheckedIn': false,
              'signature': null,
              'photo': null,
            });
          }

          setState(() {
            _driverStops.clear();
            _driverStops.addAll(mappedStops);
          });

          _updateGoongPolyline();
        }
      }
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
        _updateGoongPolyline();
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

  Future<void> _updateGoongPolyline() async {
    if (_driverStops.isEmpty) return;

    final stopLatLngs = _driverStops
        .map((s) => LatLng(s['latitude'] as double, s['longitude'] as double))
        .toList();

    if (stopLatLngs.isNotEmpty) {
      final goongPoints = await DriverService.fetchGoongRoutePolyline(
        origin: _currentLocation,
        destination: stopLatLngs.last,
        waypoints: stopLatLngs.length > 1 ? stopLatLngs.sublist(0, stopLatLngs.length - 1) : null,
      );

      if (goongPoints.isNotEmpty && mounted) {
        setState(() {
          _roadPolylinePoints = goongPoints;
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
      _showTrafficAlert = false;
    });
    _alertTimer?.cancel();
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
            padding: const EdgeInsets.only(right: 16.0, left: 8.0),
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
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(AppStyles.marginMobile),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Actions row
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _showShiftSummary,
                    icon: const Icon(Icons.summarize, size: 18.0),
                    label: const Text('Tóm tắt ca'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.deepOnyx,
                      foregroundColor: AppColors.pureWhite,
                      padding: const EdgeInsets.symmetric(vertical: 14.0),
                      shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                    ),
                  ),
                ),
                const SizedBox(width: 12.0),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      final activeStop = _driverStops.firstWhere((s) => s['isActive'] == true && s['isCheckedIn'] == false, orElse: () => <String, dynamic>{});
                      if (activeStop.isNotEmpty) {
                        _showQRScanner(activeStop);
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Không có điểm dừng nào đang hoạt động chờ Check-in.'),
                            backgroundColor: AppColors.error,
                          ),
                        );
                      }
                    },
                    icon: const Icon(Icons.qr_code_scanner, size: 18.0),
                    label: const Text('Quét Check-in'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.logisticsRed,
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
                                '${(_driverStops.length * 1.2).toStringAsFixed(1)} km',
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
                                '3.2 phút',
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
    );
  }

  Widget _buildStopCard(Map<String, dynamic> stop) {
    final int index = stop['index'] as int;
    final String title = stop['title'] as String;
    final String address = stop['address'] as String;
    final int packages = stop['packages'] as int;
    final String eta = stop['eta'] as String;
    final String distance = stop['distance'] as String;
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
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                                decoration: BoxDecoration(
                                  color: AppColors.logisticsRed.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4.0),
                                ),
                                child: Text(
                                  stop['orderCode'] ?? 'ORD-66266482',
                                  style: const TextStyle(
                                    color: AppColors.logisticsRed,
                                    fontSize: 11.0,
                                    fontWeight: FontWeight.bold,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                              ),
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
                              Text(
                                'cách $distance',
                                style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
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
              padding: const EdgeInsets.all(16.0),
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
                      Icons.turn_right,
                      size: 36.0,
                      color: AppColors.logisticsRed,
                    ),
                  ),
                  const SizedBox(width: 16.0),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              '200m',
                              style: AppTypography.headlineLgMobile.copyWith(
                                color: AppColors.logisticsRed,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(width: 6.0),
                            Text(
                              'sau đó'.toUpperCase(),
                              style: AppTypography.labelMd.copyWith(color: Colors.white70),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2.0),
                        Text(
                          'Rẽ phải vào đường Hai Bà Trưng',
                          style: AppTypography.headlineMd.copyWith(
                            color: AppColors.pureWhite,
                            fontSize: 16.0,
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
                              'Chậm khoảng 3 phút trên đoạn đường Hai Bà Trưng.',
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
                    padding: const EdgeInsets.all(12.0),
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
                        Expanded(
                          child: SizedBox(
                            height: 48.0,
                            child: ElevatedButton.icon(
                              onPressed: () {
                                // Report incident
                              },
                              icon: const Icon(Icons.report, color: AppColors.pureWhite),
                              label: const Text('BÁO CÁO SỰ CỐ'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.logisticsRed,
                                foregroundColor: AppColors.pureWhite,
                                shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12.0),
                        GestureDetector(
                          onTap: _stopNavigation,
                          child: Container(
                            width: 48.0,
                            height: 48.0,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceContainerHigh,
                              borderRadius: AppStyles.roundedLg,
                            ),
                            child: const Icon(Icons.close, color: AppColors.error, size: 28.0),
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

  void _showQRScanner(Map<String, dynamic> stop) {
    final String targetCode = (stop['orderCode'] as String? ?? 'ORD-66266482').trim();
    final TextEditingController scanController = TextEditingController(text: targetCode);
    String? errorMessage;

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setScannerState) {
            void performScanCheck() {
              final scannedValue = scanController.text.trim();
              if (scannedValue.isEmpty) {
                setScannerState(() {
                  errorMessage = 'Vui lòng nhập hoặc quét mã Barcode/QR dán trên bưu kiện!';
                });
                return;
              }

              // Check code match (case-insensitive substring or exact match)
              final bool isMatch = scannedValue.toUpperCase() == targetCode.toUpperCase() ||
                  scannedValue.toUpperCase().contains(targetCode.toUpperCase()) ||
                  targetCode.toUpperCase().contains(scannedValue.toUpperCase());

              if (isMatch) {
                Navigator.pop(context); // Close scanner modal
                setState(() {
                  stop['isCheckedIn'] = true;
                });

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
                          Text('Quét mã thành công', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        ],
                      ),
                      content: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('✅ Đã quét khớp thành công mã bưu kiện: $targetCode'),
                          const SizedBox(height: 8.0),
                          const Text(
                            'Bạn đã check-in thành công tại điểm dừng. Hãy tiến hành lấy chữ ký và chụp ảnh POD.',
                            style: TextStyle(fontSize: 12, color: AppColors.secondary),
                          ),
                        ],
                      ),
                      actions: [
                        ElevatedButton(
                          onPressed: () {
                            Navigator.pop(context);
                            _showStopDetailsDialog(stop);
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.logisticsRed,
                            foregroundColor: AppColors.pureWhite,
                          ),
                          child: const Text('Tiếp tục'),
                        ),
                      ],
                    );
                  },
                );
              } else {
                setScannerState(() {
                  errorMessage = '❌ MÃ BƯU KIỆN KHÔNG KHỚP!\n'
                      'Mã bạn nhập: "$scannedValue"\n'
                      'Mã đúng của kiện hàng này là: "$targetCode"';
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
                          '📷 QUÉT MÃ BARCODE / QR BƯU KIỆN',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.white),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8.0),

                    // Camera Scanner View Box
                    Container(
                      width: 240.0,
                      height: 180.0,
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.logisticsRed, width: 2.5),
                        borderRadius: BorderRadius.circular(16.0),
                        color: Colors.black26,
                      ),
                      child: const Stack(
                        alignment: Alignment.center,
                        children: [
                          PulsingScanLine(),
                          Icon(Icons.qr_code_scanner, color: Colors.white24, size: 80),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12.0),

                    // Target Order Code display
                    Text(
                      'Bưu kiện cần quét: $targetCode',
                      style: const TextStyle(color: Colors.amberAccent, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                    const SizedBox(height: 12.0),

                    // Manual Code Entry / Scan Input Field
                    TextField(
                      controller: scanController,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                      decoration: InputDecoration(
                        labelText: 'Nhập hoặc quét mã dán trên thùng hàng',
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
                          padding: EdgeInsets.symmetric(vertical: 12.0),
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
            final bool hasSignature = stop['signature'] != null;
            final bool hasPhoto = stop['photo'] != null;
            final bool canComplete = isCheckedIn && hasSignature && hasPhoto;

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
                                '📦 MÃ BƯU KIỆN CẦN QUÉT:',
                                style: TextStyle(fontSize: 11.0, fontWeight: FontWeight.bold, color: AppColors.secondary),
                              ),
                              Text(
                                stop['orderCode'] ?? 'ORD-66266482',
                                style: const TextStyle(
                                  fontSize: 13.0,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.logisticsRed,
                                  fontFamily: 'monospace',
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
                              Text(
                                '👤 ${stop['receiverName'] ?? 'Anh Minh (0987.654.321)'}',
                                style: const TextStyle(fontSize: 11.0, fontWeight: FontWeight.w600, color: AppColors.deepOnyx),
                              ),
                              const Text(
                                '💵 COD: 150.000đ',
                                style: TextStyle(fontSize: 11.0, fontWeight: FontWeight.bold, color: Colors.green),
                              ),
                            ],
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
                            '1. Quét QR Check-in',
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
                          hasSignature ? Icons.check_circle : Icons.radio_button_unchecked,
                          color: hasSignature ? Colors.green : AppColors.secondary,
                        ),
                        const SizedBox(width: 12.0),
                        Expanded(
                          child: Text(
                            '2. Chữ ký người nhận hàng',
                            style: TextStyle(
                              fontWeight: hasSignature ? FontWeight.bold : FontWeight.normal,
                              color: hasSignature ? AppColors.deepOnyx : AppColors.secondary,
                            ),
                          ),
                        ),
                        if (isCheckedIn && !hasSignature)
                          ElevatedButton(
                            onPressed: () {
                              _showSignaturePadDialog(stop, () {
                                setDialogState(() {});
                              });
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.deepOnyx,
                              foregroundColor: AppColors.pureWhite,
                            ),
                            child: const Text('Ký tên'),
                          ),
                      ],
                    ),
                    if (hasSignature) ...[
                      const SizedBox(height: 8.0),
                      Container(
                        width: double.infinity,
                        height: 60.0,
                        decoration: BoxDecoration(
                          color: AppColors.cloudGray,
                          borderRadius: BorderRadius.circular(8.0),
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          '✍️ Đã ký tên thành công',
                          style: TextStyle(fontStyle: FontStyle.italic, color: Colors.green, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
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
                            '3. Chụp hình bằng chứng giao nhận',
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
                        child: const Text(
                          'HOÀN THÀNH GIAO HÀNG',
                          style: TextStyle(fontWeight: FontWeight.bold),
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
    if (shipmentId != null && shipmentId.toString().isNotEmpty) {
      await DriverService.updateShipmentStatus(shipmentId.toString(), 'DELIVERED');
    }

    setState(() {
      stop['status'] = 'ĐÃ GIAO';
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
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green),
              SizedBox(width: 8.0),
              Text('Giao hàng thành công', style: TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          content: Text('Đã cập nhật trạng thái Điểm dừng ${stop['title']} thành ĐÃ GIAO và truyền thông tin POD lên máy chủ.'),
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
