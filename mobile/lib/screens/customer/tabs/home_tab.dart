import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';
import '../../../services/order_service.dart';

class HomeTab extends StatefulWidget {
  final Function(int tabIndex, {int? orderType}) onNavigate;

  const HomeTab({
    super.key,
    required this.onNavigate,
  });

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  List<Map<String, dynamic>> _recentOrders = [];
  bool _isLoadingOrders = true;

  // Pricing Calculator State
  final _weightController = TextEditingController(text: '1.0');
  final _distanceController = TextEditingController(text: '5.0');
  final _codController = TextEditingController(text: '0');
  String _serviceCode = 'STANDARD';
  bool _isFragile = false;
  bool _isCalculating = false;
  Map<String, dynamic>? _pricingResult;
  String? _calculatorError;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _weightController.dispose();
    _distanceController.dispose();
    _codController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final orders = await OrderService.fetchOrders();
      if (mounted) {
        setState(() {
          // Take top 3-5 recent orders
          _recentOrders = orders.take(3).toList();
          _isLoadingOrders = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingOrders = false;
        });
      }
    }
  }

  void _calculateQuickPricing() async {
    final weight = double.tryParse(_weightController.text) ?? 0.0;
    final distance = double.tryParse(_distanceController.text) ?? 0.0;
    final cod = double.tryParse(_codController.text) ?? 0.0;

    if (weight <= 0 || distance <= 0) {
      setState(() {
        _calculatorError = 'Khối lượng và khoảng cách phải lớn hơn 0';
        _pricingResult = null;
      });
      return;
    }

    setState(() {
      _isCalculating = true;
      _calculatorError = null;
      _pricingResult = null;
    });

    final res = await OrderService.calculatePricing(
      serviceCode: _serviceCode,
      distanceKm: distance,
      totalWeightKg: weight,
      isFragile: _isFragile,
      codAmount: cod,
    );

    if (mounted) {
      setState(() {
        _isCalculating = false;
        if (res['success'] == true) {
          _pricingResult = res['data'];
          _calculatorError = null;
        } else {
          _pricingResult = _calculatePriceClientSide(
            serviceCode: _serviceCode,
            distanceKm: distance,
            totalWeightKg: weight,
            isFragile: _isFragile,
            codAmount: cod,
          );
          _calculatorError = null;
        }
      });
    }
  }

  Map<String, dynamic> _calculatePriceClientSide({
    required String serviceCode,
    required double distanceKm,
    required double totalWeightKg,
    required bool isFragile,
    required double codAmount,
  }) {
    double base = 20000.0;
    double freeDist = 2.0;
    double rateDist = 5000.0;
    double freeWt = 1.0;
    double rateWt = 3000.0;

    switch (serviceCode) {
      case 'EXPRESS':
        base = 35000.0;
        freeDist = 2.0;
        rateDist = 8000.0;
        freeWt = 1.0;
        rateWt = 5000.0;
        break;
      case 'SAVING':
        base = 15000.0;
        freeDist = 2.0;
        rateDist = 3000.0;
        freeWt = 1.0;
        rateWt = 2000.0;
        break;
      case 'COLD_CHAIN':
        base = 60000.0;
        freeDist = 2.0;
        rateDist = 12000.0;
        freeWt = 1.0;
        rateWt = 8000.0;
        break;
      case 'STANDARD':
      default:
        base = 20000.0;
        freeDist = 2.0;
        rateDist = 5000.0;
        freeWt = 1.0;
        rateWt = 3000.0;
        break;
    }

    double billableDistance = (distanceKm - freeDist) > 0 ? (distanceKm - freeDist) : 0.0;
    double distanceFee = (serviceCode == 'EXPRESS' || serviceCode == 'COLD_CHAIN') ? (billableDistance * rateDist) : 0.0;

    double billableWeight = (totalWeightKg - freeWt) > 0 ? (totalWeightKg - freeWt) : 0.0;
    double weightFee = billableWeight * rateWt;

    double fragileSurcharge = isFragile ? 15000.0 : 0.0;

    double insuranceFee = 0.0;
    if (codAmount > 0) {
      insuranceFee = codAmount * 0.005;
      if (insuranceFee > 50000.0) insuranceFee = 50000.0;
    }

    double shippingFee = base + distanceFee + weightFee + fragileSurcharge;
    double totalAmount = shippingFee + insuranceFee;

    return {
      'basePrice': base,
      'distanceFee': distanceFee,
      'weightFee': weightFee,
      'fragileSurcharge': fragileSurcharge,
      'insuranceFee': insuranceFee,
      'shippingFee': shippingFee,
      'totalAmount': totalAmount,
    };
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(AppStyles.marginMobile),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Quick Actions Row
          _buildQuickActions(),
          const SizedBox(height: 24.0),

          // Recent Orders Section
          _buildRecentOrdersSection(),
          const SizedBox(height: 24.0),

          // Quick Pricing Calculator Card
          _buildPricingCalculatorCard(),
          const SizedBox(height: 24.0),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: _buildActionCard(
                icon: Icons.add_box_outlined,
                title: 'Tạo đơn lẻ',
                subtitle: 'Gửi kiện hàng nhanh',
                color: AppColors.logisticsRed,
                onTap: () => widget.onNavigate(3, orderType: 0),
              ),
            ),
            const SizedBox(width: 12.0),
            Expanded(
              child: _buildActionCard(
                icon: Icons.file_upload_outlined,
                title: 'Tạo hàng loạt',
                subtitle: 'Nhập từ file Excel/CSV',
                color: AppColors.deepOnyx,
                onTap: () => widget.onNavigate(3, orderType: 1),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16.0),
        decoration: BoxDecoration(
          color: AppColors.pureWhite,
          borderRadius: AppStyles.roundedLg,
          boxShadow: AppStyles.ambientShadow,
          border: Border.all(color: AppColors.surfaceContainerHighest),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10.0),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 24.0),
            ),
            const SizedBox(height: 12.0),
            Text(
              title,
              style: AppTypography.headlineMd.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.deepOnyx,
                fontSize: 15.0,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4.0),
            Text(
              subtitle,
              style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentOrdersSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Đơn hàng gần đây',
              style: AppTypography.headlineMd.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.deepOnyx,
              ),
            ),
            TextButton(
              onPressed: () => widget.onNavigate(1), // Go to Orders tab
              child: const Text('Xem tất cả'),
            ),
          ],
        ),
        if (_isLoadingOrders)
          const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 20.0),
              child: CircularProgressIndicator(color: AppColors.logisticsRed),
            ),
          )
        else if (_recentOrders.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24.0),
            decoration: BoxDecoration(
              color: AppColors.pureWhite,
              borderRadius: AppStyles.roundedLg,
              border: Border.all(color: AppColors.surfaceContainerHighest),
            ),
            child: Column(
              children: [
                const Icon(Icons.inbox_outlined, size: 48.0, color: AppColors.secondary),
                const SizedBox(height: 12.0),
                Text(
                  'Bạn chưa có đơn hàng nào',
                  style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
                ),
                const SizedBox(height: 12.0),
                ElevatedButton(
                  onPressed: () => widget.onNavigate(3, orderType: 0),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.logisticsRed,
                    foregroundColor: AppColors.pureWhite,
                    shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                  ),
                  child: const Text('Tạo đơn hàng ngay'),
                ),
              ],
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _recentOrders.length,
            itemBuilder: (context, index) {
              final order = _recentOrders[index];
              return _buildOrderCard(order);
            },
          ),
      ],
    );
  }

  Widget _buildOrderCard(Map<String, dynamic> order) {
    final status = order['status'] ?? 'PENDING';
    final dateStr = order['createdAt'] != null
        ? DateTime.parse(order['createdAt']).toLocal().toString().substring(0, 16)
        : '';
    final code = order['orderCode'] ?? '';
    final receiverName = order['receiverName'] ?? '';
    final destination = order['receiverAddressLine1'] ?? '';
    final double shippingFee = double.tryParse(order['estimatedShippingFee']?.toString() ?? '0') ?? 0.0;
    final double insuranceFee = double.tryParse(order['estimatedInsuranceFee']?.toString() ?? '0') ?? 0.0;
    final double rawPay = double.tryParse(order['payment']?['amount']?.toString() ?? order['totalAmount']?.toString() ?? '0') ?? 0.0;
    final double totalAmount = rawPay > 0 ? rawPay : (shippingFee + insuranceFee);

    return Card(
      margin: const EdgeInsets.only(bottom: 10.0),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: AppStyles.roundedLg,
        side: const BorderSide(color: AppColors.surfaceContainerHighest),
      ),
      child: ListTile(
        onTap: () {
          Navigator.pushNamed(
            context,
            '/customer/order-detail',
            arguments: {'orderId': order['id']},
          ).then((_) => _loadData()); // Reload when coming back
        },
        contentPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        title: Row(
          children: [
            Flexible(
              child: Text(
                code,
                style: AppTypography.headlineMd.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.logisticsRed,
                  fontSize: 15.0,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 12.0),
            _buildStatusChip(status),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 6.0),
            Row(
              children: [
                const Icon(Icons.person_outline, size: 14.0, color: AppColors.secondary),
                const SizedBox(width: 4.0),
                Expanded(
                  child: Text(
                    'Người nhận: $receiverName',
                    style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4.0),
            Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 14.0, color: AppColors.secondary),
                const SizedBox(width: 4.0),
                Expanded(
                  child: Text(
                    destination,
                    style: AppTypography.labelLg.copyWith(color: AppColors.secondary),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4.0),
            Text(
              dateStr,
              style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
            ),
          ],
        ),
        trailing: Text(
          '${totalAmount.toStringAsFixed(0)}đ',
          style: AppTypography.headlineMd.copyWith(
            fontWeight: FontWeight.bold,
            color: AppColors.deepOnyx,
            fontSize: 16.0,
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color bgColor;
    Color textColor;
    String label;

    switch (status) {
      case 'DRAFT':
        bgColor = Colors.grey.shade100;
        textColor = Colors.grey.shade700;
        label = 'Nháp';
        break;
      case 'PENDING':
        bgColor = const Color(0xFFFEF3C7);
        textColor = const Color(0xFFD97706);
        label = 'Chờ xử lý';
        break;
      case 'DELIVERED':
        bgColor = const Color(0xFFDCFCE7);
        textColor = const Color(0xFF166534);
        label = 'Đã giao';
        break;
      case 'CANCELLED':
        bgColor = const Color(0xFFFEE2E2);
        textColor = const Color(0xFF991B1B);
        label = 'Đã hủy';
        break;
      default:
        bgColor = const Color(0xFFDBEAFE);
        textColor = const Color(0xFF1E40AF);
        label = 'Đang xử lý';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12.0),
      ),
      child: Text(
        label,
        style: AppTypography.labelMd.copyWith(
          color: textColor,
          fontWeight: FontWeight.bold,
          fontSize: 11.0,
        ),
      ),
    );
  }

  Widget _buildPricingCalculatorCard() {
    return Container(
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
            children: [
              const Icon(Icons.calculate_outlined, color: AppColors.logisticsRed, size: 24.0),
              const SizedBox(width: 8.0),
              Expanded(
                child: Text(
                  'Tính cước phí nhanh',
                  style: AppTypography.headlineMd.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.deepOnyx,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16.0),

          // Service level selection
          Text(
            'Gói dịch vụ',
            style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx),
          ),
          const SizedBox(height: 8.0),
          DropdownButtonFormField<String>(
            initialValue: _serviceCode,
            items: const [
              DropdownMenuItem(value: 'STANDARD', child: Text('Giao hàng Tiêu chuẩn')),
              DropdownMenuItem(value: 'EXPRESS', child: Text('Giao hàng Hỏa tốc')),
              DropdownMenuItem(value: 'SAVING', child: Text('Giao hàng Tiết kiệm')),
              DropdownMenuItem(value: 'COLD_CHAIN', child: Text('Vận chuyển đông lạnh')),
            ],
            onChanged: (val) {
              if (val != null) {
                setState(() {
                  _serviceCode = val;
                });
              }
            },
            decoration: InputDecoration(
              border: OutlineInputBorder(borderRadius: AppStyles.roundedLg),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
            ),
          ),
          const SizedBox(height: 16.0),

          Row(
            children: [
              // Weight Input
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Khối lượng (kg)',
                      style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx),
                    ),
                    const SizedBox(height: 8.0),
                    TextFormField(
                      controller: _weightController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: AppStyles.roundedLg),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12.0),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16.0),

              // Distance Input
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Khoảng cách (km)',
                      style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx),
                    ),
                    const SizedBox(height: 8.0),
                    TextFormField(
                      controller: _distanceController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: AppStyles.roundedLg),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12.0),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16.0),

          // COD amount
          Text(
            'Số tiền thu hộ COD (đ)',
            style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx),
          ),
          const SizedBox(height: 8.0),
          TextFormField(
            controller: _codController,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              border: OutlineInputBorder(borderRadius: AppStyles.roundedLg),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12.0),
            ),
          ),
          const SizedBox(height: 12.0),

          // Fragile switch
          Row(
            children: [
              Checkbox(
                value: _isFragile,
                activeColor: AppColors.logisticsRed,
                onChanged: (val) {
                  setState(() {
                    _isFragile = val ?? false;
                  });
                },
              ),
              Expanded(
                child: Text(
                  'Hàng dễ vỡ / Cần bảo quản đặc biệt',
                  style: AppTypography.bodyMd.copyWith(color: AppColors.deepOnyx),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16.0),

          if (_calculatorError != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12.0),
              child: Text(
                _calculatorError!,
                style: AppTypography.bodyMd.copyWith(color: AppColors.error),
              ),
            ),

          SizedBox(
            width: double.infinity,
            height: 48.0,
            child: ElevatedButton(
              onPressed: _isCalculating ? null : _calculateQuickPricing,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.logisticsRed,
                foregroundColor: AppColors.pureWhite,
                disabledBackgroundColor: AppColors.logisticsRed.withValues(alpha: 0.5),
                shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                elevation: 0,
              ),
              child: _isCalculating
                  ? const SizedBox(
                      width: 20.0,
                      height: 20.0,
                      child: CircularProgressIndicator(color: AppColors.pureWhite, strokeWidth: 2.0),
                    )
                  : const Text('Tính cước phí'),
            ),
          ),

          // Calculator pricing breakdown
          if (_pricingResult != null) ...[
            const SizedBox(height: 20.0),
            const Divider(),
            const SizedBox(height: 12.0),
            _buildPriceRow('Cước cơ bản:', '${_pricingResult!['basePrice']}đ'),
            if ((_pricingResult!['distanceFee'] as num) > 0)
              _buildPriceRow('Phụ phí khoảng cách:', '${_pricingResult!['distanceFee']}đ'),
            if ((_pricingResult!['weightFee'] as num) > 0)
              _buildPriceRow('Phụ phí khối lượng:', '${_pricingResult!['weightFee']}đ'),
            if ((_pricingResult!['fragileSurcharge'] as num) > 0)
              _buildPriceRow('Phụ phí dễ vỡ:', '${_pricingResult!['fragileSurcharge']}đ'),
            if ((_pricingResult!['insuranceFee'] as num) > 0)
              _buildPriceRow('Phí thu hộ/bảo hiểm:', '${_pricingResult!['insuranceFee']}đ'),
            const SizedBox(height: 8.0),
            const Divider(),
            const SizedBox(height: 8.0),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Tổng cước ước tính:',
                  style: AppTypography.bodyMd.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.deepOnyx,
                  ),
                ),
                Text(
                  '${_pricingResult!['totalAmount']}đ',
                  style: AppTypography.headlineLgMobile.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.logisticsRed,
                    fontSize: 20.0,
                  ),
                ),
              ],
            ),
          ]
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.bodyMd.copyWith(color: AppColors.secondary)),
          Text(value, style: AppTypography.bodyMd.copyWith(color: AppColors.deepOnyx, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
