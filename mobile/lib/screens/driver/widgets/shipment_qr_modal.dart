import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../core/theme/app_colors.dart';

class ShipmentQrModal extends StatelessWidget {
  final String? activeRouteCode;
  final String? activeRouteId;

  const ShipmentQrModal({
    super.key,
    required this.activeRouteCode,
    required this.activeRouteId,
  });

  static void show(BuildContext context, {String? activeRouteCode, String? activeRouteId}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ShipmentQrModal(
        activeRouteCode: activeRouteCode,
        activeRouteId: activeRouteId,
      ),
    );
  }

  String get _shipmentCode {
    if (activeRouteCode != null && activeRouteCode!.isNotEmpty) return activeRouteCode!;
    if (activeRouteId != null && activeRouteId!.isNotEmpty) return activeRouteId!;
    return 'CHUA_CO_CHUYEN_XE';
  }

  @override
  Widget build(BuildContext context) {
    final shipmentCode = _shipmentCode;
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.pureWhite,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24.0)),
      ),
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2.0),
            ),
          ),
          const SizedBox(height: 16.0),
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.local_shipping, color: AppColors.logisticsRed, size: 22),
              SizedBox(width: 8),
              Flexible(
                child: Text(
                  'MÃ QR CHUYỂN XE TẢI TRUNG CHUYỂN',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8.0),
          Text(
            'Cho Thủ kho tại Bưu cục Đích / Kho Tổng quét 1 phát nhập toàn bộ Chuyến xe vào kho',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 20.0),
          Container(
            padding: const EdgeInsets.all(16.0),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16.0),
              border: Border.all(color: Colors.indigo.shade200, width: 2),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: QrImageView(
              data: shipmentCode,
              version: QrVersions.auto,
              size: 220.0,
            ),
          ),
          const SizedBox(height: 16.0),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.indigo.shade50,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              'Mã Vận Đơn Xe Tải: $shipmentCode',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: Colors.indigo.shade900,
                fontFamily: 'monospace',
              ),
            ),
          ),
          const SizedBox(height: 24.0),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.deepOnyx,
                foregroundColor: AppColors.pureWhite,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Đóng'),
            ),
          ),
        ],
      ),
    );
  }
}
