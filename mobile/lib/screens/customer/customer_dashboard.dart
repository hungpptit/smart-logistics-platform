import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';

class CustomerDashboard extends StatelessWidget {
  const CustomerDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cloudGray,
      appBar: AppBar(
        backgroundColor: AppColors.pureWhite,
        elevation: 0.5,
        title: Text(
          'Cổng Khách Hàng',
          style: AppTypography.headlineMd.copyWith(color: AppColors.deepOnyx),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.deepOnyx),
            onPressed: () {
              Navigator.pushReplacementNamed(context, '/');
            },
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.shopping_bag_outlined, size: 80.0, color: AppColors.logisticsRed),
              const SizedBox(height: 16.0),
              Text(
                'Velocity Customer Portal',
                style: AppTypography.headlineLgMobile.copyWith(color: AppColors.deepOnyx),
              ),
              const SizedBox(height: 8.0),
              Text(
                'Màn hình Dashboard của Khách hàng đang được phát triển.',
                style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
