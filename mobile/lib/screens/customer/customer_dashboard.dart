import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import 'tabs/orders_tab.dart';
import 'tabs/create_order_tab.dart';
import 'tabs/tracking_tab.dart';
import 'tabs/profile_tab.dart';

class CustomerDashboard extends StatefulWidget {
  const CustomerDashboard({super.key});

  @override
  State<CustomerDashboard> createState() => _CustomerDashboardState();
}

class _CustomerDashboardState extends State<CustomerDashboard> {
  int _selectedIndex = 0;

  late final List<Widget> _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = [
      OrdersTab(
        onCreateOrder: () {
          setState(() {
            _selectedIndex = 2;
          });
        },
        onTrackOrder: () {
          setState(() {
            _selectedIndex = 1;
          });
        },
      ),
      const TrackingTab(),
      CreateOrderTab(
        onOrderCreated: () {
          setState(() {
            _selectedIndex = 0;
          });
        },
      ),
      const ProfileTab(),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cloudGray,
      appBar: AppBar(
        backgroundColor: AppColors.pureWhite,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.menu, color: AppColors.logisticsRed),
          onPressed: () {
            // Drawer action simulated
          },
        ),
        titleSpacing: 0.0,
        title: Text(
          'Velocity Logistics',
          style: AppTypography.headlineMd.copyWith(
            color: AppColors.logisticsRed,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: AppColors.secondary),
            onPressed: () {
              setState(() {
                _selectedIndex = 1; // go to tracking tab
              });
            },
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16.0, left: 8.0),
            child: Container(
              width: 36.0,
              height: 36.0,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.surfaceContainerHighest, width: 2.0),
                image: const DecorationImage(
                  image: NetworkImage(
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuC0KE2aC6gMgoaWiUCGLSnpT8QCDR9fMkARgVMjkb6waKq3gACq6AuV5aJcIkpRFaJkfRMK0E4hpG9Qquhmrl4xJdDYYwgh9HwGGwZhqoVn8K2ioR6AUDS46Zi33tEKXQl4I2SdlZ-iXsd1XfICMrhssGoheS66LCLN-0ChfH94_Mp5RAw3kdG07TWvtxndkmLCq-nIsVmusZ4e460JCZ58OVZ32uT3EThuqSozlnmzXxwM3w12EUWegw',
                  ),
                  fit: BoxFit.cover,
                ),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: IndexedStack(
          index: _selectedIndex,
          children: _tabs,
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.pureWhite,
          border: const Border(
            top: BorderSide(color: AppColors.surfaceContainerHighest, width: 1.0),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10.0,
              offset: const Offset(0, -4),
            )
          ],
        ),
        padding: const EdgeInsets.symmetric(vertical: 12.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildNavItem(0, Icons.dashboard, 'Đơn hàng'),
            _buildNavItem(1, Icons.local_shipping, 'Theo dõi'),
            _buildNavItem(2, Icons.add_circle, 'Tạo đơn'),
            _buildNavItem(3, Icons.person, 'Cá nhân'),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isSelected = _selectedIndex == index;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedIndex = index;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primaryContainer.withValues(alpha: 0.1)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(24.0),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected ? AppColors.logisticsRed : AppColors.secondary,
              size: 24.0,
            ),
            const SizedBox(height: 4.0),
            Text(
              label,
              style: AppTypography.labelMd.copyWith(
                color: isSelected ? AppColors.logisticsRed : AppColors.secondary,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                fontSize: 12.0,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

