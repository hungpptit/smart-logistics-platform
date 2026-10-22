import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'nav_config.dart';
import 'route_model.dart';

/// Text-to-Speech (TTS) Voice Guidance for Turn-by-Turn navigation & Camera Alerts
class VoiceGuide {
  static final VoiceGuide _instance = VoiceGuide._internal();
  factory VoiceGuide() => _instance;
  VoiceGuide._internal();

  FlutterTts? _tts;
  bool _isInitialized = false;
  bool _isInitializing = false;
  bool isEnabled = true;
  bool _isVietnamese = true;

  Future<void> init() async {
    if (_isInitialized) return;
    if (_isInitializing) return;
    _isInitializing = true;
    try {
      _tts ??= FlutterTts();

      // Gọi getLanguages để đảm bảo IPC bindService với Android TextToSpeech engine hoàn tất
      try {
        await _tts!.getLanguages;
      } catch (_) {}

      // Ưu tiên tiếng Việt (vi-VN / vi)
      bool langSet = false;
      try {
        final dynamic res = await _tts!.setLanguage('vi-VN');
        if (res == 1 || res == true || res == '1') langSet = true;
      } catch (_) {}
      if (!langSet) {
        try {
          final dynamic res = await _tts!.setLanguage('vi');
          if (res == 1 || res == true || res == '1') langSet = true;
        } catch (_) {}
      }

      if (langSet) {
        _isVietnamese = true;
        debugPrint('🎙️ [VoiceGuide] Đã kích hoạt ngôn ngữ Tiếng Việt (vi-VN) thành công');
      } else {
        // Fallback sang tiếng Anh nếu thiết bị chưa cài gói tiếng Việt
        _isVietnamese = false;
        try {
          await _tts!.setLanguage('en-US');
        } catch (_) {}
        debugPrint('🎙️ [VoiceGuide] Thiết bị chưa có gói vi-VN, tự động chuyển sang tiếng Anh (en-US)');
      }

      await _tts!.setSpeechRate(0.5);
      await _tts!.setVolume(1.0);
      await _tts!.setPitch(1.0);
      
      try {
        await _tts!.awaitSpeakCompletion(false);
      } catch (_) {}

      _isInitialized = true;
    } catch (e) {
      debugPrint('⚠️ [VoiceGuide] Lỗi khởi tạo TTS: $e');
    } finally {
      _isInitializing = false;
    }
  }

  bool get isAvailable => _isInitialized;
  bool get isVietnamese => _isVietnamese;

  Future<void> stop() async {
    try {
      await _tts?.stop();
    } catch (_) {}
  }

  /// Phát âm thanh kiểm tra (Test Speak)
  Future<void> testSpeak() async {
    await init();
    if (_isVietnamese) {
      await _speak('Hệ thống cảnh báo camera phạt nguội và dẫn đường đã kích hoạt thành công.');
    } else {
      await _speak('Speed enforcement camera alert and navigation system is active.');
    }
  }

  /// Cảnh báo camera phạt nguội (Hỗ trợ ưu tiên Tiếng Việt, tự động fallback Tiếng Anh)
  Future<void> speakCameraAlert({String cameraName = '', double? distanceMeters}) async {
    if (!isEnabled) return;
    final distVi = distanceMeters != null ? ', cách ${distanceMeters.round()} mét' : '';
    final distEn = distanceMeters != null ? ' in ${distanceMeters.round()} meters' : '';
    if (_isVietnamese) {
      final phrase = cameraName.isNotEmpty
          ? 'Chú ý! Phía trước có camera phạt nguội, $cameraName$distVi'
          : 'Chú ý! Phía trước có camera phạt nguội$distVi';
      await _speak(phrase);
    } else {
      final phrase = cameraName.isNotEmpty
          ? 'Warning! Traffic camera ahead at $cameraName$distEn'
          : 'Warning! Speed enforcement camera ahead$distEn';
      await _speak(phrase);
    }
  }

