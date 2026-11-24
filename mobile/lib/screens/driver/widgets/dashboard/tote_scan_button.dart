import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_styles.dart';

class ToteScanButton extends StatelessWidget {
  final VoidCallback onPressed;

  const ToteScanButton({
    super.key,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: const Icon(Icons.inventory_2, size: 20.0),
        label: const Text(
          'Quét Nhận Thùng Hàng Lên Xe Tải',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.logisticsRed,
          foregroundColor: AppColors.pureWhite,
          padding: const EdgeInsets.symmetric(vertical: 14.0),
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
        ),
      ),
    );
  }
}
