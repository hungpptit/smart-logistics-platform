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
    final bool isStaff = msg.isStaffSupport;
    final Color accentColor = isStaff ? AppColors.tertiary : AppColors.logisticsRed;
    final Color bubbleColor = isStaff ? const Color(0xFFF0F6FF) : AppColors.pureWhite;
    final Color borderColor = isStaff
        ? AppColors.tertiary.withValues(alpha: 0.28)
        : const Color(0xFFE5E7EB);
    final String senderLabel =
        msg.senderName != null && msg.senderName!.trim().isNotEmpty
            ? 'Điều phối / Kho • ${msg.senderName!.trim()}'
            : 'Điều phối / Kho';

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
              color: accentColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
              border: Border.all(color: accentColor.withValues(alpha: 0.25)),
            ),
            child: Icon(
              isStaff ? Icons.support_agent_rounded : Icons.smart_toy_rounded,
              color: accentColor,
              size: 18.0,
            ),
          ),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
                  decoration: BoxDecoration(
                    color: bubbleColor,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(4.0),
                      topRight: Radius.circular(16.0),
                      bottomLeft: Radius.circular(16.0),
                      bottomRight: Radius.circular(16.0),
                    ),
                    border: Border.all(color: borderColor),
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
                      if (isStaff) ...[
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.headset_mic_rounded, size: 13.0, color: accentColor),
                            const SizedBox(width: 5.0),
                            Flexible(
                              child: Text(
                                senderLabel,
                                style: TextStyle(
                                  fontSize: 11.0,
                                  fontWeight: FontWeight.w700,
                                  color: accentColor,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6.0),
                      ],
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