  /// Mở rộng viết tắt và định dạng câu tiếng Việt
  static String cleanVietnameseSpeechText(String raw) {
    String text = raw
        .replaceAll(RegExp(r'<[^>]*>'), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();

    text = text.replaceAllMapped(RegExp(r'\bQL\s*(\d+)', caseSensitive: false), (m) => 'quốc lộ ${m[1]}');
    text = text.replaceAllMapped(RegExp(r'\bĐT\s*(\d+)', caseSensitive: false), (m) => 'đường tỉnh ${m[1]}');
    text = text.replaceAll(RegExp(r'\bTP\.\s*', caseSensitive: false), 'thành phố ');
    text = text.replaceAll(RegExp(r'\bQ\.\s*', caseSensitive: false), 'quận ');
    text = text.replaceAll(RegExp(r'\bP\.\s*', caseSensitive: false), 'phường ');
    text = text.replaceAll(RegExp(r'\bĐ\.\s*', caseSensitive: false), 'đường ');
    return text;
  }

  static String roundDistanceToSpokenVietnamese(double meters) {
    if (meters >= 1000) {
      final km = (meters / 1000.0).toStringAsFixed(1).replaceAll('.0', '');
      return 'sau $km ki-lô-mét';
    }
    if (meters > 500) return 'sau khoảng 500 mét';
    if (meters > 300) return 'sau 300 mét';
    if (meters > 200) return 'sau 200 mét';
    if (meters > 150) return 'sau 150 mét';
    if (meters > 100) return 'sau 100 mét';
    if (meters > 50) return 'sau 50 mét';
    return 'ngay phía trước';
  }

  /// Speak instruction immediately (e.g. at start or manual tap)
  Future<void> speakInstruction(String rawText, {String prefix = ''}) async {
    if (!isEnabled) return;
    if (!_isInitialized) await init();
    final clean = _isVietnamese ? cleanVietnameseSpeechText(rawText) : rawText;
    final msg = prefix.isNotEmpty ? '$prefix $clean' : clean;
    await _speak(msg);
  }

  /// Evaluate distance to turn and speak if step announcement milestones are reached
  Future<void> evaluateAndSpeak({
    required NavStep currentStep,
    NavStep? nextStep,
    required double distanceToTurnMeters,
    required double speedMps,
  }) async {
    if (!isEnabled) return;
    if (!_isInitialized) await init();

    final double farThreshold = NavConfig.voiceFarThresholdBaseMeters +
        speedMps * NavConfig.voiceFarSpeedMultiplier;
    final double nearThreshold = NavConfig.voiceNearThresholdBaseMeters +
        speedMps * NavConfig.voiceNearSpeedMultiplier;

    // Milestone 1: Far warning
    if (distanceToTurnMeters <= farThreshold &&
        distanceToTurnMeters > nearThreshold &&
        !currentStep.announcedFar) {
      currentStep.announcedFar = true;
      final distText = roundDistanceToSpokenVietnamese(distanceToTurnMeters);
      final instruction = cleanVietnameseSpeechText(currentStep.instruction);
      final phrase = '$distText, $instruction';
      await _speak(phrase);
      return;
    }

    // Milestone 2: Near warning (Turn now)
    if (distanceToTurnMeters <= nearThreshold && !currentStep.announcedNear) {
      currentStep.announcedNear = true;
      final instruction = cleanVietnameseSpeechText(currentStep.instruction);

      // Check if subsequent step is very close (< 50m)
      if (nextStep != null && nextStep.stepLengthMeters <= NavConfig.shortNextStepThresholdMeters) {
        final nextInstruction = cleanVietnameseSpeechText(nextStep.instruction);
        final phrase = '$instruction, sau đó $nextInstruction ngay';
        await _speak(phrase);
      } else {
        await _speak(instruction);
      }
    }
  }

  Future<void> speakRerouting() async {
    if (!isEnabled) return;
    if (!_isInitialized) await init();
    await _speak(_isVietnamese ? 'Đang tính toán lại lộ trình' : 'Rerouting, calculating new path');
  }

  Future<void> speakArrival() async {
    if (!isEnabled) return;
    if (!_isInitialized) await init();
    await _speak(_isVietnamese ? 'Bạn đã đến điểm giao nhận' : 'You have arrived at your destination');
  }

  Future<void> _speak(String message) async {
    try {
      if (!_isInitialized) await init();
      debugPrint('🔊 [VoiceGuide] Phát âm thanh (${_isVietnamese ? "VI" : "EN"}): "$message"');
      final result = await _tts?.speak(message);
      debugPrint('🔊 [VoiceGuide] Kết quả gọi TTS speak: $result');
    } catch (e) {
      debugPrint('⚠️ [VoiceGuide] Lỗi phát âm: $e');
    }
  }
}
