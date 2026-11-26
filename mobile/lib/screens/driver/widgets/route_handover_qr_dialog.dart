import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

/// Dialog hiển thị duy nhất 1 mã QR của chuyến Lấy hàng (RT-...)
/// để nhân viên kho quét mở đúng phiên đối soát của shipper đó,
/// sau đó kho sẽ quét QR dán trên từng bưu kiện vật lý.
class RouteHandoverQrDialog extends StatelessWidget {
  final String routeCode;
  final int handedOverCount;
  final int requiredHandoverCount;
  final List<String> pendingOrderCodes;
  final VoidCallback? onRefresh;

  const RouteHandoverQrDialog({
    super.key,
    required this.routeCode,
    required this.handedOverCount,
    required this.requiredHandoverCount,
    this.pendingOrderCodes = const [],
    this.onRefresh,
  });

  static Future<void> show(
    BuildContext context, {
    required String routeCode,
    required int handedOverCount,
    required int requiredHandoverCount,
    List<String> pendingOrderCodes = const [],
    VoidCallback? onRefresh,
  }) {
    return showDialog<void>(
      context: context,
      builder: (_) => RouteHandoverQrDialog(
        routeCode: routeCode,
        handedOverCount: handedOverCount,
        requiredHandoverCount: requiredHandoverCount,
        pendingOrderCodes: pendingOrderCodes,
        onRefresh: onRefresh,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool allDone =
        requiredHandoverCount > 0 && handedOverCount >= requiredHandoverCount;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.qr_code_2,
                      color: Color(0xFF1D4ED8),
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'MÃ QR BÀN GIAO VỀ KHO',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 15,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close, size: 20),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              const Text(
                'Đưa mã QR chuyến dưới đây để nhân viên kho mở đúng danh sách đơn của bạn, sau đó quét từng bưu kiện để nhập kho & phân loại.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  color: Color(0xFF475569),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFCBD5E1), width: 1.5),
                ),
                child: Column(
                  children: [
                    QrImageView(
                      data: routeCode,
                      version: QrVersions.auto,
                      size: 190,
                      backgroundColor: Colors.white,
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        routeCode,
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                          color: Colors.white,
                          letterSpacing: 0.6,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: allDone
                      ? const Color(0xFFDCFCE7)
                      : const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: allDone
                        ? const Color(0xFF16A34A)
                        : const Color(0xFF93C5FD),
                  ),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          allDone
                              ? Icons.check_circle
                              : Icons.inventory_2_outlined,
                          size: 18,
                          color: allDone
                              ? const Color(0xFF15803D)
                              : const Color(0xFF1D4ED8),
                        ),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            'Kho đã kiểm đếm: $handedOverCount / $requiredHandoverCount kiện',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 12.5,
                              color: allDone
                                  ? const Color(0xFF166534)
                                  : const Color(0xFF1E3A8A),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (pendingOrderCodes.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        alignment: WrapAlignment.center,
                        children: pendingOrderCodes.map((code) {
                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: const Color(0xFFBFDBFE),
                              ),
                            ),
                            child: Text(
                              code,
                              style: const TextStyle(
                                fontFamily: 'monospace',
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1E40AF),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  if (onRefresh != null) ...[
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          onRefresh!();
                          Navigator.of(context).pop();
                        },
                        icon: const Icon(Icons.refresh, size: 17),
                        label: const Text(
                          'Cập nhật',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF1D4ED8),
                          side: const BorderSide(color: Color(0xFF93C5FD)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 11),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                  ],
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 11),
                      ),
                      child: const Text(
                        'Đóng',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
