import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:image_picker/image_picker.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../../core/theme/app_colors.dart';
import '../../core/utils/app_snackbar.dart';
import '../../core/utils/time_format.dart';
import '../../models/chat_message.dart';
import '../../services/driver_chat_service.dart';
import 'widgets/chat/ai_message_bubble.dart';
import 'widgets/chat/attached_image_bar.dart';
import 'widgets/chat/chat_app_bar_title.dart';
import 'widgets/chat/chat_input_bar.dart';
import 'widgets/chat/quick_chips_bar.dart';
import 'widgets/chat/typing_indicator.dart';

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

  // Ngưỡng thời gian: Khi debug = 30s & 60s để test nhanh; Khi production/báo cáo = 180s (3p) & 300s (5p)
  static const int _timeoutRemindSec = kDebugMode ? 30 : 180;
  static const int _timeoutCloseSec = kDebugMode ? 60 : 300;

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

  // Timers & Mốc thời gian
  DateTime? _lastAiReplyTimestamp;
  Timer? _reminderTimer;
  Timer? _closeTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initSpeechToText();
    _loadConversationHistory();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cancelTimers();
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
      _checkBackgroundTimeout();
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

      // Nếu phiên trước đó đã ĐÓNG (CLOSED):
      // Thoát ra vào lại sẽ khởi tạo ngay phiên mới sạch sẽ, không giữ phiên cũ đã đóng
      if (_isClosed) {
        setState(() {
          _conversationId = null;
          _isClosed = false;
          _messages = _getDefaultWelcomeMessage();
          _lastAiReplyTimestamp = null;
          _isLoadingHistory = false;
        });
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
          status: MessageStatus.sent,
        ));

        // Mốc thời gian: Lấy tin trợ lý thật cuối cùng (bỏ qua tin nhắc nhở)
        if (!isUser && !content.contains('Quý khách có cần') && !content.contains('bác tài còn cần')) {
          lastRealAiTime = msgDate;
        }
      }

      setState(() {
        _messages = loaded.isNotEmpty ? loaded : _getDefaultWelcomeMessage();
        _lastAiReplyTimestamp = lastRealAiTime;
        _isLoadingHistory = false;
      });

      // Lập lịch timeout nếu phiên còn mở
      if (!_isClosed && _lastAiReplyTimestamp != null) {
        _scheduleTimers();
        _checkBackgroundTimeout();
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
  // 4. ĐIỀU PHỐI TIMEOUT 3 PHÚT / 5 PHÚT
  // ==========================================
  void _cancelTimers() {
    _reminderTimer?.cancel();
    _closeTimer?.cancel();
    _reminderTimer = null;
    _closeTimer = null;
  }

  void _scheduleTimers() {
    _cancelTimers();
    if (_isClosed || _lastAiReplyTimestamp == null) return;

    final elapsed = DateTime.now().difference(_lastAiReplyTimestamp!).inSeconds;

    // Timer nhắc nhở (3 phút)
    final remainingRemind = _timeoutRemindSec - elapsed;
    if (remainingRemind > 0) {
      _reminderTimer = Timer(Duration(seconds: remainingRemind), () {
        _handleTimeoutEvent('REMINDER_3M');
      });
    }

    // Timer đóng phiên (5 phút)
    final remainingClose = _timeoutCloseSec - elapsed;
    if (remainingClose > 0) {
      _closeTimer = Timer(Duration(seconds: remainingClose), () {
        _handleTimeoutEvent('CLOSE_5M');
      });
    }
  }

  void _checkBackgroundTimeout() {
    if (_isClosed || _lastAiReplyTimestamp == null || _conversationId == null) return;

    final elapsed = DateTime.now().difference(_lastAiReplyTimestamp!).inSeconds;

    if (elapsed >= _timeoutCloseSec) {
      _handleTimeoutEvent('CLOSE_5M');
    } else if (elapsed >= _timeoutRemindSec) {
      _handleTimeoutEvent('REMINDER_3M');
    }
  }

  Future<void> _handleTimeoutEvent(String action) async {
    if (!mounted || _conversationId == null || _isClosed) return;

    final res = await DriverChatService.timeoutCheck(
      conversationId: _conversationId!,
      action: action,
    );
    if (!mounted) return;

    if (res['success'] == true) {
      final act = res['action'];
      if (act == 'REMINDED') {
        final timeStr = formatHHmm(DateTime.now());
        final reminderText = res['message']?['text'] ??
            'Bác tài ơi, bác có còn cần Trợ lý AI hỗ trợ thêm thông tin gì trên tuyến đường nữa không ạ?';

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
      } else if (act == 'CLOSED') {
        final timeStr = formatHHmm(DateTime.now());
        final closingText = res['message']?['text'] ??
            'Do không nhận được phản hồi, Trợ lý AI xin phép tạm đóng phiên hỗ trợ. Chúc bác tài vạn dặm bình an!';

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
        _cancelTimers();
        _scrollToBottom();
      }
    }
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

    _cancelTimers(); // Hủy ngay bộ đếm khi tài xế gửi tin

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
      if (_isClosed) _isClosed = false; // Mở lại phiên khi tài xế gửi tin
    });
    _scrollToBottom();

    // Gọi API Backend thật
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
        _lastAiReplyTimestamp = DateTime.now();
        _messages.add(ChatMessage(
          id: UniqueKey().toString(),
          text: replyText,
          isUser: false,
          time: replyTimeStr,
          status: MessageStatus.sent,
        ));
      });

      _scheduleTimers(); // Lập lịch timeout sau câu trả lời của AI
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
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Tạo cuộc trò chuyện mới?'),
        content: const Text('Phiên hiện tại sẽ được lưu trữ và làm mới khung chat.'),
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

    _cancelTimers();
    final res = await DriverChatService.createNewConversation();
    if (!mounted) return;

    if (res['success'] == true) {
      setState(() {
        _conversationId = res['conversationId'];
        _isClosed = false;
        _messages = _getDefaultWelcomeMessage();
        _lastAiReplyTimestamp = null;
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
            // Quick Prompt Chips (3 chip chuẩn)
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
                        return _buildMessageBubble(_messages[index]);
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

  Widget _buildMessageBubble(ChatMessage msg) {
    if (msg.isUser) {
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
                      onTap: () => _sendMessage(retryMessage: msg),
                      child: const Text('Thử lại', style: TextStyle(fontSize: 11.0, color: Colors.blue, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
          ],
        ),
      );
    } else {
      return AiMessageBubble(msg: msg);
    }
  }

}
