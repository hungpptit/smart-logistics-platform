# Plan: Lấy tốc độ hiện tại trong app Flutter

Oct 28, 2026 · @Hưng

## Mục tiêu và kiến trúc

Mục tiêu: hiển thị tốc độ hiện tại (km/h) ổn định, phản hồi trong khoảng 1-2 giây và cảnh báo khi vượt giới hạn, bằng Flutter, dùng tốc độ Doppler của GPS thay vì tự tính từ khoảng cách giữa các tọa độ.

Luồng xử lý dữ liệu, mỗi bước là một lớp tách riêng để dễ test:

1. **Nguồn vị trí:** package `geolocator` trả về `Position` mỗi giây, có `speed` (m/s), `speedAccuracy`, `accuracy`, `timestamp`.
2. **Bộ lọc chất lượng:** bỏ mẫu cũ, mẫu có độ chính xác kém.
3. **Làm mượt:** moving average vài mẫu gần nhất.
4. **Đổi đơn vị:** `speed * 3.6` ra km/h.
5. **Cảnh báo:** so với giới hạn tốc độ, có hysteresis và dung sai.
6. **UI:** hiển thị số, trạng thái GPS (tốt, yếu, mất tín hiệu) và cảnh báo.

Phạm vi plan này chỉ gồm lấy tốc độ hiện tại và logic cảnh báo. Nguồn dữ liệu giới hạn tốc độ của từng đoạn đường (OpenStreetMap, HERE, TomTom...) là phần riêng, cần quyết định sau.

## Bước 1: Cài package và cấu hình quyền

Thêm `geolocator` vào dự án, rồi khai báo quyền vị trí cho từng nền tảng.

```bash
flutter pub add geolocator
```

**Android** (`android/app/src/main/AndroidManifest.xml`), đặt trong thẻ `<manifest>`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<!-- Chỉ cần nếu chạy nền (bước 7) -->
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

**iOS** (`ios/Runner/Info.plist`):

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Ứng dụng cần vị trí để đo tốc độ và cảnh báo khi bạn chạy quá tốc độ.</string>
<!-- Chỉ cần nếu chạy nền (bước 7) -->
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Ứng dụng cần vị trí khi chạy nền để tiếp tục cảnh báo tốc độ.</string>
<key>UIBackgroundModes</key>
<array><string>location</string></array>
```

Lưu ý: phiên bản `geolocator` và yêu cầu cấu hình có thể thay đổi, nên đối chiếu với README của package trên [pub.dev](https://pub.dev/packages/geolocator) khi cài.

## Bước 2: Xin quyền và kiểm tra dịch vụ vị trí

Trước khi nghe vị trí, phải chắc chắn GPS đang bật và app có quyền. Nếu không, tốc độ sẽ không có hoặc rơi về định vị mạng (rất sai, như trường hợp Maps báo 30-35 km/h khi chạy 80 km/h).

```dart
import 'package:geolocator/geolocator.dart';

enum LocationReady { ok, serviceOff, denied, deniedForever }

Future<LocationReady> ensureLocationReady() async {
  if (!await Geolocator.isLocationServiceEnabled()) {
    return LocationReady.serviceOff;
  }

  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
  }
  if (permission == LocationPermission.denied) return LocationReady.denied;
  if (permission == LocationPermission.deniedForever) {
    return LocationReady.deniedForever;
  }

  // Android 12+/iOS 14+: người dùng có thể chỉ cấp vị trí xấp xỉ
  final accuracy = await Geolocator.getLocationAccuracy();
  if (accuracy == LocationAccuracyStatus.reduced) {
    // Hiện hộp thoại giải thích và xin vị trí chính xác
    // (iOS: Geolocator.requestTemporaryFullAccuracy(purposeKey: '...'))
  }
  return LocationReady.ok;
}
```

Xử lý từng trạng thái trên UI:

- **serviceOff:** hiện nút mở cài đặt vị trí (`Geolocator.openLocationSettings()`).
- **deniedForever:** hiện nút mở cài đặt app (`Geolocator.openAppSettings()`).
- **Vị trí xấp xỉ:** giải thích vì sao cần vị trí chính xác, không cho bắt đầu đo tốc độ khi chỉ có quyền xấp xỉ.

## Bước 3: Stream vị trí độ chính xác cao

Dùng `getPositionStream` với cấu hình riêng cho từng nền tảng, cập nhật mỗi giây, không đặt `distanceFilter` (để nhận cả khi đứng yên hoặc chạy chậm). Trường `position.speed` đã là tốc độ Doppler của chip GPS, đơn vị m/s.

```dart
import 'dart:async';
import 'dart:io';
import 'package:geolocator/geolocator.dart';

