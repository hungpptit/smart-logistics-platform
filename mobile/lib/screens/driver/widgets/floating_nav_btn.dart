import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class FloatingNavBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;
  final Color color;

  const FloatingNavBtn({
    super.key,
    required this.icon,
    required this.onPressed,
    this.color = AppColors.deepOnyx,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 50.0,
      height: 50.0,
      decoration: BoxDecoration(
        color: AppColors.pureWhite,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.surfaceContainerHighest),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 8.0,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: IconButton(
        icon: Icon(icon, color: color, size: 24.0),
        onPressed: onPressed,
      ),
    );
  }
}
