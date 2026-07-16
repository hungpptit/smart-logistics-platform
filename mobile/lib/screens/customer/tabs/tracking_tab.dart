import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';
import '../../../services/order_service.dart';

class TrackingTab extends StatefulWidget {
  const TrackingTab({super.key});

  @override
  State<TrackingTab> createState() => _TrackingTabState();
}

class _TrackingTabState extends State<TrackingTab> {
  final _searchController = TextEditingController();
  String _selectedCode = '';
  final MapController _mapController = MapController();

  Map<String, dynamic>? _activeShipment;
  List<Map<String, dynamic>> _myRealOrders = [];
  bool _isLoading = false;
  bool _isSearching = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadInitialOrder();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialOrder() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final list = await OrderService.fetchOrders();
    if (list.isNotEmpty) {
      setState(() {
        _myRealOrders = list.map((o) {
          final code = o['orderCode'] ?? '';
          final status = o['status'] ?? 'PENDING';
          final dest = o['deliveryAddressText'] ?? 'Chưa xác định';
          return {
            'code': code,
            'status': _translateStatus(status),
            'statusRaw': status,
            'destination': dest,
            'rawData': o,
          };
        }).toList();
      });

      final firstCode = _myRealOrders.first['code'];
      _searchController.text = firstCode;
      await _fetchTrackingData(firstCode);
    }