Stream<Position> positionStream() {
  late LocationSettings settings;

  if (Platform.isAndroid) {
    settings = AndroidSettings(
      accuracy: LocationAccuracy.best,
      distanceFilter: 0,
      intervalDuration: const Duration(seconds: 1),
      // forceLocationManager: false, // mặc định dùng Fused Location nếu có
    );
  } else if (Platform.isIOS) {
    settings = AppleSettings(
      accuracy: LocationAccuracy.bestForNavigation,
      activityType: ActivityType.automotiveNavigation,
      distanceFilter: 0,
      pauseLocationUpdatesAutomatically: false,
    );
  } else {
    settings = const LocationSettings(
      accuracy: LocationAccuracy.best,
      distanceFilter: 0,
    );
  }

  return Geolocator.getPositionStream(locationSettings: settings);
}
```

Đọc nhanh tốc độ thô:

```dart
final sub = positionStream().listen((pos) {
  final kmh = pos.speed * 3.6; // m/s -> km/h
  print('speed=${kmh.toStringAsFixed(1)} km/h, '
      'acc=${pos.accuracy} m, speedAcc=${pos.speedAccuracy} m/s');
});
// Nhớ sub.cancel() khi rời màn hình hoặc dừng đo.
```

Lưu ý: `speed` có thể âm hoặc bằng 0 khi không hợp lệ (đặc biệt ngay sau khi mở GPS), nên không dùng thẳng mà phải qua bộ lọc ở bước 4.

## Bước 4: Lọc dữ liệu xấu

Mỗi mẫu `Position` phải qua kiểm tra chất lượng trước khi dùng. Mẫu không đạt thì bỏ qua, và nếu bỏ liên tục quá vài giây thì báo trạng thái "GPS yếu" thay vì giữ số cũ.

| Điều kiện | Ngưỡng gợi ý | Lý do |
| --- | --- | --- |
| Mẫu quá cũ | timestamp cách hiện tại > 3 giây | Android có thể trả vị trí cache |
| `accuracy` lớn | > 30 m | Có thể đang định vị bằng Wi-Fi hoặc mạng |
| `speedAccuracy` lớn | > 3 m/s (nếu > 0) | Tốc độ không đáng tin |
| `speed` âm | < 0 | Giá trị không hợp lệ |
| Gia tốc phi thực tế | đổi > 15 m/s trong 1 giây | Nhiễu GPS |
| Đứng yên giả | < 3 km/h coi như 0 | GPS hay báo 1-3 km/h khi đứng yên |

Các ngưỡng trên là điểm khởi đầu, cần chỉnh lại sau khi thử trên đường thật (bước 8).

```dart
class SpeedSample {
  final double kmh;
  final DateTime time;
  SpeedSample(this.kmh, this.time);
}

class SpeedFilter {
  double? _lastKmh;
  DateTime? _lastTime;

  /// Trả về null nếu mẫu bị loại.
  SpeedSample? process(Position p) {
    final now = DateTime.now();
    if (now.difference(p.timestamp).inSeconds > 3) return null;
    if (p.accuracy > 30) return null;
    if (p.speedAccuracy > 0 && p.speedAccuracy > 3) return null;
    if (p.speed < 0) return null;

    var kmh = p.speed * 3.6;
    if (kmh < 3) kmh = 0;

    // Loại giá trị nhảy bất thường (> ~54 km/h mỗi giây)
    if (_lastKmh != null && _lastTime != null) {
      final dt = p.timestamp.difference(_lastTime!).inMilliseconds / 1000.0;
      if (dt > 0 && (kmh - _lastKmh!).abs() / dt > 54) return null;
    }

    _lastKmh = kmh;
    _lastTime = p.timestamp;
    return SpeedSample(kmh, p.timestamp);
  }
}
```

Lưu ý: nếu loại mẫu do "nhảy bất thường" nhiều lần liên tiếp thì có thể chính mẫu cũ mới là sai. Nên reset `_lastKmh` sau khoảng 3 lần bị loại liên tiếp.

## Bước 5: Làm mượt tốc độ

Bắt đầu bằng moving average ngắn (3 mẫu, tức khoảng 3 giây). Làm mượt quá nhiều sẽ bị trễ khi tăng hoặc giảm tốc, như điều bạn thấy ở Google Maps.

```dart
import 'dart:collection';

class SpeedSmoother {
  SpeedSmoother({this.window = 3});
  final int window;
  final _buf = Queue<double>();

