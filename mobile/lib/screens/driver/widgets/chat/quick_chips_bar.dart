import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class QuickChipsBar extends StatelessWidget {
  final List<String> chips;
  final ValueChanged<String> onChipTap;
  final bool isDisabled;

  const QuickChipsBar({
    super.key,
    required this.chips,
    required this.onChipTap,
    this.isDisabled = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48.0,
      color: AppColors.pureWhite,
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 14.0),
        itemCount: chips.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8.0),
        itemBuilder: (context, index) {
          final chip = chips[index];
          return ActionChip(
            label: Text(
              chip,
              style: const TextStyle(
                fontSize: 12.0,
                color: AppColors.deepOnyx,
                fontWeight: FontWeight.w500,
              ),
            ),
            backgroundColor: AppColors.surface,
            side: BorderSide(color: AppColors.surfaceContainerHighest.withValues(alpha: 0.8)),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.0)),
            onPressed: isDisabled ? null : () => onChipTap(chip),
          );
        },
      ),
    );
  }
}
