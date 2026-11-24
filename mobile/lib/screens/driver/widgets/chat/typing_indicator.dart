import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class TypingIndicator extends StatelessWidget {
  const TypingIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 2.0, right: 8.0),
            width: 32.0,
            height: 32.0,
            decoration: BoxDecoration(
              color: AppColors.logisticsRed.withValues(alpha: 0.1),
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.logisticsRed.withValues(alpha: 0.2)),
            ),
            child: const Icon(Icons.smart_toy_rounded, color: AppColors.logisticsRed, size: 18.0),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
            decoration: BoxDecoration(
              color: AppColors.pureWhite,
              borderRadius: BorderRadius.circular(16.0),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 14.0,
                  height: 14.0,
                  child: CircularProgressIndicator(strokeWidth: 2.0, color: AppColors.logisticsRed),
                ),
                SizedBox(width: 8.0),
                Text('Trợ lý AI đang xử lý...', style: TextStyle(fontSize: 12.0, color: Colors.grey)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
