import 'package:geolocator/geolocator.dart';
import 'nav_config.dart';

/// Mẫu tốc độ đã qua bộ lọc chất lượng
class SpeedSample {
  final double kmh;
  final DateTime timestamp;

  const SpeedSample(this.kmh, this.timestamp);
}

/// 1. Bộ lọc chất lượng GPS (SpeedFilter)
/// Loại bỏ mẫu quá cũ, mẫu sai số lớn, mẫu âm, gia tốc phi thực tế,
/// và triệt tiêu trôi dạt khi đứng yên.
class SpeedFilter {
  double? _lastKmh;
  DateTime? _lastTime;
  int _consecutiveRejected = 0;

  /// Lọc một mẫu Position từ GPS.
  /// Trả về [SpeedSample] nếu đạt chuẩn, hoặc null nếu bị loại.
  SpeedSample? process(Position p, {DateTime? now}) {
    final currentTime = now ?? DateTime.now();

    // 1. Loại bỏ mẫu quá cũ (> gpsSampleMaxAgeSeconds trong quá khứ)
    if (currentTime.difference(p.timestamp).inSeconds > NavConfig.gpsSampleMaxAgeSeconds) {
      return null;
    }

    // 2. Loại bỏ mẫu sai số vị trí lớn
    if (p.accuracy > NavConfig.maxGpsAccuracyMeters) {
      return null;
    }

    // 3. Loại bỏ mẫu sai số tốc độ lớn (nếu thiết bị có trả về speedAccuracy)
    if (p.speedAccuracy > 0 && p.speedAccuracy > NavConfig.maxSpeedAccuracyMps) {
      return null;
    }

    // 4. Loại bỏ tốc độ âm
    if (p.speed < 0) {
      return null;
    }

    // Đổi sang km/h từ tốc độ Doppler của chip GPS (m/s * 3.6)
    var kmh = p.speed * 3.6;

    // 5. Triệt tiêu đứng yên giả (Zero-Speed Snapping)
    // GPS hay báo 1-2.5 km/h khi đứng đèn đỏ. Nếu < minMovingSpeedKmh thì ép về 0.
    if (kmh < NavConfig.minMovingSpeedKmh) {
      kmh = 0.0;
    }

    // 6. Lọc gia tốc phi thực tế (do nhiễu nhảy vọt GPS)
    if (_lastKmh != null && _lastTime != null) {
      final dt = p.timestamp.difference(_lastTime!).inMilliseconds.abs() / 1000.0;
      if (dt > 0.05) {
        final speedDelta = (kmh - _lastKmh!).abs();
        final accelKmhPerSec = speedDelta / dt;
        if (accelKmhPerSec > NavConfig.maxSpeedJumpKmhPerSec) {
          _consecutiveRejected++;
          // Nếu bị từ chối 3 lần liên tiếp thì chấp nhận reset mẫu để không bị kẹt ở mẫu cũ
          if (_consecutiveRejected < 3) {
            return null;
          }
        }
      }
    }

    _consecutiveRejected = 0;
    _lastKmh = kmh;
    _lastTime = p.timestamp;
    return SpeedSample(kmh, p.timestamp);
  }

  void reset() {
    _lastKmh = null;
    _lastTime = null;
    _consecutiveRejected = 0;
  }
}

/// 2. Bộ làm mượt tốc độ thích ứng (SpeedSmoother - Adaptive EMA)
///
/// Thay cho moving average cửa sổ 3 mẫu (luôn trễ ~1-1.5s).
/// Nguyên tắc: tốc độ ổn định thì làm mượt để số không giật,
/// còn đang tăng/giảm tốc (chênh lệch lớn) thì bám sát mẫu mới.
///
/// Giữ nguyên API cũ (add / currentAverage / reset) nên code đang gọi không phải sửa.
class SpeedSmoother {
  /// Chênh lệch (km/h) so với giá trị đang hiển thị để coi là "đang tăng/giảm tốc".
  static const double _bigDiffKmh = 5.0;
  static const double _midDiffKmh = 2.0;

