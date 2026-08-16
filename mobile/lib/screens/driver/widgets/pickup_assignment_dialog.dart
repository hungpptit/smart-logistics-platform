import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class PickupAssignmentDialog extends StatelessWidget {
  final String routeCode;
  final List<Map<String, dynamic>> stops;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  const PickupAssignmentDialog({
    super.key,
    required this.routeCode,
    required this.stops,
    required this.onAccept,
    required this.onReject,
  });

  static Future<void> show(
    BuildContext context, {
    required String routeCode,
    required List<Map<String, dynamic>> stops,
    required VoidCallback onAccept,
    required VoidCallback onReject,
  }) async {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => PickupAssignmentDialog(
        routeCode: routeCode,
        stops: stops,
        onAccept: onAccept,
        onReject: onReject,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final int pickupCount = stops.where((s) => s['isPickup'] == true || s['stopType'] == 'PICKUP').length;
    final int totalCount = stops.length;
    final int displayPickupCount = pickupCount > 0 ? pickupCount : totalCount;

    return Dialog(
      backgroundColor: AppColors.pureWhite,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 420),
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Badge & Close button
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.electric_moped, color: Color(0xFF2563EB), size: 16),
                      SizedBox(width: 6),
                      Text(
                        'ĐIỀU PHỐI LẤY HÀNG',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1E40AF),
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppColors.secondary, size: 20),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Title
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Có Lộ Trình Gom Hàng Mới!',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: AppColors.deepOnyx,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Mã chuyến: $routeCode',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFFD97706),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Stat Summary Cards
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Điểm cần lấy', style: TextStyle(fontSize: 11, color: AppColors.secondary)),
                        const SizedBox(height: 2),
                        Text(
                          '$displayPickupCount địa điểm',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.deepOnyx),
                        ),
                      ],
                    ),
                  ),
                  Container(width: 1, height: 30, color: const Color(0xFFCBD5E1)),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Thời gian dự kiến', style: TextStyle(fontSize: 11, color: AppColors.secondary)),
                        SizedBox(height: 2),
                        Text(
                          '~15 - 30 phút',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Stop List Preview
            const Text(
              'Danh sách điểm lấy hàng:',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.deepOnyx),
            ),
            const SizedBox(height: 8),

            Flexible(
              child: Container(
                constraints: const BoxConstraints(maxHeight: 180),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFF1F5F9)),
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: stops.length,
                  separatorBuilder: (_, __) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  itemBuilder: (ctx, idx) {
                    final stop = stops[idx];
                    final orderCode = stop['orderCode'] ?? 'ORD-$idx';
                    final address = stop['address'] ?? 'Địa chỉ lấy hàng';
                    final receiverName = stop['receiverName'] ?? 'Người gửi';

                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 22,
                            height: 22,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: const Color(0xFF2563EB),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '${idx + 1}',
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      orderCode,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.deepOnyx),
                                    ),
                                    Text(
                                      receiverName,
                                      style: const TextStyle(fontSize: 11, color: AppColors.secondary, fontWeight: FontWeight.w500),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  address,
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), height: 1.3),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ),
            const SizedBox(height: 18),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      onReject();
                    },
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      side: const BorderSide(color: Color(0xFFEF4444), width: 1.2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text(
                      'TỪ CHỐI',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: Color(0xFFDC2626),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 3,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      onAccept();
                    },
                    icon: const Icon(Icons.check_circle_outline, size: 18),
                    label: const Text(
                      'NHẬN LỘ TRÌNH',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.3),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF16A34A),
                      foregroundColor: AppColors.pureWhite,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      elevation: 2,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
