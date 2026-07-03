import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/theme/app_styles.dart';
import '../../services/auth_service.dart';

class DriverDashboard extends StatefulWidget {
  const DriverDashboard({super.key});

  @override
  State<DriverDashboard> createState() => _DriverDashboardState();
}

class _DriverDashboardState extends State<DriverDashboard> {
  bool _isNavigating = false;
  bool _isVoiceOn = true;
  bool _showTrafficAlert = false;
  Timer? _alertTimer;

  @override
  void dispose() {
    _alertTimer?.cancel();
    super.dispose();
  }

  void _startNavigation() {
    setState(() {
      _isNavigating = true;
      _showTrafficAlert = false;
    });

    // Simulate traffic alert popping up after 3 seconds
    _alertTimer?.cancel();
    _alertTimer = Timer(const Duration(seconds: 3), () {
      if (mounted && _isNavigating) {
        setState(() {
          _showTrafficAlert = true;
        });

        // Auto hide alert after 5 seconds
        Timer(const Duration(seconds: 5), () {
          if (mounted) {
            setState(() {
              _showTrafficAlert = false;
            });
          }
        });
      }
    });
  }

  void _stopNavigation() {
    setState(() {
      _isNavigating = false;
      _showTrafficAlert = false;
    });
    _alertTimer?.cancel();
  }

