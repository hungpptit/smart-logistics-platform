import 'package:flutter/material.dart';

class DeliveryScanBanner extends StatelessWidget {
  final String routeCode;
  final VoidCallback onScan;

  const DeliveryScanBanner({
    super.key,
    required this.routeCode,
    required this.onScan,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20.0),
      padding: const EdgeInsets.all(14.0),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: const Color(0xFFF59E0B), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.qr_code_scanner, color: Color(0xFFB45309), size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Bưu cục đã phân công Chuyến Xe [$routeCode]',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: Color(0xFFB45309),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'Tài xế chưa quét nhận chuyến xe. Vui lòng bấm nút bên dưới để quét mã QR Thùng hàng / Chuyến xe tại bưu cục trước khi bắt đầu lộ trình!',
            style: TextStyle(fontSize: 11, color: Color(0xFF92400E)),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: onScan,
              icon: const Icon(Icons.qr_code_scanner, size: 18),
              label: const Text(
                'QUÉT NHẬN CHUYẾN XE NGAY',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD97706),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
