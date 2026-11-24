import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class ChatAppBarTitle extends StatelessWidget {
  final bool isClosed;
  final bool isAITyping;

  const ChatAppBarTitle({
    super.key,
    required this.isClosed,
    required this.isAITyping,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 38.0,
          height: 38.0,
          decoration: BoxDecoration(
            color: AppColors.logisticsRed.withValues(alpha: 0.1),
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.logisticsRed.withValues(alpha: 0.2)),
          ),
          child: const Icon(Icons.smart_toy_rounded, color: AppColors.logisticsRed, size: 22.0),
        ),
        const SizedBox(width: 10.0),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Trợ lý Điều phối AI',
              style: TextStyle(
                fontSize: 15.0,
                fontWeight: FontWeight.w700,
                color: AppColors.deepOnyx,
              ),
            ),
            Row(
              children: [
                Container(
                  width: 7.0,
                  height: 7.0,
                  decoration: BoxDecoration(
                    color: isClosed ? Colors.grey : const Color(0xFF10B981),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 4.0),
                Text(
                  isClosed ? 'Phiên đã đóng' : (isAITyping ? 'Đang trả lời...' : 'Sẵn sàng hỗ trợ'),
                  style: TextStyle(
                    fontSize: 11.5,
                    color: isClosed ? Colors.grey : const Color(0xFF059669),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }
}