  double add(double kmh) {
    _buf.addLast(kmh);
    if (_buf.length > window) _buf.removeFirst();
    return _buf.reduce((a, b) => a + b) / _buf.length;
  }

  void reset() => _buf.clear();
}
```

Cách ghép các lớp thành một service phát ra tốc độ hiện tại:

```dart
class SpeedService {
  final _filter = SpeedFilter();
  final _smoother = SpeedSmoother(window: 3);
  final _controller = StreamController<double?>.broadcast();
  StreamSubscription<Position>? _sub;
  Timer? _watchdog;
  DateTime _lastGood = DateTime.fromMillisecondsSinceEpoch(0);

  /// null = mất tín hiệu GPS
  Stream<double?> get speedKmh => _controller.stream;

  void start() {
    _sub = positionStream().listen((p) {
      final s = _filter.process(p);
      if (s == null) return;
      _lastGood = DateTime.now();
      _controller.add(_smoother.add(s.kmh));
    });

    // Quá 4 giây không có mẫu tốt thì báo mất tín hiệu
    _watchdog = Timer.periodic(const Duration(seconds: 1), (_) {
      if (DateTime.now().difference(_lastGood).inSeconds > 4) {
        _smoother.reset();
        _controller.add(null);
      }
    });
  }

  void stop() {
    _sub?.cancel();
    _watchdog?.cancel();
  }
}
```

**Tùy chọn nâng cao:** nếu thấy vẫn trễ, kết hợp gia tốc kế (`sensors_plus`) với tốc độ GPS bằng Kalman filter để ước lượng tốc độ giữa hai lần GPS cập nhật. Chỉ làm khi bước cơ bản chưa đủ tốt, vì phức tạp hơn nhiều và cần xử lý hướng gắn điện thoại.

## Bước 6: Logic cảnh báo vượt tốc độ

Để tránh báo nhầm, cảnh báo cần ba cơ chế: dung sai, duy trì liên tục vài giây, và hysteresis (bật ở ngưỡng cao hơn, tắt ở ngưỡng thấp hơn).

| Tham số | Giá trị gợi ý | Ví dụ với giới hạn 60 km/h |
| --- | --- | --- |
| Dung sai bật | +1 km/h | Bật khi > 61 km/h |
| Thời gian duy trì | 2 giây liên tục | Vượt 61 trong 2 giây mới báo |
| Ngưỡng tắt | giới hạn | Tắt khi ≤ 60 km/h |
| Giãn cách nhắc lại | 10 giây | Không phát âm thanh liên tục |

```dart
class SpeedAlert {
  SpeedAlert({
    this.tolerance = 1,
    this.holdSeconds = 2,
    this.repeatSeconds = 10,
  });

  final double tolerance;
  final int holdSeconds;
  final int repeatSeconds;

  bool active = false;
  DateTime? _overSince;
  DateTime? _lastAlertAt;

