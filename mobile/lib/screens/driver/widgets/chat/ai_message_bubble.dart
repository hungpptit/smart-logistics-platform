import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/chat_markdown_formatter.dart';
import '../../../../models/chat_message.dart';

class AiMessageBubble extends StatelessWidget {
  final ChatMessage msg;

  const AiMessageBubble({
    super.key,
    required this.msg,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 2.0, right: 8.0),
            width: 32.0,
            height: 32.0,
            decoration: BoxDecoration(
              color: AppColors.logisticsRed.withValues(alpha: 0.1),
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.logisticsRed.withValues(alpha: 0.2)),
            ),
            child: const Icon(Icons.smart_toy_rounded, color: AppColors.logisticsRed, size: 18.0),
          ),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
                  decoration: BoxDecoration(
                    color: AppColors.pureWhite,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(4.0),
                      topRight: Radius.circular(16.0),
                      bottomLeft: Radius.circular(16.0),
                      bottomRight: Radius.circular(16.0),
                    ),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 6.0,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (msg.imageUrl != null && msg.imageUrl!.isNotEmpty) ...[
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8.0),
                          child: Image.network(
                            msg.imageUrl!,
                            height: 140,
                            width: double.infinity,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => const SizedBox.shrink(),
                          ),
                        ),
                        const SizedBox(height: 6.0),
                      ],
                      MarkdownBody(
                        data: ChatMarkdownFormatter.format(msg.text),
                        selectable: false,
                        styleSheet: MarkdownStyleSheet(
                          p: const TextStyle(
                            color: AppColors.deepOnyx,
                            fontSize: 13.0,
                            height: 1.5,
                            fontWeight: FontWeight.w400,
                          ),
                          strong: const TextStyle(
                            color: AppColors.deepOnyx,
                            fontSize: 13.0,
                            fontWeight: FontWeight.bold,
                          ),
                          em: const TextStyle(
                            color: AppColors.deepOnyx,
                            fontSize: 13.0,
                            fontStyle: FontStyle.italic,
                          ),
                          listBullet: const TextStyle(
                            color: AppColors.logisticsRed,
                            fontSize: 13.5,
                            fontWeight: FontWeight.bold,
                          ),
                          listIndent: 16.0,
                          blockSpacing: 8.0,
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 3.0, left: 4.0),
                  child: Text(
                    msg.time,
                    style: const TextStyle(fontSize: 10.0, color: Colors.grey),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
