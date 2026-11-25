import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_styles.dart';

class RouteScanReminderDialog extends StatelessWidget {
  final VoidCallback onScanNow;

  const RouteScanReminderDialog({
    super.key,
    required this.onScanNow,
  });

  static Future<void> show(
    BuildContext context, {
    required VoidCallback onScanNow,
  }) {
    return showDialog(
      context: context,
      builder: (ctx) => RouteScanReminderDialog(onScanNow: onScanNow),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppColors.pureWhite,
      shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
      title: const Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: Color(0xFFD97706), size: 28),
          SizedBox(width: 8),
          Text(
            'Chưa Quét Nhận Chuyến Xe',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFFB45309)),
          ),
        ],
      ),
      content: const Text(
        'Tài xế chưa quét nhận chuyến xe tại bưu cục. Vui lòng quét mã QR Thùng hàng / Chuyến xe để nhận chuyến trước khi bật Dẫn đường!',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Để sau', style: TextStyle(color: AppColors.secondary)),
        ),
        ElevatedButton.icon(
          onPressed: () {
            Navigator.pop(context);
            onScanNow();
          },
          icon: const Icon(Icons.qr_code_scanner, size: 18),
          label: const Text('QUÉT NHẬN NGAY', style: TextStyle(fontWeight: FontWeight.bold)),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFD97706),
            foregroundColor: Colors.white,
          ),
        ),
      ],
    );
  }
}
