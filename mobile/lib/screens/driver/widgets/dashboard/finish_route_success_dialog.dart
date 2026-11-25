import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_styles.dart';

class FinishRouteSuccessDialog extends StatelessWidget {
  final bool success;
  final VoidCallback onConfirm;

  const FinishRouteSuccessDialog({
    super.key,
    required this.success,
    required this.onConfirm,
  });

  static Future<void> show(
    BuildContext context, {
    required bool success,
    required VoidCallback onConfirm,
  }) {
    return showDialog(
      context: context,
      builder: (ctx) => FinishRouteSuccessDialog(
        success: success,
        onConfirm: onConfirm,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppColors.pureWhite,
      shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
      title: const Row(
        children: [
          Icon(Icons.stars, color: Color(0xFF166534), size: 28),
          SizedBox(width: 8.0),
          Text(
            'Chốt Thành Công!',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF166534)),
          ),
        ],
      ),
      content: Text(
        success
            ? 'Bạn đã chốt hoàn thành 100% chuyến đi trên hệ thống! Tài xế chuyển sang Sẵn sàng nhận chuyến tiếp theo.'
            : 'Đã gửi yêu cầu chốt chuyến đi thành công đến máy chủ.',
      ),
      actions: [
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            onConfirm();
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF166534),
            foregroundColor: AppColors.pureWhite,
          ),
          child: const Text('Đồng ý'),
        ),
      ],
    );
  }
}