  /// Hệ số bám mẫu mới (0..1). Càng gần 1 càng ít trễ, càng gần 0 càng mượt.
  static const double _alphaBig = 0.9;
  static const double _alphaMid = 0.6;
  static const double _alphaSteady = 0.4;

  /// Dưới ngưỡng này mà mẫu mới = 0 thì về 0 ngay, không để số tụt dần 3, 2, 1.
  static const double _snapToZeroBelowKmh = 5.0;

  double? _value;

  /// Tham số [window] giữ lại để tương thích code cũ, không còn được dùng.
  SpeedSmoother({int? window});

  double add(double kmh) {
    final prev = _value;
    if (prev == null) {
      return _value = kmh;
    }

    // Dừng xe: về 0 ngay khi đang chạy rất chậm
    if (kmh == 0.0 && prev < _snapToZeroBelowKmh) {
      return _value = 0.0;
    }

    final diff = (kmh - prev).abs();
    final alpha = diff > _bigDiffKmh
        ? _alphaBig
        : (diff > _midDiffKmh ? _alphaMid : _alphaSteady);

    return _value = prev + alpha * (kmh - prev);
  }

  double? get currentAverage => _value;

  void reset() {
    _value = null;
  }
}

/// 3. Bộ xử lý cảnh báo vượt tốc độ (SpeedAlert - Hysteresis & Debounce)
/// Ngăn chặn báo nhầm: Có dung sai, cần vượt liên tục 2s, tắt khi <= limit, giãn cách 10s.
class SpeedAlert {
  final double tolerance;
  final int holdSeconds;
  final int repeatSeconds;

  bool _active = false;
  DateTime? _overSince;
  DateTime? _lastAlertAt;

  SpeedAlert({
    double? tolerance,
    int? holdSeconds,
    int? repeatSeconds,
  })  : tolerance = tolerance ?? NavConfig.speedAlertToleranceKmh,
        holdSeconds = holdSeconds ?? NavConfig.speedAlertHoldSeconds,
        repeatSeconds = repeatSeconds ?? NavConfig.speedAlertRepeatSeconds;

  bool get isActive => _active;

  /// Cập nhật tốc độ hiện tại so với giới hạn đoạn đường.
  /// Trả về true nếu CẦN PHÁT CẢNH BÁO ÂM THANH lúc này.
  bool update(double? kmh, int? limitKmh, {DateTime? now}) {
    final currentTime = now ?? DateTime.now();

    // Mất tín hiệu GPS hoặc không có giới hạn tốc độ: reset trạng thái
    if (kmh == null || limitKmh == null || limitKmh <= 0) {
      _active = false;
      _overSince = null;
      return false;
    }

    final double limit = limitKmh.toDouble();

    if (!_active) {
      // Chưa ở trạng thái vượt tốc: phải vượt ngưỡng liên tục trong holdSeconds
      if (kmh > limit + tolerance) {
        _overSince ??= currentTime;
        if (currentTime.difference(_overSince!).inSeconds >= holdSeconds) {
          _active = true;
          _lastAlertAt = currentTime;
          return true; // Kích hoạt cảnh báo lần đầu
        }
      } else {
        _overSince = null;
      }
      return false;
    }

    // Đang ở trạng thái vượt tốc (Cơ chế Hysteresis: chỉ tắt khi kmh <= limit)
    if (kmh <= limit) {
      _active = false;
      _overSince = null;
      return false;
    }

    // Nếu vẫn đang vượt tốc, nhắc lại sau mỗi repeatSeconds
    if (_lastAlertAt != null && currentTime.difference(_lastAlertAt!).inSeconds >= repeatSeconds) {
      _lastAlertAt = currentTime;
      return true; // Nhắc lại cảnh báo
    }

    return false;
  }

  void reset() {
    _active = false;
    _overSince = null;
    _lastAlertAt = null;
  }
}
