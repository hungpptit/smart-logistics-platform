import 'package:flutter/material.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';

class DriverDrawer extends StatelessWidget {
  final String name;
  final String email;
  final VoidCallback onOpenChat;
  final VoidCallback onLogout;

  const DriverDrawer({
    super.key,
    required this.name,
    required this.email,
    required this.onOpenChat,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: AppColors.pureWhite,
      child: Column(
        children: [
          UserAccountsDrawerHeader(
            decoration: const BoxDecoration(color: AppColors.deepOnyx),
            currentAccountPicture: const CircleAvatar(
              backgroundImage: NetworkImage(AppConstants.drawerHeaderAvatarUrl),
            ),
            accountName: Text(
              name,
              style: AppTypography.labelLg.copyWith(
                color: AppColors.pureWhite,
                fontWeight: FontWeight.bold,
              ),
            ),
            accountEmail: Text(
              email,
              style: AppTypography.labelMd.copyWith(color: Colors.white70),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.home, color: AppColors.logisticsRed),
            title: const Text('Trang chủ'),
            onTap: () => Navigator.pop(context),
          ),
          ListTile(
            leading: const Icon(Icons.inventory_2, color: AppColors.secondary),
            title: const Text('Đơn hàng đang giao'),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.smart_toy_rounded, color: AppColors.logisticsRed),
            title: const Text('Trợ lý Tài xế AI'),
            onTap: onOpenChat,
          ),
          ListTile(
            leading: const Icon(Icons.history, color: AppColors.secondary),
            title: const Text('Lịch sử lộ trình'),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.query_stats, color: AppColors.secondary),
            title: const Text('Hiệu suất'),
            onTap: () {},
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.settings, color: AppColors.secondary),
            title: const Text('Cài đặt'),
            onTap: () {},
          ),
          const Spacer(),
          ListTile(
            leading: const Icon(Icons.logout, color: AppColors.error),
            title: const Text('Đăng xuất'),
            onTap: onLogout,
          ),
          const SizedBox(height: 20.0),
        ],
      ),
    );
  }
}
