import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'nav_config.dart';
import 'route_model.dart';

/// Text-to-Speech (TTS) Voice Guidance for Turn-by-Turn navigation
class VoiceGuide {
  FlutterTts? _tts;
  bool _isInitialized = false;
  bool isEnabled = true;

  Future<void> init() async {
    if (_isInitialized) return;
    try {
      _tts = FlutterTts();

      // On Android, prefer Google Speech Services (best Vietnamese TTS)
      try {
        final dynamic engines = await _tts!.getEngines;
        if (engines is List && engines.contains('com.google.android.tts')) {
          await _tts!.setEngine('com.google.android.tts');
          debugPrint('🎙️ [VoiceGuide] Selected Google TTS engine');
        }
      } catch (_) {}

      // Try vi-VN first, fallback to vi
      bool langSet = false;
      try {
        final dynamic res = await _tts!.setLanguage('vi-VN');
        if (res == 1 || res == true || res == '1') langSet = true;
      } catch (_) {}
      if (!langSet) {
        try {
          await _tts!.setLanguage('vi');
        } catch (_) {}
      }

      await _tts!.setSpeechRate(0.5);
      await _tts!.setVolume(1.0);
      await _tts!.setPitch(1.0);
      await _tts!.awaitSpeakCompletion(true);

      _isInitialized = true;
      debugPrint('🎙️ [VoiceGuide] Initialized vi-VN TTS completed');
    } catch (e) {
      debugPrint('⚠️ [VoiceGuide] Error initializing TTS: $e');
    }
  }

  bool get isAvailable => _isInitialized;

  Future<void> stop() async {
    try {
      await _tts?.stop();
    } catch (_) {}
  }

  /// Clean and expand Vietnamese abbreviations for natural pronunciation
  static String cleanSpeechText(String raw) {
    String text = raw
        .replaceAll(RegExp(r'<[^>]*>'), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();

    // Expand road abbreviations
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
      return '$km ki-lô-mét';
    }
    if (meters > 500) return 'khoảng 500 mét';
    if (meters > 300) return '300 mét';
    if (meters > 200) return '200 mét';
    if (meters > 150) return '150 mét';
    if (meters > 100) return '100 mét';
    if (meters > 50) return '50 mét';
    return 'ngay phía trước';
  }

  /// Speak instruction immediately (e.g. at start or manual tap)
  Future<void> speakInstruction(String rawText, {String prefix = ''}) async {
    if (!isEnabled) return;
    if (!_isInitialized) await init();
    final clean = cleanSpeechText(rawText);
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
      final instruction = cleanSpeechText(currentStep.instruction);
      final phrase = 'Sau $distText, $instruction';
      await _speak(phrase);
      return;
    }

    // Milestone 2: Near warning (Turn now)
    if (distanceToTurnMeters <= nearThreshold && !currentStep.announcedNear) {
      currentStep.announcedNear = true;
      final instruction = cleanSpeechText(currentStep.instruction);

      // Check if subsequent step is very close (< 50m)
      if (nextStep != null && nextStep.stepLengthMeters <= NavConfig.shortNextStepThresholdMeters) {
        final nextInstruction = cleanSpeechText(nextStep.instruction);
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
    await _speak('Đang tính toán lại lộ trình');
  }

  Future<void> speakArrival() async {
    if (!isEnabled) return;
    if (!_isInitialized) await init();
    await _speak('Bạn đã đến nơi');
  }

  Future<void> _speak(String message) async {
    try {
      await _tts?.stop();
      await _tts?.speak(message);
    } catch (e) {
      debugPrint('⚠️ [VoiceGuide] Speak error: $e');
    }
  }
}
