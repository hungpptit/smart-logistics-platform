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
  final void Function(String? newRouteCode) onRouteCodeUpdated;
  final VoidCallback onRefreshRoutes;
  final void Function(Map<String, dynamic>) onStopCheckedIn;

  const QrScannerDialog({
    super.key,
    this.stop,
    required this.activeRouteCode,
    required this.activeRouteId,
    required this.onRouteCodeUpdated,
    required this.onRefreshRoutes,
    required this.onStopCheckedIn,
  });

  static void show(
    BuildContext context, {
    Map<String, dynamic>? stop,
    String? activeRouteCode,
    String? activeRouteId,
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
        Future<void> performScanCheck() async {
          final scannedValue = scanController.text.trim();
          if (scannedValue.isEmpty) {
            setScannerState(() {
              errorMessage = 'Vui long dua camera quet ma QR / nhap ma';
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
                        Text(isOk ? 'Nap Sot Xe Tai Thanh Cong' : 'That Bai',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ],
                    ),
                    content: Text(isOk
                        ? 'Da tiep nhan Sot [$scannedValue] len xe tai (${result['shipmentCode'] ?? ''}). Toan bo ${result['packageCount'] ?? 1} buu kien da chuyen sang Dang trung chuyen (IN_TRANSIT).'
                        : 'Khong the nap sot $scannedValue len xe tai.'),
                    actions: [
                      ElevatedButton(
                        onPressed: () => Navigator.pop(ctx),
                        style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.logisticsRed,
                            foregroundColor: AppColors.pureWhite),
                        child: const Text('Dong'),
                      ),
                    ],
                  );
                },
              );
            }
            return;
          }

          // Case A: Scanned Tote Code (RT-XXXX) or matching route ID
          if (scannedValue.toUpperCase().startsWith('RT-') ||
              (scannedValue == activeRouteCode && activeRouteCode != null) ||
              (scannedValue == activeRouteId && activeRouteId != null)) {
            Navigator.pop(context);
            final routeIdToStart = activeRouteId ?? activeRouteCode ?? scannedValue;
            final success = await DriverService.startRoute(routeIdToStart);
            if (context.mounted) {
              onRefreshRoutes();
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: AppColors.pureWhite,
                  shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
                  title: const Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.green, size: 28),
                      SizedBox(width: 8.0),
                      Text('Nhan Sot Hang Thanh Cong',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ],
                  ),
                  content: Text(success
                      ? 'Da nhan sot $scannedValue tu buu cuc. Toan bo don hang trong sot da chuyen sang Dang di giao (OUT_FOR_DELIVERY).'
                      : 'Da xac nhan sot $scannedValue thanh cong tren he thong.'),
                  actions: [
                    ElevatedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.logisticsRed,
                          foregroundColor: AppColors.pureWhite),
                      child: const Text('Bat dau giao'),
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

          if (isMatch || (stop != null && stop!.isNotEmpty)) {
            Navigator.pop(context);
            if (stop != null && stop!.isNotEmpty) {
              onStopCheckedIn(stop!);
            }
          } else {
            setScannerState(() {
              errorMessage = 'Ma quet khong khop voi sot hang hoac buu kien hien tai';
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
                      'QUET MA QR SOT HANG / BUU KIEN',
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
                          errorMessage = 'Chua co sot hang nao duoc phan cong de quet';
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
                                'Camera dang quet - Cham de dien ma thu',
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
                      ? 'Ma Sot Hang / Buu kien can quet: $targetCode'
                      : 'Tinh trang: Chua duoc phan cong lo trinh',
                  style: const TextStyle(
                      color: Colors.amberAccent, fontWeight: FontWeight.bold, fontSize: 12),
                ),
                const SizedBox(height: 12.0),
                TextField(
                  controller: scanController,
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                  decoration: InputDecoration(
                    labelText: 'Nhap hoac quet ma Sot (RT-XXXX) / Buu kien',
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
                    label: const Text('XAC NHAN MA QUET'),
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
