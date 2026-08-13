import 'package:flutter/material.dart';
import '../../../core/theme/app_styles.dart';

class FinishRouteCard extends StatelessWidget {
  final bool isDutyLoading;
  final bool isFinished;
  final VoidCallback onFinish;

  const FinishRouteCard({
    super.key,
    required this.isDutyLoading,
    this.isFinished = false,
    required this.onFinish,
  });

  @override
  Widget build(BuildContext context) {
    final bool disabled = isDutyLoading || isFinished;
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16.0),
          decoration: BoxDecoration(
            color: isFinished ? const Color(0xFFF1F5F9) : const Color(0xFFDCFCE7),
            borderRadius: BorderRadius.circular(16.0),
            border: Border.all(
              color: isFinished ? const Color(0xFF94A3B8) : const Color(0xFF166534),
              width: 1.5,
            ),
            boxShadow: AppStyles.softShadow,
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.stars,
                    color: isFinished ? const Color(0xFF475569) : const Color(0xFF166534),
                    size: 24,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isFinished ? 'ĐÃ CHỐT HOÀN THÀNH CHUYẾN ĐI' : 'HOÀN THÀNH 100% CÁC ĐIỂM DỪNG',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      color: isFinished ? const Color(0xFF334155) : const Color(0xFF166534),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                isFinished
                    ? 'Chuyến đi đã được chốt hoàn thành thành công trên hệ thống.'
                    : 'Bạn đã hoàn thành tất cả đơn hàng trong chuyến này. Bấm nút bên dưới để chốt ca & giải phóng tài xế nhận đơn tiếp theo!',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11,
                  color: isFinished ? const Color(0xFF64748B) : const Color(0xFF15803D),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  onPressed: disabled ? null : onFinish,
                  icon: Icon(
                    isFinished ? Icons.check_circle : Icons.check_circle_outline,
                    size: 20,
                  ),
                  label: Text(
                    isFinished ? 'ĐÃ CHỐT HOÀN THÀNH' : 'CHỐT HOÀN THÀNH CHUYẾN ĐI',
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 13,
                      letterSpacing: 0.5,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF166534),
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: Colors.grey.shade400,
                    disabledForegroundColor: Colors.white70,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16.0),
      ],
    );
  }
}
