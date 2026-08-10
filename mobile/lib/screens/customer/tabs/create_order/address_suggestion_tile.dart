import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../services/location_service.dart';

/// Stateless tile for showing a single address autocomplete suggestion
class AddressSuggestionTile extends StatelessWidget {
  final AddressPrediction item;
  final VoidCallback onTap;

  const AddressSuggestionTile({
    super.key,
    required this.item,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
        child: Row(
          children: [
            const Icon(Icons.location_on_outlined, color: AppColors.secondary, size: 20.0),
            const SizedBox(width: 12.0),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    item.structuredFormatting?.mainText ?? item.description,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13.0,
                      color: AppColors.deepOnyx,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (item.structuredFormatting?.secondaryText?.isNotEmpty == true) ...[
                    const SizedBox(height: 2.0),
                    Text(
                      item.structuredFormatting!.secondaryText!,
                      style: const TextStyle(fontSize: 11.5, color: AppColors.secondary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