  void _showShiftSummary() {
    showDialog(
      context: context,
      builder: (context) {
        return Dialog(
          backgroundColor: AppColors.pureWhite,
          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Tóm tắt ca',
                      style: AppTypography.headlineLgMobile.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepOnyx,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: AppColors.secondary),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 16.0),
                Container(
                  padding: const EdgeInsets.all(16.0),
                  decoration: BoxDecoration(
                    color: AppColors.cloudGray,
                    borderRadius: AppStyles.roundedLg,
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.timer, color: AppColors.logisticsRed, size: 40.0),
                      const SizedBox(width: 16.0),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Thời gian hiện tại'.toUpperCase(),
                            style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                          ),
                          const SizedBox(height: 2.0),
                          Text(
                            '0giờ 42phút 12giây',
                            style: AppTypography.headlineMd.copyWith(
                              color: AppColors.deepOnyx,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16.0),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16.0),
                        decoration: BoxDecoration(
                          borderRadius: AppStyles.roundedLg,
                          border: Border.all(color: AppColors.surfaceContainerHighest),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Thành công',
                              style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                            ),
                            const SizedBox(height: 4.0),
                            Text(
                              '4',
                              style: AppTypography.headlineMd.copyWith(
                                color: Colors.green,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12.0),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16.0),
                        decoration: BoxDecoration(
                          borderRadius: AppStyles.roundedLg,
                          border: Border.all(color: AppColors.surfaceContainerHighest),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Đang chờ',
                              style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                            ),
                            const SizedBox(height: 4.0),
                            Text(
                              '14',
                              style: AppTypography.headlineMd.copyWith(
                                color: AppColors.deepOnyx,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16.0),
                Container(
                  padding: const EdgeInsets.all(16.0),
                  decoration: BoxDecoration(
                    borderRadius: AppStyles.roundedLg,
                    border: Border.all(color: AppColors.surfaceContainerHighest),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Thu nhập (Dự kiến)',
                        style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                      ),
                      const SizedBox(height: 4.0),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '\$142.50',
                            style: AppTypography.headlineLgMobile.copyWith(
                              color: AppColors.deepOnyx,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            '+\$12.00 thưởng',
                            style: AppTypography.labelLg.copyWith(
                              color: Colors.green,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24.0),
                SizedBox(
                  width: double.infinity,
                  height: 48.0,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.logisticsRed,
                      foregroundColor: AppColors.pureWhite,
                      shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                    ),
                    child: const Text('TẢI BÁO CÁO'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isNavigating) {
      return _buildNavigationScreen();
    }

    return Scaffold(
      backgroundColor: AppColors.cloudGray,
      appBar: AppBar(
        backgroundColor: AppColors.pureWhite,
        elevation: 0.5,
        title: Text(
          'Velocity Logistics',
          style: AppTypography.headlineMd.copyWith(
            color: AppColors.logisticsRed,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none, color: AppColors.deepOnyx),
            onPressed: () {},
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16.0, left: 8.0),
            child: CircleAvatar(
              radius: 18.0,
              backgroundImage: const NetworkImage(
                'https://lh3.googleusercontent.com/aida-public/AB6AXuANja3zeifum0i91jCsi1-_rLWN0_ur9Ei6pA-ZxEPasd_19VmvkBs8CuqUFMDDQ2J6ik0bKTzHOS1_5RPPn9jFMe7y8tqHuda7--IK3SCCIUD_jcGs413LNup-Rzhiui3n8lajNT-9XPixzsacUjRFf5RVBc-5zXZ8ZDut-fQk13E2KARZqDv1oYLNF9F9cascOR5F-0YAjkVDoko8Dt8j-l95YugQOZz4P33L5WNtcdPuOJeM9fIA4Q',
              ),
              backgroundColor: AppColors.surfaceContainerHighest,
            ),
          ),
        ],
      ),
      drawer: Drawer(
        backgroundColor: AppColors.pureWhite,
        child: Column(
          children: [
            UserAccountsDrawerHeader(
              decoration: const BoxDecoration(color: AppColors.deepOnyx),
              currentAccountPicture: const CircleAvatar(
                backgroundImage: NetworkImage(
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuDaWHdHbndbzOw4N3alsZ0z3J-w93wa6FWG0Q6Mp5m902BW4jN33bpQDQiqk_rVSh_ns09HEeSO5MIj_mNnycfXUi3PPny9SmTCThXKB8uEGlZkLkjxunNqeEybkNkVXHZGTkOsxME2AFgoJlCIyXyuG0qDEkDIWdCOWbmTZdRZVpZq8X8CtXnvzK1U51fq5o3kpE9CroH1dpIXGVvndc2ODZG4cZJcvFf_ruulEJBnUJopunvUx8zr7g',
                ),
              ),
              accountName: Text(
                'Logistics Pro',
                style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite, fontWeight: FontWeight.bold),
              ),
              accountEmail: Text(
                'ID: VEL-99283',
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
              onTap: () async {
                await AuthService.clearAuthData();
                if (context.mounted) {
                  Navigator.pushReplacementNamed(context, '/');
                }
              },
            ),
            const SizedBox(height: 20.0),
          ],
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(AppStyles.marginMobile),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Intro
            Text(
              'Chào buổi sáng, Tài xế 99283',
              style: AppTypography.headlineLgMobile.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.deepOnyx,
              ),
            ),
            const SizedBox(height: 4.0),
            Text(
              'Ca làm việc của bạn đã bắt đầu được 42 phút. Bạn đang theo đúng tiến độ cho 18 đơn hàng.',
              style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
            ),
            const SizedBox(height: 16.0),

            // Actions row
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _showShiftSummary,
                    icon: const Icon(Icons.summarize, size: 18.0),
                    label: const Text('Tóm tắt ca'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.deepOnyx,
                      foregroundColor: AppColors.pureWhite,
                      padding: const EdgeInsets.symmetric(vertical: 14.0),
                      shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                    ),
                  ),
                ),
                const SizedBox(width: 12.0),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      // Check-in scanner
                    },
                    icon: const Icon(Icons.qr_code_scanner, size: 18.0),
                    label: const Text('Quét Check-in'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.logisticsRed,
                      foregroundColor: AppColors.pureWhite,
                      padding: const EdgeInsets.symmetric(vertical: 14.0),
                      shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24.0),

            // Stats Bento Card
            Container(
              padding: const EdgeInsets.all(20.0),
              decoration: BoxDecoration(
                color: AppColors.pureWhite,
                borderRadius: AppStyles.roundedXl,
                border: Border.all(color: AppColors.surfaceContainer),
                boxShadow: AppStyles.ambientShadow,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Trạng thái ca',
                        style: AppTypography.labelLg.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppColors.deepOnyx,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(12.0),
                        ),
                        child: Text(
                          'HOẠT ĐỘNG',
                          style: AppTypography.labelMd.copyWith(
                            color: Colors.green.shade800,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16.0),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Hoàn thành', style: AppTypography.bodyMd.copyWith(color: AppColors.secondary)),
                      Text('4 / 18', style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 8.0),
                  LinearProgressIndicator(
                    value: 4 / 18,
                    backgroundColor: AppColors.cloudGray,
                    color: AppColors.logisticsRed,
                    minHeight: 8.0,
                    borderRadius: BorderRadius.circular(4.0),
                  ),
                  const SizedBox(height: 20.0),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12.0),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceContainerLow,
                            borderRadius: AppStyles.roundedLg,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Quãng đường',
                                style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                              ),
                              const SizedBox(height: 4.0),
                              Text(
                                '12.4 mi',
                                style: AppTypography.headlineMd.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.deepOnyx,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12.0),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12.0),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceContainerLow,
                            borderRadius: AppStyles.roundedLg,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Dừng trung bình',
                                style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                              ),
                              const SizedBox(height: 4.0),
                              Text(
                                '3.2 phút',
                                style: AppTypography.headlineMd.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.deepOnyx,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20.0),

