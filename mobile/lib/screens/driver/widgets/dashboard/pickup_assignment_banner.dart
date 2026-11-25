import 'package:flutter/material.dart';

class PickupAssignmentBanner extends StatelessWidget {
  final String routeCode;
  final int stopCount;
  final VoidCallback onReject;
  final VoidCallback onView;

  const PickupAssignmentBanner({
    super.key,
    required this.routeCode,
    required this.stopCount,
    required this.onReject,
    required this.onView,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20.0),
      padding: const EdgeInsets.all(14.0),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: const Color(0xFF3B82F6), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.electric_moped, color: Color(0xFF1D4ED8), size: 24),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Bưu cục điều phối Lộ Trình Gom Hàng [$routeCode]',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: Color(0xFF1E40AF),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Có $stopCount điểm lấy hàng cần gom từ nhà khách/shop. Vui lòng bấm bên dưới để xem chi tiết và xác nhận nhận chuyến hoặc từ chối.',
            style: const TextStyle(fontSize: 11, color: Color(0xFF1E3A8A), height: 1.3),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                flex: 2,
                child: OutlinedButton(
                  onPressed: onReject,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFEF4444), width: 1.2),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  child: const Text(
                    'TỪ CHỐI',
                    style: TextStyle(
                      color: Color(0xFFDC2626),
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 3,
                child: ElevatedButton.icon(
                  onPressed: onView,
                  icon: const Icon(Icons.assignment_turned_in, size: 16),
                  label: const Text(
                    'XEM & NHẬN LỘ TRÌNH',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF16A34A),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
