import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/theme/app_styles.dart';
import '../../services/auth_service.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _otpControllers = List.generate(6, (_) => TextEditingController());
  final _otpFocusNodes = List.generate(6, (_) => FocusNode());
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _isLoading = false;
  bool _isSuccess = false;
  bool _showNewPassword = false;
  bool _showConfirmPassword = false;
  String _email = '';

  late AnimationController _successAnimController;
  late Animation<double> _successScaleAnim;

  @override
  void initState() {
    super.initState();
    _successAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _successScaleAnim = CurvedAnimation(
      parent: _successAnimController,
      curve: Curves.elasticOut,
    );
    // Auto-focus first OTP field after build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _otpFocusNodes[0].requestFocus();
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    if (args != null) {
      _email = args['email'] ?? '';
    }
  }

  @override
  void dispose() {
    _successAnimController.dispose();
    for (final c in _otpControllers) {
      c.dispose();
    }
    for (final f in _otpFocusNodes) {
      f.dispose();
    }
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  String get _otpCode =>
      _otpControllers.map((c) => c.text).join();

  void _handleOtpInput(int index, String value) {
    if (value.isNotEmpty && index < 5) {
      _otpFocusNodes[index + 1].requestFocus();
    }
    setState(() {});
  }

  void _handleOtpBackspace(int index) {
    if (_otpControllers[index].text.isEmpty && index > 0) {
      _otpFocusNodes[index - 1].requestFocus();
      _otpControllers[index - 1].clear();
    }
    setState(() {});
  }

  void _handleSubmit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final otp = _otpCode;
    if (otp.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Vui lòng nhập đủ 6 chữ số mã xác thực.',
            style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite),
          ),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
          margin: const EdgeInsets.all(AppStyles.marginMobile),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    final result = await AuthService.resetPassword(
      email: _email,
      otp: otp,
      newPassword: _newPasswordController.text,
    );

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (result['success'] == true) {
      setState(() => _isSuccess = true);
      _successAnimController.forward();
    } else {
      // Clear OTP fields on failure
      for (final c in _otpControllers) {
        c.clear();
      }
      _otpFocusNodes[0].requestFocus();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error_outline, color: AppColors.logisticsRed),
              const SizedBox(width: 12.0),
              Expanded(
                child: Text(
                  result['message'] ?? 'Có lỗi xảy ra, vui lòng thử lại.',
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
              child: _isSuccess ? _buildSuccessView() : _buildFormView(),
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
          // Icon
          Center(
            child: Container(
              padding: const EdgeInsets.all(16.0),
              decoration: BoxDecoration(
                color: AppColors.logisticsRed.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.shield_outlined,
                color: AppColors.logisticsRed,
                size: 40.0,
              ),
            ),
          ),
          const SizedBox(height: 24.0),
          // Title
          Center(
            child: Text(
              'Đặt lại mật khẩu',
              style: AppTypography.headlineLgMobile.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.deepOnyx,
              ),
            ),
          ),
          const SizedBox(height: 8.0),
          Center(
            child: RichText(
              textAlign: TextAlign.center,
              text: TextSpan(
                style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
                children: [
                  const TextSpan(text: 'Nhập mã 6 chữ số đã gửi đến\n'),
                  TextSpan(
                    text: _email.isNotEmpty ? _email : 'email của bạn',
                    style: AppTypography.bodyMd.copyWith(
                      color: AppColors.logisticsRed,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 32.0),

          // OTP fields
          Text(
            'Mã xác thực',
            style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx),
          ),
          const SizedBox(height: 12.0),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(6, (index) => _buildOtpBox(index)),
          ),
          const SizedBox(height: 28.0),

          // New password
          Text(
            'Mật khẩu mới',
            style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx),
          ),
          const SizedBox(height: 8.0),
          TextFormField(
            controller: _newPasswordController,
            obscureText: !_showNewPassword,
            style: AppTypography.bodyMd,
            validator: (value) {
              if (value == null || value.isEmpty) return 'Vui lòng nhập mật khẩu mới';
              if (value.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
              return null;
            },
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.lock_outline, color: AppColors.secondary),
              suffixIcon: IconButton(
                icon: Icon(
                  _showNewPassword ? Icons.visibility_off : Icons.visibility,
                  color: AppColors.secondary,
                  size: 20,
                ),
                onPressed: () => setState(() => _showNewPassword = !_showNewPassword),
              ),
              hintText: 'Ít nhất 6 ký tự',
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
              errorBorder: OutlineInputBorder(
                borderRadius: AppStyles.roundedLg,
                borderSide: const BorderSide(color: AppColors.error),
              ),
              focusedErrorBorder: OutlineInputBorder(
                borderRadius: AppStyles.roundedLg,
                borderSide: const BorderSide(color: AppColors.error, width: 1.5),
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 16.0),
            ),
          ),
          const SizedBox(height: 16.0),

          // Confirm password
          Text(
            'Xác nhận mật khẩu',
            style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx),
          ),
          const SizedBox(height: 8.0),
          TextFormField(
            controller: _confirmPasswordController,
            obscureText: !_showConfirmPassword,
            style: AppTypography.bodyMd,
            validator: (value) {
              if (value == null || value.isEmpty) return 'Vui lòng xác nhận mật khẩu';
              if (value != _newPasswordController.text) return 'Mật khẩu xác nhận không khớp';
              return null;
            },
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.lock_outline, color: AppColors.secondary),
              suffixIcon: IconButton(
                icon: Icon(
                  _showConfirmPassword ? Icons.visibility_off : Icons.visibility,
                  color: AppColors.secondary,
                  size: 20,
                ),
                onPressed: () => setState(() => _showConfirmPassword = !_showConfirmPassword),
              ),
              hintText: 'Nhập lại mật khẩu mới',
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
              errorBorder: OutlineInputBorder(
                borderRadius: AppStyles.roundedLg,
                borderSide: const BorderSide(color: AppColors.error),
              ),
              focusedErrorBorder: OutlineInputBorder(
                borderRadius: AppStyles.roundedLg,
                borderSide: const BorderSide(color: AppColors.error, width: 1.5),
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 16.0),
            ),
          ),
          const SizedBox(height: 28.0),

          // Submit button
          SizedBox(
            width: double.infinity,
            height: 52.0,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.logisticsRed,
                foregroundColor: AppColors.pureWhite,
                disabledBackgroundColor: AppColors.logisticsRed.withValues(alpha: 0.5),
                shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
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
                      'Đặt lại mật khẩu',
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

  Widget _buildOtpBox(int index) {
    final isFilled = _otpControllers[index].text.isNotEmpty;
    return SizedBox(
      width: 44.0,
      height: 52.0,
      child: Focus(
        onKeyEvent: (node, event) {
          if (event is KeyDownEvent &&
              event.logicalKey == LogicalKeyboardKey.backspace) {
            _handleOtpBackspace(index);
            return KeyEventResult.ignored;
          }
          return KeyEventResult.ignored;
        },
        child: TextFormField(
          controller: _otpControllers[index],
          focusNode: _otpFocusNodes[index],
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          maxLength: 1,
          style: AppTypography.headlineLgMobile.copyWith(
            color: AppColors.deepOnyx,
            fontWeight: FontWeight.bold,
            fontSize: 20.0,
          ),
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: InputDecoration(
            counterText: '',
            filled: true,
            fillColor: isFilled
                ? AppColors.logisticsRed.withValues(alpha: 0.06)
                : AppColors.surfaceContainerLow,
            border: OutlineInputBorder(
              borderRadius: AppStyles.roundedLg,
              borderSide: BorderSide(
                color: isFilled ? AppColors.logisticsRed : AppColors.surfaceContainerHighest,
                width: isFilled ? 1.5 : 1.0,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: AppStyles.roundedLg,
              borderSide: BorderSide(
                color: isFilled ? AppColors.logisticsRed : AppColors.surfaceContainerHighest,
                width: isFilled ? 1.5 : 1.0,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: AppStyles.roundedLg,
              borderSide: const BorderSide(color: AppColors.logisticsRed, width: 2.0),
            ),
            contentPadding: EdgeInsets.zero,
          ),
          onChanged: (value) => _handleOtpInput(index, value),
        ),
      ),
    );
  }

  Widget _buildSuccessView() {
    return ScaleTransition(
      scale: _successScaleAnim,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(20.0),
            decoration: const BoxDecoration(
              color: Color(0xFFDCFCE7),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.check_circle_rounded,
              color: Color(0xFF166534),
              size: 56.0,
            ),
          ),
          const SizedBox(height: 24.0),
          Text(
            'Đặt lại thành công!',
            style: AppTypography.headlineLgMobile.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.deepOnyx,
            ),
          ),
          const SizedBox(height: 12.0),
          Text(
            'Mật khẩu của bạn đã được cập nhật.\nVui lòng đăng nhập với mật khẩu mới.',
            style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32.0),
          SizedBox(
            width: double.infinity,
            height: 52.0,
            child: ElevatedButton(
              onPressed: () =>
                  Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.logisticsRed,
                foregroundColor: AppColors.pureWhite,
                shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                elevation: 0,
              ),
              child: Text(
                'Đăng nhập ngay',
                style: AppTypography.button.copyWith(
                  fontWeight: FontWeight.bold,
                  fontSize: 16.0,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12.0),
          TextButton(
            onPressed: () =>
                Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false),
            child: Text(
              'Quay về Trang chủ',
              style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
            ),
          ),
        ],
      ),
    );
  }
}
