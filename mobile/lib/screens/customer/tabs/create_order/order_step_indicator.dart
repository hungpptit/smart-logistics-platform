import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';

/// Step indicator bar showing current progress through the order form
class OrderStepIndicator extends StatelessWidget {
  final int currentStep;
  static const int totalSteps = 3;

  const OrderStepIndicator({super.key, required this.currentStep});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _buildStepItem(0, '1', 'Thong tin'),
        _buildStepLine(0),
        _buildStepItem(1, '2', 'Kien hang'),
        _buildStepLine(1),
        _buildStepItem(2, '3', 'Thanh toan'),
      ],
    );
  }

  Widget _buildStepItem(int stepIndex, String stepNum, String title) {
    final bool isCompleted = currentStep > stepIndex;
    final bool isActive = currentStep == stepIndex;
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 32.0,
            height: 32.0,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isCompleted
                  ? Colors.green
                  : (isActive ? AppColors.logisticsRed : AppColors.surfaceContainerHighest),
              border: isActive
                  ? Border.all(color: AppColors.logisticsRed, width: 2.0)
                  : null,
            ),
            alignment: Alignment.center,
            child: isCompleted
                ? const Icon(Icons.check, color: Colors.white, size: 16.0)
                : Text(
                    stepNum,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isActive ? AppColors.pureWhite : AppColors.secondary,
                    ),
                  ),
          ),
          const SizedBox(height: 6.0),
          Text(
            title,
            style: AppTypography.labelMd.copyWith(
              color: isActive ? AppColors.logisticsRed : AppColors.secondary,
              fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
              fontSize: 11.0,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildStepLine(int stepIndex) {
    return Container(
      height: 2.0,
      width: 24.0,
      color: currentStep > stepIndex ? Colors.green : AppColors.surfaceContainerHighest,
    );
  }
}
