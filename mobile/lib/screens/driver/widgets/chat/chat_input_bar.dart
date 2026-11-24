import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class ChatInputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool isListening;
  final bool isBusy;
  final VoidCallback onMic;
  final VoidCallback onCamera;
  final VoidCallback onSend;

  const ChatInputBar({
    super.key,
    required this.controller,
    required this.isListening,
    required this.isBusy,
    required this.onMic,
    required this.onCamera,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 8.0),
      decoration: BoxDecoration(
        color: AppColors.pureWhite,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10.0,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Voice mic button
          IconButton(
            icon: Icon(
              isListening ? Icons.mic_rounded : Icons.mic_none_rounded,
              color: isListening ? AppColors.logisticsRed : AppColors.deepOnyx,
              size: 24.0,
            ),
            tooltip: 'Nói để nhập bằng giọng nói',
            onPressed: isBusy ? null : onMic,
          ),

          // Camera icon
          IconButton(
            icon: const Icon(Icons.camera_alt_outlined, color: AppColors.deepOnyx, size: 22.0),
            tooltip: 'Chụp ảnh sự cố',
            onPressed: isBusy ? null : onCamera,
          ),

          // Text Field (Tự động mở rộng từ 1 đến 5 dòng, sau 5 dòng sẽ cuộn bên trong)
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 2.0),
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(20.0),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: TextField(
                controller: controller,
                enabled: !isBusy, // Khóa khi AI đang trả lời hoặc đang gửi
                minLines: 1,
                maxLines: 5, // Mở rộng tối đa 5 dòng, sau đó bắt đầu cuộn bên trong ô nhập
                keyboardType: TextInputType.multiline,
                textInputAction: TextInputAction.newline,
                style: const TextStyle(fontSize: 13.5, color: AppColors.deepOnyx, height: 1.4),
                decoration: InputDecoration(
                  hintText: isListening ? 'Đang lắng nghe bác tài...' : 'Nói hoặc nhập câu hỏi...',
                  hintStyle: TextStyle(
                    fontSize: 12.5,
                    color: isListening ? AppColors.logisticsRed : Colors.grey,
                  ),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  errorBorder: InputBorder.none,
                  disabledBorder: InputBorder.none,
                  focusedErrorBorder: InputBorder.none,
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(vertical: 9.0),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8.0),

          // Send Button
          Padding(
            padding: const EdgeInsets.only(bottom: 2.0),
            child: InkWell(
              onTap: isBusy ? null : onSend,
              borderRadius: BorderRadius.circular(24.0),
              child: Container(
                width: 42.0,
                height: 42.0,
                decoration: BoxDecoration(
                  color: isBusy ? Colors.grey : AppColors.logisticsRed,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.logisticsRed.withValues(alpha: 0.3),
                      blurRadius: 6.0,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(Icons.send_rounded, color: Colors.white, size: 20.0),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