  /// Gọi mỗi khi có tốc độ mới. Trả về true nếu cần phát cảnh báo lúc này.
  bool update(double? kmh, double limit) {
    final now = DateTime.now();

    // Mất tín hiệu: không cảnh báo, reset trạng thái
    if (kmh == null) {
      active = false;
      _overSince = null;
      return false;
    }

    if (!active) {
      if (kmh > limit + tolerance) {
        _overSince ??= now;
        if (now.difference(_overSince!).inSeconds >= holdSeconds) {
          active = true;
          _lastAlertAt = now;
          return true;
        }
      } else {
        _overSince = null;
      }
      return false;
    }

    // Đang trong trạng thái vượt tốc độ
    if (kmh <= limit) {
      active = false;
      _overSince = null;
      return false;
    }
    if (now.difference(_lastAlertAt!).inSeconds >= repeatSeconds) {
      _lastAlertAt = now;
      return true; // nhắc lại
    }
    return false;
  }
}
```

Ví dụ dùng trong UI, nối với `SpeedService` ở bước 5:

```dart
final alert = SpeedAlert();
speedService.speedKmh.listen((kmh) {
  final shouldBeep = alert.update(kmh, currentLimit);
  if (shouldBeep) {
    // phát âm thanh, rung, hoặc hiện banner (ví dụ package audioplayers, vibration)
  }
  // cập nhật state để hiển thị số tốc độ và màu cảnh báo
});
```

Lưu ý về dung sai: theo quy định pháp luật mỗi nước, ngưỡng xử phạt có thể khác nhau. App chỉ nên là công cụ nhắc nhở, không nên tuyên bố là căn cứ pháp lý về tốc độ.

Lưu ý với dung sai +1 km/h: mức này nhỏ hơn sai số thường gặp của GPS (±1-2 km/h), nên dễ báo nhầm khi tốc độ dao động quanh giới hạn. Hai cơ chế giảm báo nhầm là thời gian duy trì 2 giây và ngưỡng tắt bằng giới hạn. Nếu thử đường thật thấy báo nhầm nhiều, tăng `holdSeconds` lên 3 trước, rồi mới tăng dung sai.

## Bước 7: Chạy nền và tối ưu pin

Nếu người dùng khóa màn hình hoặc chuyển sang app khác (ví dụ mở Maps để dẫn đường), hệ điều hành sẽ làm chậm hoặc dừng cập nhật vị trí của app, khiến cảnh báo trễ hoặc không có. Cần cấu hình chạy nền riêng cho mỗi nền tảng.

App này luôn phải bật GPS, nên ngoài chạy nền còn phải quản lý pin: GPS độ chính xác cao chạy liên tục cả ngày sẽ hao pin rất nhiều. Hướng xử lý là đổi độ chính xác theo trạng thái di chuyển, ở phần Tối ưu pin bên dưới.

**Android:** dùng foreground service có thông báo cố định, cấu hình ngay trong `AndroidSettings`:

```dart
AndroidSettings(
  accuracy: LocationAccuracy.best,
  distanceFilter: 0,
  intervalDuration: const Duration(seconds: 1),
  foregroundNotificationConfig: const ForegroundNotificationConfig(
    notificationTitle: 'Đang đo tốc độ',
    notificationText: 'Ứng dụng đang cảnh báo tốc độ khi bạn lái xe.',
    enableWakeLock: true,
  ),
)
```

Cần thêm khai báo service trong `AndroidManifest.xml` theo hướng dẫn của `geolocator`, và xin quyền thông báo trên Android 13+ (`POST_NOTIFICATIONS`). Từ Android 10, quyền vị trí nền (`ACCESS_BACKGROUND_LOCATION`) phải xin riêng và người dùng phải chọn "Luôn cho phép".

**iOS:** bật Background Modes (Location updates) ở Xcode, đặt trong `AppleSettings`:

```dart
AppleSettings(
  accuracy: LocationAccuracy.bestForNavigation,
  activityType: ActivityType.automotiveNavigation,
  distanceFilter: 0,
  pauseLocationUpdatesAutomatically: false,
  showBackgroundLocationIndicator: true,
  allowBackgroundLocationUpdates: true,
)
```

**Tối ưu pin:**

Hai chế độ định vị, tự chuyển theo tốc độ:

- **Chế độ lái xe (high):** `LocationAccuracy.best`, cập nhật mỗi giây, `distanceFilter: 0`. Dùng khi đang di chuyển.
- **Chế độ chờ (idle):** `LocationAccuracy.low`, `distanceFilter` khoảng 20 m, cập nhật mỗi 10 giây. Vào chế độ này khi tốc độ dưới 3 km/h liên tục 3 phút, và quay lại chế độ lái xe ngay khi tốc độ thô vượt 10 km/h.
- Không bao giờ tắt hẳn stream, để vẫn bắt được lúc người dùng bắt đầu chạy xe.
- Tùy chọn: dùng `activity_recognition` (nhận diện đang lái xe) để vào chế độ lái xe sớm hơn.
- Hướng dẫn người dùng tắt tối ưu pin cho app trên các máy Android hay giết app nền (Xiaomi, Oppo, Vivo, Samsung): cài đặt Pin, chọn Không hạn chế.

Sửa hàm `positionStream` ở bước 3 để nhận tham số chế độ:

```dart
Stream<Position> positionStream({bool high = true}) {
  final accuracy = high ? LocationAccuracy.best : LocationAccuracy.low;
  final filter = high ? 0 : 20;
  final interval = Duration(seconds: high ? 1 : 10);

  late LocationSettings settings;
  if (Platform.isAndroid) {
    settings = AndroidSettings(
      accuracy: accuracy,
      distanceFilter: filter,
      intervalDuration: interval,
      foregroundNotificationConfig: const ForegroundNotificationConfig(
        notificationTitle: 'Đang đo tốc độ',
        notificationText: 'Ứng dụng đang cảnh báo tốc độ khi bạn lái xe.',
        enableWakeLock: true,
      ),
    );
  } else if (Platform.isIOS) {
    settings = AppleSettings(
      accuracy: high ? LocationAccuracy.bestForNavigation : LocationAccuracy.low,
      activityType: ActivityType.automotiveNavigation,
      distanceFilter: filter,
      pauseLocationUpdatesAutomatically: false,
      showBackgroundLocationIndicator: true,
      allowBackgroundLocationUpdates: true,
    );
  } else {
    settings = LocationSettings(accuracy: accuracy, distanceFilter: filter);
  }
  return Geolocator.getPositionStream(locationSettings: settings);
}
```

Sửa `SpeedService` ở bước 5 để tự chuyển chế độ:

```dart
bool _highMode = true;
DateTime? _slowSince;

