import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';

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

  final List<Map<String, dynamic>> _allOrders = [
    {
      'code': '#VEL-7210-B',
      'destination': 'Austin, TX',
      'date': '18 thg 10, 2023',
      'cost': '\$142.50',
      'status': 'Đã giao',
      'icon': Icons.inventory_2,
    },
    {
      'code': '#VEL-9104-Z',
      'destination': 'Seattle, WA',
      'date': '20 thg 10, 2023',
      'cost': '\$89.20',
      'status': 'Chờ xử lý',
      'icon': Icons.local_shipping,
    },
    {
      'code': '#VEL-1033-Q',
      'destination': 'Miami, FL',
      'date': '21 thg 10, 2023',
      'cost': '\$210.00',
      'status': 'Đang xử lý',
      'icon': Icons.inventory,
    },
    {
      'code': '#VEL-0045-A',
      'destination': 'Boston, MA',
      'date': '15 thg 10, 2023',
      'cost': '\$0.00',
      'status': 'Đã hủy',
      'icon': Icons.cancel,
    },
  ];

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

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(
        horizontal: AppStyles.marginMobile,
        vertical: 24.0,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header / Welcome section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Danh sách đơn hàng',
                      style: AppTypography.headlineLgMobile.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepOnyx,
                      ),
                    ),
                    const SizedBox(height: 4.0),
                    Text(
                      'Quản lý và theo dõi các đơn hàng đang hoạt động trong thời gian thực.',
                      style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16.0),

          // Action Buttons
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: widget.onTrackOrder,
                  icon: const Icon(Icons.location_searching, size: 18.0),
                  label: const Text('Tra cứu nhanh'),
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
                  onPressed: widget.onCreateOrder,
                  icon: const Icon(Icons.add_circle, size: 18.0),
                  label: const Text('Tạo đơn mới'),
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
                  padding: const EdgeInsets.symmetric(horizontal: 12.0),
                  decoration: BoxDecoration(
                    color: AppColors.cloudGray,
                    borderRadius: AppStyles.roundedLg,
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.search, color: AppColors.secondary),
                      const SizedBox(width: 8.0),
                      Expanded(
                        child: TextFormField(
                          controller: _searchController,
                          onChanged: (val) {
                            setState(() {
                              _searchQuery = val;
                            });
                          },
                          style: AppTypography.bodyMd,
                          decoration: const InputDecoration(
                            hintText: 'Tìm kiếm theo mã đơn, điểm đến...',
                            border: InputBorder.none,
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

          // Active Shipment Hero Card
          if (_selectedFilter == 'Tất cả' || _selectedFilter == 'Đang giao') ...[
            Container(
              decoration: BoxDecoration(
                color: AppColors.pureWhite,
                borderRadius: AppStyles.roundedXl,
                border: const Border(
                  left: BorderSide(color: AppColors.logisticsRed, width: 4.0),
                ),
                boxShadow: AppStyles.ambientShadow,
              ),
              child: Column(
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
                              padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                              decoration: BoxDecoration(
                                color: AppColors.primaryContainer.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(20.0),
                              ),
                              child: Text(
                                'Đang vận chuyển',
                                style: AppTypography.labelMd.copyWith(
                                  color: AppColors.logisticsRed,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            Text(
                              'Đơn hàng #VEL-8829-X',
                              style: AppTypography.labelLg.copyWith(color: AppColors.secondary),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12.0),
                        Text(
                          'Vận chuyển hỏa tốc San Francisco đến New York',
                          style: AppTypography.headlineMd.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppColors.deepOnyx,
                            fontSize: 18.0,
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
                                  const SizedBox(height: 2.0),
                                  Text(
                                    '24 thg 10, 2023',
                                    style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.bold),
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
                                  const SizedBox(height: 2.0),
                                  Text(
                                    'Hub Chicago',
                                    style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20.0),

                        // Simple stepper
                        _buildStepper(),
                      ],
                    ),
                  ),

                  // Mini map image overlay
                  Container(
                    height: 160.0,
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
                            AppColors.deepOnyx.withValues(alpha: 0.6),
                          ],
                        ),
                      ),
                      padding: const EdgeInsets.all(16.0),
                      alignment: Alignment.bottomCenter,
                      child: SizedBox(
                        width: double.infinity,
                        height: 40.0,
                        child: ElevatedButton(
                          onPressed: widget.onTrackOrder,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.pureWhite,
                            foregroundColor: AppColors.deepOnyx,
                            shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                          ),
                          child: const Text('Theo dõi bản đồ'),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24.0),
          ],

          // Orders List
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: filteredOrders.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12.0),
            itemBuilder: (context, index) {
              final order = filteredOrders[index];
              return _buildOrderListItem(order);
            },
          ),
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

    return Container(
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
              childAspectRatio: 2.5,
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
              IconButton(
                icon: const Icon(Icons.more_vert, color: AppColors.secondary),
                onPressed: () {},
              ),
            ],
          ),
        ],
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
