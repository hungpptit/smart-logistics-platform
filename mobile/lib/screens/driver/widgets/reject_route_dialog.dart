import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class RejectRouteDialog extends StatefulWidget {
  final String routeCode;
  final Function(String reason) onConfirmReject;

  const RejectRouteDialog({
    super.key,
    required this.routeCode,
    required this.onConfirmReject,
  });

  static Future<void> show(
    BuildContext context, {
    required String routeCode,
    required Function(String reason) onConfirmReject,
  }) async {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => RejectRouteDialog(
        routeCode: routeCode,
        onConfirmReject: onConfirmReject,
      ),
    );
  }

  @override
  State<RejectRouteDialog> createState() => _RejectRouteDialogState();
}

class _RejectRouteDialogState extends State<RejectRouteDialog> {
  final List<String> _reasons = [
    'Xe gặp sự cố kỹ thuật / hỏng hóc',
    'Thùng hàng đã đầy / Quá tải trọng',
    'Khu vực lấy hàng bị ngập / kẹt xe nghiêm trọng',
    'Đã hết ca làm việc / Ngoại tuyến',
    'Lý do cá nhân / Sự cố khẩn cấp',
    'Lý do khác',
  ];

  String _selectedReason = 'Xe gặp sự cố kỹ thuật / hỏng hóc';
  final TextEditingController _customReasonController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _customReasonController.dispose();
    super.dispose();
  }

  void _handleSubmit() {
    final String finalReason = _selectedReason == 'Lý do khác'
        ? (_customReasonController.text.trim().isNotEmpty
            ? _customReasonController.text.trim()
            : 'Tài xế từ chối không nêu chi tiết')
        : (_customReasonController.text.trim().isNotEmpty
            ? '$_selectedReason: ${_customReasonController.text.trim()}'
            : _selectedReason);

    setState(() => _isSubmitting = true);
    Navigator.pop(context);
    widget.onConfirmReject(finalReason);
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.pureWhite,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.cancel_outlined, color: AppColors.error, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Từ Chối Lộ Trình',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.deepOnyx,
                          ),
                        ),
                        Text(
                          'Mã chuyến: ${widget.routeCode}',
                          style: const TextStyle(fontSize: 12, color: AppColors.secondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              const Text(
                'Vui lòng chọn lý do từ chối để hệ thống điều phối lại đơn hàng cho tài xế khác:',
                style: TextStyle(fontSize: 12, color: AppColors.secondary, height: 1.4),
              ),
              const SizedBox(height: 12),

              // Reason Radio Options
              ..._reasons.map((reason) {
                final bool isSelected = _selectedReason == reason;
                return InkWell(
                  onTap: () => setState(() => _selectedReason = reason),
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6.0, horizontal: 4.0),
                    child: Row(
                      children: [
                        Icon(
                          isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                          color: isSelected ? AppColors.logisticsRed : AppColors.secondary,
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            reason,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              color: isSelected ? AppColors.deepOnyx : Colors.black87,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),

              const SizedBox(height: 12),

              // Optional Custom Text
              TextField(
                controller: _customReasonController,
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: 'Ghi chú chi tiết thêm (không bắt buộc)...',
                  hintStyle: const TextStyle(fontSize: 12, color: Colors.grey),
                  contentPadding: const EdgeInsets.all(12),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.logisticsRed),
                  ),
                ),
                style: const TextStyle(fontSize: 13),
              ),

              const SizedBox(height: 20),

              // Actions
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isSubmitting ? null : () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text(
                        'HỦY BỎ',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.secondary),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _handleSubmit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.logisticsRed,
                        foregroundColor: AppColors.pureWhite,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text(
                              'XÁC NHẬN',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
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
