import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class AiAssistantFab extends StatelessWidget {
  final VoidCallback onPressed;
  final int unreadCount;

  const AiAssistantFab({
    super.key,
    required this.onPressed,
    this.unreadCount = 0,
  });

  @override
  Widget build(BuildContext context) {
    const Widget robotIcon = Icon(Icons.smart_toy_rounded, color: Colors.white, size: 26.0);
    final Widget fabChild = unreadCount > 0
        ? Badge(
            backgroundColor: AppColors.deepOnyx,
            textColor: AppColors.pureWhite,
            offset: const Offset(6, -6),
            label: Text(
              unreadCount > 99 ? '99+' : '$unreadCount',
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w800,
              ),
            ),
            child: robotIcon,
          )
        : robotIcon;

    return FloatingActionButton(
      onPressed: onPressed,
      backgroundColor: AppColors.logisticsRed,
      elevation: 4.0,
      tooltip: 'Trợ lý Tài xế AI',
      child: fabChild,
    );
  }
}
