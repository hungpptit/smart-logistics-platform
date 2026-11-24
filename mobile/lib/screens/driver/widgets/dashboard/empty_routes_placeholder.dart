import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_styles.dart';

class EmptyRoutesPlaceholder extends StatelessWidget {
  const EmptyRoutesPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 32.0, horizontal: 20.0),
      margin: const EdgeInsets.only(bottom: 20.0),
      decoration: BoxDecoration(
        color: AppColors.pureWhite,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: AppStyles.ambientShadow,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(16.0),
            decoration: const BoxDecoration(
              color: Color(0xFFF1F5F9),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.assignment_outlined, size: 36, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 14),
          const Text(
            'Chưa Có Chuyến Xe Nào',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppColors.deepOnyx,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Hiện tại bạn chưa có chuyến xe nào được điều phối. Hãy duy trì trạng thái Trực tuyến để sẵn sàng nhận chuyến mới từ Bưu cục!',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: AppColors.secondary, height: 1.4),
          ),
        ],
      ),
    );
  }
}
