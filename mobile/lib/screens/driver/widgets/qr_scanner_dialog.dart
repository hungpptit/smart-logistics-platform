import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_styles.dart';
import '../../../services/driver_service.dart';
import 'pulsing_scan_line.dart';

class QrScannerDialog extends StatelessWidget {
  final Map<String, dynamic>? stop;
  final String? activeRouteCode;
  final String? activeRouteId;
  final String scanMode;
  final void Function(String? newRouteCode) onRouteCodeUpdated;
  final VoidCallback onRefreshRoutes;
  final void Function(Map<String, dynamic>) onStopCheckedIn;

  const QrScannerDialog({
    super.key,
    this.stop,
    required this.activeRouteCode,
    required this.activeRouteId,
    this.scanMode = 'ROUTE',
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
        onRouteCodeUpdated: onRouteCodeUpdated,
        onRefreshRoutes: onRefreshRoutes,
        onStopCheckedIn: onStopCheckedIn,
      ),
    );
  }

  String? get _targetCode =>
      (activeRouteCode != null && activeRouteCode!.isNotEmpty)
          ? activeRouteCode
          : ((activeRouteId != null && activeRouteId!.isNotEmpty)
              ? activeRouteId
              : ((stop != null && stop!['orderCode'] != null)
                  ? stop!['orderCode'].toString().trim()
                  : null));

  @override
  Widget build(BuildContext context) {
    final targetCode = _targetCode;
    final TextEditingController scanController = TextEditingController();
    String? errorMessage;

    return StatefulBuilder(
      builder: (context, setScannerState) {
        bool isProcessing = false;

        Future<void> performScanCheck() async {
          final scannedValue = scanController.text.trim();
          if (scannedValue.isEmpty) {
            setScannerState(() {
              errorMessage = 'Vui lòng đưa camera quét mã QR / nhập mã';
            });
            return;
          }

          // Case 0: Scanned Linehaul Warehouse Tote (TOTE-ZONE-...)
          if (scannedValue.toUpperCase().startsWith('TOTE-')) {
            Navigator.pop(context);
            final result = await DriverService.loadToteIntoShipment(scannedValue);
            if (context.mounted) {
              if (result != null && result['shipmentCode'] != null) {
                onRouteCodeUpdated(result['shipmentCode'].toString());
              }
              onRefreshRoutes();
              showDialog(
                context: context,
                builder: (ctx) {
                  final bool isOk = result != null;
                  return AlertDialog(
                    backgroundColor: AppColors.pureWhite,
                    shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
                    title: Row(
                      children: [
                        Icon(isOk ? Icons.check_circle : Icons.error,
                            color: isOk ? Colors.green : Colors.red, size: 28),
                        const SizedBox(width: 8.0),
                        Text(isOk ? 'Nạp Sọt Xe Tải Thành Công' : 'Thất Bại',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ],
                    ),
                    content: Text(isOk
                        ? 'Đã tiếp nhận Sọt [$scannedValue] lên xe tải (${result['shipmentCode'] ?? ''}). Toàn bộ ${result['packageCount'] ?? 1} bưu kiện đã chuyển sang Đang trung chuyển (IN_TRANSIT).'
                        : 'Không thể nạp sọt $scannedValue lên xe tải.'),
                    actions: [
                      ElevatedButton(
                        onPressed: () => Navigator.pop(ctx),
                        style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.logisticsRed,
                            foregroundColor: AppColors.pureWhite),
                        child: const Text('Đóng'),
                      ),
                    ],
                  );
                },
              );
            }
            return;
          }

          // Case A: Scanned Route / Tote Code (RT-XXXX, SHP-LH-XXXX, or matching active route)
          final bool isToteCode = scannedValue.toUpperCase().startsWith('TOT-') ||
              scannedValue.toUpperCase().startsWith('ST-');
          final bool isRouteCodeFormat = scannedValue.toUpperCase().startsWith('RT-') ||
              scannedValue.toUpperCase().startsWith('SHP-LH-') ||
              (activeRouteCode != null && scannedValue.toUpperCase() == activeRouteCode!.toUpperCase()) ||
              (activeRouteId != null && scannedValue.toUpperCase() == activeRouteId!.toUpperCase());

          // Case A1: Tote Scan (Bốc sọt hàng lên xe tải trung chuyển)
          if (isToteCode) {
            setScannerState(() {
              isProcessing = true;
            });
            final res = await DriverService.loadToteIntoShipment(scannedValue);
            final bool success = res != null;
            if (context.mounted) {
              Navigator.pop(context);
              onRefreshRoutes();
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: AppColors.pureWhite,
                  shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
                  title: Row(
                    children: [
                      Icon(success ? Icons.check_circle : Icons.error_outline,
                          color: success ? Colors.green : AppColors.error, size: 28),
                      const SizedBox(width: 8.0),
                      Text(success ? 'Bốc Sọt Hàng Lên Xe Thành Công' : 'Lỗi Quét Sọt Hàng',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: success ? Colors.green.shade900 : AppColors.error)),
                    ],
                  ),
                  content: Text(success
                      ? 'Đã bốc sọt $scannedValue lên xe tải trung chuyển. Dữ liệu đã được đồng bộ hệ thống!'
                      : 'Không thể quét nhận sọt $scannedValue. Vui lòng kiểm tra mã Sọt Tote hoặc liên hệ Quản lý.'),
                  actions: [
                    ElevatedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: success ? AppColors.logisticsRed : AppColors.deepOnyx,
                          foregroundColor: AppColors.pureWhite),
                      child: const Text('Đóng'),
                    ),
                  ],
                ),
              );
            }
            return;
          }

          // Case A2: Route Code Scan (Nhận chuyến xe / Lộ trình)
          if (isRouteCodeFormat) {
            // Check if shipper is assigned to this route:
            final bool isAssignedToThisDriver = (activeRouteCode != null &&
                    scannedValue.toUpperCase() == activeRouteCode!.toUpperCase()) ||
                (activeRouteId != null &&
                    scannedValue.toUpperCase() == activeRouteId!.toUpperCase()) ||
                scannedValue.toUpperCase().startsWith('RT-') ||
                scannedValue.toUpperCase().startsWith('SHP-LH-');

            if (!isAssignedToThisDriver) {
              // Shipper is NOT assigned to this scanned route!
              Navigator.pop(context);
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: AppColors.pureWhite,
                  shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
                  title: const Row(
                    children: [
                      Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 28),
                      SizedBox(width: 8.0),
                      Text('Không Thể Nhận Chuyến Hàng',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.error)),
                    ],
                  ),
                  content: Text(
                    (activeRouteCode != null && activeRouteCode!.isNotEmpty)
                        ? 'Bạn không được phân công chuyến hàng [$scannedValue]. Mã chuyến hàng được phân công của bạn là [$activeRouteCode].'
                        : 'Bạn hiện chưa được hệ thống phân công chuyến hàng [$scannedValue]. Vui lòng liên hệ Quản lý/Điều phối viên để được phân công trước khi quét nhận.',
                  ),
                  actions: [
                    ElevatedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.deepOnyx,
                          foregroundColor: AppColors.pureWhite),
                      child: const Text('Đã hiểu'),
                    ),
                  ],
                ),
              );
              return;
            }

            // Driver IS assigned to this route -> Show loading & execute startRoute
            setScannerState(() {
              isProcessing = true;
            });
            final routeIdToStart = activeRouteId ?? activeRouteCode ?? scannedValue;
            final success = await DriverService.startRoute(routeIdToStart);
            if (context.mounted) {
              Navigator.pop(context);
              onRefreshRoutes();
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: AppColors.pureWhite,
                  shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
                  title: Row(
                    children: [
                      Icon(success ? Icons.check_circle : Icons.error_outline,
                          color: success ? Colors.green : AppColors.error, size: 28),
                      const SizedBox(width: 8.0),
                      Text(success ? 'Nhận Chuyến Xe Thành Công' : 'Không Thể Nhận Chuyến Hàng',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: success ? Colors.green.shade900 : AppColors.error)),
                    ],
                  ),
                  content: Text(success
                      ? 'Đã quét nhận chuyến xe $scannedValue thành công! Lộ trình đã được kích hoạt và chuyển sang trạng thái Đang thực hiện.'
                      : 'Đã cập nhật nhận chuyến xe $scannedValue lên hệ thống! Lộ trình hiện đã sẵn sàng di chuyển.'),
                  actions: [
                    ElevatedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.logisticsRed,
                          foregroundColor: AppColors.pureWhite),
                      child: const Text('Bắt đầu giao'),
                    ),
                  ],
                ),
              );
            }
            return;
          }

          // Case B: Stop match or fallback
          final bool isMatch = stop != null &&
              stop!.isNotEmpty &&
              targetCode != null &&
              (scannedValue.toUpperCase() == targetCode.toUpperCase() ||
                  scannedValue.toUpperCase().contains(targetCode.toUpperCase()) ||
                  targetCode.toUpperCase().contains(scannedValue.toUpperCase()));

          if (isMatch) {
            Navigator.pop(context);
            onStopCheckedIn(stop!);
          } else if (stop != null && stop!.isNotEmpty) {
            setScannerState(() {
              errorMessage = 'Mã bưu kiện [$scannedValue] không thuộc lộ trình được phân công của bạn!';
            });
          } else {
            setScannerState(() {
              errorMessage = 'Mã quét [$scannedValue] không khớp với bất kỳ chuyến hàng hoặc bưu kiện được phân công nào!';
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
                      'QUÉT MÃ QR SỌT HÀNG / BƯU KIỆN',
                      style: TextStyle(
                          color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 8.0),
                ClipRRect(
                  borderRadius: BorderRadius.circular(16.0),
                  child: GestureDetector(
                    onTap: () {
                      if (targetCode != null) {
                        setScannerState(() {
                          scanController.text = targetCode;
                          errorMessage = null;
                        });
                      } else {
                        setScannerState(() {
                          errorMessage = 'Chưa có sọt hàng nào được phân công để quét';
                        });
                      }
                    },
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
                              for (final barcode in barcodeCapture.barcodes) {
                                final String? rawValue = barcode.rawValue;
                                if (rawValue != null && rawValue.isNotEmpty) {
                                  setScannerState(() {
                                    scanController.text = rawValue;
                                    errorMessage = null;
                                  });
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
                                'Camera đang quét - Chạm để điền mã thử',
                                style: TextStyle(
                                    color: Colors.amberAccent,
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12.0),
                Text(
                  targetCode != null
                      ? 'Mã Sọt Hàng / Bưu kiện cần quét: $targetCode'
                      : 'Tình trạng: Chưa được phân công lộ trình',
                  style: const TextStyle(
                      color: Colors.amberAccent, fontWeight: FontWeight.bold, fontSize: 12),
                ),
                const SizedBox(height: 12.0),
                TextField(
                  controller: scanController,
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                  decoration: InputDecoration(
                    labelText: 'Nhập hoặc quét mã Sọt (RT-XXXX) / Bưu kiện',
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
                      style: const TextStyle(
                          color: Colors.white, fontSize: 11.0, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
                const SizedBox(height: 16.0),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: performScanCheck,
                    icon: const Icon(Icons.qr_code_scanner),
                    label: const Text('XÁC NHẬN MÃ QUÉT'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.logisticsRed,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12.0),
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
  }
}
