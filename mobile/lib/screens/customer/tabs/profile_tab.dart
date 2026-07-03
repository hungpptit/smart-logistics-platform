import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';
import '../../../services/auth_service.dart';

class ProfileTab extends StatelessWidget {
  const ProfileTab({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(
        horizontal: AppStyles.marginMobile,
        vertical: 24.0,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Profile Header
          const SizedBox(height: 12.0),
          Stack(
            alignment: Alignment.bottomRight,
            children: [
              Container(
                width: 110.0,
                height: 110.0,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.pureWhite, width: 4.0),
                  boxShadow: AppStyles.ambientShadow,
                  image: const DecorationImage(
                    image: NetworkImage(
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuCMVneF7Mp_WYnKxaqBM7A0LzI3B4l1jOX2gVlfAtTxApIyuAyQ2OHLEJRk4t807hb11XbZ3b4cey-A8rPySQyhi2216ZoxpGnEgVVIW1M04xkDTf9dGYwZb5DHU0QblWk_I0Cd0o2o2hzfypfFE4tM8Q_pwekHkh4gr-hsleBCO1JPkB6r8xWPDkDP2THhpbxinZH_KZlPxTcKINiYKHgQLHDx97XpmYVqlsK_9d3UveEaIzQo6sfj6w',
                    ),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              Positioned(
                bottom: 2.0,
                right: 2.0,
                child: Container(
                  padding: const EdgeInsets.all(6.0),
                  decoration: const BoxDecoration(
                    color: AppColors.logisticsRed,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.edit,
                    color: AppColors.pureWhite,
                    size: 14.0,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16.0),

          // Name and Member Tier Badge
          Text(
            'Trần Minh Quân',
            style: AppTypography.headlineLgMobile.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.deepOnyx,
            ),
          ),
          const SizedBox(height: 6.0),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 4.0),
            decoration: BoxDecoration(
              color: AppColors.primaryContainer.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20.0),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.star, color: AppColors.logisticsRed, size: 14.0),
                const SizedBox(width: 4.0),
                Text(
                  'Khách hàng VVIP',
                  style: AppTypography.labelMd.copyWith(
                    color: AppColors.logisticsRed,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28.0),

          // Contact Details Card
          Container(
            padding: const EdgeInsets.all(16.0),
            decoration: BoxDecoration(
              color: AppColors.pureWhite,
              borderRadius: AppStyles.roundedXl,
              border: Border.all(color: AppColors.surfaceContainer),
              boxShadow: AppStyles.ambientShadow,
            ),
            child: Column(
              children: [
                _buildContactRow(Icons.phone, 'Số điện thoại', '+84 901 234 567'),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12.0),
                  child: Divider(height: 1.0, color: AppColors.surfaceContainerHighest),
                ),
                _buildContactRow(Icons.mail, 'Email', 'quan.tran@velocity.vn'),
              ],
            ),
          ),
          const SizedBox(height: 24.0),

          // Saved Addresses
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Sổ địa chỉ mặc định',
                style: AppTypography.headlineMd.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.deepOnyx,
                  fontSize: 18.0,
                ),
              ),
              Text(
                'Quản lý',
                style: AppTypography.labelMd.copyWith(
                  color: AppColors.logisticsRed,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12.0),
          Container(
            decoration: BoxDecoration(
              color: AppColors.pureWhite,
              borderRadius: AppStyles.roundedXl,
              border: Border.all(color: AppColors.surfaceContainer),
              boxShadow: AppStyles.ambientShadow,
            ),
            child: Column(
              children: [
                _buildAddressRow(
                  'Địa chỉ nhận hàng (Nhà riêng)',
                  '120 Lê Lợi, Phường Bến Thành, Quận 1, TP. HCM',
                  isDefault: true,
                ),
                const Divider(height: 1.0, color: AppColors.surfaceContainer),
                _buildAddressRow(
                  'Địa chỉ lấy hàng (Văn phòng)',
                  '450 Điện Biên Phủ, Phường 25, Quận Bình Thạnh, TP. HCM',
                  isDefault: false,
                ),
              ],
            ),
          ),
          const SizedBox(height: 28.0),

          // Action Buttons
          SizedBox(
            width: double.infinity,
            height: 48.0,
            child: OutlinedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.lock_reset, size: 18.0),
              label: const Text('Đổi mật khẩu'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.deepOnyx,
                side: const BorderSide(color: AppColors.deepOnyx, width: 1.5),
                shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
              ),
            ),
          ),
          const SizedBox(height: 12.0),
          SizedBox(
            width: double.infinity,
            height: 48.0,
            child: ElevatedButton.icon(
              onPressed: () async {
                await AuthService.clearAuthData();
                if (context.mounted) {
                  Navigator.of(context).pushReplacementNamed('/');
                }
              },
              icon: const Icon(Icons.logout, size: 18.0),
              label: const Text('Đăng xuất'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                foregroundColor: AppColors.logisticsRed,
                shadowColor: Colors.transparent,
                side: const BorderSide(color: AppColors.logisticsRed, width: 1.5),
                shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
              ),
            ),
          ),
          const SizedBox(height: 40.0),

          // Version Footer
          Text(
            'Phiên bản 4.2.0 (Build 99283)',
            style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
          ),
          const SizedBox(height: 4.0),
          Text(
            '© 2024 Velocity Logistics. Bảo lưu mọi quyền.',
            style: AppTypography.labelMd.copyWith(color: AppColors.secondary, fontSize: 10.0),
          ),
          const SizedBox(height: 20.0),
        ],
      ),
    );
  }

  Widget _buildContactRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Container(
          width: 40.0,
          height: 40.0,
          decoration: const BoxDecoration(
            color: AppColors.surfaceContainerLow,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: AppColors.logisticsRed, size: 20.0),
        ),
        const SizedBox(width: 14.0),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
            ),
            const SizedBox(height: 2.0),
            Text(
              value,
              style: AppTypography.bodyMd.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.deepOnyx,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildAddressRow(String label, String address, {required bool isDefault}) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.location_on, color: AppColors.secondary, size: 20.0),
          const SizedBox(width: 12.0),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8.0,
                  runSpacing: 4.0,
                  children: [
                    Text(
                      label,
                      style: AppTypography.labelLg.copyWith(
                        color: AppColors.deepOnyx,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (isDefault) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 2.0),
                        decoration: BoxDecoration(
                          color: AppColors.primaryContainer.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4.0),
                        ),
                        child: Text(
                          'Mặc định',
                          style: AppTypography.labelMd.copyWith(
                            color: AppColors.logisticsRed,
                            fontSize: 8.0,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4.0),
                Text(
                  address,
                  style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: AppColors.secondary, size: 18.0),
        ],
      ),
    );
  }
}
