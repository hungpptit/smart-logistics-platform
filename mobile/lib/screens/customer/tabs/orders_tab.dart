import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';
import '../../../services/order_service.dart';

class OrdersTab extends StatefulWidget {
  final VoidCallback onCreateOrder;
  final VoidCallback onTrackOrder;

  const OrdersTab({
    super.key,
    required this.onCreateOrder,
    required this.onTrackOrder,
  });

  @override
  State<OrdersTab> createState() => _OrdersTabState();
}

class _OrdersTabState extends State<OrdersTab> {
  String _selectedFilter = 'Tất cả';
  String _searchQuery = '';
  final _searchController = TextEditingController();
  bool _isLoading = false;

  List<Map<String, dynamic>> _allOrders = [];

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    setState(() {
      _isLoading = true;
    });

    final realOrders = await OrderService.fetchOrders();
    if (!mounted) return;

    if (realOrders.isNotEmpty) {
      final formatted = realOrders.map((item) {
        final trackingCode = item['orderCode'] ?? item['trackingCode'] ?? item['orderNumber'] ?? item['id'] ?? 'N/A';
        final deliveryAddr = item['deliveryAddressText'] ?? item['deliveryAddressSnapshot'] ?? item['deliveryAddress']?['formattedAddress'] ?? 'Việt Nam';
        final statusRaw = item['status'] ?? 'PENDING';
        
        final double shipping = double.tryParse(item['estimatedShippingFee']?.toString() ?? '0') ?? 0.0;
        final double insurance = double.tryParse(item['estimatedInsuranceFee']?.toString() ?? '0') ?? 0.0;
        final double rawPay = double.tryParse(item['payment']?['amount']?.toString() ?? item['totalAmount']?.toString() ?? '0') ?? 0.0;
        final double totalFee = rawPay > 0 ? rawPay : (shipping + insurance);

        final createdAt = item['createdAt'] != null ? DateTime.tryParse(item['createdAt']) : DateTime.now();

        String statusStr = 'Mới tạo';
        IconData icon = Icons.hourglass_top;
        if (statusRaw == 'READY_FOR_PICKUP') {
          statusStr = 'Sẵn sàng lấy';
          icon = Icons.inventory;
        } else if (statusRaw == 'DELIVERED' || statusRaw == 'COMPLETED') {
          statusStr = 'Đã giao';
          icon = Icons.inventory_2;
        } else if (statusRaw == 'CANCELLED') {
          statusStr = 'Đã hủy';
          icon = Icons.cancel;
        } else if (statusRaw == 'IN_TRANSIT' || statusRaw == 'DISPATCHED' || statusRaw == 'PICKED_UP' || statusRaw == 'AT_HUB' || statusRaw == 'ASSIGNED') {
          statusStr = 'Đang xử lý';
          icon = Icons.local_shipping;
        }

        final dateStr = createdAt != null ? '${createdAt.day}/${createdAt.month}/${createdAt.year}' : '';

        return {
          'id': item['id'] ?? '',
          'code': '#$trackingCode',
          'destination': deliveryAddr,
          'date': dateStr,
          'cost': '\$${totalFee.toStringAsFixed(2)}',
          'status': statusStr,
          'statusRaw': statusRaw,
          'icon': icon,
        };
      }).toList();

      setState(() {
        _allOrders = formatted;
        _isLoading = false;
      });
    } else {
      setState(() {
        _allOrders = [];
        _isLoading = false;
      });
    }
  }

  void _confirmCancelOrder(Map<String, dynamic> order) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: AppColors.pureWhite,
          title: Text(
            'Xác nhận hủy đơn',
            style: AppTypography.headlineMd.copyWith(fontWeight: FontWeight.bold, color: AppColors.deepOnyx),
          ),
          content: Text(
            'Bạn có chắc chắn muốn hủy đơn hàng ${order['code']} không?',
            style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Bỏ qua', style: TextStyle(color: AppColors.secondary)),
            ),
            ElevatedButton(
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(context);
                Navigator.pop(context);
                setState(() {
                  _isLoading = true;
                });
                final res = await OrderService.cancelOrder(order['id']);
                if (mounted) {
                  setState(() {
                    _isLoading = false;
                  });
                  messenger.showSnackBar(
                    SnackBar(
                      content: Text(res['message'] ?? ''),
                      backgroundColor: res['success'] == true ? Colors.green : AppColors.error,
                    ),
                  );
                  _loadOrders();
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.logisticsRed,
                foregroundColor: AppColors.pureWhite,
              ),
              child: const Text('Đồng ý hủy', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Filter orders
    final filteredOrders = _allOrders.where((order) {
      final matchesFilter = _selectedFilter == 'Tất cả' || order['status'] == _selectedFilter;
      final matchesSearch = order['code'].toString().toLowerCase().contains(_searchQuery.toLowerCase()) ||
          order['destination'].toString().toLowerCase().contains(_searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    }).toList();

    // Find active order to show on the top card
    final activeOrdersList = _allOrders.where((o) => o['status'] == 'Đang xử lý' || o['status'] == 'Chờ xử lý').toList();
    final hasActiveOrder = activeOrdersList.isNotEmpty;
    final activeOrder = hasActiveOrder ? activeOrdersList.first : null;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(
        horizontal: AppStyles.marginMobile,
        vertical: 24.0,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [


          // Search & Filter Bar Container
          Container(
            padding: const EdgeInsets.all(16.0),
            decoration: BoxDecoration(
              color: AppColors.pureWhite,
              borderRadius: AppStyles.roundedXl,
              boxShadow: AppStyles.ambientShadow,
              border: Border.all(color: AppColors.surfaceContainer),
            ),
            child: Column(
              children: [
                // Search Input
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
                  decoration: BoxDecoration(
                    color: AppColors.pureWhite,
                    borderRadius: BorderRadius.circular(100.0),
                    border: Border.all(color: AppColors.surfaceContainerHighest, width: 1.0),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.search, color: AppColors.secondary, size: 20.0),
                      const SizedBox(width: 10.0),
                      Expanded(
                        child: TextFormField(
                          controller: _searchController,
                          onChanged: (val) {
                            setState(() {
                              _searchQuery = val;
                            });
                          },
                          style: AppTypography.bodyMd.copyWith(color: AppColors.deepOnyx),
                          decoration: const InputDecoration(
                            hintText: 'Tìm kiếm theo mã đơn, điểm đến...',
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            hintStyle: TextStyle(color: Colors.black38),
                            isDense: true,
                            contentPadding: EdgeInsets.symmetric(vertical: 12.0),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12.0),

                // Horizontal Filter Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: [
                      'Tất cả',
                      'Chờ xử lý',
                      'Đang xử lý',
                      'Đang giao',
                      'Đã giao',
                      'Đã hủy'
                    ].map((filter) {
                      final isSelected = _selectedFilter == filter;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: ChoiceChip(
                          label: Text(
                            filter,
                            style: AppTypography.labelLg.copyWith(
                              color: isSelected ? AppColors.logisticsRed : AppColors.secondary,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: AppColors.primaryContainer.withValues(alpha: 0.1),
                          backgroundColor: AppColors.surfaceContainerLow,
                          onSelected: (selected) {
                            if (selected) {
                              setState(() {
                                _selectedFilter = filter;
                              });
                            }
                          },
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20.0),
                            side: BorderSide(
                              color: isSelected ? AppColors.logisticsRed : Colors.transparent,
                            ),
                          ),
                          showCheckmark: false,
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24.0),

          // Active Shipment Hero Card (Show real active order details if one exists)
          if ((_selectedFilter == 'Tất cả' || _selectedFilter == 'Đang giao') && activeOrder != null) ...[
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
                    width: 4.0,
                    child: Container(color: AppColors.logisticsRed),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
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
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Container(
                                        width: 8.0,
                                        height: 8.0,
                                        decoration: const BoxDecoration(
                                          color: Colors.green,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                      const SizedBox(width: 6.0),
                                      Text(
                                        'ĐANG VẬN CHUYỂN',
                                        style: AppTypography.labelMd.copyWith(
                                          color: Colors.green.shade800,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 11.0,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  activeOrder['code'],
                                  style: AppTypography.labelLg.copyWith(
                                    color: AppColors.secondary,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16.0),
                            Text(
                              'Đang giao đến ${activeOrder['destination'].toString().split(',').first}',
                              style: AppTypography.headlineLgMobile.copyWith(
                                color: AppColors.deepOnyx,
                                fontWeight: FontWeight.bold,
                                fontSize: 18.0,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 12.0),
                            _buildStepper(),
                            const SizedBox(height: 16.0),
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Ngày tạo đơn',
                                        style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                                      ),
                                      const SizedBox(height: 4.0),
                                      Text(
                                        activeOrder['date'],
                                        style: AppTypography.headlineMd.copyWith(
                                          color: AppColors.deepOnyx,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15.0,
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
                                        'Đang xử lý lấy hàng',
                                        style: AppTypography.headlineMd.copyWith(
                                          color: AppColors.deepOnyx,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15.0,
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
                      // Mini map image overlay
                      Container(
                        height: 140.0,
                        width: double.infinity,
                        decoration: const BoxDecoration(
                          image: DecorationImage(
                            image: NetworkImage(
                              'https://lh3.googleusercontent.com/aida-public/AB6AXuCdr4zOfZ6wcMlC1wGHTGsspcbaQJhcbZ_eD8iNpFUE67Mvz3j8dCXNHhUPgfohoQKqCpTM2YbUCL6Pbt01X0cZ5gcM2dY9yNqlntQ1MHFMVO5lNFwCL3MZG0cz1szSHuFgXA6Ryty6ZxRMQX76oFWhdEyBe_bhu3zl4HC0WuEll8WeXEaEtKP2wJBzwsvwFL6Ou1C3J2gJ2dDKpYqjK8H955rHm556ZSVS7Z-oCFeOX0mQA065juzQog',
                            ),
                            fit: BoxFit.cover,
                          ),
                        ),
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.transparent,
                                AppColors.deepOnyx.withValues(alpha: 0.4),
                              ],
                            ),
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
                          alignment: Alignment.bottomCenter,
                          child: SizedBox(
                            width: double.infinity,
                            height: 44.0,
                            child: ElevatedButton(
                              onPressed: widget.onTrackOrder,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.pureWhite,
                                foregroundColor: AppColors.deepOnyx,
                                elevation: 3.0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(100.0),
                                ),
                              ),
                              child: Text(
                                'Theo dõi bản đồ',
                                style: AppTypography.button.copyWith(
                                  color: AppColors.deepOnyx,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14.0,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24.0),
          ],

          // Orders List
          _isLoading
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 32.0),
                    child: CircularProgressIndicator(color: AppColors.logisticsRed),
                  ),
                )
              : filteredOrders.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 40.0),
                        child: Column(
                          children: [
                            Icon(
                              Icons.inventory_2_outlined,
                              size: 64.0,
                              color: AppColors.secondary.withValues(alpha: 0.3),
                            ),
                            const SizedBox(height: 16.0),
                            Text(
                              'Không có đơn hàng nào',
                              style: AppTypography.headlineMd.copyWith(
                                color: AppColors.secondary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8.0),
                            Text(
                              'Đơn hàng thực tế của bạn sẽ được hiển thị tại đây.',
                              style: AppTypography.bodyMd.copyWith(
                                color: AppColors.secondary,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: filteredOrders.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 12.0),
                      itemBuilder: (context, index) {
                        final order = filteredOrders[index];
                        return _buildOrderListItem(order);
                      },
                    ),
          if (filteredOrders.isNotEmpty) ...[
            const SizedBox(height: 24.0),

            // Pagination / Load More button
            Center(
              child: OutlinedButton(
                onPressed: () {},
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.deepOnyx,
                  side: const BorderSide(color: AppColors.surfaceContainerHighest),
                  shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                  padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0),
                ),
                child: const Text('Xem lịch sử cũ hơn'),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStepper() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _buildStep('Nguồn', isDone: true),
        _buildStepLine(isDone: true),
        _buildStep('Hub', isDone: true),
        _buildStepLine(isDone: false),
        _buildStep('Phân loại', isDone: false),
        _buildStepLine(isDone: false),
        _buildStep('Đích', isDone: false),
      ],
    );
  }

  Widget _buildStep(String label, {required bool isDone}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 14.0,
          height: 14.0,
          decoration: BoxDecoration(
            color: isDone ? AppColors.logisticsRed : AppColors.surfaceDim,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.pureWhite, width: 2.0),
          ),
        ),
        const SizedBox(height: 4.0),
        Text(
          label,
          style: AppTypography.labelMd.copyWith(
            fontSize: 10.0,
            color: isDone ? AppColors.deepOnyx : AppColors.secondary,
            fontWeight: isDone ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  Widget _buildStepLine({required bool isDone}) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.only(bottom: 14.0),
        child: Container(
          height: 2.0,
          color: isDone ? AppColors.logisticsRed : AppColors.surfaceContainerHighest,
        ),
      ),
    );
  }

  Widget _buildOrderListItem(Map<String, dynamic> order) {
    Color chipBg = AppColors.surfaceContainerLow;
    Color chipText = AppColors.secondary;

    switch (order['status']) {
      case 'Đã giao':
        chipBg = Colors.green.shade50;
        chipText = Colors.green.shade800;
        break;
      case 'Chờ xử lý':
        chipBg = Colors.yellow.shade50;
        chipText = Colors.yellow.shade800;
        break;
      case 'Đang xử lý':
        chipBg = Colors.blue.shade50;
        chipText = Colors.blue.shade800;
        break;
      case 'Đã hủy':
        chipBg = AppColors.errorContainer.withValues(alpha: 0.1);
        chipText = AppColors.error;
        break;
    }

    return InkWell(
      onTap: () {
        Navigator.pushNamed(
          context,
          '/customer/order-detail',
          arguments: {'orderId': order['id']},
        ).then((_) => _loadOrders());
      },
      borderRadius: AppStyles.roundedXl,
      child: Container(
        padding: const EdgeInsets.all(16.0),
        decoration: BoxDecoration(
          color: AppColors.pureWhite,
          borderRadius: AppStyles.roundedXl,
          border: Border.all(color: AppColors.surfaceContainer),
          boxShadow: AppStyles.ambientShadow,
        ),
        child: Row(
          children: [
            Container(
              width: 48.0,
              height: 48.0,
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerLow,
                borderRadius: AppStyles.roundedLg,
              ),
              child: Icon(
                order['icon'] as IconData,
                color: order['status'] == 'Đã giao'
                    ? AppColors.logisticsRed
                    : order['status'] == 'Đang xử lý'
                        ? AppColors.tertiary
                        : AppColors.secondary,
                size: 24.0,
              ),
            ),
            const SizedBox(width: 16.0),
            Expanded(
              child: GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                childAspectRatio: 2.0,
                crossAxisSpacing: 8.0,
                mainAxisSpacing: 4.0,
                children: [
                  _buildGridItem('Mã đơn hàng', order['code'] as String, isBold: true),
                  _buildGridItem('Điểm đến', order['destination'] as String),
                  _buildGridItem('Ngày', order['date'] as String),
                  _buildGridItem('Phí', order['cost'] as String),
                ],
              ),
            ),
            const SizedBox(width: 8.0),
            Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                  decoration: BoxDecoration(
                    color: chipBg,
                    borderRadius: BorderRadius.circular(12.0),
                  ),
                  child: Text(
                    order['status'] as String,
                    style: AppTypography.labelMd.copyWith(
                      color: chipText,
                      fontWeight: FontWeight.bold,
                      fontSize: 10.0,
                    ),
                  ),
                ),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert, color: AppColors.secondary),
                  onSelected: (val) {
                    if (val == 'cancel') {
                      _confirmCancelOrder(order);
                    }
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem<String>(
                      value: 'cancel',
                      enabled: order['statusRaw'] == 'CREATED' || order['statusRaw'] == 'READY_FOR_PICKUP' || order['statusRaw'] == 'PENDING' || order['statusRaw'] == 'DRAFT',
                      child: Text(
                        'Hủy đơn hàng',
                        style: TextStyle(
                          color: (order['statusRaw'] == 'CREATED' || order['statusRaw'] == 'READY_FOR_PICKUP' || order['statusRaw'] == 'PENDING' || order['statusRaw'] == 'DRAFT')
                              ? AppColors.error
                              : AppColors.secondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGridItem(String label, String value, {bool isBold = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          label.toUpperCase(),
          style: AppTypography.labelMd.copyWith(color: AppColors.secondary, fontSize: 8.0),
        ),
        const SizedBox(height: 1.0),
        Text(
          value,
          style: AppTypography.labelLg.copyWith(
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            color: AppColors.deepOnyx,
          ),
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}
