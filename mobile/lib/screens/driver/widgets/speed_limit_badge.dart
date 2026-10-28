import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

/// SpeedLimitBadge
/// Widget hiển thị cụm Biển báo tốc độ giới hạn (P.127 chuẩn Việt Nam)
/// kết hợp Đồng hồ đo tốc độ xe chạy thực tế trên màn hình dẫn đường.
class SpeedLimitBadge extends StatelessWidget {
  final int? speedLimitKmh;
  final double currentSpeedKmh;
  final String? roadName;
  final bool isOverSpeed;
  final bool isMotorcycleForbidden;
  final VoidCallback? onTap;

  const SpeedLimitBadge({
    super.key,
    this.speedLimitKmh,
    required this.currentSpeedKmh,
    this.roadName,
    this.isOverSpeed = false,
    this.isMotorcycleForbidden = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        constraints: const BoxConstraints(maxWidth: 170.0),
        padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 8.0),
        decoration: BoxDecoration(
          color: isOverSpeed
              ? const Color(0xFFFFF1F2) // Nền cảnh báo đỏ nhạt
              : AppColors.pureWhite.withValues(alpha: 0.96),
          borderRadius: BorderRadius.circular(16.0),
          border: Border.all(
            color: isOverSpeed ? const Color(0xFFE53935) : AppColors.surfaceContainerHigh,
            width: isOverSpeed ? 2.0 : 1.0,
          ),
          boxShadow: [
            BoxShadow(
              color: (isOverSpeed ? Colors.red : Colors.black).withValues(alpha: isOverSpeed ? 0.25 : 0.08),
              blurRadius: isOverSpeed ? 12.0 : 8.0,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hàng hiển thị: Biển giới hạn + Tốc độ xe hiện tại
            Row(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // 1. Biển báo tốc độ giới hạn (P.127 chuẩn Việt Nam)
                Container(
                  width: 44.0,
                  height: 44.0,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(0xFFE53935), // Viền đỏ chuẩn biển báo
                      width: 3.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 3.0,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      speedLimitKmh != null && speedLimitKmh! > 0 ? '$speedLimitKmh' : '--',
                      style: const TextStyle(
                        color: Color(0xFF1E293B),
                        fontSize: 16.0,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8.0),

                // 2. Tốc độ xe thực tế (GPS Smoothed)
                Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TweenAnimationBuilder<double>(
                      tween: Tween<double>(
                        begin: 0.0,
                        end: currentSpeedKmh.clamp(0.0, 200.0),
                      ),
                      duration: const Duration(milliseconds: 700),
                      curve: Curves.easeOutCubic,
                      builder: (context, animatedSpeed, child) {
                        return Text(
                          animatedSpeed.round().toString(),
                          style: TextStyle(
                            color: isOverSpeed ? const Color(0xFFE53935) : const Color(0xFF0F172A),
                            fontSize: 22.0,
                            fontWeight: FontWeight.w900,
                            height: 1.0,
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 2.0),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'km/h',
                          style: TextStyle(
                            color: isOverSpeed ? const Color(0xFFE53935) : AppColors.secondary,
                            fontSize: 11.0,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (isOverSpeed) ...[
                          const SizedBox(width: 4.0),
                          const Icon(
                            Icons.warning_amber_rounded,
                            size: 13.0,
                            color: Color(0xFFE53935),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ],
            ),

            // 3. Tên đoạn đường đang chạy
            if (roadName != null && roadName!.trim().isNotEmpty) ...[
              const SizedBox(height: 5.0),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.signpost_outlined,
                    size: 11.0,
                    color: AppColors.secondary,
                  ),
                  const SizedBox(width: 4.0),
                  Flexible(
                    child: Text(
                      roadName!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: Color(0xFF475569),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ],

            // 4. Nhãn cảnh báo cấm xe máy (Cao tốc)
            if (isMotorcycleForbidden) ...[
              const SizedBox(height: 5.0),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 2.0),
                decoration: BoxDecoration(
                  color: const Color(0xFFDC2626),
                  borderRadius: BorderRadius.circular(6.0),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.block, size: 10.0, color: Colors.white),
                    SizedBox(width: 3.0),
                    Text(
                      'CẤM XE MÁY',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 9.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
