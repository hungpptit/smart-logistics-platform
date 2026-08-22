import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_styles.dart';
import '../../../services/driver_service.dart';
import 'pulsing_scan_line.dart';

class QrScannerDialog extends StatefulWidget {
  final Map<String, dynamic>? stop;
  final String? activeRouteCode;
  final String? activeRouteId;
  final String scanMode;
  final bool isLinehaulRoute;
  final void Function(String? newRouteCode) onRouteCodeUpdated;
  final VoidCallback onRefreshRoutes;
  final void Function(Map<String, dynamic>) onStopCheckedIn;

  const QrScannerDialog({
    super.key,
    this.stop,
    required this.activeRouteCode,
    required this.activeRouteId,
    this.scanMode = 'ROUTE',
    this.isLinehaulRoute = false,
    required this.onRouteCodeUpdated,
    required this.onRefreshRoutes,
    required this.onStopCheckedIn,
  });

  static void show(
    BuildContext context, {
    Map<String, dynamic>? stop,
    String? activeRouteCode,
    String? activeRouteId,
    String scanMode = 'ROUTE',
    bool isLinehaulRoute = false,
    required void Function(String? newRouteCode) onRouteCodeUpdated,
    required VoidCallback onRefreshRoutes,
    required void Function(Map<String, dynamic>) onStopCheckedIn,
  }) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) => QrScannerDialog(
        stop: stop,
        activeRouteCode: activeRouteCode,
        activeRouteId: activeRouteId,
        scanMode: scanMode,
        isLinehaulRoute: isLinehaulRoute,
        onRouteCodeUpdated: onRouteCodeUpdated,
        onRefreshRoutes: onRefreshRoutes,
        onStopCheckedIn: onStopCheckedIn,
      ),
    );
  }

  @override
  State<QrScannerDialog> createState() => _QrScannerDialogState();
}

