import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_styles.dart';

class ReportIncidentDialog extends StatefulWidget {
  const ReportIncidentDialog({super.key});

  static void show(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => const ReportIncidentDialog(),
    );
  }

  @override
  State<ReportIncidentDialog> createState() => _ReportIncidentDialogState();
}

class _ReportIncidentDialogState extends State<ReportIncidentDialog> {
  String _selectedReason = 'Kẹt xe nghiêm trọng';
  final TextEditingController _noteController = TextEditingController();

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppColors.pureWhite,
      shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
      title: const Row(
        children: [
          Icon(Icons.report_problem, color: AppColors.logisticsRed, size: 24),
          SizedBox(width: 8),
          Text(
            'Báo Cáo Sự Cố Tuyến Đường',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Chọn loại sự cố gặp phải:',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _selectedReason,
            decoration: InputDecoration(
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
            items: const [
              DropdownMenuItem(value: 'Kẹt xe nghiêm trọng', child: Text('Kẹt xe nghiêm trọng')),
              DropdownMenuItem(value: 'Sự cố xe / Thủng lốp', child: Text('Sự cố xe / Thủng lốp')),
              DropdownMenuItem(value: 'Không liên lạc được khách hàng', child: Text('Không liên lạc được khách')),
              DropdownMenuItem(value: 'Thời tiết xấu / Ngập nước', child: Text('Thời tiết xấu / Ngập nước')),
              DropdownMenuItem(value: 'Sự cố khác', child: Text('Sự cố khác')),
            ],
            onChanged: (val) {
              if (val != null) setState(() => _selectedReason = val);
            },
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _noteController,
            maxLines: 2,
            decoration: InputDecoration(
              labelText: 'Ghi chú thêm (không bắt buộc)',
              labelStyle: const TextStyle(fontSize: 11),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Hủy', style: TextStyle(color: AppColors.secondary)),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Đã gửi báo cáo sự cố "$_selectedReason" đến Bưu cục!'),
                backgroundColor: AppColors.logisticsRed,
                behavior: SnackBarBehavior.floating,
              ),
            );
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.logisticsRed,
            foregroundColor: AppColors.pureWhite,
          ),
          child: const Text('Gửi báo cáo'),
        ),
      ],
    );
  }
}
