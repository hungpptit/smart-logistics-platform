import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../models/chat_message.dart';

class UserMessageBubble extends StatelessWidget {
  final ChatMessage msg;
  final VoidCallback onRetry;

  const UserMessageBubble({
    super.key,
    required this.msg,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Padding(
                padding: const EdgeInsets.only(right: 6.0, bottom: 2.0),
                child: Text(
                  msg.time,
                  style: const TextStyle(fontSize: 10.0, color: Colors.grey),
                ),
              ),
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
                  decoration: BoxDecoration(
                    color: msg.status == MessageStatus.failed ? Colors.red.shade400 : AppColors.logisticsRed,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(16.0),
                      topRight: Radius.circular(16.0),
                      bottomLeft: Radius.circular(16.0),
                      bottomRight: Radius.circular(4.0),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.logisticsRed.withValues(alpha: 0.25),
                        blurRadius: 6.0,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (msg.imageBase64 != null) ...[
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8.0),
                          child: Image.memory(
                            base64Decode(msg.imageBase64!.split(',').last),
                            height: 140,
                            width: double.infinity,
                            fit: BoxFit.cover,
                          ),
                        ),
                        const SizedBox(height: 6.0),
                      ] else if (msg.imageUrl != null && msg.imageUrl!.isNotEmpty) ...[
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
                      if (msg.text.isNotEmpty)
                        MarkdownBody(
                          data: msg.text,
                          selectable: false,
                          styleSheet: MarkdownStyleSheet(
                            p: const TextStyle(
                              color: Colors.white,
                              fontSize: 13.5,
                              height: 1.4,
                              fontWeight: FontWeight.w500,
                            ),
                            strong: const TextStyle(
                              color: Colors.white,
                              fontSize: 13.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          // Trạng thái gửi thất bại kèm nút Thử lại
          if (msg.status == MessageStatus.failed)
            Padding(
              padding: const EdgeInsets.only(top: 4.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  const Text('Gửi thất bại', style: TextStyle(fontSize: 11.0, color: Colors.red)),
                  const SizedBox(width: 6.0),
                  InkWell(
                    onTap: onRetry,
                    child: const Text(
                      'Thử lại',
                      style: TextStyle(
                        fontSize: 11.0,
                        color: Colors.blue,
                        fontWeight: FontWeight.bold,
                      ),
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