class _QrScannerDialogState extends State<QrScannerDialog> {
  late final TextEditingController _scanController;
  bool _isProcessing = false;
  bool _isMatched = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _scanController = TextEditingController();
  }

  @override
  void dispose() {
    _scanController.dispose();
    super.dispose();
  }

  bool get _isToteScanMode => widget.scanMode == 'TOTE' || widget.isLinehaulRoute;

  String _formatCurrency(dynamic amount) {
    if (amount == null) return '0 đ';
    final num? val = num.tryParse(amount.toString());
    if (val == null || val <= 0) return '0 đ (Đã thanh toán)';
    final int value = val.round();
    final String str = value.toString();
    final RegExp reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    final String result = str.replaceAllMapped(reg, (Match m) => '${m[1]}.');
    return '$result đ';
  }

  String? get _targetCode {
    if (_isToteScanMode) {
      return null;
    }
    if (widget.stop != null && widget.stop!.isNotEmpty) {
      final code = widget.stop!['orderCode'] ?? widget.stop!['packageCode'] ?? widget.stop!['shipmentCode'];
      if (code != null && code.toString().trim().isNotEmpty) {
        return code.toString().trim();
      }
    }
    if (widget.activeRouteCode != null && widget.activeRouteCode!.isNotEmpty) {
      return widget.activeRouteCode;
    }
    if (widget.activeRouteId != null && widget.activeRouteId!.isNotEmpty) {
      return widget.activeRouteId;
    }
    return null;
  }

  void _handleResetScan() {
    setState(() {
      _scanController.clear();
      _isMatched = false;
      _isProcessing = false;
      _errorMessage = null;
    });
  }

  void _handleConfirmStopDelivery() {
    if (widget.stop != null && widget.stop!.isNotEmpty) {
      setState(() => _isProcessing = true);
      widget.onStopCheckedIn(widget.stop!);
      if (mounted) Navigator.pop(context);
    }
  }

  Future<void> _performScanCheck() async {
    final scannedValue = _scanController.text.trim();
    if (scannedValue.isEmpty) {
      setState(() {
        _errorMessage = 'Vui lòng đưa camera quét mã QR / nhập mã';
      });
      return;
    }

    final upperScanned = scannedValue.toUpperCase();
    final bool isOrderOrPackage = upperScanned.startsWith('ORD-') || upperScanned.startsWith('PKG-');
    final bool isToteCode = upperScanned.startsWith('TOTE-') ||
        upperScanned.startsWith('TOT-') ||
        upperScanned.startsWith('ST-') ||
        upperScanned.startsWith('TB-') ||
        upperScanned.startsWith('BAG-');

    // 1. Phân quyền và Chặn quét nhầm:
    if (_isToteScanMode && isOrderOrPackage) {
      setState(() {
        _isProcessing = false;
        _isMatched = false;
        _errorMessage = 'Mã [$scannedValue] là mã Bưu kiện / Đơn hàng đơn lẻ!\n\n'
            'Tài xế xe tải trung chuyển (Linehaul) chỉ quét mã QR Sọt / Thùng hàng (Tote Bag) đã niêm phong.';
      });
      return;
    }

    if (isToteCode && !widget.isLinehaulRoute && widget.scanMode != 'TOTE') {
      setState(() {
        _isProcessing = false;
        _isMatched = false;
        _errorMessage = 'Bạn là Shipper chặng cuối, không thể quét nhận Thùng hàng xe tải!';
      });
      return;
    }

    // 2. Case A: Quét Sọt hàng Linehaul (Tote Bag)
    if (_isToteScanMode || isToteCode) {
      setState(() {
        _isProcessing = true;
        _errorMessage = null;
      });

      final result = await DriverService.loadToteIntoShipment(scannedValue);

      if (!mounted) return;

      if (result != null) {
        final routeId = result['routeId']?.toString() ?? '';
        final routeCode = result['routeCode']?.toString() ?? '';

        if (routeId.isNotEmpty) {
          widget.onRouteCodeUpdated(routeId);
        } else if (routeCode.isNotEmpty) {
          widget.onRouteCodeUpdated(routeCode);
        }

        widget.onRefreshRoutes();

        Navigator.pop(context);

        final bool consolidatedAdded = result['consolidatedAdded'] == true;
        final String intermediateHubName = result['intermediateFacilityName']?.toString() ?? '';

        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: AppColors.pureWhite,
            shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
            title: Row(
              children: [
                Icon(
                  consolidatedAdded ? Icons.bolt : Icons.check_circle,
                  color: consolidatedAdded ? const Color(0xFFB91C1C) : Colors.green,
                  size: 28,
                ),
                const SizedBox(width: 8.0),
                Expanded(
                  child: Text(
                    consolidatedAdded ? 'Tối Ưu Lộ Trình Tự Động!' : 'Nạp Thùng Hàng Thành Công',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: consolidatedAdded ? const Color(0xFFB91C1C) : AppColors.deepOnyx,
                    ),
                  ),
                ),
              ],
            ),
            content: Text(
              consolidatedAdded
                  ? 'Tải trọng xe hiện tại < 80% sức chứa.\n\n'
                    'Hệ thống đã tự động điều phối thêm chặng dừng tại [$intermediateHubName] để ghé bốc thêm thùng hàng tiện đường!'
                  : 'Thùng hàng [$scannedValue] đã được xác nhận bốc lên xe thành công.',
              style: const TextStyle(fontSize: 13, height: 1.4),
            ),
            actions: [
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(
                  backgroundColor: consolidatedAdded ? const Color(0xFFB91C1C) : AppColors.logisticsRed,
                  foregroundColor: AppColors.pureWhite,
                ),
                child: const Text('Đã Hiểu'),
              ),
            ],
          ),
        );
      } else {
        setState(() {
          _isProcessing = false;
          _isMatched = false;
          _errorMessage = 'Không tìm thấy Sọt Hàng [$scannedValue] trong CSDL hoặc sọt chưa sẵn sàng nạp lên xe tải!';
        });
      }
      return;
    }

    // Case B: Last-Mile Delivery / Pickup Route Scan
    final String? targetCode = _targetCode;
    final cleanScanned = scannedValue.toUpperCase().trim();
    final cleanTarget = (targetCode ?? '').toUpperCase().trim();
    final cleanRouteCode = (widget.activeRouteCode ?? '').toUpperCase().trim();
    final cleanRouteId = (widget.activeRouteId ?? '').toUpperCase().trim();

    final String baseScannedOrderCode = cleanScanned.contains('-PKG')
        ? cleanScanned.split('-PKG').first
        : cleanScanned;
    final String baseTargetOrderCode = cleanTarget.contains('-PKG')
        ? cleanTarget.split('-PKG').first
        : cleanTarget;

    final stopOrderCode = (widget.stop?['orderCode'] ?? '').toString().toUpperCase().trim();
    final stopPkgCode = (widget.stop?['packageCode'] ?? '').toString().toUpperCase().trim();
    final stopShipmentCode = (widget.stop?['shipmentCode'] ?? '').toString().toUpperCase().trim();
    final stopTracking = (widget.stop?['trackingNumber'] ?? '').toString().toUpperCase().trim();

    final bool isRouteStartMode = (widget.stop == null || widget.stop!.isEmpty);
    
    final bool isMatch = isRouteStartMode
        ? (cleanScanned.isNotEmpty && (
            cleanScanned == cleanRouteCode ||
            cleanScanned == cleanRouteId ||
            cleanScanned.startsWith('ORD-') ||
            cleanScanned.startsWith('RT-') ||
            cleanScanned.startsWith('SHP-') ||
            cleanScanned.startsWith('PKG-')
          ))
        : (cleanTarget.isNotEmpty && (
            cleanScanned == cleanTarget ||
            cleanScanned.startsWith(cleanTarget) ||
            cleanTarget.startsWith(cleanScanned) ||
            baseScannedOrderCode == cleanTarget ||
            baseScannedOrderCode == baseTargetOrderCode ||
            (stopOrderCode.isNotEmpty && (cleanScanned == stopOrderCode || baseScannedOrderCode == stopOrderCode || cleanScanned.startsWith(stopOrderCode))) ||
            (stopPkgCode.isNotEmpty && (cleanScanned == stopPkgCode || cleanScanned.startsWith(stopPkgCode))) ||
            (stopShipmentCode.isNotEmpty && cleanScanned == stopShipmentCode) ||
            (stopTracking.isNotEmpty && cleanScanned == stopTracking)
        ));

    if (isMatch || targetCode == null) {
      // 1. Nếu là quét bưu kiện của Shipper chặng cuối: HIỂN THỊ THÔNG TIN ĐƠN ĐỂ KIỂM TRA (CHƯA TỰ ĐỘNG CHỐT)
      if (widget.stop != null && widget.stop!.isNotEmpty) {
        setState(() {
          _isMatched = true;
          _isProcessing = false;
          _errorMessage = null;
        });
        return;
      }

      // 2. Nếu là quét nhận chuyến xe ban đầu:
      setState(() {
        _isProcessing = true;
        _errorMessage = null;
      });

      try {
        final routeToStart = (widget.activeRouteCode != null && widget.activeRouteCode!.isNotEmpty)
            ? widget.activeRouteCode!
            : ((targetCode != null && targetCode.isNotEmpty) ? targetCode : scannedValue);

        if (routeToStart.isNotEmpty) {
          bool startSuccess = false;
          if (widget.isLinehaulRoute) {
            startSuccess = await DriverService.updateShipmentStatus(routeToStart, 'IN_PROGRESS');
          } else {
            startSuccess = await DriverService.startRoute(routeToStart);
          }

          if (!startSuccess) {
            if (mounted) {
              setState(() {
                _isProcessing = false;
                _errorMessage = 'Không thể nhận chuyến xe [$routeToStart]. Vui lòng thử lại!';
              });
            }
            return;
          }

          widget.onRouteCodeUpdated(routeToStart);
        }

        widget.onRefreshRoutes();

        if (mounted) {
          Navigator.of(context).pop();
          showDialog(
            context: context,
            builder: (dialogCtx) => AlertDialog(
              backgroundColor: AppColors.pureWhite,
              shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
              title: const Text(
                'Nhận Chuyến Xe Thành Công',
                style: TextStyle(
                  color: Color(0xFF15803D),
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
              content: Text(
                'Đã nhận chuyến xe [$routeToStart] thành công! Sẵn sàng khởi hành.',
                style: const TextStyle(
                  color: AppColors.deepOnyx,
                  fontSize: 14,
                ),
              ),
              actions: [
                ElevatedButton(
                  onPressed: () => Navigator.pop(dialogCtx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF15803D),
                    foregroundColor: AppColors.pureWhite,
                    shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                  ),
                  child: const Text('Đồng ý', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          );
        }
      } catch (e) {
        debugPrint('Lỗi khi xác nhận mã quét: $e');
        if (mounted) {
          setState(() {
            _errorMessage = 'Lỗi xử lý xác nhận. Vui lòng thử lại!';
          });
        }
      } finally {
        if (mounted) {
          setState(() {
            _isProcessing = false;
          });
        }
      }
    } else {
      setState(() {
        _isProcessing = false;
        _isMatched = false;
        _errorMessage = 'Mã QR [$scannedValue] không trùng khớp với đơn hàng cần xử lý!\n\nCần quét: $targetCode';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final targetCode = _targetCode;
    final stop = widget.stop;
    final bool isPickupStop = stop != null &&
        (stop['isPickup'] == true ||
            stop['stopType'] == 'PICKUP' ||
            stop['title']?.toString().toLowerCase().contains('lay hang') == true);

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 20.0),
      child: Container(
        padding: const EdgeInsets.all(18.0),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(24.0),
          border: Border.all(
            color: _isMatched ? const Color(0xFF22C55E) : const Color(0xFF334155),
            width: _isMatched ? 2.0 : 1.0,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.6),
              blurRadius: 24,
              offset: const Offset(0, 10),
            )
          ],
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        Icon(
                          _isToteScanMode
                              ? Icons.inventory_2_outlined
                              : (isPickupStop ? Icons.archive_outlined : Icons.unarchive_outlined),
                          color: _isMatched ? const Color(0xFF22C55E) : AppColors.logisticsRed,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _isToteScanMode
                                ? 'QUÉT MÃ SỌT / THÙNG HÀNG'
                                : (stop != null
                                    ? (isPickupStop ? 'XÁC NHẬN LẤY HÀNG' : 'XÁC NHẬN GIAO HÀNG')
                                    : 'QUÉT MÃ CHUYẾN XE'),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 13.5,
                              letterSpacing: 0.3,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white70, size: 20),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 12.0),

              // ==========================================
              // VIEW 1: KHI ĐÃ QUÉT TRÙNG KHỚP (CONFIRMATION CARD)
              // ==========================================
              if (_isMatched && stop != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14.0),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16.0),
                    border: Border.all(color: const Color(0xFF22C55E), width: 1.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF15803D),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.check_circle, color: Colors.white, size: 14),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    child: Text(
                                      isPickupStop ? 'ĐÃ KHỚP ĐIỂM LẤY' : 'ĐÃ KHỚP ĐƠN GIAO',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.bold,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            stop['orderCode'] ?? '',
                            style: const TextStyle(
                              color: Color(0xFF60A5FA),
                              fontWeight: FontWeight.bold,
                              fontSize: 12.5,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Thông tin người nhận / lấy
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.person_outline, color: Colors.white60, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              stop['receiverName'] ?? stop['customerName'] ?? 'Khách hàng',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Địa chỉ
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.location_on_outlined, color: Colors.white60, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              stop['address'] ?? stop['subtitle'] ?? '',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                                height: 1.3,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const Divider(color: Colors.white24, height: 20),

                      // Tiền thu COD
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Tiền thu hộ COD:',
                            style: TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              _formatCurrency(stop['totalToCollect'] ?? stop['codAmount'] ?? stop['cod']),
                              style: TextStyle(
                                color: ((num.tryParse((stop['totalToCollect'] ?? stop['codAmount'] ?? '0').toString()) ?? 0) > 0)
                                    ? const Color(0xFFF97316)
                                    : const Color(0xFF22C55E),
                                fontWeight: FontWeight.bold,
                                fontSize: 13.5,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.end,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14.0),

                // 2 Nút: Quét Lại & Xác Nhận
                Row(
                  children: [
                    Expanded(
                      flex: 4,
                      child: OutlinedButton.icon(
                        onPressed: _isProcessing ? null : _handleResetScan,
                        icon: const Icon(Icons.refresh, size: 16, color: Colors.white70),
                        label: const Text(
                          'Quét Lại',
                          style: TextStyle(color: Colors.white70, fontSize: 12.5, fontWeight: FontWeight.bold),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white30),
                          padding: const EdgeInsets.symmetric(vertical: 12.0),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.0)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10.0),
                    Expanded(
                      flex: 6,
                      child: ElevatedButton.icon(
                        onPressed: _isProcessing ? null : _handleConfirmStopDelivery,
                        icon: _isProcessing
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Icon(Icons.check_circle_outline, size: 18),
                        label: Text(
                          _isProcessing
                              ? 'ĐANG LƯU...'
                              : (isPickupStop ? 'XÁC NHẬN LẤY' : 'XÁC NHẬN GIAO'),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF15803D),
                          foregroundColor: AppColors.pureWhite,
                          padding: const EdgeInsets.symmetric(vertical: 12.0),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.0)),
                        ),
                      ),
                    ),
                  ],
                ),
              ]
              // ==========================================
              // VIEW 2: KHUNG CAMERA QUÉT MÃ QR
              // ==========================================
              else ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(16.0),
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
                            if (_isProcessing || _isMatched) return;
                            for (final barcode in barcodeCapture.barcodes) {
                              final String? rawValue = barcode.rawValue;
                              if (rawValue != null && rawValue.trim().isNotEmpty) {
                                setState(() {
                                  _scanController.text = rawValue.trim();
                                  _errorMessage = null;
                                });
                                _performScanCheck();
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
                              'Đưa mã QR vào khung ngắm...',
                              style: TextStyle(
                                color: Colors.amberAccent,
                                fontSize: 9.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12.0),

                Text(
                  _isToteScanMode
                      ? 'Đưa camera quét mã QR trên Sọt / Thùng hàng (Tote Bag)'
                      : (targetCode != null
                          ? 'Mã Bưu kiện cần quét: $targetCode'
                          : 'Mã Chuyến xe cần quét: ${widget.activeRouteCode ?? widget.activeRouteId ?? "Tất cả"}'),
                  style: TextStyle(
                    color: _isToteScanMode ? const Color(0xFF60A5FA) : Colors.amberAccent,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12.0),

                TextField(
                  controller: _scanController,
                  readOnly: true,
                  enableInteractiveSelection: false,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'monospace',
                  ),
                  decoration: InputDecoration(
                    hintText: 'Mã nhận diện tự động từ Camera',
                    hintStyle: const TextStyle(color: Colors.white38, fontSize: 11),
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

                if (_errorMessage != null) ...[
                  const SizedBox(height: 10.0),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10.0),
                    decoration: BoxDecoration(
                      color: Colors.red.shade900.withValues(alpha: 0.8),
                      borderRadius: BorderRadius.circular(10.0),
                      border: Border.all(color: Colors.redAccent, width: 1.5),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: Colors.redAccent, size: 22),
                        const SizedBox(width: 8.0),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11.5,
                              fontWeight: FontWeight.bold,
                              height: 1.3,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 14.0),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _isProcessing ? null : _performScanCheck,
                    icon: _isProcessing
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Icon(Icons.qr_code_scanner, size: 20),
                    label: Text(
                      _isProcessing ? 'ĐANG XỬ LÝ...' : 'KIỂM TRA MÃ QUÉT',
                      style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.logisticsRed,
                      foregroundColor: AppColors.pureWhite,
                      padding: const EdgeInsets.symmetric(vertical: 13.0),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.0)),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