    setState(() {
      _isLoading = false;
    });
  }

  Future<void> _fetchTrackingData(String code) async {
    setState(() {
      _isSearching = true;
      _errorMessage = null;
    });

    final order = await OrderService.trackOrder(code);
    if (order != null) {
      setState(() {
        _selectedCode = code;
        _activeShipment = _mapRealOrderToShipment(order);
        _isSearching = false;
      });

      // Move map controller to order destination
      final lat = double.tryParse(order['deliveryLatitude']?.toString() ?? '') ?? 10.7725;
      final lng = double.tryParse(order['deliveryLongitude']?.toString() ?? '') ?? 106.6980;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        try {
          _mapController.move(LatLng(lat, lng), 12.0);
        } catch (e) {
          debugPrint('⚠️ [TrackingTab] Không thể di chuyển bản đồ: $e');
        }
      });
    } else {
      setState(() {
        _errorMessage = 'Không tìm thấy thông tin vận đơn: $code';
        _isSearching = false;
        _activeShipment = null;
      });
    }
  }

  void _onSearchSubmit() {
    final query = _searchController.text.trim().toUpperCase();
    if (query.isNotEmpty) {
      _fetchTrackingData(query);
    }
  }

  Map<String, dynamic> _mapRealOrderToShipment(Map<String, dynamic> o) {
    final destination = o['deliveryAddressText'] ?? 'Chưa xác định';
    final statusStr = o['status'] ?? 'PENDING';
    final status = _translateStatus(statusStr);

    final eta = o['estimatedDeliveryDate'] != null
        ? o['estimatedDeliveryDate'].toString().split('T')[0]
        : 'Chưa có thông tin';

    double totalWeight = 0.0;
    int packageCount = 0;
    if (o['packages'] != null && o['packages'] is List) {
      final pkgs = o['packages'] as List;
      packageCount = pkgs.length;
      for (final p in pkgs) {
        if (p['weight'] != null) {
          totalWeight += double.tryParse(p['weight'].toString()) ?? 0.0;
        }
      }
    }
    final weight = '${totalWeight.toStringAsFixed(1)} kg';

    final serviceObj = o['service'] ?? {};
    final service = serviceObj['name'] ?? 'Chuyển phát tiêu chuẩn';

    final carrier = 'Velocity Express';
    final items = '$packageCount kiện hàng';

    final history = o['statusHistory'] != null ? List<dynamic>.from(o['statusHistory']) : [];
    final List<Map<String, dynamic>> timeline = [];

    if (history.isNotEmpty) {
      for (int i = history.length - 1; i >= 0; i--) {
        final h = history[i];
        final hStatus = h['status'] ?? 'PENDING';
        final isDone = true;
        final isActive = i == history.length - 1;
        final timeStr = h['createdAt'] != null
            ? h['createdAt'].toString().split('T')[0]
            : '';
        final note = h['note'] ?? _getStatusDescription(hStatus);

        timeline.add({
          'title': _translateStatus(hStatus),
          'time': timeStr,
          'desc': note,
          'isDone': isDone,
          'isActive': isActive,
          'icon': _getStatusIcon(hStatus),
        });
      }
    } else {
      timeline.add({
        'title': _translateStatus(statusStr),
        'time': o['createdAt'] != null ? o['createdAt'].toString().split('T')[0] : '',
        'desc': _getStatusDescription(statusStr),
        'isDone': true,
        'isActive': true,
        'icon': _getStatusIcon(statusStr),
      });
    }

    return {
      'destination': destination,
      'status': status,
      'eta': eta,
      'weight': weight,
      'service': service,
      'carrier': carrier,
      'items': items,
      'timeline': timeline,
      'latitude': double.tryParse(o['deliveryLatitude']?.toString() ?? '') ?? 10.7725,
      'longitude': double.tryParse(o['deliveryLongitude']?.toString() ?? '') ?? 106.6980,
    };
  }

  String _translateStatus(String status) {
    switch (status) {
      case 'DRAFT': return 'Đơn nháp';
      case 'PENDING': return 'Chờ xử lý';
      case 'READY_FOR_PICKUP': return 'Sẵn sàng gom';
      case 'PICKED_UP': return 'Đã thu gom';
      case 'IN_TRANSIT': return 'Đang vận chuyển';
      case 'AT_HUB': return 'Đã nhập kho trung chuyển';
      case 'OUT_FOR_DELIVERY': return 'Đang giao hàng';
      case 'DELIVERED': return 'Đã giao thành công';
      case 'CANCELLED': return 'Đã hủy';
      default: return status;
    }
  }

  String _getStatusDescription(String status) {
    switch (status) {
      case 'PENDING': return 'Đơn hàng mới được tạo và đang chờ xác nhận.';
      case 'READY_FOR_PICKUP': return 'Tài xế đang trên đường đến lấy hàng.';
      case 'PICKED_UP': return 'Kiện hàng đã được tài xế lấy thành công.';
      case 'IN_TRANSIT': return 'Đơn hàng đang được vận chuyển giữa các bưu cục.';
      case 'AT_HUB': return 'Lô hàng đã được tiếp nhận và phân loại tại bưu cục.';
      case 'OUT_FOR_DELIVERY': return 'Shipper đang trên đường giao hàng tới người nhận.';
      case 'DELIVERED': return 'Đơn hàng đã được giao nhận thành công.';
      case 'CANCELLED': return 'Đơn hàng đã bị hủy bỏ.';
      default: return 'Đang cập nhật lịch sử.';
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'PENDING': return Icons.article_outlined;
      case 'READY_FOR_PICKUP': return Icons.departure_board;
      case 'PICKED_UP': return Icons.inventory_2;
      case 'IN_TRANSIT': return Icons.local_shipping;
      case 'AT_HUB': return Icons.warehouse;
      case 'OUT_FOR_DELIVERY': return Icons.moped;
      case 'DELIVERED': return Icons.check_circle;
      case 'CANCELLED': return Icons.cancel_outlined;
      default: return Icons.info_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(
        horizontal: AppStyles.marginMobile,
        vertical: 24.0,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header / Search block
          Center(
            child: Column(
              children: [
                // Search field
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
                  decoration: BoxDecoration(
                    color: AppColors.pureWhite,
                    borderRadius: BorderRadius.circular(100.0),
                    border: Border.all(color: AppColors.surfaceContainerHighest, width: 1.0),
                    boxShadow: AppStyles.ambientShadow,
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.search, color: AppColors.secondary, size: 20.0),
                      const SizedBox(width: 10.0),
                      Expanded(
                        child: TextFormField(
                          controller: _searchController,
                          style: AppTypography.bodyMd.copyWith(color: AppColors.deepOnyx),
                          decoration: const InputDecoration(
                            hintText: 'Nhập mã vận đơn...',
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            hintStyle: TextStyle(color: Colors.black38),
                            isDense: true,
                            contentPadding: EdgeInsets.symmetric(vertical: 12.0),
                          ),
                          onFieldSubmitted: (_) => _onSearchSubmit(),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24.0),

          // Horizontal selection for customer's real orders
          if (_myRealOrders.isNotEmpty) ...[
            Text(
              'ĐƠN HÀNG CỦA BẠN',
              style: AppTypography.labelLg.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.deepOnyx,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 12.0),
            SizedBox(
              height: 90.0,
              child: ListView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                children: _myRealOrders.map((o) {
                  final code = o['code'];
                  final isSelected = _selectedCode == code;
                  return GestureDetector(
                    onTap: () {
                      _searchController.text = code;
                      _fetchTrackingData(code);
                    },
                    child: Container(
                      width: 200.0,
                      margin: const EdgeInsets.only(right: 12.0),
                      padding: const EdgeInsets.all(12.0),
                      decoration: BoxDecoration(
                        color: AppColors.pureWhite,
                        borderRadius: AppStyles.roundedLg,
                        border: Border.all(
                          color: isSelected ? AppColors.logisticsRed : AppColors.surfaceContainerHighest,
                          width: isSelected ? 2.0 : 1.0,
                        ),
                        boxShadow: AppStyles.ambientShadow,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                code,
                                style: AppTypography.labelLg.copyWith(
                                  color: AppColors.deepOnyx,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Container(
                                width: 8.0,
                                height: 8.0,
                                decoration: BoxDecoration(
                                  color: o['statusRaw'] == 'DELIVERED' ? Colors.green : Colors.orange,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4.0),
                          Text(
                            o['status'] as String,
                            style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                          ),
                          const SizedBox(height: 2.0),
                          Text(
                            'Đến: ${o['destination']}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.labelMd.copyWith(color: AppColors.secondary, fontSize: 10.0),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 28.0),
          ],

          // Search state indicators / Error State / Empty State / Results Card
          if (_isLoading || _isSearching)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 40.0),
                child: CircularProgressIndicator(color: AppColors.logisticsRed),
              ),
            )
          else if (_errorMessage != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 40.0),
                child: Column(
                  children: [
                    const Icon(Icons.warning_amber_rounded, size: 56.0, color: AppColors.logisticsRed),
                    const SizedBox(height: 12.0),
                    Text(
                      _errorMessage!,
                      style: AppTypography.bodyLg.copyWith(color: AppColors.deepOnyx, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            )
          else if (_activeShipment == null)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 40.0),
                child: Column(
                  children: [
                    Icon(Icons.query_stats, size: 64.0, color: AppColors.secondary.withValues(alpha: 0.3)),
                    const SizedBox(height: 16.0),
                    Text(
                      'Nhập mã vận đơn của bạn để bắt đầu tra cứu hành trình trực tiếp.',
                      style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            )
          else ...[
            // Active Shipment Card
            Container(
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: AppColors.pureWhite,
                borderRadius: AppStyles.roundedXl,
                border: Border.all(color: AppColors.surfaceContainerHighest),
                boxShadow: AppStyles.ambientShadow,
              ),
              child: Stack(
                children: [
                  Positioned(
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 5.0,
                    child: Container(color: AppColors.logisticsRed),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 6.0),
                              decoration: BoxDecoration(
                                color: const Color(0xFFDCFCE7),
                                borderRadius: BorderRadius.circular(20.0),
                              ),
                              child: Text(
                                _activeShipment!['status'] as String,
                                style: AppTypography.labelMd.copyWith(
                                  color: const Color(0xFF166534),
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            Text(
                              '#$_selectedCode',
                              style: AppTypography.labelLg.copyWith(
                                color: AppColors.secondary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16.0),
                        Text(
                          'Đang giao đến ${_activeShipment!['destination']}',
                          style: AppTypography.headlineLgMobile.copyWith(
                            color: AppColors.deepOnyx,
                            fontWeight: FontWeight.bold,
                            fontSize: 20.0,
                          ),
                        ),
                        const SizedBox(height: 16.0),
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Dự kiến đến',
                                    style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                                  ),
                                  const SizedBox(height: 4.0),
                                  Text(
                                    _activeShipment!['eta'] as String,
                                    style: AppTypography.headlineMd.copyWith(
                                      color: AppColors.deepOnyx,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16.0,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Vị trí hiện tại',
                                    style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                                  ),
                                  const SizedBox(height: 4.0),
                                  Text(
                                    (_activeShipment!['timeline'] as List).isNotEmpty
                                        ? (_activeShipment!['timeline'] as List)[0]['title'] as String
                                        : 'Velocity Hub',
                                    style: AppTypography.headlineMd.copyWith(
                                      color: AppColors.deepOnyx,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16.0,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20.0),
                        // Embedded Map
                        Container(
                          height: 180.0,
                          width: double.infinity,
                          clipBehavior: Clip.antiAlias,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16.0),
                            border: Border.all(color: AppColors.surfaceContainerHighest),
                          ),
                          child: Stack(
                            children: [
                              Positioned.fill(
                                child: FlutterMap(
                                  mapController: _mapController,
                                  options: MapOptions(
                                    initialCenter: LatLng(
                                      _activeShipment!['latitude'] as double,
                                      _activeShipment!['longitude'] as double,
                                    ),
                                    initialZoom: 12.0,
                                  ),
                                  children: [
                                    TileLayer(
                                      urlTemplate: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                                      userAgentPackageName: 'com.velocity.mobile',
                                    ),
                                    MarkerLayer(
                                      markers: [
                                        Marker(
                                          point: LatLng(
                                            _activeShipment!['latitude'] as double,
                                            _activeShipment!['longitude'] as double,
                                          ),
                                          width: 36.0,
                                          height: 36.0,
                                          child: Container(
                                            decoration: BoxDecoration(
                                              color: AppColors.logisticsRed,
                                              shape: BoxShape.circle,
                                              border: Border.all(color: AppColors.pureWhite, width: 2.0),
                                              boxShadow: AppStyles.softShadow,
                                            ),
                                            child: const Icon(
                                              Icons.local_shipping,
                                              color: AppColors.pureWhite,
                                              size: 16.0,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              Positioned.fill(
                                child: Container(
                                  color: Colors.black.withValues(alpha: 0.05),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28.0),

            // Redesigned timeline
            Container(
              padding: const EdgeInsets.all(20.0),
              decoration: BoxDecoration(
                color: AppColors.pureWhite,
                borderRadius: AppStyles.roundedXl,
                border: Border.all(color: AppColors.surfaceContainerHighest),
                boxShadow: AppStyles.ambientShadow,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Trạng thái giao hàng',
                    style: AppTypography.labelLg.copyWith(fontWeight: FontWeight.bold, color: AppColors.deepOnyx),
                  ),
                  const SizedBox(height: 20.0),
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: (_activeShipment!['timeline'] as List).length,
                    itemBuilder: (context, index) {
                      final step = (_activeShipment!['timeline'] as List)[index];
                      final isLast = index == (_activeShipment!['timeline'] as List).length - 1;
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Column(
                            children: [
                              Container(
                                width: 28.0,
                                height: 28.0,
                                decoration: BoxDecoration(
                                  color: step['isActive'] == true ? AppColors.logisticsRed : AppColors.surfaceContainerLow,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  step['icon'] as IconData,
                                  color: step['isActive'] == true ? AppColors.pureWhite : AppColors.secondary,
                                  size: 14.0,
                                ),
                              ),
                              if (!isLast)
                                Container(
                                  width: 2.0,
                                  height: 40.0,
                                  color: AppColors.surfaceContainer,
                                ),
                            ],
                          ),
                          const SizedBox(width: 16.0),
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.only(top: 2.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        step['title'] as String,
                                        style: AppTypography.labelLg.copyWith(
                                          fontWeight: FontWeight.bold,
                                          color: step['isActive'] == true ? AppColors.logisticsRed : AppColors.deepOnyx,
                                        ),
                                      ),
                                      Text(
                                        step['time'] as String,
                                        style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4.0),
                                  Text(
                                    step['desc'] as String,
                                    style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
                                  ),
                                  const SizedBox(height: 16.0),
                                ],
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24.0),

            // Shipment Details
            Container(
              padding: const EdgeInsets.all(20.0),
              decoration: BoxDecoration(
                color: AppColors.pureWhite,
                borderRadius: AppStyles.roundedXl,
                border: Border.all(color: AppColors.surfaceContainerHighest),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Chi tiết lô hàng',
                    style: AppTypography.labelLg.copyWith(fontWeight: FontWeight.bold, color: AppColors.deepOnyx),
                  ),
                  const SizedBox(height: 6.0),
                  const Divider(),
                  const SizedBox(height: 12.0),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    childAspectRatio: 2.0,
                    children: [
                      _buildDetailsItem('Dự kiến đến', _activeShipment!['eta'] as String),
                      _buildDetailsItem('Trọng lượng', _activeShipment!['weight'] as String),
                      _buildDetailsItem('Loại dịch vụ', _activeShipment!['service'] as String, isRed: true),
                      _buildDetailsItem('Nhà vận chuyển', _activeShipment!['carrier'] as String),
                    ],
                  ),
                  const SizedBox(height: 12.0),
                  const Divider(),
                  const SizedBox(height: 12.0),
                  Row(
                    children: [
                      Container(
                        width: 40.0,
                        height: 40.0,
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerLow,
                          borderRadius: AppStyles.roundedLg,
                        ),
                        child: const Icon(Icons.inventory_2, color: AppColors.logisticsRed),
                      ),
                      const SizedBox(width: 12.0),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Hàng ký gửi',
                            style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                          ),
                          Text(
                            _activeShipment!['items'] as String,
                            style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.bold, color: AppColors.deepOnyx),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24.0),

            // Support Actions Card
            Container(
              padding: const EdgeInsets.all(20.0),
              decoration: BoxDecoration(
                color: AppColors.deepOnyx,
                borderRadius: AppStyles.roundedXl,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Cần hỗ trợ về lô hàng này?',
                    style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16.0),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {},
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.logisticsRed,
                            foregroundColor: AppColors.pureWhite,
                            shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                            padding: const EdgeInsets.symmetric(vertical: 12.0),
                          ),
                          child: const Text('Hỗ trợ'),
                        ),
                      ),
                      const SizedBox(width: 12.0),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {},
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.pureWhite,
                            side: const BorderSide(color: Colors.white24),
                            shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                            padding: const EdgeInsets.symmetric(vertical: 12.0),
                          ),
                          child: const Text('Hẹn lại lịch'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDetailsItem(String label, String value, {bool isRed = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          label,
          style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
        ),
        const SizedBox(height: 2.0),
        Text(
          value,
          style: AppTypography.bodyMd.copyWith(
            fontWeight: FontWeight.bold,
            color: isRed ? AppColors.logisticsRed : AppColors.deepOnyx,
          ),
        ),
      ],
    );
  }
}
