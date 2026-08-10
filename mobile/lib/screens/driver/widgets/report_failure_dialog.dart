import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_styles.dart';
import '../../../core/constants/order_status_constants.dart';
import '../../../services/driver_service.dart';

class ReportFailureDialog extends StatefulWidget {
  final Map<String, dynamic> stop;
  final VoidCallback onConfirmed;

  const ReportFailureDialog({
    super.key,
    required this.stop,
    required this.onConfirmed,
  });

  static void show(
    BuildContext context, {
    required Map<String, dynamic> stop,
    required VoidCallback onConfirmed,
  }) {
    showDialog(
      context: context,
      builder: (context) => ReportFailureDialog(stop: stop, onConfirmed: onConfirmed),
    );
  }

  @override
  State<ReportFailureDialog> createState() => _ReportFailureDialogState();
}

class _ReportFailureDialogState extends State<ReportFailureDialog> {
  late String _selectedReason;
  final TextEditingController _noteController = TextEditingController();

  bool get _isPickupStop =>
      widget.stop['isPickup'] == true ||
      widget.stop['stopType'] == 'PICKUP' ||
      widget.stop['title']?.toString().contains('lay hang') == true;

  List<String> get _reasonsList =>
      _isPickupStop
          ? OrderStatusConstants.pickupFailureReasons
          : OrderStatusConstants.deliveryFailureReasons;

  @override
  void initState() {
    super.initState();
    _selectedReason = _reasonsList.first;
  }

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
      title: Row(
        children: [
          const Icon(Icons.warning_amber_rounded, color: AppColors.logisticsRed, size: 28),
          const SizedBox(width: 8.0),
          Text(
            _isPickupStop ? 'Bao Lay Hang That Bai' : 'Bao Giao Hang That Bai',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Don hang: ${widget.stop['orderCode'] ?? ''}',
            style: const TextStyle(
                fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.logisticsRed),
          ),
          const SizedBox(height: 12),
          const Text('Chon ly do khong the hoan thanh:',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _selectedReason,
            isExpanded: true,
            decoration: InputDecoration(
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
            items: _reasonsList
                .map((r) => DropdownMenuItem(
                      value: r,
                      child: Text(r, style: const TextStyle(fontSize: 11)),
                    ))
                .toList(),
            onChanged: (val) {
              if (val != null) setState(() => _selectedReason = val);
            },
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _noteController,
            maxLines: 2,
            style: const TextStyle(fontSize: 11),
            decoration: InputDecoration(
              labelText: 'Ghi chu chi tiet (Khong bat buoc)',
              labelStyle: const TextStyle(fontSize: 10),
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
          onPressed: () async {
            Navigator.pop(context);

            final finalReason =
                (_selectedReason == 'Ly do khac' && _noteController.text.trim().isNotEmpty)
                    ? _noteController.text.trim()
                    : (_noteController.text.trim().isNotEmpty
                        ? '$_selectedReason - ${_noteController.text.trim()}'
                        : _selectedReason);

            final orderCode = widget.stop['orderCode'];
            final shipmentId = widget.stop['shipmentId'];
            final targetStatus = _isPickupStop ? 'PICK_FAILED' : 'DELIVERY_FAILED';

            if (orderCode != null) {
              await DriverService.updateOrderStatus(
                  orderCode.toString(), targetStatus, reason: finalReason);
            }
            if (shipmentId != null) {
              await DriverService.updateShipmentStatus(
                  shipmentId.toString(), targetStatus, notes: finalReason);
            }

            widget.onConfirmed();
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.logisticsRed,
            foregroundColor: AppColors.pureWhite,
          ),
          child: const Text('Xac nhan bao loi'),
        ),
      ],
    );
  }
}
