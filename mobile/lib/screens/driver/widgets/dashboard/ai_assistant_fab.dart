import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class AiAssistantFab extends StatelessWidget {
  final VoidCallback onPressed;

  const AiAssistantFab({
    super.key,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton(
      onPressed: onPressed,
      backgroundColor: AppColors.logisticsRed,
      elevation: 4.0,
      tooltip: 'Trợ lý Tài xế AI',
      child: const Icon(Icons.smart_toy_rounded, color: Colors.white, size: 26.0),
    );
  }
}
