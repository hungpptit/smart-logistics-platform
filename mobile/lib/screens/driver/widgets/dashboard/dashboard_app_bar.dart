import 'package:flutter/material.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';

class DashboardAppBar extends StatelessWidget implements PreferredSizeWidget {
  const DashboardAppBar({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.pureWhite,
      elevation: 0.5,
      title: Text(
        'Velocity Logistics',
        style: AppTypography.headlineMd.copyWith(color: AppColors.logisticsRed, fontWeight: FontWeight.bold),
      ),
      actions: [
        IconButton(icon: const Icon(Icons.notifications_none, color: AppColors.deepOnyx), onPressed: () {}),
        Padding(
          padding: const EdgeInsets.only(right: 16.0, left: 4.0),
          child: CircleAvatar(
            radius: 18.0,
            backgroundImage: const NetworkImage(AppConstants.defaultAvatarUrl),
            backgroundColor: AppColors.surfaceContainerHighest,
          ),
        ),
      ],
    );
  }
}
