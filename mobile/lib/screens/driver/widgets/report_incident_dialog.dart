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
  String _selectedReason = 'Ket xe nghiem trong';
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
            'Bao Cao Su Co Tuyen Duong',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Chon loai su co gap phai:',
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
              DropdownMenuItem(value: 'Ket xe nghiem trong', child: Text('Ket xe nghiem trong')),
              DropdownMenuItem(value: 'Su co xe / Thung lop', child: Text('Su co xe / Thung lop')),
              DropdownMenuItem(value: 'Khong lien lac duoc khach hang', child: Text('Khong lien lac duoc khach')),
              DropdownMenuItem(value: 'Thoi tiet xau / Ngap nuoc', child: Text('Thoi tiet xau / Ngap nuoc')),
              DropdownMenuItem(value: 'Su co khac', child: Text('Su co khac')),
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
              labelText: 'Ghi chu them (khong bat buoc)',
              labelStyle: const TextStyle(fontSize: 11),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Huy', style: TextStyle(color: AppColors.secondary)),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Da gui bao cao su co "$_selectedReason" den Buu cuc!'),
                backgroundColor: AppColors.logisticsRed,
                behavior: SnackBarBehavior.floating,
              ),
            );
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.logisticsRed,
            foregroundColor: AppColors.pureWhite,
          ),
          child: const Text('Gui bao cao'),
        ),
      ],
    );
  }
}
