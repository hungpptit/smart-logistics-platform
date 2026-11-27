import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../../core/theme/app_colors.dart';
import '../../core/utils/app_snackbar.dart';
import '../../core/utils/time_format.dart';
import '../../models/chat_message.dart';
import '../../services/driver_chat_service.dart';
import '../../services/socket_service.dart';
import 'controllers/chat_timeout_controller.dart';
import 'widgets/chat/ai_message_bubble.dart';
import 'widgets/chat/attached_image_bar.dart';
import 'widgets/chat/chat_app_bar_title.dart';
import 'widgets/chat/chat_input_bar.dart';
import 'widgets/chat/quick_chips_bar.dart';
import 'widgets/chat/typing_indicator.dart';
import 'widgets/chat/user_message_bubble.dart';

class DriverChatScreen extends StatefulWidget {
  const DriverChatScreen({super.key});

  @override
  State<DriverChatScreen> createState() => _DriverChatScreenState();
}

class _DriverChatScreenState extends State<DriverChatScreen> with WidgetsBindingObserver {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final ImagePicker _imagePicker = ImagePicker();
  final stt.SpeechToText _speechToText = stt.SpeechToText();

  // 6 Chip thao tác nhanh cho tài xế (3 chip nghiệp vụ + 3 chip công cụ tra cứu)
  final List<String> _quickChips = [
    'Không liên hệ được khách',
    'Báo kẹt xe / chậm ETA',
    'Quy trình nộp tiền COD',
    'Điểm giao kế tiếp',
    'COD hôm nay',
    'Tìm bưu cục gần nhất',
  ];

  List<ChatMessage> _messages = [];
  String? _conversationId;
  bool _isLoadingHistory = true;
  bool _isAITyping = false;
  bool _isSending = false;
  bool _isClosed = false;

  // Speech-to-Text state
  bool _speechAvailable = false;
  bool _hasVietnamese = false;
  bool _isListening = false;

  // Image attachment state
  String? _attachedImageBase64;
  File? _attachedImageFile;

  // Điều phối timeout 3p / 5p
  late final ChatTimeoutController _timeoutController;

  @override
  void initState() {
    super.initState();
    _timeoutController = ChatTimeoutController(
      onReminder: (reminderText) {
        if (!mounted) return;
        final timeStr = formatHHmm(DateTime.now());
        setState(() {
          _messages.add(ChatMessage(
            id: UniqueKey().toString(),
            text: reminderText,
            isUser: false,
            time: timeStr,
            status: MessageStatus.sent,
          ));
        });
        _scrollToBottom();
      },
      onClosed: (closingText) {
        if (!mounted) return;
        final timeStr = formatHHmm(DateTime.now());
        setState(() {
          _isClosed = true;
          _messages.add(ChatMessage(
            id: UniqueKey().toString(),
            text: closingText,
            isUser: false,
            time: timeStr,
            status: MessageStatus.sent,
          ));
        });
        _scrollToBottom();
      },
    );
    WidgetsBinding.instance.addObserver(this);
    SocketService().emitChatScreenActive(true);
    SocketService().onChatNewMessage(_handleIncomingSocketMessage);
    _initSpeechToText();
    _loadConversationHistory();
  }

