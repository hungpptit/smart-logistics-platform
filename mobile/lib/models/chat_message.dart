enum MessageStatus { sending, sent, failed }

class ChatMessage {
  final String id;
  final String text;
  final bool isUser;
  final String time;
  final String? imageBase64;
  final String? imageUrl;
  final String? toolName;
  final String? senderName;
  MessageStatus status;

  bool get isStaffSupport => toolName == 'STAFF_SUPPORT';
  bool get isStaffReply => toolName == 'STAFF_SUPPORT_REPLY';

  ChatMessage({
    required this.id,
    required this.text,
    required this.isUser,
    required this.time,
    this.imageBase64,
    this.imageUrl,
    this.toolName,
    this.senderName,
    this.status = MessageStatus.sent,
  });
}
