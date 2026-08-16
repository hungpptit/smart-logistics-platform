import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../../core/constants/api_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_styles.dart';
import '../../../core/theme/app_typography.dart';
import '../../../services/auth_service.dart';

/// Dialog displaying list of totes in a shipment, drill-down to packages inside each tote,
/// and full order details view with soft crimson brand theme.
class ToteDetailDialog extends StatefulWidget {
  final List<String> loadedTotes;
  final int totalPackageCount;

  const ToteDetailDialog({
    super.key,
    required this.loadedTotes,
    this.totalPackageCount = 0,
  });

  static void show(
    BuildContext context, {
    required List<String> loadedTotes,
    int totalPackageCount = 0,
  }) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => ToteDetailDialog(
        loadedTotes: loadedTotes,
        totalPackageCount: totalPackageCount,
      ),
    );
  }

  @override
  State<ToteDetailDialog> createState() => _ToteDetailDialogState();
}

class _ToteDetailDialogState extends State<ToteDetailDialog> {
  static const Color primaryCrimson = Color(0xFF991B1B); // Softer elegant dark crimson red
  static const Color accentCrimson = Color(0xFFB91C1C);  // Soft rose red
  static const Color softRedBg = Color(0xFFFEF2F2);      // Light soft blush red background
  static const Color softRedBorder = Color(0xFFFCA5A5);  // Soft pastel red border

  String? _selectedToteCode;
  Map<String, dynamic>? _selectedPackage;
  bool _isLoadingPackages = false;
  List<Map<String, dynamic>> _totePackages = [];
  String? _errorMessage;

