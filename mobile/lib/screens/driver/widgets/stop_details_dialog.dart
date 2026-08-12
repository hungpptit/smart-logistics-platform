import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';
import 'report_failure_dialog.dart';
import 'shipment_qr_modal.dart';

class StopDetailsDialog extends StatelessWidget {
  final Map<String, dynamic> stop;
  final String Function(num) formatCurrency;
  final Future<void> Function(Map<String, dynamic> stop, VoidCallback onCaptured) onCapturePhoto;
  final Future<void> Function(Map<String, dynamic> stop) onCompleteStop;
  final VoidCallback onShowQRScanner;
  final VoidCallback onFailureConfirmed;
  final VoidCallback? onShowShipmentQR;

  const StopDetailsDialog({
    super.key,
    required this.stop,
    required this.formatCurrency,
    required this.onCapturePhoto,
    required this.onCompleteStop,
    required this.onShowQRScanner,
    required this.onFailureConfirmed,
    this.onShowShipmentQR,
  });

  static void show(
    BuildContext context, {
    required Map<String, dynamic> stop,
    required String Function(num) formatCurrency,
    required Future<void> Function(Map<String, dynamic>, VoidCallback) onCapturePhoto,
    required Future<void> Function(Map<String, dynamic>) onCompleteStop,
    required VoidCallback onShowQRScanner,
    required VoidCallback onFailureConfirmed,
    VoidCallback? onShowShipmentQR,
  }) {
    showDialog(
      context: context,
      builder: (context) => StopDetailsDialog(
        stop: stop,
        formatCurrency: formatCurrency,
        onCapturePhoto: onCapturePhoto,
        onCompleteStop: onCompleteStop,
        onShowQRScanner: onShowQRScanner,
        onFailureConfirmed: onFailureConfirmed,
        onShowShipmentQR: onShowShipmentQR,
      ),
    );
  }

  bool get _isPickupStop =>
      stop['isPickup'] == true ||
      stop['stopType'] == 'PICKUP' ||
      stop['title']?.toString().toLowerCase().contains('lay hang') == true ||
      stop['title']?.toString().toLowerCase().contains('xuat sot') == true ||
      stop['status'] == 'PICKING' ||
      stop['status'] == 'READY_FOR_PICKUP' ||
      stop['status'] == 'PICKUP_ASSIGNED';

  bool get _isLinehaul =>
      stop['isLinehaul'] == true ||
      (stop['orderCode']?.toString().startsWith('SHP-') ?? false) ||
      (stop['orderCode']?.toString().startsWith('RT-LH-') ?? false) ||
      stop['title']?.toString().toLowerCase().contains('sot') == true ||
      stop['title']?.toString().toLowerCase().contains('trung chuyen') == true;

