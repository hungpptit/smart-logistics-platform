import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/theme/app_styles.dart';
import '../../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  
  bool _isObscured = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _togglePasswordVisibility() {
    setState(() {
      _isObscured = !_isObscured;
    });
  }

  void _handleLogin() async {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
      });

      final result = await AuthService.login(
        _usernameController.text.trim(),
        _passwordController.text,
      );

      if (!mounted) return;

      setState(() {
        _isLoading = false;
      });

      if (result['success'] == true) {
        final role = result['role'];
        if (role == 'DRIVER' || role == 'SHIPPER') {
          Navigator.pushReplacementNamed(context, '/driver/dashboard');
        } else {
          Navigator.pushReplacementNamed(context, '/customer/dashboard');
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: AppColors.logisticsRed),
                const SizedBox(width: 12.0),
                Expanded(
                  child: Text(
                    result['message'] ?? 'Đăng nhập thất bại',
                    style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite),
                  ),
                ),
              ],
            ),
            backgroundColor: AppColors.deepOnyx,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
            margin: const EdgeInsets.all(AppStyles.marginMobile),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cloudGray,
      appBar: AppBar(
        backgroundColor: AppColors.pureWhite,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.deepOnyx),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Velocity Logistics',
          style: AppTypography.headlineMd.copyWith(
            color: AppColors.logisticsRed,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: false,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppStyles.marginMobile),
              child: Container(
                width: double.infinity,
                constraints: const BoxConstraints(maxWidth: 480.0),
                decoration: BoxDecoration(
                  color: AppColors.pureWhite,
                  borderRadius: AppStyles.roundedXl,
                  border: Border.all(color: AppColors.surfaceContainerHighest),
                  boxShadow: AppStyles.softShadow,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Header Form section
                    Padding(
                      padding: const EdgeInsets.only(top: 32.0, left: 24.0, right: 24.0),
                      child: Column(
                        children: [
                          Container(
                            width: 64.0,
                            height: 64.0,
                            decoration: BoxDecoration(
                              color: AppColors.logisticsRed.withValues(alpha: 0.08),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.lock_person,
                              color: AppColors.logisticsRed,
                              size: 36.0,
                            ),
                          ),
                          const SizedBox(height: 20.0),
                          Text(
                            'Chào mừng trở lại',
                            style: AppTypography.headlineLgMobile.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppColors.deepOnyx,
                            ),
                          ),
                          const SizedBox(height: 8.0),
                          Text(
                            'Đăng nhập để quản lý vận đơn và hiệu suất đội xe của bạn.',
                            style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),

                    // Main Form Content
                    Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [


                            // Username Input
                            Text(
                              'Tên đăng nhập',
                              style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx),
                            ),
                            const SizedBox(height: 8.0),
                            TextFormField(
                              controller: _usernameController,
                              keyboardType: TextInputType.text,
                              style: AppTypography.bodyMd,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Vui lòng nhập tên đăng nhập';
                                }
                                return null;
                              },
                              decoration: const InputDecoration(
                                prefixIcon: Icon(Icons.person, color: AppColors.secondary),
                                hintText: 'shp_dangvanbi_1',
                              ),
                            ),
                            const SizedBox(height: 20.0),

                            // Password Input
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Mật khẩu',
                                  style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx),
                                ),
                                GestureDetector(
                                   onTap: () {
                                     Navigator.pushNamed(context, '/forgot-password');
                                   },
                                   child: Text(
                                     'Quên mật khẩu?',
                                    style: AppTypography.labelMd.copyWith(
                                      color: AppColors.tertiary,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8.0),
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _isObscured,
                              style: AppTypography.bodyMd,
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Vui lòng nhập mật khẩu';
                                }
                                return null;
                              },
                              decoration: InputDecoration(
                                prefixIcon: const Icon(Icons.lock, color: AppColors.secondary),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _isObscured ? Icons.visibility : Icons.visibility_off,
                                    color: AppColors.secondary,
                                  ),
                                  onPressed: _togglePasswordVisibility,
                                ),
                                hintText: '••••••••',
                              ),
                            ),
                            const SizedBox(height: 28.0),

                            // Login Button
                            SizedBox(
                              width: double.infinity,
                              height: 56.0,
                              child: ElevatedButton(
                                onPressed: _isLoading ? null : _handleLogin,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.logisticsRed,
                                  foregroundColor: AppColors.pureWhite,
                                  disabledBackgroundColor: AppColors.logisticsRed.withValues(alpha: 0.6),
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
                                    : Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Text(
                                            'ĐĂNG NHẬP',
                                            style: AppTypography.button.copyWith(color: AppColors.pureWhite),
                                          ),
                                          const SizedBox(width: 8.0),
                                          const Icon(Icons.arrow_forward, size: 18.0),
                                        ],
                                      ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Divider and Register CTA
                    Padding(
                      padding: const EdgeInsets.only(left: 24.0, right: 24.0, bottom: 32.0),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Expanded(child: Divider(color: AppColors.surfaceContainerHighest.withValues(alpha: 0.5))),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                                child: Text(
                                  'HOẶC',
                                  style: AppTypography.labelMd.copyWith(color: AppColors.secondary, letterSpacing: 1.0),
                                ),
                              ),
                              Expanded(child: Divider(color: AppColors.surfaceContainerHighest.withValues(alpha: 0.5))),
                            ],
                          ),
                          const SizedBox(height: 20.0),
                          Wrap(
                            alignment: WrapAlignment.center,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Text(
                                'Mới sử dụng Velocity? ',
                                style: AppTypography.bodyMd.copyWith(color: AppColors.onSurfaceVariant),
                              ),
                              GestureDetector(
                                onTap: () {
                                  Navigator.pushNamed(context, '/register');
                                },
                                child: Text(
                                  'Đăng ký ngay',
                                  style: AppTypography.bodyMd.copyWith(
                                    color: AppColors.logisticsRed,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    )
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