            // Live Map Preview Card
            Container(
              height: 220.0,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: AppStyles.roundedXl,
                border: Border.all(color: AppColors.surfaceContainer),
                image: const DecorationImage(
                  image: NetworkImage(
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuDzQB6RDtlgqjcCGlIAOOsifvWn2qtgcDJCOLHUUP_mzYCFfbIlsF08vXVsPUr86ATHFNdsrNSmNudKBReySkEx26iHpd3tL46w9d-MAImLyXYJNrI8A3xIVCMA_Ibk3dxYxT4XwthKu0ccrEReST02y2VQheenWKH3gvGOy8Dj1B1Ptr969lqx7Dcn6V2lqnY1Ia0srTYBqsw083DuVycfZSGLGdmPFCzjzIchA7-PAF8Kh058CogzgQ',
                  ),
                  fit: BoxFit.cover,
                ),
              ),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: AppStyles.roundedXl,
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      AppColors.deepOnyx.withValues(alpha: 0.6),
                    ],
                  ),
                ),
                padding: const EdgeInsets.all(16.0),
                alignment: Alignment.bottomCenter,
                child: Container(
                  padding: const EdgeInsets.all(12.0),
                  decoration: BoxDecoration(
                    color: AppColors.pureWhite.withValues(alpha: 0.9),
                    borderRadius: AppStyles.roundedLg,
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 36.0,
                        height: 36.0,
                        decoration: const BoxDecoration(
                          color: AppColors.logisticsRed,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.navigation, color: AppColors.pureWhite, size: 18.0),
                      ),
                      const SizedBox(width: 12.0),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Dự kiến điểm dừng tiếp',
                              style: AppTypography.labelMd.copyWith(color: AppColors.logisticsRed, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              '14 Phút',
                              style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.bold, color: AppColors.deepOnyx),
                            ),
                          ],
                        ),
                      ),
                      ElevatedButton(
                        onPressed: _startNavigation,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.deepOnyx,
                          foregroundColor: AppColors.pureWhite,
                          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                          padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        ),
                        child: const Text('Dẫn đường'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24.0),

            // Route List
            Text(
              'Lộ trình trong ngày',
              style: AppTypography.headlineMd.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.deepOnyx,
              ),
            ),
            const SizedBox(height: 12.0),

            _buildStopCard(
              index: 5,
              title: 'Velocity Tech Hub',
              address: '452 Industrial Way, Dock 4, Austin TX',
              packages: 3,
              eta: '10:45 SA',
              distance: '0.8 mi',
              status: 'ĐANG THỰC HIỆN',
              isActive: true,
            ),
            const SizedBox(height: 12.0),
            _buildStopCard(
              index: 6,
              title: 'Northside Retail Center',
              address: '8920 Burnet Rd, Suite 110, Austin TX',
              packages: 1,
              eta: '11:15 SA',
              distance: '2.4 mi',
              status: 'TIẾP THEO',
              isActive: false,
            ),
            const SizedBox(height: 12.0),
            _buildStopCard(
              index: 7,
              title: 'Summit Residential Park',
              address: '2200 Summit Vista Pkwy, Austin TX',
              packages: 2,
              eta: '11:45 SA',
              distance: '4.1 mi',
              status: 'ĐANG CHỜ',
              isActive: false,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStopCard({
    required int index,
    required String title,
    required String address,
    required int packages,
    required String eta,
    required String distance,
    required String status,
    required bool isActive,
  }) {
    return GestureDetector(
      onTap: () {
        if (isActive) {
          _startNavigation();
        }
      },
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.pureWhite,
          borderRadius: AppStyles.roundedXl,
          border: Border.all(color: AppColors.surfaceContainer),
          boxShadow: AppStyles.ambientShadow,
        ),
        clipBehavior: Clip.antiAlias,
        child: Row(
          children: [
            // Left gradient line for active item
            Container(
              width: 4.0,
              height: 120.0,
              color: isActive ? AppColors.logisticsRed : Colors.transparent,
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Stop Number Circle
                    Column(
                      children: [
                        Container(
                          width: 36.0,
                          height: 36.0,
                          decoration: BoxDecoration(
                            color: isActive ? AppColors.logisticsRed : AppColors.surfaceContainer,
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '$index',
                            style: AppTypography.headlineMd.copyWith(
                              color: isActive ? AppColors.pureWhite : AppColors.secondary,
                              fontSize: 16.0,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 12.0),

                    // Information
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                                decoration: BoxDecoration(
                                  color: isActive ? Colors.red.shade50 : AppColors.surfaceContainerLow,
                                  borderRadius: BorderRadius.circular(4.0),
                                ),
                                child: Text(
                                  status,
                                  style: AppTypography.labelMd.copyWith(
                                    color: isActive ? AppColors.logisticsRed : AppColors.secondary,
                                    fontSize: 9.0,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              Text(
                                'cách $distance',
                                style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6.0),
                          Text(
                            title,
                            style: AppTypography.labelLg.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppColors.deepOnyx,
                            ),
                          ),
                          const SizedBox(height: 4.0),
                          Row(
                            children: [
                              const Icon(Icons.location_on, size: 14.0, color: AppColors.secondary),
                              const SizedBox(width: 4.0),
                              Expanded(
                                child: Text(
                                  address,
                                  style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8.0),
                          Row(
                            children: [
                              Icon(Icons.inventory_2, size: 14.0, color: isActive ? AppColors.tertiary : AppColors.secondary),
                              const SizedBox(width: 4.0),
                              Text(
                                '$packages Kiện hàng',
                                style: AppTypography.labelMd.copyWith(
                                  color: isActive ? AppColors.tertiary : AppColors.secondary,
                                  fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                              const SizedBox(width: 16.0),
                              const Icon(Icons.schedule, size: 14.0, color: AppColors.secondary),
                              const SizedBox(width: 4.0),
                              Text(
                                'Dự kiến: $eta',
                                style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ----------------------------------------------------
  // FULL SCREEN GPS NAVIGATION VIEW (Màn hình 2.6)
  // ----------------------------------------------------
  Widget _buildNavigationScreen() {
    return Scaffold(
      body: Stack(
        children: [
          // 1. Full Screen Map
          Positioned.fill(
            child: Image.network(
              'https://lh3.googleusercontent.com/aida-public/AB6AXuD3-VB_5qkstxR_ResRVgBqslLZk09wNt7uwI5PyFcSwDgSsmDJT2eam9EIO3qagLAiM7YIqU6r8x_w1u1bOusGtta4S8t-0Z-s7holsubQ46WucFOEEn8YDni0_cVRx1cdd0hn2gGGMcn9KB5Y9XAc82_BU31_StSUUlyuFyRGg71hn4UYa5WP6YOfCc9lXQ6ToJGOIQJS8-VG-8RjyYY83jIN5PV0snwrXdAIWzbcjXAEOVS37auxFA',
              fit: BoxFit.cover,
            ),
          ),

          // 2. Animated Pulse Location Arrow overlay
          Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Pulsing outer ring
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 1.0, end: 2.0),
                  duration: const Duration(seconds: 2),
                  builder: (context, value, child) {
                    return Container(
                      width: 50.0 * value,
                      height: 50.0 * value,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.logisticsRed.withValues(alpha: 0.3 * (2.0 - value)),
                      ),
                    );
                  },
                  onEnd: () {},
                ),
                // Driver Arrow
                Transform.rotate(
                  angle: 0.44, // tilted ~25 degrees
                  child: Container(
                    width: 44.0,
                    height: 44.0,
                    decoration: BoxDecoration(
                      color: AppColors.logisticsRed,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.pureWhite, width: 2.0),
                      boxShadow: AppStyles.softShadow,
                    ),
                    child: const Icon(Icons.navigation, color: AppColors.pureWhite, size: 24.0),
                  ),
                ),
              ],
            ),
          ),

          // 3. Delivery stops overlays on map
          // Stop 1
          Positioned(
            top: 150.0,
            left: 80.0,
            child: _buildMapStopPin('1'),
          ),
          // Stop 2
          Positioned(
            top: 280.0,
            right: 120.0,
            child: _buildMapStopPin('2'),
          ),

          // 4. Top Navigation Direction Banner
          Positioned(
            top: MediaQuery.of(context).padding.top + 12.0,
            left: 16.0,
            right: 16.0,
            child: Container(
              padding: const EdgeInsets.all(16.0),
              decoration: BoxDecoration(
                color: AppColors.deepOnyx,
                borderRadius: AppStyles.roundedXl,
                border: const Border(left: BorderSide(color: AppColors.logisticsRed, width: 4.0)),
                boxShadow: AppStyles.softShadow,
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10.0),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      borderRadius: AppStyles.roundedLg,
                    ),
                    child: const Icon(
                      Icons.turn_right,
                      size: 36.0,
                      color: AppColors.logisticsRed,
                    ),
                  ),
                  const SizedBox(width: 16.0),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              '200m',
                              style: AppTypography.headlineLgMobile.copyWith(
                                color: AppColors.logisticsRed,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(width: 6.0),
                            Text(
                              'sau đó'.toUpperCase(),
                              style: AppTypography.labelMd.copyWith(color: Colors.white70),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2.0),
                        Text(
                          'Rẽ phải vào đường Hai Bà Trưng',
                          style: AppTypography.headlineMd.copyWith(
                            color: AppColors.pureWhite,
                            fontSize: 16.0,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 5. Floating action controls (right-side)
          Positioned(
            right: 16.0,
            top: 240.0,
            child: Column(
              children: [
                _buildFloatingNavBtn(
                  icon: _isVoiceOn ? Icons.volume_up : Icons.volume_off,
                  onPressed: () {
                    setState(() {
                      _isVoiceOn = !_isVoiceOn;
                    });
                  },
                  color: _isVoiceOn ? AppColors.deepOnyx : AppColors.secondary,
                ),
                const SizedBox(height: 12.0),
                _buildFloatingNavBtn(icon: Icons.search, onPressed: () {}),
                const SizedBox(height: 12.0),
                _buildFloatingNavBtn(icon: Icons.layers, onPressed: () {}),
                const SizedBox(height: 12.0),
                _buildFloatingNavBtn(
                  icon: Icons.my_location,
                  onPressed: () {},
                  color: AppColors.logisticsRed,
                ),
              ],
            ),
          ),

          // 6. Traffic alert notification
          if (_showTrafficAlert)
            Positioned(
              bottom: 220.0,
              left: 20.0,
              right: 20.0,
              child: AnimatedOpacity(
                opacity: _showTrafficAlert ? 1.0 : 0.0,
                duration: const Duration(milliseconds: 300),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF4E5),
                    borderRadius: AppStyles.roundedXl,
                    border: Border.all(color: const Color(0xFFFF9800)),
                    boxShadow: AppStyles.ambientShadow,
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning, color: Color(0xFFFF9800), size: 28.0),
                      const SizedBox(width: 12.0),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Kẹt xe phía trước',
                              style: AppTypography.labelLg.copyWith(
                                color: const Color(0xFF663C00),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'Chậm khoảng 3 phút trên đoạn đường Hai Bà Trưng.',
                              style: AppTypography.labelMd.copyWith(color: const Color(0xFF663C00)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // 7. Bottom GPS Stats Panel & Primary Control
          Positioned(
            bottom: 0.0,
            left: 0.0,
            right: 0.0,
            child: Container(
              padding: const EdgeInsets.only(left: 16.0, right: 16.0, bottom: 24.0),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Colors.white70, Colors.white],
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Stats card
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 16.0),
                    decoration: BoxDecoration(
                      color: AppColors.pureWhite,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(16.0),
                        topRight: Radius.circular(16.0),
                      ),
                      border: const Border(bottom: BorderSide(color: AppColors.surfaceContainer)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 10.0,
                          offset: const Offset(0, -5),
                        )
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildNavStatItem('Thời gian', '5', 'phút', isRed: true),
                        Container(width: 1.0, height: 40.0, color: AppColors.surfaceContainer),
                        _buildNavStatItem('Khoảng cách', '1.2', 'km'),
                        Container(width: 1.0, height: 40.0, color: AppColors.surfaceContainer),
                        _buildNavStatItem('Vận tốc', '35', 'km/h'),
                      ],
                    ),
                  ),

                  // Actions row
                  Container(
                    padding: const EdgeInsets.all(12.0),
                    decoration: BoxDecoration(
                      color: AppColors.pureWhite,
                      borderRadius: const BorderRadius.only(
                        bottomLeft: Radius.circular(16.0),
                        bottomRight: Radius.circular(16.0),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 10.0,
                          offset: const Offset(0, 5),
                        )
                      ],
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: SizedBox(
                            height: 48.0,
                            child: ElevatedButton.icon(
                              onPressed: () {
                                // Report incident
                              },
                              icon: const Icon(Icons.report, color: AppColors.pureWhite),
                              label: const Text('BÁO CÁO SỰ CỐ'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.logisticsRed,
                                foregroundColor: AppColors.pureWhite,
                                shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12.0),
                        GestureDetector(
                          onTap: _stopNavigation,
                          child: Container(
                            width: 48.0,
                            height: 48.0,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceContainerHigh,
                              borderRadius: AppStyles.roundedLg,
                            ),
                            child: const Icon(Icons.close, color: AppColors.error, size: 28.0),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Route Progress Bar (Subtle bottom bar)
                  const SizedBox(height: 12.0),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8.0),
                    child: LinearProgressIndicator(
                      value: 0.82,
                      minHeight: 6.0,
                      backgroundColor: AppColors.surfaceContainerHighest,
                      color: AppColors.logisticsRed,
                      borderRadius: BorderRadius.circular(4.0),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMapStopPin(String label) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 28.0,
          height: 28.0,
          decoration: BoxDecoration(
            color: AppColors.logisticsRed,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.pureWhite, width: 2.0),
            boxShadow: AppStyles.softShadow,
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: AppTypography.labelMd.copyWith(color: AppColors.pureWhite, fontWeight: FontWeight.bold),
          ),
        ),
        Container(
          width: 3.0,
          height: 6.0,
          color: AppColors.logisticsRed,
        ),
      ],
    );
  }

  Widget _buildFloatingNavBtn({
    required IconData icon,
    required VoidCallback onPressed,
    Color color = AppColors.deepOnyx,
  }) {
    return Container(
      width: 50.0,
      height: 50.0,
      decoration: BoxDecoration(
        color: AppColors.pureWhite,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.surfaceContainerHighest),
        boxShadow: AppStyles.softShadow,
      ),
      child: IconButton(
        icon: Icon(icon, color: color, size: 24.0),
        onPressed: onPressed,
      ),
    );
  }

  Widget _buildNavStatItem(String label, String value, String unit, {bool isRed = false}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: AppTypography.labelMd.copyWith(color: AppColors.secondary, fontSize: 10.0),
        ),
        const SizedBox(height: 2.0),
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              value,
              style: AppTypography.headlineLgMobile.copyWith(
                fontWeight: FontWeight.bold,
                color: isRed ? AppColors.logisticsRed : AppColors.deepOnyx,
                fontSize: 22.0,
              ),
            ),
            const SizedBox(width: 2.0),
            Text(
              unit,
              style: AppTypography.labelMd.copyWith(
                color: AppColors.deepOnyx,
                fontSize: 12.0,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
