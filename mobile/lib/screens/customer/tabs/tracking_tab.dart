import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';

class TrackingTab extends StatefulWidget {
  const TrackingTab({super.key});

  @override
  State<TrackingTab> createState() => _TrackingTabState();
}

class _TrackingTabState extends State<TrackingTab> {
  final _searchController = TextEditingController();
  String _selectedCode = 'VEL-482-991';

  final Map<String, Map<String, dynamic>> _shipmentsData = {
    'VEL-482-991': {
      'destination': 'Chicago, IL',
      'status': 'Đang vận chuyển',
      'eta': '26 Th10, Cuối ngày',
      'weight': '12.5 kg',
      'service': 'Chuyển phát nhanh',
      'carrier': 'VEL Prime',
      'items': '2x Linh kiện Công nghệ cao',
      'timeline': [
        {
          'title': 'Đang vận chuyển',
          'time': 'Hôm nay, 09:42 SA',
          'desc': 'Đã rời Trung tâm Phân phối Khu vực (RDC), Chicago Hub.',
          'isDone': true,
          'isActive': true,
          'icon': Icons.local_shipping,
        },
        {
          'title': 'Đã nhập kho',
          'time': '24 Th10, 02:15 CH',
          'desc': 'Lô hàng đã được xử lý qua Cơ sở Phân loại và sẵn sàng để điều phối.',
          'isDone': true,
          'isActive': false,
          'icon': Icons.check,
        },
        {
          'title': 'Đã lấy hàng',
          'time': '24 Th10, 09:00 SA',
          'desc': 'Kiện hàng đã được lấy từ địa chỉ Người gửi: Khu công nghiệp A, Detroit.',
          'isDone': true,
          'isActive': false,
          'icon': Icons.check,
        },
        {
          'title': 'Đã tạo vận đơn',
          'time': '23 Th10, 11:30 CH',
          'desc': 'Đơn hàng đã được xử lý và nhãn vận chuyển đã được tạo. Sẵn sàng để thu gom.',
          'isDone': true,
          'isActive': false,
          'icon': Icons.check,
        },
      ]
    },
    'VEL-112-901': {
      'destination': 'Austin, TX',
      'status': 'Đang xử lý',
      'eta': '28 Th10, Trưa',
      'weight': '4.2 kg',
      'service': 'Tiết kiệm',
      'carrier': 'VEL Standard',
      'items': '1x Sách & Văn phòng phẩm',
      'timeline': [
        {
          'title': 'Đã nhập kho',
          'time': 'Hôm nay, 08:15 SA',
          'desc': 'Lô hàng đã được nhận tại kho trung chuyển Detroit.',
          'isDone': true,
          'isActive': true,
          'icon': Icons.inventory_2,
        },
        {
          'title': 'Đã lấy hàng',
          'time': '24 Th10, 11:00 SA',
          'desc': 'Tài xế đã thu gom kiện hàng thành công.',
          'isDone': true,
          'isActive': false,
          'icon': Icons.check,
        },
        {
          'title': 'Đã tạo vận đơn',
          'time': '24 Th10, 08:30 SA',
          'desc': 'Đơn hàng đã được đăng ký thành công trên hệ thống.',
          'isDone': true,
          'isActive': false,
          'icon': Icons.check,
        },
      ]
    },
    'VEL-992-004': {
      'destination': 'Seattle, WA',
      'status': 'Đang vận chuyển',
      'eta': '25 Th10, Sáng',
      'weight': '8.0 kg',
      'service': 'Chuyển phát nhanh',
      'carrier': 'VEL Prime',
      'items': '3x Quần áo thời trang',
      'timeline': [
        {
          'title': 'Đang bay trung chuyển',
          'time': 'Hôm nay, 10:30 SA',
          'desc': 'Đang vận chuyển hàng không hướng tới sân bay Seattle-Tacoma.',
          'isDone': true,
          'isActive': true,
          'icon': Icons.flight_takeoff,
        },
        {
          'title': 'Rời cảng Detroit',
          'time': 'Hôm nay, 04:00 SA',
          'desc': 'Kiện hàng đã rời trung tâm điều phối Detroit.',
          'isDone': true,
          'isActive': false,
          'icon': Icons.check,
        },
        {
          'title': 'Đã tạo vận đơn',
          'time': '24 Th10, 04:30 CH',
          'desc': 'Đã tạo vận đơn vận chuyển hàng không.',
          'isDone': true,
          'isActive': false,
          'icon': Icons.check,
        },
      ]
    },
  };

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchSubmit() {
    final query = _searchController.text.trim().toUpperCase();
    if (query.isNotEmpty) {
      if (_shipmentsData.containsKey(query)) {
        setState(() {
          _selectedCode = query;
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Không tìm thấy mã vận đơn: $query',
              style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite),
            ),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final shipment = _shipmentsData[_selectedCode] ?? _shipmentsData['VEL-482-991']!;
    final timeline = shipment['timeline'] as List<dynamic>;

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
                Text(
                  'Theo dõi đơn hàng',
                  style: AppTypography.headlineLgMobile.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.deepOnyx,
                  ),
                ),
                const SizedBox(height: 16.0),

                // Search field
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4.0),
                  decoration: BoxDecoration(
                    color: AppColors.pureWhite,
                    borderRadius: AppStyles.roundedXl,
                    border: Border.all(color: AppColors.surfaceContainerHighest, width: 2.0),
                    boxShadow: AppStyles.ambientShadow,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16.0),
                          child: TextFormField(
                            controller: _searchController,
                            style: AppTypography.bodyLg.copyWith(color: AppColors.deepOnyx),
                            decoration: const InputDecoration(
                              hintText: 'Nhập mã vận đơn (VD: VEL-482-991)',
                              border: InputBorder.none,
                            ),
                            onFieldSubmitted: (_) => _onSearchSubmit(),
                          ),
                        ),
                      ),
                      ElevatedButton(
                        onPressed: _onSearchSubmit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.logisticsRed,
                          foregroundColor: AppColors.pureWhite,
                          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                        ),
                        child: const Text('TRA CỨU'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12.0),

                // Recent searches
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Gần đây: ',
                      style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                    ),
                    _buildRecentChip('VEL-112-901'),
                    const SizedBox(width: 8.0),
                    _buildRecentChip('VEL-992-004'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 28.0),

          // Horizontal selection
          Text(
            'CHỌN NHANH',
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
              children: _shipmentsData.keys.map((code) {
                final isSelected = _selectedCode == code;
                final data = _shipmentsData[code]!;
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedCode = code;
                    });
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
                                color: data['status'] == 'Đang vận chuyển' ? Colors.green : AppColors.surfaceDim,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4.0),
                        Text(
                          data['status'] as String,
                          style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                        ),
                        const SizedBox(height: 2.0),
                        Text(
                          'Đến: ${data['destination']}',
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

          // Active Shipment detail header card
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'ĐƠN HÀNG ĐANG HOẠT ĐỘNG',
                            style: AppTypography.labelMd.copyWith(color: AppColors.secondary, letterSpacing: 1.0),
                          ),
                          const SizedBox(height: 4.0),
                          Text(
                            _selectedCode,
                            style: AppTypography.headlineMd.copyWith(
                              color: AppColors.deepOnyx,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8.0),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 6.0),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(20.0),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6.0,
                            height: 6.0,
                            decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 6.0),
                          Text(
                            shipment['status'] as String,
                            style: AppTypography.labelMd.copyWith(color: Colors.green.shade800, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24.0),

                // Vertical Timeline implementation
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: timeline.length,
                  itemBuilder: (context, index) {
                    final step = timeline[index];
                    final isLast = index == timeline.length - 1;
                    return Stack(
                      children: [
                        if (!isLast)
                          Positioned(
                            left: 11.0,
                            top: 24.0,
                            bottom: 0.0,
                            child: Container(
                              width: 2.0,
                              color: step['isActive'] ? AppColors.surfaceDim : AppColors.deepOnyx,
                            ),
                          ),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 24.0),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Timeline node
                              Container(
                                width: 24.0,
                                height: 24.0,
                                decoration: BoxDecoration(
                                  color: step['isActive'] ? AppColors.logisticsRed : AppColors.deepOnyx,
                                  shape: BoxShape.circle,
                                  boxShadow: step['isActive'] ? AppStyles.softShadow : null,
                                ),
                                child: Icon(
                                  step['icon'] as IconData,
                                  color: AppColors.pureWhite,
                                  size: 12.0,
                                ),
                              ),
                              const SizedBox(width: 16.0),

                              // Timeline content
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          step['title'] as String,
                                          style: AppTypography.labelLg.copyWith(
                                            color: AppColors.deepOnyx,
                                            fontWeight: FontWeight.bold,
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
                                  ],
                                ),
                              ),
                            ],
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

          // Live Map Card
          Container(
            height: 240.0,
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: AppStyles.roundedXl,
              border: Border.all(color: AppColors.surfaceContainerHighest),
              image: const DecorationImage(
                image: NetworkImage(
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuA4gM76B7HMMkMvR7ODppo1ySv8CPB3mGBBdI3CZgK1n0yG7gmzhC4UMsoPDDNE41UHuHFY5BhSEOf2vvGr4zyzpZzFB7H1W_a4FHsnVqFXXe6D9KTpH8Y-167O5xyKpRKpDrxCSOSTuJyLR1lN0-AoKP19qgp9RCl1UsLklnx8bqRVodyyPmpA-gf_5asGSd08C4uWZbCXmF6fO2jW7oZpuUUU5SetD0hOMGOjJQ036bKBs94J4O6bFQ',
                ),
                fit: BoxFit.cover,
              ),
            ),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: AppStyles.roundedXl,
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Colors.black.withValues(alpha: 0.6)],
                ),
              ),
              padding: const EdgeInsets.all(16.0),
              alignment: Alignment.bottomCenter,
              child: SizedBox(
                width: double.infinity,
                height: 48.0,
                child: ElevatedButton.icon(
                  onPressed: () {
                    // Open full map modal/route
                  },
                  icon: const Icon(Icons.map, size: 18.0),
                  label: const Text('Xem bản đồ trực tuyến'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.pureWhite,
                    foregroundColor: AppColors.deepOnyx,
                    shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                  ),
                ),
              ),
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
                  childAspectRatio: 2.2,
                  children: [
                    _buildDetailsItem('Dự kiến đến', shipment['eta'] as String),
                    _buildDetailsItem('Trọng lượng', shipment['weight'] as String),
                    _buildDetailsItem('Loại dịch vụ', shipment['service'] as String, isRed: true),
                    _buildDetailsItem('Nhà vận chuyển', shipment['carrier'] as String),
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
                          shipment['items'] as String,
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
      ),
    );
  }

  Widget _buildRecentChip(String code) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedCode = code;
          _searchController.text = code;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 6.0),
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(20.0),
        ),
        child: Text(
          code,
          style: AppTypography.labelMd.copyWith(color: AppColors.deepOnyx, fontWeight: FontWeight.bold),
        ),
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
