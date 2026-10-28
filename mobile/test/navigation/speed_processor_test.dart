import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:velocity_mobile/navigation/speed_processor.dart';
import 'package:velocity_mobile/navigation/speed_limit_info.dart';
import 'package:velocity_mobile/services/speed_limit_service.dart';

Position createTestPosition({
  required double latitude,
  required double longitude,
  required double speed, // m/s
  double accuracy = 10.0,
  double speedAccuracy = 0.5,
  DateTime? timestamp,
}) {
  return Position(
    latitude: latitude,
    longitude: longitude,
    timestamp: timestamp ?? DateTime.now(),
    accuracy: accuracy,
    altitude: 10.0,
    altitudeAccuracy: 1.0,
    heading: 90.0,
    headingAccuracy: 1.0,
    speed: speed,
    speedAccuracy: speedAccuracy,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('SpeedFilter (Bộ lọc chất lượng GPS) Tests', () {
    late SpeedFilter filter;

    setUp(() {
      filter = SpeedFilter();
    });

    test('Chấp nhận mẫu GPS chuẩn xác (15 m/s = 54 km/h)', () {
      final now = DateTime.now();
      final p = createTestPosition(
        latitude: 10.8460,
        longitude: 106.7860,
        speed: 15.0, // 15 m/s * 3.6 = 54 km/h
        accuracy: 8.0,
        speedAccuracy: 0.8,
        timestamp: now,
      );

      final sample = filter.process(p, now: now);
      expect(sample, isNotNull);
      expect(sample!.kmh, closeTo(54.0, 0.1));
    });

    test('Loại bỏ mẫu GPS quá cũ (> 3 giây)', () {
      final now = DateTime.now();
      final oldTime = now.subtract(const Duration(seconds: 5));
      final p = createTestPosition(
        latitude: 10.8460,
        longitude: 106.7860,
        speed: 10.0,
        timestamp: oldTime,
      );

      final sample = filter.process(p, now: now);
      expect(sample, isNull);
    });

    test('Loại bỏ mẫu có độ chính xác vị trí kém (accuracy > 30m)', () {
      final now = DateTime.now();
      final p = createTestPosition(
        latitude: 10.8460,
        longitude: 106.7860,
        speed: 10.0,
        accuracy: 45.0, // Sai số 45m > 30m
        timestamp: now,
      );

      final sample = filter.process(p, now: now);
      expect(sample, isNull);
    });

    test('Loại bỏ mẫu có sai số tốc độ lớn (speedAccuracy > 3 m/s)', () {
      final now = DateTime.now();
      final p = createTestPosition(
        latitude: 10.8460,
        longitude: 106.7860,
        speed: 12.0,
        speedAccuracy: 4.5, // > 3.0 m/s
        timestamp: now,
      );

      final sample = filter.process(p, now: now);
      expect(sample, isNull);
    });

    test('Loại bỏ tốc độ âm không hợp lệ (speed < 0)', () {
      final now = DateTime.now();
      final p = createTestPosition(
        latitude: 10.8460,
        longitude: 106.7860,
        speed: -1.0,
        timestamp: now,
      );

      final sample = filter.process(p, now: now);
      expect(sample, isNull);
    });

    test('Triệt tiêu trôi dạt khi đứng yên: Tốc độ < 3 km/h ép về 0.0', () {
      final now = DateTime.now();
      // 0.5 m/s = 1.8 km/h (< 3 km/h) do sóng GPS trôi dạt ở đèn đỏ
      final p = createTestPosition(
        latitude: 10.8460,
        longitude: 106.7860,
        speed: 0.5,
        timestamp: now,
      );

      final sample = filter.process(p, now: now);
      expect(sample, isNotNull);
      expect(sample!.kmh, equals(0.0));
    });

    test('Loại bỏ gia tốc phi thực tế (nhảy vọt > 54 km/h trong 1 giây)', () {
      final t0 = DateTime(2026, 10, 28, 10, 0, 0);
      final t1 = t0.add(const Duration(seconds: 1));

      // Mẫu 1: 30 km/h (8.33 m/s)
      final p1 = createTestPosition(
        latitude: 10.8460,
        longitude: 106.7860,
        speed: 8.33,
        timestamp: t0,
      );
      final s1 = filter.process(p1, now: t0);
      expect(s1, isNotNull);

      // Mẫu 2: Bất ngờ nhảy vọt lên 100 km/h (27.7 m/s) chỉ sau 1s (chênh 70 km/h/s > 54)
      final p2 = createTestPosition(
        latitude: 10.8461,
        longitude: 106.7861,
        speed: 27.7,
        timestamp: t1,
      );
      final s2 = filter.process(p2, now: t1);
      expect(s2, isNull);
    });
  });

  group('SpeedSmoother (Làm mượt tốc độ thích ứng Adaptive EMA) Tests', () {
    late SpeedSmoother smoother;

    setUp(() {
      smoother = SpeedSmoother();
    });

    test('Chênh lệch lớn > 5 km/h: bám 90% mẫu mới (giảm thiểu độ trễ tối đa)', () {
      expect(smoother.add(30.0), closeTo(30.0, 0.01));
      // Tăng vọt lên 40 km/h: chênh 10 km/h > 5 -> alpha = 0.9 -> 30 + 0.9 * 10 = 39.0
      expect(smoother.add(40.0), closeTo(39.0, 0.01));
      expect(smoother.currentAverage, closeTo(39.0, 0.01));
    });

    test('Chênh lệch vừa 2-5 km/h: bám 60% mẫu mới', () {
      smoother.add(30.0);
      // Chênh lệch 4 km/h: alpha = 0.6 -> 30 + 0.6 * 4 = 32.4
      expect(smoother.add(34.0), closeTo(32.4, 0.01));
    });

    test('Chênh lệch nhỏ < 2 km/h: bám 40% (chống rung giật khi chạy đều)', () {
      smoother.add(30.0);
      // Chênh lệch 1 km/h: alpha = 0.4 -> 30 + 0.4 * 1 = 30.4
      expect(smoother.add(31.0), closeTo(30.4, 0.01));
    });

    test('Dừng xe: Mẫu mới = 0 và tốc độ < 5 km/h thì về 0 ngay lập tức', () {
      smoother.add(4.0);
      expect(smoother.add(0.0), equals(0.0));
    });

    test('Reset xóa sạch giá trị lưu trữ', () {
      smoother.add(50.0);
      smoother.reset();
      expect(smoother.currentAverage, isNull);
    });
  });

  group('SpeedAlert (Cảnh báo vượt tốc Hysteresis & Debounce) Tests', () {
    late SpeedAlert alert;

    setUp(() {
      alert = SpeedAlert(
        tolerance: 1.0,    // Vượt > 61 km/h
        holdSeconds: 2,    // Duy trì liên tục 2s mới báo
        repeatSeconds: 10, // 10s nhắc lại 1 lần
      );
    });

    test('Chưa báo nếu thời gian vượt tốc chưa đủ 2 giây', () {
      final t0 = DateTime(2026, 10, 28, 10, 0, 0);
      final t1 = t0.add(const Duration(seconds: 1));

      // Giới hạn 60 km/h, xe chạy 65 km/h tại t=0s
      final shouldBeep0 = alert.update(65.0, 60, now: t0);
      expect(shouldBeep0, isFalse);
      expect(alert.isActive, isFalse);

      // Tại t=1s (mới được 1s < 2s)
      final shouldBeep1 = alert.update(65.0, 60, now: t1);
      expect(shouldBeep1, isFalse);
      expect(alert.isActive, isFalse);
    });

    test('Kích hoạt cảnh báo khi vượt tốc liên tục đủ 2 giây', () {
      final t0 = DateTime(2026, 10, 28, 10, 0, 0);
      final t2 = t0.add(const Duration(seconds: 2));

      alert.update(65.0, 60, now: t0);
      final shouldBeep = alert.update(65.0, 60, now: t2);

      expect(shouldBeep, isTrue); // Phát âm thanh cảnh báo!
      expect(alert.isActive, isTrue);
    });

    test('Hysteresis: Đang báo, xe giảm về 60 km/h (<= limit) thì tắt cảnh báo', () {
      final t0 = DateTime(2026, 10, 28, 10, 0, 0);
      final t2 = t0.add(const Duration(seconds: 2));
      final t3 = t0.add(const Duration(seconds: 3));

      // Kích hoạt
      alert.update(65.0, 60, now: t0);
      alert.update(65.0, 60, now: t2);
      expect(alert.isActive, isTrue);

      // Xe giảm tốc về 60 km/h
      final shouldBeep = alert.update(60.0, 60, now: t3);
      expect(shouldBeep, isFalse);
      expect(alert.isActive, isFalse); // Đã tắt cảnh báo
    });

    test('Debounce: Giãn cách 10 giây mới nhắc lại một lần nếu vẫn quá tốc độ', () {
      final t0 = DateTime(2026, 10, 28, 10, 0, 0);
      final t2 = t0.add(const Duration(seconds: 2));
      final t5 = t0.add(const Duration(seconds: 5));
      final t12 = t0.add(const Duration(seconds: 12));

      // Bật lần đầu tại t=2s
      alert.update(65.0, 60, now: t0);
      alert.update(65.0, 60, now: t2);

      // Tại t=5s (mới trôi qua 3s < 10s repeatCooldown) -> không phát lặp lại
      expect(alert.update(65.0, 60, now: t5), isFalse);

      // Tại t=12s (đã trôi qua 10s kể từ t=2s) -> phát nhắc lại!
      expect(alert.update(65.0, 60, now: t12), isTrue);
    });
  });

  group('SpeedLimitService (Thông tư 38/2024 & Cache) Tests', () {
    late SpeedLimitService service;

    setUp(() {
      service = SpeedLimitService();
      service.clearCache();
    });

    test('Nội suy chuẩn Thông tư 38/2024 cho Xe Máy (Motorcycle)', () {
      // 1. Đường trunk nhiều làn (Xa lộ Hà Nội) -> 70 km/h
      final trunk = service.determineSpeedLimit({
        'name': 'Xa lộ Hà Nội',
        'type': 'trunk',
        'extratags': {'lanes': '3', 'oneway': 'yes'},
      }, vehicleType: 'MOTORCYCLE');
      expect(trunk.speedLimit, equals(70));

      // 2. Đường primary nội đô (Võ Văn Ngân) -> 60 km/h
      final primary = service.determineSpeedLimit({
        'name': 'Đường Võ Văn Ngân',
        'type': 'primary',
        'extratags': {'lanes': '2'},
      }, vehicleType: 'MOTORCYCLE');
      expect(primary.speedLimit, equals(60));

      // 3. Đường residential (khu dân cư) -> 50 km/h
      final res = service.determineSpeedLimit({
        'name': 'Đường số 8',
        'type': 'residential',
      }, vehicleType: 'MOTORCYCLE');
      expect(res.speedLimit, equals(50));

      // 4. Đường ngõ hẻm / kho (service) -> 30 km/h
      final serviceRoad = service.determineSpeedLimit({
        'name': 'Hẻm 120',
        'type': 'service',
      }, vehicleType: 'MOTORCYCLE');
      expect(serviceRoad.speedLimit, equals(30));

      // 5. Đường cao tốc (motorway) -> cấm xe máy!
      final motorway = service.determineSpeedLimit({
        'name': 'Cao tốc TP.HCM - Long Thành',
        'type': 'motorway',
      }, vehicleType: 'MOTORCYCLE');
      expect(motorway.motorcycleForbidden, isTrue);
    });

    test('Nội suy chuẩn Thông tư 38/2024 cho Xe Tải (Truck)', () {
      // Xe tải <= 3.5 tấn trên đường trunk -> 90 km/h
      final truckLight = service.determineSpeedLimit({
        'name': 'Quốc lộ 22',
        'type': 'trunk',
        'extratags': {'lanes': '2', 'oneway': 'yes'},
      }, vehicleType: 'TRUCK', truckWeightTons: 2.5);
      expect(truckLight.speedLimit, equals(90));

      // Xe tải > 3.5 tấn trên đường trunk -> 80 km/h
      final truckHeavy = service.determineSpeedLimit({
        'name': 'Quốc lộ 22',
        'type': 'trunk',
        'extratags': {'lanes': '2', 'oneway': 'yes'},
      }, vehicleType: 'TRUCK', truckWeightTons: 5.0);
      expect(truckHeavy.speedLimit, equals(80));

      // Có biển báo cụ thể maxspeed:hgv: 60 -> ưu tiên lấy 60
      final withTag = service.determineSpeedLimit({
        'name': 'Đoạn cầu hẹp',
        'type': 'trunk',
        'extratags': {'maxspeed': '80', 'maxspeed:hgv': '60'},
      }, vehicleType: 'TRUCK');
      expect(withTag.speedLimit, equals(60));
      expect(withTag.source, equals('OSM_MAXSPEED'));
    });

    test('LRU Cache và hàm clearCache()', () {
      expect(service.cacheCount, equals(0));

      final info = SpeedLimitInfo(
        roadName: 'Đặng Văn Bi',
        roadType: 'secondary',
        speedLimit: 50,
        source: 'TT_38_2024_FALLBACK',
      );

      service.putToCache(10.846, 106.786, info);
      expect(service.cacheCount, equals(1));

      final retrieved = service.getFromCache(10.846, 106.786);
      expect(retrieved, isNotNull);
      expect(retrieved!.roadName, equals('Đặng Văn Bi'));

      service.clearCache();
      expect(service.cacheCount, equals(0));
      expect(service.getFromCache(10.846, 106.786), isNull);
    });
  });
}
