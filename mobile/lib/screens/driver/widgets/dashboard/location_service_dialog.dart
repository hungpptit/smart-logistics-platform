import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../../../core/theme/app_colors.dart';

class LocationServiceDialog extends StatelessWidget {
  final VoidCallback onRetryInit;

  const LocationServiceDialog({
    super.key,
    required this.onRetryInit,
  });

  static Future<void> show(
    BuildContext context, {
    required VoidCallback onRetryInit,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => LocationServiceDialog(onRetryInit: onRetryInit),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.location_off, color: AppColors.logisticsRed),
          SizedBox(width: 8),
          Text('Chưa bật định vị'),
        ],
      ),
      content: const Text(
        'Dịch vụ định vị GPS trên thiết bị của bạn đang tắt. Vui lòng bật định vị để ứng dụng có thể hiển thị bản đồ và dẫn đường chính xác.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Hủy', style: TextStyle(color: AppColors.secondary)),
        ),
        ElevatedButton(
          onPressed: () async {
            Navigator.of(context).pop();
            await Geolocator.openLocationSettings();
            Future.delayed(const Duration(seconds: 2), onRetryInit);
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.deepOnyx,
            foregroundColor: AppColors.pureWhite,
          ),
          child: const Text('Mở Cài đặt'),
        ),
      ],
    );
  }
}