void _listen({required bool high}) {
  _sub?.cancel();
  _highMode = high;
  _sub = positionStream(high: high).listen(_onPosition);
}

void _onPosition(Position p) {
  final rawKmh = p.speed < 0 ? 0 : p.speed * 3.6;

  if (!_highMode) {
    if (rawKmh > 10) _listen(high: true); // bắt đầu di chuyển
    return;
  }

  final s = _filter.process(p);
  if (s == null) return;
  _lastGood = DateTime.now();
  _controller.add(_smoother.add(s.kmh));

  if (s.kmh < 3) {
    _slowSince ??= DateTime.now();
    if (DateTime.now().difference(_slowSince!).inMinutes >= 3) {
      _slowSince = null;
      _smoother.reset();
      _listen(high: false); // đứng yên lâu, giảm tần suất
    }
  } else {
    _slowSince = null;
  }
}
```

Trong `start()`, thay phần `listen` cũ bằng `_listen(high: true)`, và chỉ cho watchdog báo mất tín hiệu khi `_highMode` đang bật (ở chế độ chờ, GPS cập nhật thưa là bình thường).

**Chính sách cửa hàng ứng dụng:** Google Play và App Store xét duyệt kỹ quyền vị trí nền. Màn hình xin quyền cần giải thích rõ lý do (cảnh báo tốc độ cần theo dõi liên tục khi lái xe), và khi đăng app phải khai báo đúng mục đích dùng vị trí nền theo form của từng cửa hàng. Thiếu bước này, app có thể bị từ chối.

## Bước 8: Kiểm thử và xử lý lỗi

GPS chỉ thử đúng được ngoài đường thật, nên cần ít nhất một vòng thử trên xe trước khi tin vào các ngưỡng ở bước 4 và 6.

**Checklist thử trên đường:**

- [ ] So tốc độ app với đồng hồ xe ở 30, 50, 60, 80 km/h. Chấp nhận chênh khoảng 2-5% vì đồng hồ xe thường hiển thị cao hơn thực tế.
- [ ] Thử mở app khi vừa khởi động xe (cold start) và ghi lại bao lâu thì có tốc độ đúng.
- [ ] Thử qua hầm chui, dưới cầu vượt, đoạn nhiều nhà cao tầng: app phải hiện "GPS yếu" thay vì số sai.
- [ ] Thử điện thoại đặt ở giá đỡ gần kính lái và ở túi áo để thấy chênh lệch tín hiệu.
- [ ] Thử khóa màn hình và chuyển sang app khác 5 phút: cảnh báo vẫn hoạt động (bước 7).
- [ ] Thử bật tiết kiệm pin, và tắt quyền vị trí chính xác, xem app xử lý ra sao.
- [ ] Ghi log mỗi mẫu (thời gian, tốc độ thô, accuracy, speedAccuracy, mẫu bị loại hay không) ra file để chỉnh ngưỡng sau chuyến đi.

**Bảng xử lý lỗi thường gặp:**

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| Tốc độ luôn bằng 0 | Định vị mạng, hoặc chưa có GPS fix | Kiểm tra `accuracy`, hiện trạng thái GPS yếu |
| Tốc độ thấp hơn thực tế nhiều | Quyền vị trí xấp xỉ, hoặc tiết kiệm pin | Yêu cầu vị trí chính xác, hướng dẫn tắt tiết kiệm pin |
| Số nhảy lung tung | Ngưỡng lọc quá lỏng | Siết `accuracy` và `speedAccuracy`, tăng cửa sổ làm mượt |
| Số trễ khi tăng giảm tốc | Cửa sổ làm mượt quá lớn | Giảm cửa sổ xuống 2-3 mẫu |
| Mất cảnh báo khi tắt màn hình | Không chạy nền | Xem lại bước 7, xin quyền vị trí nền |
| Hao pin nhanh | Bật đo liên tục | Chỉ bật khi lái xe, dừng khi đứng yên lâu |

**Việc nên làm tiếp sau khi hoàn tất:** chọn nguồn dữ liệu giới hạn tốc độ cho từng đoạn đường, vì tốc độ hiện tại chính xác nhưng giới hạn sai thì cảnh báo vẫn sai.
