import 'package:flutter/material.dart';
import '../../../core/theme/app_styles.dart';

class FinishRouteCard extends StatelessWidget {
  final bool isDutyLoading;
  final bool isFinished;
  final VoidCallback onFinish;
  final bool isPickupHandover;
  final int handedOverCount;
  final int requiredHandoverCount;
  final List<String> pendingOrderCodes;
  final VoidCallback? onShowRouteQr;
  final VoidCallback? onRefreshStatus;

  const FinishRouteCard({
    super.key,
    required this.isDutyLoading,
    this.isFinished = false,
    required this.onFinish,
    this.isPickupHandover = false,
    this.handedOverCount = 0,
    this.requiredHandoverCount = 0,
    this.pendingOrderCodes = const [],
    this.onShowRouteQr,
    this.onRefreshStatus,
  });

  @override
  Widget build(BuildContext context) {
    final bool waitingWarehouseHandover = isPickupHandover &&
        !isFinished &&
        requiredHandoverCount > 0 &&
        handedOverCount < requiredHandoverCount;

    if (waitingWarehouseHandover) {
      return _buildPickupHandoverWaitingCard();
    }

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
                  Flexible(
                    child: Text(
                      isFinished ? 'ĐÃ CHỐT HOÀN THÀNH CHUYẾN ĐI' : 'HOÀN THÀNH 100% CÁC ĐIỂM DỪNG',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        color: isFinished ? const Color(0xFF334155) : const Color(0xFF166534),
                        fontSize: 13,
                      ),
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

  Widget _buildPickupHandoverWaitingCard() {
    final double progress = requiredHandoverCount > 0
        ? (handedOverCount / requiredHandoverCount).clamp(0.0, 1.0)
        : 0.0;

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16.0),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(16.0),
            border: Border.all(
              color: const Color(0xFF1D4ED8),
              width: 1.5,
            ),
            boxShadow: AppStyles.softShadow,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.warehouse_outlined,
                    color: Color(0xFF1D4ED8),
                    size: 24,
                  ),
                  SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      'CHỜ KHO KIỂM ĐẾM BÀN GIAO',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF1E3A8A),
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Hãy quay về bưu cục để nhân viên kho quét QR dán trên từng kiện hàng nhập kho. Hệ thống sẽ tự chốt hoàn thành chuyến khi đủ số kiện.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11.5,
                  color: Color(0xFF1E40AF),
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(
                              Icons.inventory_2_outlined,
                              size: 16,
                              color: Color(0xFF1D4ED8),
                            ),
                            SizedBox(width: 6),
                            Text(
                              'Chờ kho kiểm đếm:',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1E3A8A),
                              ),
                            ),
                          ],
                        ),
                        Text(
                          '$handedOverCount / $requiredHandoverCount kiện đã nhập kho',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF1D4ED8),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 7,
                        backgroundColor: const Color(0xFFDBEAFE),
                        valueColor: const AlwaysStoppedAnimation<Color>(
                          Color(0xFF1D4ED8),
                        ),
                      ),
                    ),
                    if (pendingOrderCodes.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      const Text(
                        'Đơn chờ kho quét:',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF475569),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: pendingOrderCodes.map((code) {
                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: const Color(0xFFCBD5E1),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.local_shipping_outlined,
                                  size: 12,
                                  color: Color(0xFF1D4ED8),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  code,
                                  style: const TextStyle(
                                    fontFamily: 'monospace',
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    flex: 3,
                    child: SizedBox(
                      height: 46,
                      child: ElevatedButton.icon(
                        onPressed: isDutyLoading ? null : onShowRouteQr,
                        icon: const Icon(Icons.qr_code_2, size: 20),
                        label: const Text(
                          'HIỆN MÃ QR CHUYẾN',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 12,
                            letterSpacing: 0.3,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1D4ED8),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  ),
                  if (onRefreshStatus != null) ...[
                    const SizedBox(width: 8),
                    SizedBox(
                      height: 46,
                      child: OutlinedButton.icon(
                        onPressed: isDutyLoading ? null : onRefreshStatus,
                        icon: const Icon(Icons.refresh, size: 18),
                        label: const Text(
                          'Cập nhật',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 12,
                          ),
                        ),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF1D4ED8),
                          side: const BorderSide(color: Color(0xFF93C5FD)),
                          backgroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16.0),
      ],
    );
  }
}
