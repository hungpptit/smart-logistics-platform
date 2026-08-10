import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';

/// Step indicator bar showing current progress through the order form.
/// UI preserved exactly from original _buildStepIndicator/_buildStepItem/_buildStepLine methods.
class OrderStepIndicator extends StatelessWidget {
  final int currentStep;

  const OrderStepIndicator({super.key, required this.currentStep});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16.0),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStepItem(0, '1 & 2', 'Dia chi'),
          _buildStepLine(0),
          _buildStepItem(1, '3', 'Hang hoa'),
          _buildStepLine(1),
          _buildStepItem(2, '4', 'Thanh toan'),
        ],
      ),
    );
  }

  Widget _buildStepItem(int stepIndex, String stepNum, String title) {
    final isActive = currentStep == stepIndex;
    final isDone = currentStep > stepIndex;

    return Row(
      children: [
        CircleAvatar(
          radius: 14.0,
          backgroundColor: isDone
              ? const Color(0xFF166534)
              : isActive
                  ? AppColors.logisticsRed
                  : AppColors.surfaceContainerHigh,
          child: isDone
              ? const Icon(Icons.check, size: 14.0, color: Colors.white)
              : Text(
                  stepNum,
                  style: TextStyle(
                    color: isActive ? Colors.white : AppColors.secondary,
                    fontWeight: FontWeight.bold,
                    fontSize: 11.0,
                  ),
                ),
        ),
        const SizedBox(width: 6.0),
        Text(
          title,
          style: AppTypography.labelMd.copyWith(
            color: isActive ? AppColors.deepOnyx : AppColors.secondary,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
            fontSize: 12.0,
          ),
        ),
      ],
    );
  }

  Widget _buildStepLine(int stepIndex) {
    final isDone = currentStep > stepIndex;
    return Expanded(
      child: Container(
        height: 2.0,
        margin: const EdgeInsets.symmetric(horizontal: 4.0),
        color: isDone ? const Color(0xFF166534) : AppColors.surfaceContainerHigh,
      ),
    );
  }
}