  Future<void> _fetchTotePackages(String toteCode) async {
    setState(() {
      _selectedToteCode = toteCode;
      _selectedPackage = null;
      _isLoadingPackages = true;
      _errorMessage = null;
      _totePackages.clear();
    });

    try {
      final token = await AuthService.getToken();
      final url = Uri.parse(ApiConstants.totePackages(toteCode));
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
          'ngrok-skip-browser-warning': 'true',
        },
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true && body['data'] != null) {
          final rawPkgs = body['data']['packages'] as List? ?? [];
          setState(() {
            _totePackages = List<Map<String, dynamic>>.from(rawPkgs);
            _isLoadingPackages = false;
          });
          return;
        }
      }
      setState(() {
        _errorMessage = 'Không thể tải danh sách bưu kiện của Thùng [$toteCode]';
        _isLoadingPackages = false;
      });
    } catch (e) {
      debugPrint('💥 Error fetching tote packages: $e');
      setState(() {
        _errorMessage = 'Lỗi kết nối máy chủ khi lấy dữ liệu Thùng [$toteCode]';
        _isLoadingPackages = false;
      });
    }
  }

  void _goBackToToteList() {
    setState(() {
      _selectedToteCode = null;
      _selectedPackage = null;
      _totePackages.clear();
      _errorMessage = null;
    });
  }

  void _goBackToPackageList() {
    setState(() {
      _selectedPackage = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final bool isViewingPackageDetail = _selectedPackage != null;
    final bool isViewingPackagesList = _selectedToteCode != null && !isViewingPackageDetail;
    final bool isViewingTotesList = _selectedToteCode == null;

    String headerTitle = 'Danh Sách Thùng Hàng Trên Chuyến (${widget.loadedTotes.length} thùng)';
    String headerSubtitle = 'Tổng bưu kiện: ${widget.totalPackageCount} kiện hàng';

    if (isViewingPackageDetail) {
      headerTitle = 'Chi Tiết Đơn Hàng';
      headerSubtitle = 'Mã đơn: ${_selectedPackage!['orderCode'] ?? _selectedPackage!['packageCode'] ?? ''}';
    } else if (isViewingPackagesList) {
      headerTitle = 'Danh Sách Đơn Trong Thùng';
      headerSubtitle = 'Mã Thùng: $_selectedToteCode';
    }

    return Dialog(
      backgroundColor: AppColors.pureWhite,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 24.0),
      shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
      clipBehavior: Clip.antiAlias,
      child: Container(
        constraints: const BoxConstraints(maxHeight: 580),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header (Soft Dark Crimson Theme)
            Container(
              padding: const EdgeInsets.all(16.0),
              decoration: const BoxDecoration(
                color: primaryCrimson,
              ),
              child: Row(
                children: [
                  if (!isViewingTotesList)
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: AppColors.pureWhite),
                      onPressed: () {
                        if (isViewingPackageDetail) {
                          _goBackToPackageList();
                        } else {
                          _goBackToToteList();
                        }
                      },
                      tooltip: 'Quay lại',
                    )
                  else
                    const Icon(Icons.inventory_2, color: AppColors.pureWhite, size: 24),
                  const SizedBox(width: 8.0),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          headerTitle,
                          style: AppTypography.labelLg.copyWith(
                            color: AppColors.pureWhite,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          headerSubtitle,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 11,
                            fontFamily: 'monospace',
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white70),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            // Content Body
            Expanded(
              child: isViewingPackageDetail
                  ? _buildPackageDetailView()
                  : (isViewingPackagesList ? _buildPackagesListView() : _buildTotesListView()),
            ),

            // Footer (Crimson Button)
            if (!isViewingTotesList)
              Container(
                padding: const EdgeInsets.all(12.0),
                decoration: const BoxDecoration(
                  border: Border(top: BorderSide(color: AppColors.surfaceContainer)),
                ),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      if (isViewingPackageDetail) {
                        _goBackToPackageList();
                      } else {
                        _goBackToToteList();
                      }
                    },
                    icon: const Icon(Icons.arrow_back, size: 18),
                    label: Text(
                      isViewingPackageDetail ? 'QUAY LẠI DANH SÁCH ĐƠN' : 'QUAY LẠI DANH SÁCH THÙNG',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryCrimson,
                      foregroundColor: AppColors.pureWhite,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildTotesListView() {
    if (widget.loadedTotes.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.inventory_2_outlined, size: 48, color: AppColors.secondary),
              const SizedBox(height: 12),
              Text(
                'Chưa có Thùng hàng nào được quét lên xe',
                style: AppTypography.labelLg.copyWith(color: AppColors.secondary, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              const Text(
                'Vui lòng dùng nút "Quét Nhận Thùng Hàng" để nạp các Thùng hàng lên xe tải!',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: AppColors.secondary),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16.0),
      itemCount: widget.loadedTotes.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (ctx, index) {
        final toteCode = widget.loadedTotes[index];
        return InkWell(
          onTap: () => _fetchTotePackages(toteCode),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(14.0),
            decoration: BoxDecoration(
              color: AppColors.pureWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: softRedBorder, width: 1.2),
              boxShadow: AppStyles.ambientShadow,
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: const BoxDecoration(
                    color: softRedBg,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.inventory_2, color: accentCrimson, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        toteCode,
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.bold,
                          color: AppColors.deepOnyx,
                          fontFamily: 'monospace',
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Nhấn để xem các đơn hàng trong Thùng này ›',
                        style: TextStyle(fontSize: 11, color: accentCrimson, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: accentCrimson),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPackagesListView() {
    if (_isLoadingPackages) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: primaryCrimson),
            SizedBox(height: 12),
            Text('Đang tải danh sách bưu kiện...', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Text(_errorMessage!, style: const TextStyle(color: AppColors.error, fontSize: 13)),
        ),
      );
    }

    if (_totePackages.isEmpty) {
      return const Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Text('Thùng hàng này hiện chưa chứa bưu kiện nào.', style: TextStyle(color: AppColors.secondary, fontSize: 13)),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16.0),
      itemCount: _totePackages.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (ctx, index) {
        final pkg = _totePackages[index];
        final orderCode = pkg['orderCode'] ?? pkg['packageCode'] ?? 'N/A';
        final receiverName = pkg['receiverName'] ?? 'Khách hàng nhận';
        final receiverPhone = pkg['receiverPhone'] ?? '';
        final destFacility = pkg['destinationFacilityName'] ?? 'Bưu cục đích';

        return Container(
          padding: const EdgeInsets.all(12.0),
          decoration: BoxDecoration(
            color: AppColors.pureWhite,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.surfaceContainer),
            boxShadow: AppStyles.ambientShadow,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  color: softRedBg,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Text(
                  '${index + 1}',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: accentCrimson, fontSize: 12),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      orderCode,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: primaryCrimson,
                        fontSize: 12.5,
                        fontFamily: 'monospace',
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Người nhận: $receiverName ${receiverPhone.isNotEmpty ? "($receiverPhone)" : ""}',
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppColors.deepOnyx),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Đích: $destFacility',
                      style: const TextStyle(fontSize: 11, color: AppColors.secondary),
                    ),
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerRight,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          setState(() {
                            _selectedPackage = pkg;
                          });
                        },
                        icon: const Icon(Icons.info_outline, size: 14),
                        label: const Text('Xem chi tiết đơn', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryCrimson,
                          foregroundColor: AppColors.pureWhite,
                          padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPackageDetailView() {
    if (_selectedPackage == null) return const SizedBox.shrink();
    final pkg = _selectedPackage!;
    final orderCode = pkg['orderCode'] ?? pkg['packageCode'] ?? 'N/A';
    final senderName = pkg['senderName'] ?? 'Khách hàng gửi';
    final senderPhone = pkg['senderPhone'] ?? '';
    final pickupAddr = pkg['pickupAddressText'] ?? pkg['originFacilityName'] ?? 'Bưu cục nguồn';

    final receiverName = pkg['receiverName'] ?? 'Khách hàng nhận';
    final receiverPhone = pkg['receiverPhone'] ?? '';
    final deliveryAddr = pkg['deliveryAddressText'] ?? pkg['destinationFacilityName'] ?? 'Bưu cục đích';

    final num shippingFee = pkg['shippingFee'] ?? 15000;
    final num codAmount = pkg['codAmount'] ?? 0;
    final String feePayer = (pkg['feePayer'] ?? 'SENDER').toString().toUpperCase();
    final bool isReceiverPay = feePayer == 'RECEIVER';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Order Header Card
          Container(
            padding: const EdgeInsets.all(14.0),
            decoration: BoxDecoration(
              color: softRedBg,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: softRedBorder),
            ),
            child: Row(
              children: [
                const Icon(Icons.local_shipping, color: primaryCrimson, size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('MÃ VẬN ĐƠN / BƯU KIỆN', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.secondary)),
                      Text(
                        orderCode,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: primaryCrimson, fontFamily: 'monospace'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 1. Sender Info
          _buildSectionTitle(Icons.unarchive, 'THÔNG TIN NGƯỜI GỬI'),
          const SizedBox(height: 6),
          _buildInfoBox(
            title: '$senderName ${senderPhone.isNotEmpty ? "($senderPhone)" : ""}',
            subtitle: 'Địa chỉ lấy: $pickupAddr',
          ),
          const SizedBox(height: 14),

          // 2. Receiver Info
          _buildSectionTitle(Icons.archive, 'THÔNG TIN NGƯỜI NHẬN'),
          const SizedBox(height: 6),
          _buildInfoBox(
            title: '$receiverName ${receiverPhone.isNotEmpty ? "($receiverPhone)" : ""}',
            subtitle: 'Địa chỉ giao: $deliveryAddr',
          ),
          const SizedBox(height: 14),

          // 3. Fee & Payment Info
          _buildSectionTitle(Icons.payments, 'CƯỚC PHÍ & NGƯỜI THANH TOÁN'),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.all(12.0),
            decoration: BoxDecoration(
              color: AppColors.pureWhite,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.surfaceContainer),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Cước phí vận chuyển:', style: TextStyle(fontSize: 12, color: AppColors.secondary)),
                    Text(
                      '${_formatCurrency(shippingFee)} đ',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.deepOnyx),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Tiền thu hộ (COD):', style: TextStyle(fontSize: 12, color: AppColors.secondary)),
                    Text(
                      codAmount > 0 ? '${_formatCurrency(codAmount)} đ' : 'Không có',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: codAmount > 0 ? accentCrimson : AppColors.secondary,
                      ),
                    ),
                  ],
                ),
                const Divider(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Người trả cước phí:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.deepOnyx)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                      decoration: BoxDecoration(
                        color: isReceiverPay ? softRedBg : Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(
                          color: isReceiverPay ? softRedBorder : Colors.amber.shade300,
                        ),
                      ),
                      child: Text(
                        isReceiverPay ? 'NGƯỜI NHẬN TRẢ CƯỚC' : 'NGƯỜI GỬI TRẢ CƯỚC',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.bold,
                          color: isReceiverPay ? primaryCrimson : const Color(0xFFB45309),
                        ),
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

  Widget _buildSectionTitle(IconData icon, String title) {
    return Row(
      children: [
        Icon(icon, size: 16, color: primaryCrimson),
        const SizedBox(width: 6),
        Text(
          title,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: primaryCrimson),
        ),
      ],
    );
  }

  Widget _buildInfoBox({required String title, required String subtitle}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12.0),
      decoration: BoxDecoration(
        color: AppColors.pureWhite,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.surfaceContainer),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: AppColors.deepOnyx)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(fontSize: 11.5, color: AppColors.secondary)),
        ],
      ),
    );
  }

  String _formatCurrency(num amount) {
    return amount.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]}.',
        );
  }
}
