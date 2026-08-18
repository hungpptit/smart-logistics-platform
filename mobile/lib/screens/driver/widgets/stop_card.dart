import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';

class StopCard extends StatelessWidget {
  final Map<String, dynamic> stop;
  final VoidCallback? onTap;
  final VoidCallback? onShowToteDetails;

  const StopCard({
    super.key,
    required this.stop,
    this.onTap,
    this.onShowToteDetails,
  });

  @override
  Widget build(BuildContext context) {
    final int index = stop['index'] as int;
    final String title = stop['title'] as String;
    final String address = stop['address'] as String;
    final int packages = stop['packages'] as int? ?? 1;
    final String eta = stop['eta'] as String? ?? 'Theo lộ trình';
    final String status = stop['status'] as String? ?? 'CHỜ THỰC HIỆN';
    final bool isActive = stop['isActive'] as bool? ?? false;
    final bool isLinehaul = stop['isLinehaul'] == true;

    final List<String> loadedTotes = (stop['loadedTotes'] is List)
        ? List<String>.from(stop['loadedTotes'])
        : <String>[];

    return GestureDetector(
      onTap: (isActive || (isLinehaul && status != 'ĐÃ XUẤT BƯU CỤC' && status != 'ĐÃ TỚI KHO ĐÍCH' && status != 'COMPLETED')) ? onTap : null,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.pureWhite,
          borderRadius: AppStyles.roundedXl,
          border: Border.all(
            color: isLinehaul ? const Color(0xFFFCA5A5) : AppColors.surfaceContainer,
            width: isLinehaul ? 1.5 : 1.0,
          ),
          boxShadow: AppStyles.ambientShadow,
        ),
        clipBehavior: Clip.antiAlias,
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Left gradient line for active item
              Container(
                width: 4.0,
                color: isLinehaul
                    ? const Color(0xFFB91C1C)
                    : (isActive ? AppColors.logisticsRed : Colors.transparent),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Stop Number Circle
                      Container(
                        width: 36.0,
                        height: 36.0,
                        decoration: BoxDecoration(
                          color: isLinehaul
                              ? const Color(0xFFB91C1C)
                              : (isActive ? AppColors.logisticsRed : AppColors.surfaceContainer),
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '$index',
                          style: AppTypography.headlineMd.copyWith(
                            color: AppColors.pureWhite,
                            fontSize: 16.0,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
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
                                Flexible(
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                                    decoration: BoxDecoration(
                                      color: isLinehaul
                                          ? (stop['isIntermediate'] == true
                                              ? const Color(0xFFFEF3C7)
                                              : (stop['isFirstStop'] == true
                                                  ? const Color(0xFFFEF2F2)
                                                  : const Color(0xFFEFF6FF)))
                                          : AppColors.logisticsRed.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(4.0),
                                    ),
                                    child: Text(
                                      isLinehaul
                                          ? (stop['isIntermediate'] == true
                                              ? 'TRẠM GHÉ TRUNG CHUYỂN'
                                              : (stop['isFirstStop'] == true
                                                  ? 'ĐIỂM XUẤT PHÁT'
                                                  : 'ĐIỂM ĐẾN'))
                                          : (stop['orderCode'] ?? 'ORD-66266482'),
                                      style: TextStyle(
                                        color: isLinehaul
                                            ? (stop['isIntermediate'] == true
                                                ? const Color(0xFFB45309)
                                                : (stop['isFirstStop'] == true
                                                    ? const Color(0xFF991B1B)
                                                    : const Color(0xFF1D4ED8)))
                                            : AppColors.logisticsRed,
                                        fontSize: 10.0,
                                        fontWeight: FontWeight.bold,
                                        fontFamily: 'monospace',
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 4.0),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 2.0),
                                  decoration: BoxDecoration(
                                    color: (status == 'DANG THUC HIEN' || status == 'ĐANG THỰC HIỆN' || status == 'ĐANG BỐC HÀNG')
                                        ? AppColors.logisticsRed.withValues(alpha: 0.1)
                                        : (status == 'CHỜ XÁC NHẬN' || status == 'CHO XAC NHAN')
                                            ? const Color(0xFFEFF6FF)
                                            : (status == 'ĐÃ GIAO' || status == 'ĐÃ LẤY HÀNG' || status == 'DA GIAO' || status == 'DA LAY HANG')
                                                ? const Color(0xFFDCFCE7)
                                                : (status == 'CHỜ QUÉT NHẬN' || status == 'CHO QUET NHAN')
                                                    ? const Color(0xFFFEF3C7)
                                                    : AppColors.surfaceContainer,
                                    borderRadius: BorderRadius.circular(4.0),
                                  ),
                                  child: Text(
                                    status,
                                    style: TextStyle(
                                      color: (status == 'DANG THUC HIEN' || status == 'ĐANG THỰC HIỆN' || status == 'ĐANG BỐC HÀNG')
                                          ? AppColors.logisticsRed
                                          : (status == 'CHỜ XÁC NHẬN' || status == 'CHO XAC NHAN')
                                              ? const Color(0xFF2563EB)
                                              : (status == 'ĐÃ GIAO' || status == 'ĐÃ LẤY HÀNG' || status == 'DA GIAO' || status == 'DA LAY HANG')
                                                  ? const Color(0xFF166534)
                                                  : (status == 'CHỜ QUÉT NHẬN' || status == 'CHO QUET NHAN')
                                                      ? const Color(0xFFB45309)
                                                      : AppColors.secondary,
                                      fontSize: 9.0,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
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

                            // Detail Tote View Button for Linehaul stops
                            if (isLinehaul && onShowToteDetails != null) ...[
                              InkWell(
                                onTap: onShowToteDetails,
                                borderRadius: BorderRadius.circular(6),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
                                  decoration: BoxDecoration(
                                    color: Colors.amber.shade50,
                                    borderRadius: BorderRadius.circular(6.0),
                                    border: Border.all(color: Colors.amber.shade400, width: 1.0),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.info_outline, size: 13, color: Color(0xFFB45309)),
                                      const SizedBox(width: 4),
                                      Text(
                                        loadedTotes.isNotEmpty
                                            ? 'Xem chi tiết ${loadedTotes.length} Thùng hàng ›'
                                            : 'Xem chi tiết Thùng hàng ›',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF92400E),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8.0),
                            ],

                            // ETA & Items Info Row
                            if (!isLinehaul) ...[
                              Row(
                                children: [
                                  Icon(
                                    Icons.inventory_2,
                                    size: 14.0,
                                    color: isActive ? AppColors.tertiary : AppColors.secondary,
                                  ),
                                  const SizedBox(width: 4.0),
                                  Text(
                                    '$packages Kiện hàng',
                                    style: AppTypography.labelMd.copyWith(
                                      color: isActive ? AppColors.tertiary : AppColors.secondary,
                                      fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                                    ),
                                  ),
                                  const SizedBox(width: 12.0),
                                  const Icon(Icons.schedule, size: 14.0, color: AppColors.secondary),
                                  const SizedBox(width: 4.0),
                                  Flexible(
                                    child: Text(
                                      'Dự kiến: $eta',
                                      style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ] else ...[
                              // Linehaul stops: Display full ETA time cleanly without duplicate tote count label
                              Row(
                                children: [
                                  const Icon(Icons.schedule, size: 14.0, color: AppColors.secondary),
                                  const SizedBox(width: 4.0),
                                  Expanded(
                                    child: Text(
                                      'Dự kiến: $eta',
                                      style: AppTypography.labelMd.copyWith(
                                        color: AppColors.deepOnyx,
                                        fontWeight: FontWeight.w600,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],

                            // Action button for Linehaul stops (Mobile Driver UI)
                            if (isLinehaul) ...[
                              if (stop['isPickup'] == true &&
                                  stop['isCheckedIn'] != true &&
                                  status != 'ĐÃ XUẤT BƯU CỤC' &&
                                  status != 'ĐÃ BỐC & RỜI TRẠM GHÉ' &&
                                  status != 'ĐÃ LẤY HÀNG' &&
                                  status != 'COMPLETED') ...[
                                const SizedBox(height: 10.0),
                                SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton.icon(
                                    onPressed: onTap,
                                    icon: Icon(
                                      stop['isIntermediate'] == true ? Icons.add_box_outlined : Icons.qr_code_2,
                                      size: 18,
                                    ),
                                    label: Text(
                                      stop['isIntermediate'] == true
                                          ? 'Xác nhận & Bốc thêm hàng tại trạm ghé'
                                          : 'Xác nhận & Hiện QR Xuất bến',
                                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
                                    ),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: stop['isIntermediate'] == true
                                          ? const Color(0xFFD97706)
                                          : const Color(0xFFB91C1C),
                                      foregroundColor: AppColors.pureWhite,
                                      padding: const EdgeInsets.symmetric(vertical: 9.0),
                                      elevation: 2,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
                                    ),
                                  ),
                                ),
                              ] else if (stop['isPickup'] != true &&
                                  stop['isCheckedIn'] != true &&
                                  (isActive || status == 'ĐANG THỰC HIỆN') &&
                                  status != 'ĐÃ TỚI KHO ĐÍCH' &&
                                  status != 'COMPLETED') ...[
                                const SizedBox(height: 10.0),
                                SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton.icon(
                                    onPressed: onTap,
                                    icon: const Icon(Icons.qr_code_2, size: 18),
                                    label: const Text(
                                      'Xác nhận & Hiện QR Cập bến đích',
                                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
                                    ),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF1E3A8A),
                                      foregroundColor: AppColors.pureWhite,
                                      padding: const EdgeInsets.symmetric(vertical: 9.0),
                                      elevation: 2,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
                                    ),
                                  ),
                                ),
                              ],
                            ],
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
      ),
    );
  }
}
