import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/theme/app_styles.dart';
import '../../services/auth_service.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  void _handleSubmit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() {
      _isLoading = true;
    });

    final res = await AuthService.forgotPassword(_emailController.text.trim());
    if (mounted) {
      setState(() {
        _isLoading = false;
      });

      if (res['success'] == true) {
        // Navigate to reset password screen passing the email
        Navigator.pushNamed(
          context,
          '/reset-password',
          arguments: {'email': _emailController.text.trim()},
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Có lỗi xảy ra, vui lòng thử lại.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceContainerLow,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0.0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.deepOnyx),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: AppStyles.marginMobile),
            child: Container(
              padding: const EdgeInsets.all(28.0),
              decoration: BoxDecoration(
                color: AppColors.pureWhite,
                borderRadius: AppStyles.roundedXl,
                boxShadow: AppStyles.ambientShadow,
                border: Border.all(color: AppColors.surfaceContainerHighest),
              ),
              child: _buildFormView(),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFormView() {
    return Form(
      key: _formKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              padding: const EdgeInsets.all(16.0),
              decoration: BoxDecoration(
                color: AppColors.primaryContainer.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.lock_reset,
                color: AppColors.logisticsRed,
                size: 40.0,
              ),
            ),
          ),
          const SizedBox(height: 24.0),
          Center(
            child: Text(
              'Quên mật khẩu?',
              style: AppTypography.headlineLgMobile.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.deepOnyx,
              ),
            ),
          ),
          const SizedBox(height: 8.0),
          Center(
            child: Text(
              'Nhập email của bạn để nhận liên kết đặt lại mật khẩu.',
              style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 28.0),
          Text(
            'Địa chỉ Email',
            style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx),
          ),
          const SizedBox(height: 8.0),
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            style: AppTypography.bodyMd,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Vui lòng nhập email';
              }
              if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                return 'Định dạng email không hợp lệ';
              }
              return null;
            },
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.email, color: AppColors.secondary),
              hintText: 'email@example.com',
              hintStyle: const TextStyle(color: Colors.black26),
              border: OutlineInputBorder(
                borderRadius: AppStyles.roundedLg,
                borderSide: const BorderSide(color: AppColors.surfaceContainerHighest),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: AppStyles.roundedLg,
                borderSide: const BorderSide(color: AppColors.surfaceContainerHighest),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: AppStyles.roundedLg,
                borderSide: const BorderSide(color: AppColors.logisticsRed, width: 1.5),
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 16.0),
            ),
          ),
          const SizedBox(height: 28.0),
          SizedBox(
            width: double.infinity,
            height: 52.0,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.logisticsRed,
                foregroundColor: AppColors.pureWhite,
                shape: RoundedRectangleBorder(
                  borderRadius: AppStyles.roundedLg,
                ),
                elevation: 0,
              ),
              child: _isLoading
                  ? const SizedBox(
                      width: 24.0,
                      height: 24.0,
                      child: CircularProgressIndicator(
                        color: AppColors.pureWhite,
                        strokeWidth: 2.5,
                      ),
                    )
                  : Text(
                      'Gửi liên kết',
                      style: AppTypography.button.copyWith(
                        fontWeight: FontWeight.bold,
                        fontSize: 16.0,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
