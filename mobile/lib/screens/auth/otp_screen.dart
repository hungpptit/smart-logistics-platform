import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/theme/app_styles.dart';
import '../../services/auth_service.dart';

class OtpScreen extends StatefulWidget {
  const OtpScreen({super.key});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _otpController = TextEditingController();
  final _otpFocusNode = FocusNode();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Auto-focus after the build is complete
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _otpFocusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _otpController.dispose();
    _otpFocusNode.dispose();
    super.dispose();
  }

  void _handleVerifyOtp(String email) async {
    final otp = _otpController.text.trim();
    if (otp.length < 6) return;

    setState(() {
      _isLoading = true;
    });

    final result = await AuthService.verifyOtp(email: email, otp: otp);

    if (!mounted) return;

    setState(() {
      _isLoading = false;
    });

    if (result['success'] == true) {
      final role = result['role'];
      if (role == 'CUSTOMER') {
        Navigator.pushNamedAndRemoveUntil(context, '/customer/dashboard', (route) => false);
      } else if (role == 'DRIVER' || role == 'SHIPPER') {
        Navigator.pushNamedAndRemoveUntil(context, '/driver/dashboard', (route) => false);
      } else {
        Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
      }
    } else {
      _otpController.clear();
      _otpFocusNode.requestFocus();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error_outline, color: AppColors.logisticsRed),
              const SizedBox(width: 12.0),
              Expanded(
                child: Text(
                  result['message'] ?? 'Xác thực OTP thất bại',
                  style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite),
                ),
              ),
            ],
          ),
          backgroundColor: AppColors.deepOnyx,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
          margin: const EdgeInsets.all(AppStyles.marginMobile),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // Retrieve email argument from navigator
    final email = ModalRoute.of(context)?.settings.arguments as String? ?? '';

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
          'Xác thực OTP',
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
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Header Icon
                      Container(
                        width: 64.0,
                        height: 64.0,
                        decoration: BoxDecoration(
                          color: AppColors.logisticsRed.withValues(alpha: 0.08),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.verified_user,
                          color: AppColors.logisticsRed,
                          size: 36.0,
                        ),
                      ),
                      const SizedBox(height: 20.0),
                      Text(
                        'Nhập mã xác thực',
                        style: AppTypography.headlineLgMobile.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppColors.deepOnyx,
                        ),
                      ),
                      const SizedBox(height: 8.0),
                      Text(
                        'Vui lòng nhập mã OTP 6 số đã được gửi tới email:',
                        style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 4.0),
                      Text(
                        email,
                        style: AppTypography.bodyMd.copyWith(
                          color: AppColors.deepOnyx,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 32.0),

                      // Hidden real text field
                      SizedBox(
                        height: 0,
                        width: 0,
                        child: TextField(
                          controller: _otpController,
                          focusNode: _otpFocusNode,
                          keyboardType: TextInputType.number,
                          maxLength: 6,
                          onChanged: (val) {
                            setState(() {});
                            if (val.length == 6) {
                              _handleVerifyOtp(email);
                            }
                          },
                          decoration: const InputDecoration(
                            counterText: "",
                            border: InputBorder.none,
                          ),
                        ),
                      ),

                      // Beautiful Custom OTP Row
                      GestureDetector(
                        onTap: () => _otpFocusNode.requestFocus(),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: List.generate(6, (index) {
                            String char = "";
                            if (_otpController.text.length > index) {
                              char = _otpController.text[index];
                            }
                            
                            final isFocused = _otpController.text.length == index;

                            return Container(
                              width: 44.0,
                              height: 52.0,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: AppColors.surfaceContainerLow,
                                borderRadius: BorderRadius.circular(12.0),
                                border: Border.all(
                                  color: isFocused
                                      ? AppColors.logisticsRed
                                      : AppColors.surfaceContainerHighest,
                                  width: isFocused ? 2.0 : 1.0,
                                ),
                              ),
                              child: Text(
                                char,
                                style: AppTypography.headlineMd.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.deepOnyx,
                                ),
                              ),
                            );
                          }),
                        ),
                      ),
                      const SizedBox(height: 36.0),

                      // Submit Button
                      SizedBox(
                        width: double.infinity,
                        height: 48.0,
                        child: ElevatedButton(
                          onPressed: _isLoading || _otpController.text.length < 6
                              ? null
                              : () => _handleVerifyOtp(email),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.logisticsRed,
                            foregroundColor: AppColors.pureWhite,
                            shape: RoundedRectangleBorder(
                              borderRadius: AppStyles.roundedLg,
                            ),
                            elevation: 0.0,
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 20.0,
                                  height: 20.0,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.0,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      AppColors.pureWhite,
                                    ),
                                  ),
                                )
                              : Text(
                                  'Xác nhận kích hoạt',
                                  style: AppTypography.button.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 24.0),

                      // Helper footer text
                      Text(
                        'Kiểm tra thư mục Spam nếu bạn không thấy mã gửi về.',
                        style: AppTypography.labelMd.copyWith(
                          color: AppColors.secondary,
                          fontStyle: FontStyle.italic,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
