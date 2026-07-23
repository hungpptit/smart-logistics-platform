import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/theme/app_styles.dart';
import '../../services/order_service.dart';

class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  String _orderId = '';
  Map<String, dynamic>? _order;
  bool _isLoading = true;
  String? _error;
  bool _isCancelling = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    if (args != null && _orderId.isEmpty) {
      _orderId = args['orderId'] ?? '';
      _loadOrderDetail();
    }
  }

  Future<void> _loadOrderDetail() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final data = await OrderService.fetchOrderDetail(_orderId);

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (data != null) {
          _order = data;
        } else {
          _error = 'Không thể lấy thông tin chi tiết đơn hàng.';
        }
      });
    }
  }

  void _handleCancelOrder() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          'Xác nhận hủy đơn',
          style: AppTypography.headlineMd.copyWith(fontWeight: FontWeight.bold),
        ),
        content: const Text('Bạn có chắc chắn muốn hủy đơn hàng này không? Hành động này không thể hoàn tác.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Bỏ qua'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.logisticsRed,
              foregroundColor: AppColors.pureWhite,
            ),
            child: const Text('Xác nhận hủy'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() {
      _isCancelling = true;
    });

    final res = await OrderService.cancelOrder(_orderId);

    if (mounted) {
      setState(() {
        _isCancelling = false;
      });

      if (res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Hủy đơn hàng thành công!'),
            backgroundColor: const Color(0xFF166534),
          ),
        );
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Không thể hủy đơn hàng.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cloudGray,
      appBar: AppBar(
        title: const Text('Chi tiết đơn hàng'),
        backgroundColor: AppColors.pureWhite,
        foregroundColor: AppColors.deepOnyx,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.logisticsRed));
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48.0, color: AppColors.secondary),
              const SizedBox(height: 16.0),
              Text(_error!, style: AppTypography.bodyMd, textAlign: TextAlign.center),
              const SizedBox(height: 16.0),
              ElevatedButton(
                onPressed: _loadOrderDetail,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.logisticsRed),
                child: const Text('Tải lại'),
              ),
            ],
          ),
        ),
      );
    }

    if (_order == null) return const SizedBox();

    final status = _order!['status'] ?? 'CREATED';
    final code = _order!['orderCode'] ?? '';
    final canCancel = status == 'CREATED' || status == 'READY_FOR_PICKUP' || status == 'PENDING' || status == 'DRAFT';

    return SafeArea(
      child: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(AppStyles.marginMobile),
              child: Column(
                children: [
                  // QR label card
                  _buildQRCard(code),
                  const SizedBox(height: 16.0),

                  // Order Info Card
                  _buildOrderInfoCard(),
                  const SizedBox(height: 16.0),

                  // Cost Breakdown Card
                  _buildCostBreakdownCard(),
                  const SizedBox(height: 16.0),

                  // Timeline Card
                  _buildTimelineCard(),
                  const SizedBox(height: 20.0),
                ],
              ),
            ),
          ),
          if (canCancel)
            Container(
              padding: const EdgeInsets.all(AppStyles.marginMobile),
              decoration: const BoxDecoration(
                color: AppColors.pureWhite,
                border: Border(top: BorderSide(color: AppColors.surfaceContainerHighest)),
              ),
              child: SizedBox(
                width: double.infinity,
                height: 50.0,
                child: ElevatedButton(
                  onPressed: _isCancelling ? null : _handleCancelOrder,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.logisticsRed,
                    foregroundColor: AppColors.pureWhite,
                    disabledBackgroundColor: AppColors.logisticsRed.withValues(alpha: 0.5),
                    shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                    elevation: 0,
                  ),
                  child: _isCancelling
                      ? const SizedBox(
                          width: 20.0,
                          height: 20.0,
                          child: CircularProgressIndicator(color: AppColors.pureWhite, strokeWidth: 2.0),
                        )
                      : Text(
                          'HỦY ĐƠN HÀNG',
                          style: AppTypography.button.copyWith(fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildQRCard(String code) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        color: AppColors.pureWhite,
        borderRadius: AppStyles.roundedXl,
        border: Border.all(color: AppColors.surfaceContainerHighest),
        boxShadow: AppStyles.ambientShadow,
      ),
      child: Column(
        children: [
          Text(
            'Mã vận đơn',
            style: AppTypography.labelLg.copyWith(color: AppColors.secondary),
          ),
          const SizedBox(height: 4.0),
          Text(
            code,
            style: AppTypography.headlineLgMobile.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.logisticsRed,
            ),
          ),
          const SizedBox(height: 16.0),
          Container(
            padding: const EdgeInsets.all(12.0),
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.surfaceContainerHighest),
              borderRadius: AppStyles.roundedLg,
            ),
            child: Image.network(
              'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=$code',
              width: 150.0,
              height: 150.0,
              errorBuilder: (context, error, stackTrace) => const Icon(
                Icons.qr_code,
                size: 150.0,
                color: AppColors.secondary,
              ),
            ),
          ),
          const SizedBox(height: 12.0),
          Text(
            'In nhãn này dán lên bưu kiện để quét QR Code',
            style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildOrderInfoCard() {
    final senderName = _order!['senderName'] ?? '';
    final senderPhone = _order!['senderPhone'] ?? '';
    final senderAddress = _order!['senderAddressLine1'] ?? '';

    final receiverName = _order!['receiverName'] ?? '';
    final receiverPhone = _order!['receiverPhone'] ?? '';
    final receiverAddress = _order!['receiverAddressLine1'] ?? '';

    final service = _order!['service'] != null ? _order!['service']['serviceName'] ?? '' : '';

    return Container(
      width: double.infinity,
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
            'Thông tin vận chuyển',
            style: AppTypography.headlineMd.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.deepOnyx,
            ),
          ),
          const SizedBox(height: 16.0),

          // Sender
          _buildInfoRow(
            icon: Icons.circle,
            iconColor: const Color(0xFF1E40AF),
            title: 'Người gửi: $senderName ($senderPhone)',
            desc: senderAddress,
          ),
          const SizedBox(height: 16.0),

          // Receiver
          _buildInfoRow(
            icon: Icons.location_on,
            iconColor: AppColors.logisticsRed,
            title: 'Người nhận: $receiverName ($receiverPhone)',
            desc: receiverAddress,
          ),
          const SizedBox(height: 16.0),
          const Divider(),
          const SizedBox(height: 12.0),

          // Service Level
          Row(
            children: [
              const Icon(Icons.local_shipping_outlined, color: AppColors.secondary, size: 20.0),
              const SizedBox(width: 8.0),
              Expanded(
                child: RichText(
                  text: TextSpan(
                    style: AppTypography.bodyMd.copyWith(color: AppColors.deepOnyx),
                    children: [
                      const TextSpan(text: 'Dịch vụ: '),
                      TextSpan(
                        text: service,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String desc,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 4.0),
          child: Icon(icon, color: iconColor, size: 14.0),
        ),
        const SizedBox(width: 12.0),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTypography.bodyMd.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.deepOnyx,
                ),
              ),
              const SizedBox(height: 4.0),
              Text(
                desc,
                style: AppTypography.labelLg.copyWith(color: AppColors.secondary),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCostBreakdownCard() {
    final rawTotal = _order!['estimatedTotalAmount'] ?? _order!['totalAmount'];
    final rawShipping = _order!['estimatedShippingFee'] ?? _order!['shippingFee'];
    final rawInsurance = _order!['estimatedInsuranceFee'] ?? _order!['insuranceFee'];

    final totalAmount = rawTotal != null ? double.tryParse(rawTotal.toString()) ?? 0.0 : 0.0;
    final shippingFee = rawShipping != null ? double.tryParse(rawShipping.toString()) ?? 0.0 : 0.0;
    final insuranceFee = rawInsurance != null ? double.tryParse(rawInsurance.toString()) ?? 0.0 : 0.0;

    final paymentMethod = _order!['payment'] != null ? _order!['payment']['paymentMethod'] ?? 'CASH' : 'CASH';
    final paymentStatus = _order!['payment'] != null ? _order!['payment']['status'] ?? 'UNPAID' : 'UNPAID';

    return Container(
      width: double.infinity,
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
            'Chi tiết thanh toán',
            style: AppTypography.headlineMd.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.deepOnyx,
            ),
          ),
          const SizedBox(height: 16.0),
          _buildPriceRow('Cước vận chuyển:', '${shippingFee.toStringAsFixed(0)}đ'),
          if (insuranceFee > 0)
            _buildPriceRow('Phí thu hộ/bảo hiểm:', '${insuranceFee.toStringAsFixed(0)}đ'),
          const Divider(),
          const SizedBox(height: 8.0),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Tổng tiền:',
                style: AppTypography.bodyMd.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.deepOnyx,
                ),
              ),
              Text(
                '${totalAmount.toStringAsFixed(0)}đ',
                style: AppTypography.headlineLgMobile.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.logisticsRed,
                  fontSize: 18.0,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16.0),
          const Divider(),
          const SizedBox(height: 12.0),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Phương thức:',
                style: AppTypography.labelLg.copyWith(color: AppColors.secondary),
              ),
              Text(
                paymentMethod == 'COD' ? 'Thu hộ COD' : (paymentMethod == 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'),
                style: AppTypography.bodyMd.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.deepOnyx,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8.0),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Trạng thái:',
                style: AppTypography.labelLg.copyWith(color: AppColors.secondary),
              ),
              _buildPaymentStatusChip(paymentStatus),
            ],
          ),
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

  Widget _buildPaymentStatusChip(String status) {
    final isPaid = status == 'PAID';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
      decoration: BoxDecoration(
        color: isPaid ? const Color(0xFFDCFCE7) : const Color(0xFFFEE2E2),
        borderRadius: BorderRadius.circular(12.0),
      ),
      child: Text(
        isPaid ? 'Đã thanh toán' : 'Chưa thanh toán',
        style: AppTypography.labelMd.copyWith(
          color: isPaid ? const Color(0xFF166534) : const Color(0xFF991B1B),
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildTimelineCard() {
    final historyList = _order!['statusHistory'] as List? ?? [];

    return Container(
      width: double.infinity,
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
            'Hành trình đơn hàng',
            style: AppTypography.headlineMd.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.deepOnyx,
            ),
          ),
          const SizedBox(height: 20.0),
          if (historyList.isEmpty)
            Text(
              'Chưa có thông tin cập nhật hành trình.',
              style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: historyList.length,
              itemBuilder: (context, index) {
                // Reverse list to show newest on top
                final history = historyList[historyList.length - 1 - index];
                final isFirst = index == 0;
                final isLast = index == historyList.length - 1;

                final status = history['status'] ?? '';
                final reason = history['reason'] ?? '';
                final date = history['createdAt'] != null
                    ? DateTime.parse(history['createdAt']).toLocal().toString().substring(0, 16)
                    : '';

                return _buildTimelineStep(
                  status: status,
                  reason: reason,
                  time: date,
                  isFirst: isFirst,
                  isLast: isLast,
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildTimelineStep({
    required String status,
    required String reason,
    required String time,
    required bool isFirst,
    required bool isLast,
  }) {
    Color activeColor = isFirst ? AppColors.logisticsRed : AppColors.secondary;
    double dotSize = isFirst ? 14.0 : 10.0;

    String statusLabel;
    switch (status) {
      case 'CREATED':
        statusLabel = 'Đã tạo đơn';
        break;
      case 'READY_FOR_PICKUP':
        statusLabel = 'Sẵn sàng gom hàng';
        break;
      case 'PICKUP_ASSIGNED':
        statusLabel = 'Đã phân công tài xế gom';
        break;
      case 'PICKING':
        statusLabel = 'Tài xế đang đến lấy hàng';
        break;
      case 'PICKED_UP':
        statusLabel = 'Gom hàng thành công';
        break;
      case 'ARRIVED_ORIGIN_FACILITY':
        statusLabel = 'Đã đến bưu cục gửi';
        break;
      case 'READY_FOR_DISPATCH':
        statusLabel = 'Sẵn sàng trung chuyển';
        break;
      case 'IN_TRANSIT':
        statusLabel = 'Đang trung chuyển giữa các kho';
        break;
      case 'AT_HUB':
        statusLabel = 'Đã đến kho phân loại trung tâm';
        break;
      case 'OUT_FOR_DELIVERY':
        statusLabel = 'Đang giao hàng';
        break;
      case 'DELIVERED':
        statusLabel = 'Giao hàng thành công';
        break;
      case 'DELIVERY_FAILED':
        statusLabel = 'Giao hàng thất bại';
        break;
      case 'CANCELLED':
        statusLabel = 'Đơn hàng đã hủy';
        break;
      default:
        statusLabel = status;
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Indicator column
          Column(
            children: [
              Container(
                width: dotSize,
                height: dotSize,
                decoration: BoxDecoration(
                  color: activeColor,
                  shape: BoxShape.circle,
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2.0,
                    color: AppColors.surfaceContainerHighest,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 16.0),

          // Content column
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    statusLabel,
                    style: AppTypography.bodyMd.copyWith(
                      fontWeight: isFirst ? FontWeight.bold : FontWeight.w600,
                      color: isFirst ? AppColors.logisticsRed : AppColors.deepOnyx,
                    ),
                  ),
                  if (reason.isNotEmpty) ...[
                    const SizedBox(height: 4.0),
                    Text(
                      reason,
                      style: AppTypography.labelLg.copyWith(color: AppColors.secondary),
                    ),
                  ],
                  const SizedBox(height: 4.0),
                  Text(
                    time,
                    style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
