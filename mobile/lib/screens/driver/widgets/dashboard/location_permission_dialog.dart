import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../../../core/theme/app_colors.dart';

class LocationPermissionDialog extends StatelessWidget {
  final bool permanent;
  final VoidCallback onRetryInit;

  const LocationPermissionDialog({
    super.key,
    required this.permanent,
    required this.onRetryInit,
  });

  static Future<void> show(
    BuildContext context, {
    required bool permanent,
    required VoidCallback onRetryInit,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => LocationPermissionDialog(
        permanent: permanent,
        onRetryInit: onRetryInit,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          Icon(Icons.security, color: permanent ? AppColors.logisticsRed : AppColors.secondary),
          const SizedBox(width: 8),
          const Text('Quyền định vị'),
        ],
      ),
      content: Text(
        permanent
            ? 'Bạn đã từ chối vĩnh viễn quyền định vị. Vui lòng mở Cài đặt ứng dụng để cấp quyền thủ công.'
            : 'Ứng dụng cần quyền định vị để hiển thị vị trí của bạn trên bản đồ.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Hủy', style: TextStyle(color: AppColors.secondary)),
        ),
        ElevatedButton(
          onPressed: () async {
            Navigator.of(context).pop();
            if (permanent) {
              await Geolocator.openAppSettings();
            } else {
              onRetryInit();
            }
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.deepOnyx,
            foregroundColor: AppColors.pureWhite,
          ),
          child: Text(permanent ? 'Mở Cài đặt' : 'Cấp quyền'),
        ),
      ],
    );
  }
}
