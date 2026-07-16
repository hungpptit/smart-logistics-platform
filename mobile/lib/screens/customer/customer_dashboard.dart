import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import 'tabs/home_tab.dart';
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
  int _selectedOrderType = 0;
  int _orderTypeKey = 0;
  int _ordersRefreshKey = 0;
  int _trackingRefreshKey = 0;

  List<Widget> get _tabs => [
        HomeTab(
          onNavigate: (index, {orderType}) {
            setState(() {
              _selectedIndex = index;
              if (orderType != null) {
                _selectedOrderType = orderType;
                _orderTypeKey = DateTime.now().millisecondsSinceEpoch;
              }
              if (index == 1) {
                _ordersRefreshKey = DateTime.now().millisecondsSinceEpoch;
              } else if (index == 2) {
                _trackingRefreshKey = DateTime.now().millisecondsSinceEpoch;
              }
            });
          },
        ),
        OrdersTab(
          key: ValueKey(_ordersRefreshKey),
          onCreateOrder: () {
            setState(() {
              _selectedOrderType = 0;
              _orderTypeKey = DateTime.now().millisecondsSinceEpoch;
              _selectedIndex = 3; // Switch to CreateOrderTab
            });
          },
          onTrackOrder: () {
            setState(() {
              _selectedIndex = 2; // Switch to TrackingTab
            });
          },
        ),
        TrackingTab(
          key: ValueKey(_trackingRefreshKey),
        ),
        CreateOrderTab(
          key: ValueKey(_orderTypeKey),
          initialOrderType: _selectedOrderType,
          onOrderCreated: () {
            setState(() {
              _ordersRefreshKey = DateTime.now().millisecondsSinceEpoch;
              _selectedIndex = 1; // Switch to OrdersTab
            });
          },
        ),
        const ProfileTab(),
      ];

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
            _buildNavItem(0, Icons.home_outlined, 'Trang chủ'),
            _buildNavItem(1, Icons.dashboard_outlined, 'Đơn hàng'),
            _buildNavItem(2, Icons.local_shipping_outlined, 'Theo dõi'),
            _buildNavItem(3, Icons.add_circle_outline, 'Tạo đơn'),
            _buildNavItem(4, Icons.person_outline, 'Cá nhân'),
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
          if (index == 1) {
            _ordersRefreshKey = DateTime.now().millisecondsSinceEpoch;
          } else if (index == 2) {
            _trackingRefreshKey = DateTime.now().millisecondsSinceEpoch;
          }
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
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
                fontSize: 11.0,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
