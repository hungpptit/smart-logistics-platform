import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/theme/app_styles.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> with SingleTickerProviderStateMixin {
  late AnimationController _floatController;
  late Animation<double> _floatAnimation;

  @override
  void initState() {
    super.initState();
    _floatController = AnimationController(
      duration: const Duration(seconds: 4),
      vsync: this,
    )..repeat(reverse: true);
    
    _floatAnimation = Tween<double>(begin: 0, end: -10).animate(
      CurvedAnimation(parent: _floatController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _floatController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cloudGray,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppStyles.marginMobile,
              vertical: AppStyles.marginMobile,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Spacer / Brand Icon
                const SizedBox(height: 24.0),
                AnimatedBuilder(
                  animation: _floatAnimation,
                  builder: (context, child) {
                    return Transform.translate(
                      offset: Offset(0, _floatAnimation.value),
                      child: child,
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16.0),
                    decoration: BoxDecoration(
                      color: AppColors.pureWhite,
                      borderRadius: AppStyles.roundedXl,
                      border: Border.all(color: AppColors.surfaceContainerHigh),
                      boxShadow: AppStyles.softShadow,
                    ),
                    child: const Icon(
                      Icons.local_shipping,
                      size: 64.0,
                      color: AppColors.logisticsRed,
                    ),
                  ),
                ),
                const SizedBox(height: 20.0),

                // Brand Name & Subtitle
                Text(
                  'Velocity Logistics',
                  style: AppTypography.headlineLgMobile.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.deepOnyx,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8.0),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      height: 2.0,
                      width: 24.0,
                      color: AppColors.logisticsRed.withOpacity(0.5),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0),
                      child: Text(
                        'Tốc độ & Tin cậy',
                        style: AppTypography.labelLg.copyWith(
                          color: AppColors.secondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    Container(
                      height: 2.0,
                      width: 24.0,
                      color: AppColors.logisticsRed.withOpacity(0.5),
                    ),
                  ],
                ),
                const SizedBox(height: 32.0),

                // Bento-Style Highlight Panel
                // 1. Delivery Card with image background
                Container(
                  width: double.infinity,
                  height: 180.0,
                  decoration: BoxDecoration(
                    borderRadius: AppStyles.roundedXl,
                    boxShadow: AppStyles.softShadow,
                    image: const DecorationImage(
                      image: NetworkImage(
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuC4dG09Nir02J1MxBW6Cjxv_XPJU_ihnZtsMMdrrGMbasDEyt7VKaaOCl4Faa07IgZkuulnJek9L4aoI9lPLg9tGFSQpk32lkgThQaxEbWETjf8ae9k1fRbqk06Y7mUKtl69QPjcab1vPZ91agzbpszRd4PjW1uIA1WPx7fLCo63OlDtuamcPQPEwhNTlX78DJhQgBKq2kVF9RIPUhXQKmLGdaWxNmymUtIb2zdO-_-NRp6p8OB--QpUw',
                      ),
                      fit: BoxFit.cover,
                    ),
                  ),
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: AppStyles.roundedXl,
                      gradient: LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [
                          AppColors.deepOnyx.withOpacity(0.95),
                          AppColors.deepOnyx.withOpacity(0.2),
                          Colors.transparent,
                        ],
                      ),
                    ),
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Chuyển phát toàn cầu',
                          style: AppTypography.headlineMd.copyWith(
                            color: AppColors.pureWhite,
                            fontSize: 20.0,
                          ),
                        ),
                        const SizedBox(height: 4.0),
                        Text(
                          'Vận chuyển liền mạch tới hơn 200 quốc gia.',
                          style: AppTypography.labelMd.copyWith(
                            color: AppColors.pureWhite.withOpacity(0.85),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16.0),

                // 2. Row of Secondary Metric Cards
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 20.0, horizontal: 12.0),
                        decoration: BoxDecoration(
                          color: AppColors.pureWhite,
                          borderRadius: AppStyles.roundedXl,
                          boxShadow: AppStyles.ambientShadow,
                          border: const Border(
                            left: BorderSide(color: AppColors.logisticsRed, width: 4.0),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '99.9%',
                              style: AppTypography.headlineLg.copyWith(
                                color: AppColors.logisticsRed,
                                height: 1.0,
                              ),
                            ),
                            const SizedBox(height: 6.0),
                            Text(
                              'ĐÚNG GIỜ TUYỆT ĐỐI',
                              style: AppTypography.labelMd.copyWith(
                                color: AppColors.secondary,
                                fontSize: 10.0,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 16.0),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16.0),
                        height: 94.0, // align with left card
                        decoration: BoxDecoration(
                          color: AppColors.deepOnyx,
                          borderRadius: AppStyles.roundedXl,
                          boxShadow: AppStyles.ambientShadow,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.bolt,
                              color: AppColors.logisticsRed,
                              size: 28.0,
                            ),
                            const SizedBox(height: 4.0),
                            Text(
                              'Cập nhật hành trình tức thời.',
                              style: AppTypography.labelMd.copyWith(
                                color: AppColors.pureWhite,
                                fontSize: 10.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 40.0),

                // Call to Action Buttons
                SizedBox(
                  width: double.infinity,
                  height: 56.0,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pushNamed(context, '/login');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.logisticsRed,
                      foregroundColor: AppColors.pureWhite,
                      elevation: 4.0,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'ĐĂNG NHẬP',
                          style: AppTypography.button.copyWith(color: AppColors.pureWhite),
                        ),
                        const SizedBox(width: 8.0),
                        const Icon(Icons.login, size: 18.0),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16.0),
                SizedBox(
                  width: double.infinity,
                  height: 56.0,
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.pushNamed(context, '/register');
                    },
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.deepOnyx, width: 2.0),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'ĐĂNG KÝ',
                          style: AppTypography.button.copyWith(color: AppColors.deepOnyx),
                        ),
                        const SizedBox(width: 8.0),
                        const Icon(Icons.person_add, size: 18.0),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 40.0),

                // Trust Badges
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 16.0),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(color: AppColors.surfaceContainerHighest.withOpacity(0.5)),
                    ),
                  ),
                  child: const Wrap(
                    spacing: 16.0,
                    runSpacing: 12.0,
                    alignment: WrapAlignment.center,
                    children: [
                      _BadgeItem(icon: Icons.verified_user, label: 'ISO 9001'),
                      _BadgeItem(icon: Icons.public, label: 'Neutral Carbon'),
                      _BadgeItem(icon: Icons.support_agent, label: 'Hỗ trợ 24/7'),
                    ],
                  ),
                ),

                // Footer
                const SizedBox(height: 16.0),
                Text(
                  '© 2026 Velocity Logistics Inc. | Chính sách bảo mật',
                  style: AppTypography.labelMd.copyWith(color: AppColors.secondary, fontSize: 11.0),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20.0),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _BadgeItem extends StatelessWidget {
  final IconData icon;
  final String label;

  const _BadgeItem({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16.0, color: AppColors.deepOnyx.withOpacity(0.6)),
        const SizedBox(width: 4.0),
        Text(
          label,
          style: AppTypography.labelMd.copyWith(
            color: AppColors.deepOnyx.withOpacity(0.7),
            fontSize: 11.0,
          ),
        ),
      ],
    );
  }
}
