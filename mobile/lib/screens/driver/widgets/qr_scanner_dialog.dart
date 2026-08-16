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
  String? _errorMessage;
  String? _successNotice;

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

  String? get _targetCode {
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

  Future<void> _performScanCheck() async {
    final scannedValue = _scanController.text.trim();
    if (scannedValue.isEmpty) {
      setState(() {
        _errorMessage = 'Vui lòng đưa camera quét mã QR / nhập mã';
        _successNotice = null;
      });
      return;
    }

    // Case 0 & A1: Scanned Linehaul Warehouse Tote (TOTE-..., TOT-..., ST-...)
    final bool isToteCode = scannedValue.toUpperCase().startsWith('TOTE-') ||
        scannedValue.toUpperCase().startsWith('TOT-') ||
        scannedValue.toUpperCase().startsWith('ST-');

    // Chặn Shipper chặng cuối quét thùng hàng của xe tải trung chuyển
    if (isToteCode && !widget.isLinehaulRoute) {
      setState(() {
        _isProcessing = false;
        _errorMessage = 'Bạn là Shipper chặng cuối, không thể quét nhận Thùng hàng xe tải!';
        _successNotice = null;
      });
      return;
    }

    if (isToteCode) {
      setState(() {
        _isProcessing = true;
        _errorMessage = null;
        _successNotice = null;
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
          _errorMessage = 'Không thể nạp Thùng Hàng [$scannedValue]. Vui lòng kiểm tra lại mã!';
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

    // Tách phần mã đơn gốc nếu mã quét có đuôi bưu kiện (-PKG-01, -PKG...)
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

    // Kiểm tra khớp mã
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
      setState(() {
        _isProcessing = true;
        _errorMessage = null;
        _successNotice = (widget.stop != null && widget.stop!.isNotEmpty)
            ? 'Mã khớp! Đã xác nhận bưu kiện...'
            : 'Mã khớp! Đang nhận chuyến xe...';
      });

      try {
        if (widget.stop != null && widget.stop!.isNotEmpty) {
          widget.onStopCheckedIn(widget.stop!);
          if (mounted) Navigator.pop(context);
          return;
        }

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
                _successNotice = null;
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
        _errorMessage = 'Mã QR không trùng khớp! Cần quét: ${targetCode ?? widget.activeRouteCode ?? 'bưu kiện'}';
        _successNotice = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final targetCode = _targetCode;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
      child: Container(
        padding: const EdgeInsets.all(20.0),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(24.0),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.5),
              blurRadius: 20,
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
                  const Expanded(
                    child: Text(
                      'QUÉT MÃ QR',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12.5,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 8.0),

              // Camera Scanner Box
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
                          if (_isProcessing) return;
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
                            'Camera quang học đang quét trực tiếp...',
                            style: TextStyle(
                              color: Colors.amberAccent,
                              fontSize: 9,
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
                targetCode != null
                    ? 'Mã Thùng Hàng / Bưu kiện cần quét: $targetCode'
                    : 'Tình trạng: Sẵn sàng quét mã thùng hàng nạp xe',
                style: const TextStyle(
                  color: Colors.amberAccent,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
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

              if (_successNotice != null) ...[
                const SizedBox(height: 10.0),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10.0),
                  decoration: BoxDecoration(
                    color: Colors.green.shade900.withValues(alpha: 0.8),
                    borderRadius: BorderRadius.circular(10.0),
                    border: Border.all(color: Colors.greenAccent, width: 1.5),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle, color: Colors.greenAccent, size: 22),
                      const SizedBox(width: 8.0),
                      Expanded(
                        child: Text(
                          _successNotice!,
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

              const SizedBox(height: 16.0),

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
                    _isProcessing ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN MÃ QUÉT',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.logisticsRed,
                    foregroundColor: AppColors.pureWhite,
                    padding: const EdgeInsets.symmetric(vertical: 14.0),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.0)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