  @override
  void dispose() {
    SocketService().removeChatNewMessageListener(_handleIncomingSocketMessage);
    SocketService().emitChatScreenActive(false);
    WidgetsBinding.instance.removeObserver(this);
    _timeoutController.dispose();
    _textController.dispose();
    _scrollController.dispose();
    _speechToText.stop();
    try {
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
    } catch (_) {}
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Khi app từ background quay lại foreground, kiểm tra thời gian đã trôi qua
      _timeoutController.checkBackgroundTimeout();
    }
  }

  // ==========================================
  // 1. KHỞI TẠO SPEECH-TO-TEXT TIẾNG VIỆT
  // ==========================================
  Future<void> _initSpeechToText() async {
    try {
      _speechAvailable = await _speechToText.initialize(
        onError: (err) {
          debugPrint('⚠️ [STT] Lỗi nhận diện giọng nói: ${err.errorMsg}');
          if (mounted) setState(() => _isListening = false);
        },
        onStatus: (status) {
          debugPrint('🎙️ [STT] Trạng thái: $status');
          if (status == 'done' || status == 'notListening') {
            if (mounted) setState(() => _isListening = false);
          }
        },
      );

      if (_speechAvailable) {
        final locales = await _speechToText.locales();
        _hasVietnamese = locales.any((l) => l.localeId.toLowerCase().startsWith('vi'));
        debugPrint('🎙️ [STT] Khởi tạo thành công. Hỗ trợ tiếng Việt: $_hasVietnamese');
      }
    } catch (e) {
      debugPrint('⚠️ [STT] Ngoại lệ khởi tạo STT: $e');
      _speechAvailable = false;
      _hasVietnamese = false;
    }
  }

  void _toggleListening() async {
    if (!_speechAvailable) {
      AppSnackBar.show(
        context,
        content: const Text('Tính năng nhận diện giọng nói không khả dụng trên thiết bị này.'),
        backgroundColor: Colors.orange,
      );
      return;
    }

    if (!_hasVietnamese) {
      AppSnackBar.show(
        context,
        content: const Text('Thiết bị chưa cài đặt nhận dạng giọng nói Tiếng Việt. Bác tài vui lòng bật Google Speech Services hoặc nhập văn bản.'),
        backgroundColor: AppColors.logisticsRed,
      );
      return;
    }

    if (_isListening) {
      await _speechToText.stop();
      if (mounted) setState(() => _isListening = false);
    } else {
      if (mounted) setState(() => _isListening = true);
      await _speechToText.listen(
        onResult: (result) {
          if (mounted) {
            setState(() {
              _textController.text = result.recognizedWords;
              _textController.selection = TextSelection.fromPosition(
                TextPosition(offset: _textController.text.length),
              );
            });
          }
        },
        listenOptions: stt.SpeechListenOptions(
          partialResults: true,
          cancelOnError: true,
        ),
      );
    }
  }

  // ==========================================
  // 2. CHỌN & NÉN ẢNH MULTIMODAL
  // ==========================================
  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _imagePicker.pickImage(
        source: source,
        imageQuality: 70, // Nén 70% chất lượng
        maxWidth: 1024,   // Giới hạn chiều rộng 1024px
        maxHeight: 1024,
      );

      if (picked != null) {
        final bytes = await picked.readAsBytes();
        final base64Str = 'data:image/jpeg;base64,${base64Encode(bytes)}';

        if (mounted) {
          setState(() {
            _attachedImageFile = File(picked.path);
            _attachedImageBase64 = base64Str;
          });
        }
      }
    } catch (e) {
      debugPrint('⚠️ [DriverChatScreen] Lỗi chọn ảnh: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Không thể tải ảnh: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _clearAttachedImage() {
    if (mounted) {
      setState(() {
        _attachedImageFile = null;
        _attachedImageBase64 = null;
      });
    }
  }

  void _handleIncomingSocketMessage(Map<String, dynamic> payload) {
    if (!mounted) return;
    final String msgId = payload['id']?.toString() ?? UniqueKey().toString();
    if (_messages.any((m) => m.id == msgId)) return;

    final String content = (payload['text'] ?? payload['content'] ?? '').toString();
    final String? imageVal = payload['imageUrl']?.toString();
    if (content.trim().isEmpty && (imageVal == null || imageVal.isEmpty)) return;

    final String? toolName = payload['toolName']?.toString();
    final String? senderName = payload['senderName']?.toString();
    final String? incomingConvId = payload['conversationId']?.toString();
    final bool isUser = payload['isUser'] == true ||
        payload['role']?.toString().toUpperCase() == 'USER';

    DateTime msgDate = DateTime.now();
    if (payload['createdAt'] != null) {
      msgDate = DateTime.tryParse(payload['createdAt'].toString())?.toLocal() ?? msgDate;
    }
    final String timeStr =
        payload['time']?.toString().isNotEmpty == true ? payload['time'].toString() : formatHHmm(msgDate);

    setState(() {
      if (incomingConvId != null && incomingConvId.isNotEmpty) {
        _conversationId = incomingConvId;
        _isClosed = false;
      }
      _messages.add(ChatMessage(
        id: msgId,
        text: content,
        isUser: isUser,
        time: timeStr,
        imageUrl: imageVal,
        toolName: toolName,
        senderName: senderName,
        status: MessageStatus.sent,
      ));
    });
    _scrollToBottom();
    DriverChatService.markAsRead();
  }

  // ==========================================
  // 3. NẠP LỊCH SỬ THẬT TỪ BACKEND
  // ==========================================
  Future<void> _loadConversationHistory() async {
    if (mounted) setState(() => _isLoadingHistory = true);

    final res = await DriverChatService.getActiveMessages();
    if (!mounted) return;

    if (res['success'] == true) {
      _conversationId = res['conversationId'];
      _isClosed = (res['status'] == 'CLOSED');
      final bool hasUnread = res['hasUnread'] == true;

      // Chỉ tự làm mới phiên đã đóng nếu KHÔNG còn tin nhắn chưa đọc để tài xế không bỏ lỡ thông báo
      if (_isClosed && !hasUnread) {
        setState(() {
          _conversationId = null;
          _isClosed = false;
          _messages = _getDefaultWelcomeMessage();
          _timeoutController.syncState(
            conversationId: null,
            isClosed: false,
            lastAiReplyTimestamp: null,
          );
          _isLoadingHistory = false;
        });
        DriverChatService.markAsRead();
        return;
      }

      final rawMessages = res['messages'] as List<dynamic>? ?? [];
      final List<ChatMessage> loaded = [];

      DateTime? lastRealAiTime;

      for (final m in rawMessages) {
        final sender = m['sender']?.toString().toLowerCase();
        final role = m['role']?.toString().toUpperCase();
        final isUser = (sender == 'user') || (role == 'USER');

        final content = (m['text'] ?? m['content'] ?? '').toString();
        final imageVal = m['image']?.toString();
        // Bỏ qua tin rỗng nếu không có text lẫn image
        if (content.trim().isEmpty && (imageVal == null || imageVal.isEmpty)) continue;

        final String? toolName = m['toolName']?.toString();
        final dynamic actionData = m['actionData'];
        final String? senderName = m['senderName']?.toString() ??
            (actionData is Map ? actionData['senderName']?.toString() : null);

        String timeStr;
        DateTime msgDate = DateTime.now();
        if (m['createdAt'] != null) {
          msgDate = DateTime.tryParse(m['createdAt'].toString())?.toLocal() ?? DateTime.now();
          timeStr = formatHHmm(msgDate);
        } else if (m['timestamp'] != null) {
          timeStr = m['timestamp'].toString();
        } else {
          timeStr = formatHHmm(msgDate);
        }

        loaded.add(ChatMessage(
          id: m['id']?.toString() ?? UniqueKey().toString(),
          text: content,
          isUser: isUser,
          time: timeStr,
          imageUrl: imageVal,
          toolName: toolName,
          senderName: senderName,
          status: MessageStatus.sent,
        ));

        // Mốc thời gian: Lấy tin trợ lý AI thật cuối cùng (bỏ qua tin nhắc nhở và tin STAFF_SUPPORT)
        if (!isUser &&
            toolName != 'STAFF_SUPPORT' &&
            !content.contains('Quý khách có cần') &&
            !content.contains('bác tài còn cần')) {
          lastRealAiTime = msgDate;
        }
      }

      setState(() {
        _messages = loaded.isNotEmpty ? loaded : _getDefaultWelcomeMessage();
        _timeoutController.syncState(
          conversationId: _conversationId,
          isClosed: _isClosed,
          lastAiReplyTimestamp: lastRealAiTime,
        );
        _isLoadingHistory = false;
      });

      DriverChatService.markAsRead();

      // Lập lịch timeout nếu phiên còn mở
      if (!_isClosed && lastRealAiTime != null) {
        _timeoutController.scheduleTimers();
        _timeoutController.checkBackgroundTimeout();
      }
    } else {
      // Chưa có hội thoại hoặc lỗi
      setState(() {
        _messages = _getDefaultWelcomeMessage();
        _isLoadingHistory = false;
      });
    }

    _scrollToBottom();
  }

  List<ChatMessage> _getDefaultWelcomeMessage() {
    final timeStr = formatHHmm(DateTime.now());
    return [
      ChatMessage(
        id: 'welcome',
        text: 'Xin chào bác tài! Em là Trợ lý AI Hỗ trợ & Điều phối Tuyến đường của Velocity. Bác tài cần hỗ trợ xử lý sự cố gì trên chuyến giao/lấy hàng hôm nay ạ?',
        isUser: false,
        time: timeStr,
        status: MessageStatus.sent,
      ),
    ];
  }

  // ==========================================
  // 5. GỬI TIN NHẮN THẬT LÊN BACKEND (API REST)
  // ==========================================
  Future<void> _sendMessage({String? customText, ChatMessage? retryMessage}) async {
    if (_isSending || _isAITyping) return; // Khóa chống gửi đúp

    final text = (customText ?? retryMessage?.text ?? _textController.text).trim();
    final imageBase64 = retryMessage?.imageBase64 ?? _attachedImageBase64;

    if (text.isEmpty && imageBase64 == null) return;

    final timeStr = formatHHmm(DateTime.now());

    _timeoutController.cancelTimers(); // Hủy ngay bộ đếm khi tài xế gửi tin

    late ChatMessage userMsg;
    if (retryMessage != null) {
      userMsg = retryMessage;
      userMsg.status = MessageStatus.sending;
    } else {
      userMsg = ChatMessage(
        id: UniqueKey().toString(),
        text: text.isNotEmpty ? text : '[Hình ảnh sự cố]',
        isUser: true,
        time: timeStr,
        imageBase64: imageBase64,
        status: MessageStatus.sending,
      );
      _messages.add(userMsg);
      _textController.clear();
      _clearAttachedImage();
    }

    setState(() {
      _isSending = true;
      _isAITyping = true;
      if (_isClosed) {
        _isClosed = false; // Mở lại phiên khi tài xế gửi tin
        _timeoutController.isClosed = false;
      }
    });
    _scrollToBottom();

    // Gọi API Backend Trợ lý AI thật
    final res = await DriverChatService.sendMessage(
      message: text,
      imageBase64: imageBase64,
      conversationId: _conversationId,
    );

    if (!mounted) return;

    if (res['success'] == true) {
      final data = res['data'];
      final replyText = data?['reply']?.toString() ?? 'Em đã ghi nhận thông tin từ bác tài.';
      _conversationId = data?['conversationId'] ?? _conversationId;

      final replyTimeStr = formatHHmm(DateTime.now());

      setState(() {
        userMsg.status = MessageStatus.sent;
        _isAITyping = false;
        _isSending = false;
        _timeoutController.syncState(
          conversationId: _conversationId,
          isClosed: _isClosed,
          lastAiReplyTimestamp: DateTime.now(),
        );
        _messages.add(ChatMessage(
          id: UniqueKey().toString(),
          text: replyText,
          isUser: false,
          time: replyTimeStr,
          status: MessageStatus.sent,
        ));
      });

      _timeoutController.scheduleTimers(); // Lập lịch timeout sau câu trả lời của AI
    } else {
      // Xử lý lỗi trung thực (không dùng phản hồi giả mạo)
      final statusCode = res['statusCode'];
      String errorMsg = res['message'] ?? 'Gửi tin nhắn thất bại.';
      if (statusCode == 401) {
        errorMsg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (statusCode == 403) {
        errorMsg = 'Từ chối truy cập: Tài khoản không có quyền Trợ lý Tài xế.';
      }

      setState(() {
        userMsg.status = MessageStatus.failed;
        _isAITyping = false;
        _isSending = false;
      });

      AppSnackBar.show(
        context,
        content: Text(errorMsg),
        backgroundColor: AppColors.logisticsRed,
        action: statusCode == 401
            ? null
            : SnackBarAction(
                label: 'Thử lại',
                textColor: Colors.white,
                onPressed: () => _sendMessage(retryMessage: userMsg),
              ),
      );
    }

    _scrollToBottom();
  }

  // ==========================================
  // 6. TẠO CUỘC TRÒ CHUYỆN MỚI
  // ==========================================
  Future<void> _handleNewConversation() async {
    final bool hasStaffMessages = _messages.any((m) => m.isStaffSupport || m.isStaffReply);
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Tạo cuộc trò chuyện mới?'),
        content: Text(
          hasStaffMessages
              ? 'Cuộc trò chuyện này đang có tin nhắn trao đổi với Nhân viên Kho / Điều phối. Tạo hội thoại mới sẽ mở khung chat AI trống mới (nhân viên Kho vẫn xem được lịch sử trước đó). Bạn có chắc chắn muốn tiếp tục?'
              : 'Phiên hiện tại sẽ được lưu trữ và làm mới khung chat.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.logisticsRed),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Tạo mới', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    _timeoutController.cancelTimers();
    final res = await DriverChatService.createNewConversation();
    if (!mounted) return;

    if (res['success'] == true) {
      setState(() {
        _conversationId = res['conversationId'];
        _isClosed = false;
        _messages = _getDefaultWelcomeMessage();
        _timeoutController.syncState(
          conversationId: _conversationId,
          isClosed: false,
          lastAiReplyTimestamp: null,
        );
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  // ==========================================
  // 7. GIAO DIỆN CHAT UI
  // ==========================================
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.pureWhite,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.deepOnyx, size: 20.0),
          onPressed: () => Navigator.pop(context),
        ),
        titleSpacing: 0,
        title: ChatAppBarTitle(
          isClosed: _isClosed,
          isAITyping: _isAITyping,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_comment_outlined, color: AppColors.deepOnyx, size: 22.0),
            tooltip: 'Hội thoại mới',
            onPressed: _handleNewConversation,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Quick Prompt Chips
            QuickChipsBar(
              chips: _quickChips,
              isDisabled: _isSending || _isAITyping,
              onChipTap: (chip) => _sendMessage(customText: chip),
            ),

            // Chat Message List
            Expanded(
              child: _isLoadingHistory
                  ? const Center(child: CircularProgressIndicator(color: AppColors.logisticsRed))
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
                      itemCount: _messages.length + (_isAITyping ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index == _messages.length && _isAITyping) {
                          return const TypingIndicator();
                        }
                        final msg = _messages[index];
                        return msg.isUser
                            ? UserMessageBubble(
                                msg: msg,
                                onRetry: () => _sendMessage(retryMessage: msg),
                              )
                            : AiMessageBubble(msg: msg);
                      },
                    ),
            ),

            // Attached Image Preview
            if (_attachedImageFile != null)
              AttachedImageBar(
                imageFile: _attachedImageFile!,
                onClear: _clearAttachedImage,
              ),

            // Bottom Input Bar
            ChatInputBar(
              controller: _textController,
              isListening: _isListening,
              isBusy: _isSending || _isAITyping,
              onMic: _toggleListening,
              onCamera: () => _pickImage(ImageSource.camera),
              onSend: () => _sendMessage(),
            ),
          ],
        ),
      ),
    );
  }



}
