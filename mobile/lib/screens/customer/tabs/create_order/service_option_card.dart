import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

/// Tappable card for selecting a shipping service level.
/// UI preserved exactly from original _buildServiceOptionCard method.
class ServiceOptionCard extends StatelessWidget {
  final String code;
  final String title;
  final String subtitle;
  final String priceText;
  final bool isSelected;
  final VoidCallback onTap;

  const ServiceOptionCard({
    super.key,
    required this.code,
    required this.title,
    required this.subtitle,
    required this.priceText,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? Colors.red.shade50 : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.logisticsRed : Colors.grey.shade300,
            width: isSelected ? 2.0 : 1.0,
          ),
        ),
        child: Row(
          children: [
            Radio<String>(
              value: code,
              groupValue: isSelected ? code : '',
              activeColor: AppColors.logisticsRed,
              onChanged: (_) => onTap(),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: isSelected ? AppColors.logisticsRed : AppColors.deepOnyx,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ),
            Text(
              priceText,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: AppColors.logisticsRed,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