  @override
  Widget build(BuildContext context) {
    return StatefulBuilder(
      builder: (context, setDialogState) {
        final bool isLinehaul = _isLinehaul;
        final bool isCheckedIn = stop['isCheckedIn'] == true || isLinehaul;
        final bool hasPhoto = stop['photo'] != null;
        final bool canComplete = isLinehaul ? true : (isCheckedIn && hasPhoto);
        final bool isPickupStop = _isPickupStop;

        return Dialog(
          backgroundColor: AppColors.pureWhite,
          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          stop['title'] as String,
                          style: AppTypography.headlineLgMobile.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppColors.deepOnyx,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: AppColors.secondary),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  Text(
                    stop['address'] as String,
                    style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
                  ),
                  const SizedBox(height: 12.0),
                  // Package / Shipment Identification Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12.0),
                    decoration: BoxDecoration(
                      color: AppColors.cloudGray,
                      borderRadius: BorderRadius.circular(10.0),
                      border: Border.all(color: AppColors.surfaceContainerHighest),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              isLinehaul ? 'MA CHUYEN XE TAI:' : 'MA BUU KIEN:',
                              style: const TextStyle(
                                  fontSize: 11.0,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.secondary),
                            ),
                            const SizedBox(width: 4.0),
                            Flexible(
                              child: Text(
                                stop['orderCode'] ?? 'SHP-LH-0001',
                                style: const TextStyle(
                                  fontSize: 12.0,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.logisticsRed,
                                  fontFamily: 'monospace',
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8.0),
                        Center(
                          child: Image.network(
                            'https://bwipjs-api.metafloor.com/?bcid=code128&text=${stop['orderCode'] ?? 'SHP-LH-0001'}&scale=2&height=10',
                            height: 40.0,
                            fit: BoxFit.contain,
                            errorBuilder: (context, error, stackTrace) => Text(
                              '|||||||||||||||||||||||||\n${stop['orderCode'] ?? 'SHP-LH-0001'}',
                              style: const TextStyle(
                                  fontFamily: 'monospace',
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8.0),
                        Text(
                          '${stop['receiverName'] ?? 'Buu cuc xu ly'}',
                          style: const TextStyle(
                              fontSize: 11.0,
                              fontWeight: FontWeight.w600,
                              color: AppColors.deepOnyx),
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 8.0),
                        // Linehaul Transfer Mode OR Customer Collection info
                        if (isLinehaul) ...[
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12.0),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(8.0),
                              border: Border.all(color: const Color(0xFF93C5FD)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.local_shipping, color: Color(0xFF1D4ED8), size: 18),
                                    SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        'VAN CHUYEN TRUNG CHUYEN BUU CUC',
                                        style: TextStyle(
                                          fontSize: 11.0,
                                          fontWeight: FontWeight.w900,
                                          color: Color(0xFF1E40AF),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6.0),
                                Text(
                                  isPickupStop
                                      ? '• Da xuat kho & tiep nhan toan bo sot hang len xe tai.\n• Giao dich van chuyen noi bo he thong (Khong thu tien mat).'
                                      : '• Trinh ma QR Chuyen xe cho Nhan vien Buu cuc dich quet nhap kho.\n• Giao dich van chuyen noi bo he thong (Khong thu tien mat).',
                                  style: const TextStyle(
                                    fontSize: 10.5,
                                    color: Color(0xFF1E3A8A),
                                    height: 1.4,
                                  ),
                                ),
                                const SizedBox(height: 10.0),
                                ElevatedButton.icon(
                                  onPressed: () {
                                    Navigator.pop(context);
                                    if (onShowShipmentQR != null) {
                                      onShowShipmentQR!();
                                    } else {
                                      ShipmentQrModal.show(context, activeRouteCode: stop['orderCode']?.toString(), activeRouteId: stop['shipmentId']?.toString());
                                    }
                                  },
                                  icon: const Icon(Icons.qr_code_2, size: 18),
                                  label: const Text('HIEN MA QR CHUYEN XE CHO BUU CUC', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF1D4ED8),
                                    foregroundColor: Colors.white,
                                    minimumSize: const Size(double.infinity, 38),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ] else ...[
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(10.0),
                            decoration: BoxDecoration(
                              color: (stop['totalToCollect'] as num? ?? 0) > 0
                                  ? const Color(0xFFDCFCE7)
                                  : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(8.0),
                              border: Border.all(
                                color: (stop['totalToCollect'] as num? ?? 0) > 0
                                    ? const Color(0xFF166534)
                                    : const Color(0xFF94A3B8),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        (stop['totalToCollect'] as num? ?? 0) > 0
                                            ? (isPickupStop
                                                ? 'CAN THU NGUOI GUI:'
                                                : 'TONG CAN THU NGUOI NHAN:')
                                            : (isPickupStop
                                                ? 'KHONG THU TIEN NGUOI GUI'
                                                : 'KHONG THU TIEN NGUOI NHAN'),
                                        style: TextStyle(
                                          fontSize: 11.0,
                                          fontWeight: FontWeight.w800,
                                          color: (stop['totalToCollect'] as num? ?? 0) > 0
                                              ? const Color(0xFF166534)
                                              : const Color(0xFF475569),
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    if ((stop['totalToCollect'] as num? ?? 0) > 0) ...[
                                      const SizedBox(width: 8.0),
                                      Text(
                                        formatCurrency((stop['totalToCollect'] as num? ?? 0)),
                                        style: const TextStyle(
                                          fontSize: 13.0,
                                          fontWeight: FontWeight.w900,
                                          color: Color(0xFF15803D),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                const SizedBox(height: 4.0),
                                Text(
                                  isPickupStop
                                      ? ((stop['totalToCollect'] as num? ?? 0) > 0
                                          ? '- Cuoc gui hang: ${formatCurrency((stop['shippingFee'] as num? ?? (stop['totalToCollect'] as num? ?? 0)))}\n- Tien COD: ${formatCurrency((stop['codAmount'] as num? ?? 0))} (Se thu tu Nguoi Nhan khi giao)'
                                          : '- Nguoi gui da tra cuoc truoc.\n- Tien COD: ${formatCurrency((stop['codAmount'] as num? ?? 0))} (Se thu tu Nguoi Nhan khi giao)')
                                      : ((stop['isReceiverPayFee'] == true)
                                          ? '- Tien COD thu ho: ${formatCurrency((stop['codAmount'] as num? ?? 0))}\n- Cuoc ship (Nguoi nhan tra): ${formatCurrency((stop['shippingFee'] as num? ?? 0))}'
                                          : '- Tien COD thu ho: ${formatCurrency((stop['codAmount'] as num? ?? 0))}\n- Cuoc ship: 0d (Nguoi gui da tra cuoc)'),
                                  style: TextStyle(
                                    fontSize: 10.0,
                                    color: (stop['totalToCollect'] as num? ?? 0) > 0
                                        ? const Color(0xFF166534)
                                        : const Color(0xFF475569),
                                    height: 1.3,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16.0),
                  // Step 1: QR Check-in / QR Presentation
                  Row(
                    children: [
                      Icon(
                        isCheckedIn ? Icons.check_circle : Icons.radio_button_unchecked,
                        color: isCheckedIn ? Colors.green : AppColors.secondary,
                      ),
                      const SizedBox(width: 12.0),
                      Expanded(
                        child: Text(
                          isLinehaul
                              ? (isPickupStop
                                  ? '1. Da boc sot len xe & xuat buu cuc'
                                  : '1. Trinh ma QR Chuyen xe cho Buu cuc dich')
                              : (isPickupStop
                                  ? '1. Quet QR / Barcode Ma Don Nguoi Gui'
                                  : '1. Quet QR Check-in'),
                          style: TextStyle(
                            fontWeight: isCheckedIn ? FontWeight.bold : FontWeight.normal,
                            color: isCheckedIn ? AppColors.deepOnyx : AppColors.secondary,
                          ),
                        ),
                      ),
                      if (!isCheckedIn && !isLinehaul)
                        ElevatedButton(
                          onPressed: () {
                            Navigator.pop(context);
                            onShowQRScanner();
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.logisticsRed,
                            foregroundColor: AppColors.pureWhite,
                          ),
                          child: const Text('Quet QR'),
                        ),
                    ],
                  ),
                  const Divider(height: 24.0),
                  // Step 2: Take Photo
                  Row(
                    children: [
                      Icon(
                        hasPhoto ? Icons.check_circle : Icons.radio_button_unchecked,
                        color: hasPhoto ? Colors.green : AppColors.secondary,
                      ),
                      const SizedBox(width: 12.0),
                      Expanded(
                        child: Text(
                          isLinehaul
                              ? (isPickupStop
                                  ? '2. Chup anh xe tai / niem phong (Tuy chon)'
                                  : '2. Chup anh ban giao tai kho dich (Tuy chon)')
                              : (isPickupStop
                                  ? '2. Chup hinh buu kien da nhan tai Shop'
                                  : '2. Chup hinh bang chung giao nhan'),
                          style: TextStyle(
                            fontWeight: hasPhoto ? FontWeight.bold : FontWeight.normal,
                            color: hasPhoto ? AppColors.deepOnyx : AppColors.secondary,
                          ),
                        ),
                      ),
                      if (isCheckedIn && !hasPhoto)
                        ElevatedButton(
                          onPressed: () {
                            onCapturePhoto(stop, () {
                              setDialogState(() {});
                            });
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.deepOnyx,
                            foregroundColor: AppColors.pureWhite,
                          ),
                          child: const Text('Chup anh'),
                        ),
                    ],
                  ),
                  if (hasPhoto) ...[
                    const SizedBox(height: 8.0),
                    Container(
                      width: double.infinity,
                      height: 100.0,
                      decoration: BoxDecoration(
                        color: AppColors.cloudGray,
                        borderRadius: BorderRadius.circular(8.0),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Image.network(
                        'https://picsum.photos/id/10/400/200',
                        fit: BoxFit.cover,
                      ),
                    ),
                  ],
                  const SizedBox(height: 24.0),
                  // Action buttons
                  Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: SizedBox(
                          height: 52.0,
                          child: ElevatedButton(
                            onPressed: canComplete
                                ? () {
                                    Navigator.pop(context);
                                    onCompleteStop(stop);
                                  }
                                : null,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.logisticsRed,
                              foregroundColor: AppColors.pureWhite,
                            ),
                            child: Text(
                              isLinehaul
                                  ? (isPickupStop ? 'XAC NHAN DA XUAT BUU CUC' : 'XAC NHAN DA TOI BUU CUC DICH')
                                  : (isPickupStop ? 'XAC NHAN DA LAY HANG' : 'HOAN THANH GIAO HANG'),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8.0),
                      Expanded(
                        flex: 2,
                        child: SizedBox(
                          height: 52.0,
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Navigator.pop(context);
                              ReportFailureDialog.show(
                                context,
                                stop: stop,
                                onConfirmed: onFailureConfirmed,
                              );
                            },
                            icon: const Icon(Icons.warning_amber_rounded,
                                size: 16, color: AppColors.error),
                            label: const Text('Bao Loi',
                                style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.error,
                                    fontSize: 12)),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppColors.error, width: 1.5),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
