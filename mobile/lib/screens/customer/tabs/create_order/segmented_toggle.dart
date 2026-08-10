import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';

/// Generic segmented toggle button for selecting one value from a set
class SegmentedToggle<T> extends StatelessWidget {
  final T selectedValue;
  final Map<T, String> options;
  final void Function(T value) onChanged;

  const SegmentedToggle({
    super.key,
    required this.selectedValue,
    required this.options,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4.0),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(10.0),
        border: Border.all(color: AppColors.surfaceContainerHighest),
      ),
      child: Row(
        children: options.entries.map((entry) {
          final bool isSelected = selectedValue == entry.key;
          return Expanded(
            child: GestureDetector(
              onTap: () => onChanged(entry.key),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 10.0, horizontal: 4.0),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.logisticsRed : Colors.transparent,
                  borderRadius: BorderRadius.circular(8.0),
                ),
                alignment: Alignment.center,
                child: Text(
                  entry.value,
                  style: AppTypography.labelMd.copyWith(
                    color: isSelected ? AppColors.pureWhite : AppColors.secondary,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    fontSize: 11.5,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
