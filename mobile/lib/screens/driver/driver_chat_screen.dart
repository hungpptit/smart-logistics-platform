import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:image_picker/image_picker.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../../core/theme/app_colors.dart';
import '../../services/driver_chat_service.dart';

enum MessageStatus { sending, sent, failed }

class ChatMessage {
  final String id;
  final String text;
  final bool isUser;
  final String time;
  final String? imageBase64;
  final String? imageUrl;
  MessageStatus status;

  ChatMessage({
    required this.id,
    required this.text,
    required this.isUser,
    required this.time,
    this.imageBase64,
    this.imageUrl,
    this.status = MessageStatus.sent,
  });
}

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
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Tính năng nhận diện giọng nói không khả dụng trên thiết bị này.'),
          backgroundColor: Colors.orange,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
          margin: const EdgeInsets.all(16.0),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.0)),
        ),
      );
      return;
    }

    if (!_hasVietnamese) {
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Thiết bị chưa cài đặt nhận dạng giọng nói Tiếng Việt. Bác tài vui lòng bật Google Speech Services hoặc nhập văn bản.'),
          backgroundColor: AppColors.logisticsRed,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
          margin: const EdgeInsets.all(16.0),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.0)),
        ),
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
          timeStr = '${msgDate.hour.toString().padLeft(2, '0')}:${msgDate.minute.toString().padLeft(2, '0')}';
        } else if (m['timestamp'] != null) {
          timeStr = m['timestamp'].toString();
        } else {
          timeStr = '${msgDate.hour.toString().padLeft(2, '0')}:${msgDate.minute.toString().padLeft(2, '0')}';
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
    final now = TimeOfDay.now();
    final timeStr = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
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
        final now = TimeOfDay.now();
        final timeStr = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
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
        final now = TimeOfDay.now();
        final timeStr = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
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

    final now = TimeOfDay.now();
    final timeStr = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

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

      final replyNow = TimeOfDay.now();
      final replyTimeStr = '${replyNow.hour.toString().padLeft(2, '0')}:${replyNow.minute.toString().padLeft(2, '0')}';

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

      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMsg),
          backgroundColor: AppColors.logisticsRed,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
          margin: const EdgeInsets.all(16.0),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10.0)),
          action: statusCode == 401
              ? null
              : SnackBarAction(
                  label: 'Thử lại',
                  textColor: Colors.white,
                  onPressed: () => _sendMessage(retryMessage: userMsg),
                ),
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
        title: Row(
          children: [
            Container(
              width: 38.0,
              height: 38.0,
              decoration: BoxDecoration(
                color: AppColors.logisticsRed.withValues(alpha: 0.1),
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.logisticsRed.withValues(alpha: 0.2)),
              ),
              child: const Icon(Icons.smart_toy_rounded, color: AppColors.logisticsRed, size: 22.0),
            ),
            const SizedBox(width: 10.0),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Trợ lý Điều phối AI',
                  style: TextStyle(
                    fontSize: 15.0,
                    fontWeight: FontWeight.w700,
                    color: AppColors.deepOnyx,
                  ),
                ),
                Row(
                  children: [
                    Container(
                      width: 7.0,
                      height: 7.0,
                      decoration: BoxDecoration(
                        color: _isClosed ? Colors.grey : const Color(0xFF10B981),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4.0),
                    Text(
                      _isClosed ? 'Phiên đã đóng' : (_isAITyping ? 'Đang trả lời...' : 'Sẵn sàng hỗ trợ'),
                      style: TextStyle(
                        fontSize: 11.5,
                        color: _isClosed ? Colors.grey : const Color(0xFF059669),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
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
            _buildQuickChipsBar(),

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
                          return _buildTypingIndicator();
                        }
                        return _buildMessageBubble(_messages[index]);
                      },
                    ),
            ),

            // Attached Image Preview
            if (_attachedImageFile != null) _buildAttachedImageBar(),

            // Bottom Input Bar
            _buildBottomInputBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickChipsBar() {
    return Container(
      height: 48.0,
      color: AppColors.pureWhite,
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 14.0),
        itemCount: _quickChips.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8.0),
        itemBuilder: (context, index) {
          final chip = _quickChips[index];
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
            onPressed: _isSending || _isAITyping ? null : () => _sendMessage(customText: chip),
          );
        },
      ),
    );
  }

  String _formatMarkdownForDisplay(String rawText) {
    if (rawText.isEmpty) return rawText;

    String text = rawText;

    // 1. Chuẩn hóa: Nếu dòng đã có gạch đầu dòng (- hoặc *) trước Bước X thì chuẩn hóa để không bị đúp bullet
    text = text.replaceAllMapped(
      RegExp(r'(?:^|\n)\s*[-*]\s*(\*{0,2}(Bước\s*\d+:?|Lưu ý:?)\*{0,2})', caseSensitive: false),
      (m) => '\n\n- ${m[1]}',
    );

    // 2. Nếu "Bước X:" dính liền trong câu mà chưa có gạch đầu dòng: Tách thành mục danh sách
    text = text.replaceAllMapped(
      RegExp(r'([^\n-*])\s*(\*{0,2}(Bước\s*\d+:?|Lưu ý:?)\*{0,2})', caseSensitive: false),
      (m) => '${m[1]}\n\n- ${m[2]}',
    );

    // 3. Xóa các gạch đầu dòng mồ côi (dòng chỉ có dấu - hoặc *)
    text = text.replaceAll(RegExp(r'^\s*[-*]\s*$', multiLine: true), '');

    // 4. Chuyển các dấu xuống dòng đơn lẻ thành \n\n để Markdown ngắt dòng đẹp mắt
    text = text.replaceAll(RegExp(r'(?<!\n)\n(?!\n)'), '\n\n');

    return text.trim();
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
                          data: _formatMarkdownForDisplay(msg.text),
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

  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
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
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
            decoration: BoxDecoration(
              color: AppColors.pureWhite,
              borderRadius: BorderRadius.circular(16.0),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 14.0,
                  height: 14.0,
                  child: CircularProgressIndicator(strokeWidth: 2.0, color: AppColors.logisticsRed),
                ),
                SizedBox(width: 8.0),
                Text('Trợ lý AI đang xử lý...', style: TextStyle(fontSize: 12.0, color: Colors.grey)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttachedImageBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 6.0),
      color: Colors.grey.shade100,
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8.0),
            child: Image.file(_attachedImageFile!, width: 44.0, height: 44.0, fit: BoxFit.cover),
          ),
          const SizedBox(width: 10.0),
          const Expanded(
            child: Text('Đã đính kèm ảnh sự cố', style: TextStyle(fontSize: 12.0, fontWeight: FontWeight.w500)),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 18.0, color: Colors.grey),
            onPressed: _clearAttachedImage,
          ),
        ],
      ),
    );
  }

  Widget _buildBottomInputBar() {
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
              _isListening ? Icons.mic_rounded : Icons.mic_none_rounded,
              color: _isListening ? AppColors.logisticsRed : AppColors.deepOnyx,
              size: 24.0,
            ),
            tooltip: 'Nói để nhập bằng giọng nói',
            onPressed: _isSending || _isAITyping ? null : _toggleListening,
          ),

          // Camera icon
          IconButton(
            icon: const Icon(Icons.camera_alt_outlined, color: AppColors.deepOnyx, size: 22.0),
            tooltip: 'Chụp ảnh sự cố',
            onPressed: _isSending || _isAITyping
                ? null
                : () => _pickImage(ImageSource.camera),
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
                controller: _textController,
                enabled: !_isSending && !_isAITyping, // Khóa khi AI đang trả lời
                minLines: 1,
                maxLines: 5, // Mở rộng tối đa 5 dòng, sau đó bắt đầu cuộn bên trong ô nhập
                keyboardType: TextInputType.multiline,
                textInputAction: TextInputAction.newline,
                style: const TextStyle(fontSize: 13.5, color: AppColors.deepOnyx, height: 1.4),
                decoration: InputDecoration(
                  hintText: _isListening ? 'Đang lắng nghe bác tài...' : 'Nói hoặc nhập câu hỏi...',
                  hintStyle: TextStyle(
                    fontSize: 12.5,
                    color: _isListening ? AppColors.logisticsRed : Colors.grey,
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
              onTap: _isSending || _isAITyping ? null : () => _sendMessage(),
              borderRadius: BorderRadius.circular(24.0),
              child: Container(
                width: 42.0,
                height: 42.0,
                decoration: BoxDecoration(
                  color: _isSending || _isAITyping ? Colors.grey : AppColors.logisticsRed,
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
