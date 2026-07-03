import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/theme/app_styles.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _isObscured = true;
  bool _isConfirmObscured = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _handleRegister() {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.green),
              const SizedBox(width: 12.0),
              Expanded(
                child: Text(
                  'Đăng ký tài khoản thành công! Đang chuyển đến Đăng nhập...',
                  style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite),
                ),
              ),
            ],
          ),
          backgroundColor: AppColors.deepOnyx,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
          margin: const EdgeInsets.all(AppStyles.marginMobile),
          duration: const Duration(seconds: 2),
        ),
      );

      Future.delayed(const Duration(milliseconds: 2000), () {
        if (!mounted) return;
        setState(() {
          _isLoading = false;
        });
        Navigator.pushReplacementNamed(context, '/login');
      });
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
          'Đăng ký thành viên',
          style: AppTypography.headlineMd.copyWith(
            color: AppColors.deepOnyx,
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
              padding: const EdgeInsets.symmetric(horizontal: AppStyles.marginMobile, vertical: 16.0),
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
                    // Form Header
                    Padding(
                      padding: const EdgeInsets.only(top: 32.0, left: 24.0, right: 24.0),
                      child: Column(
                        children: [
                          Container(
                            width: 64.0,
                            height: 64.0,
                            decoration: BoxDecoration(
                              color: AppColors.tertiary.withOpacity(0.08),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.person_add,
                              color: AppColors.tertiary,
                              size: 36.0,
                            ),
                          ),
                          const SizedBox(height: 16.0),
                          Text(
                            'Tạo tài khoản mới',
                            style: AppTypography.headlineLgMobile.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppColors.deepOnyx,
                            ),
                          ),
                          const SizedBox(height: 6.0),
                          Text(
                            'Đăng ký tài khoản Khách hàng để bắt đầu gửi hàng và quản lý hành trình.',
                            style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),

                    // Register Fields
                    Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Full Name
                            Text('Họ và tên', style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx)),
                            const SizedBox(height: 6.0),
                            TextFormField(
                              controller: _fullNameController,
                              style: AppTypography.bodyMd,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Vui lòng nhập họ và tên';
                                }
                                return null;
                              },
                              decoration: const InputDecoration(
                                prefixIcon: Icon(Icons.person, color: AppColors.secondary),
                                hintText: 'Nguyễn Văn A',
                              ),
                            ),
                            const SizedBox(height: 16.0),

                            // Email
                            Text('Địa chỉ Email', style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx)),
                            const SizedBox(height: 6.0),
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              style: AppTypography.bodyMd,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Vui lòng nhập Email';
                                }
                                if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                                  return 'Email không hợp lệ';
                                }
                                return null;
                              },
                              decoration: const InputDecoration(
                                prefixIcon: Icon(Icons.mail, color: AppColors.secondary),
                                hintText: 'nguyenvana@gmail.com',
                              ),
                            ),
                            const SizedBox(height: 16.0),

                            // Phone
                            Text('Số điện thoại', style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx)),
                            const SizedBox(height: 6.0),
                            TextFormField(
                              controller: _phoneController,
                              keyboardType: TextInputType.phone,
                              style: AppTypography.bodyMd,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Vui lòng nhập số điện thoại';
                                }
                                if (!RegExp(r'^[0-9]{10,11}$').hasMatch(value)) {
                                  return 'Số điện thoại không hợp lệ (10-11 số)';
                                }
                                return null;
                              },
                              decoration: const InputDecoration(
                                prefixIcon: Icon(Icons.phone, color: AppColors.secondary),
                                hintText: '0901234567',
                              ),
                            ),
                            const SizedBox(height: 16.0),

                            // Password
                            Text('Mật khẩu', style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx)),
                            const SizedBox(height: 6.0),
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _isObscured,
                              style: AppTypography.bodyMd,
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Vui lòng nhập mật khẩu';
                                }
                                if (value.length < 6) {
                                  return 'Mật khẩu tối thiểu phải 6 ký tự';
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
                                  onPressed: () => setState(() => _isObscured = !_isObscured),
                                ),
                                hintText: 'Tối thiểu 6 ký tự',
                              ),
                            ),
                            const SizedBox(height: 16.0),

                            // Confirm Password
                            Text('Xác nhận mật khẩu', style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx)),
                            const SizedBox(height: 6.0),
                            TextFormField(
                              controller: _confirmPasswordController,
                              obscureText: _isConfirmObscured,
                              style: AppTypography.bodyMd,
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Vui lòng xác nhận mật khẩu';
                                }
                                if (value != _passwordController.text) {
                                  return 'Mật khẩu xác nhận không trùng khớp';
                                }
                                return null;
                              },
                              decoration: InputDecoration(
                                prefixIcon: const Icon(Icons.lock, color: AppColors.secondary),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _isConfirmObscured ? Icons.visibility : Icons.visibility_off,
                                    color: AppColors.secondary,
                                  ),
                                  onPressed: () => setState(() => _isConfirmObscured = !_isConfirmObscured),
                                ),
                                hintText: 'Nhập lại mật khẩu',
                              ),
                            ),
                            const SizedBox(height: 28.0),

                            // Submit Button
                            SizedBox(
                              width: double.infinity,
                              height: 56.0,
                              child: ElevatedButton(
                                onPressed: _isLoading ? null : _handleRegister,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.logisticsRed,
                                  foregroundColor: AppColors.pureWhite,
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
                                            'ĐĂNG KÝ',
                                            style: AppTypography.button.copyWith(color: AppColors.pureWhite),
                                          ),
                                          const SizedBox(width: 8.0),
                                          const Icon(Icons.person_add, size: 18.0),
                                        ],
                                      ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Footer Redirect
                    Padding(
                      padding: const EdgeInsets.only(left: 24.0, right: 24.0, bottom: 32.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Đã có tài khoản? ',
                            style: AppTypography.bodyMd.copyWith(color: AppColors.onSurfaceVariant),
                          ),
                          GestureDetector(
                            onTap: () {
                              Navigator.pushReplacementNamed(context, '/login');
                            },
                            child: Text(
                              'Đăng nhập ngay',
                              style: AppTypography.bodyMd.copyWith(
                                color: AppColors.logisticsRed,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
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
