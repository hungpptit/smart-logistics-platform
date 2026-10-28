import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../navigation/route_model.dart';
import '../navigation/speed_limit_info.dart';

/// SpeedLimitService
/// Dịch vụ tra cứu và quản lý bộ nhớ đệm (LRU Cache) giới hạn tốc độ đường bộ
/// Sử dụng OpenStreetMap (Nominatim Reverse API) kết hợp quy chuẩn Thông tư 38/2024/TT-BGTVT.
class SpeedLimitService {
  static final SpeedLimitService _instance = SpeedLimitService._internal();
  factory SpeedLimitService() => _instance;
  SpeedLimitService._internal();

  /// Giới hạn tối đa 1.000 cung đường trong LRU Cache (~200KB RAM)
  static const int _maxCacheSize = 1000;

  /// Thời gian sống của cache: 24 giờ (xuyên suốt ca làm việc)
  static const Duration _cacheTtl = Duration(hours: 24);

  /// LinkedHashMap ghi nhớ thứ tự truy cập để thực hiện cơ chế LRU Eviction
  final Map<String, SpeedLimitInfo> _cache = {};

  int get cacheCount => _cache.length;

  /// Tạo cache key từ tọa độ làm tròn 3 chữ số thập phân (~100m)
  String _makeCacheKey(double lat, double lon) {
    return '${lat.toStringAsFixed(3)},${lon.toStringAsFixed(3)}';
  }

  /// Lấy dữ liệu từ Cache theo cơ chế LRU (khi truy cập sẽ đưa lên đầu danh sách)
  SpeedLimitInfo? getFromCache(double lat, double lon) {
    final key = _makeCacheKey(lat, lon);
    if (!_cache.containsKey(key)) return null;

    final info = _cache[key]!;
    // Kiểm tra hết hạn TTL 24h
    if (DateTime.now().difference(info.cachedAt) > _cacheTtl) {
      _cache.remove(key);
      return null;
    }

    // Đưa lên cuối map (Mới dùng nhất - LRU refresh)
    _cache.remove(key);
    _cache[key] = info;
    return info;
  }

  /// Lưu vào Cache kèm cơ chế tự động đào thải (Eviction) khi vượt ngưỡng 1.000 điểm
  void putToCache(double lat, double lon, SpeedLimitInfo info) {
    final key = _makeCacheKey(lat, lon);
    if (_cache.containsKey(key)) {
      _cache.remove(key);
    } else if (_cache.length >= _maxCacheSize) {
      // Xóa phần tử lâu nhất ở đầu Map
      final oldestKey = _cache.keys.first;
      _cache.remove(oldestKey);
      debugPrint('🧹 [SpeedLimitService] LRU Evicted: $oldestKey');
    }
    _cache[key] = info;
  }

  /// Dọn dẹp sạch toàn bộ cache khi tài xế Đăng xuất (Logout)
  void clearCache() {
    _cache.clear();
    debugPrint('🧹 [SpeedLimitService] Cache cleared completely');
  }

  /// Tra cứu giới hạn tốc độ tại một tọa độ cụ thể
  Future<SpeedLimitInfo> fetchSpeedLimitForLocation(
    double lat,
    double lon, {
    String vehicleType = 'MOTORCYCLE',
    double truckWeightTons = 3.5,
  }) async {
    // 1. Kiểm tra trong Cache trước
    final cached = getFromCache(lat, lon);
    if (cached != null) {
      return cached;
    }

    // 2. Gọi OpenStreetMap Nominatim Reverse Geocoding API
    try {
      final uri = Uri.parse(
        'https://nominatim.openstreetmap.org/reverse?lat=$lat&lon=$lon&zoom=17&format=jsonv2&extratags=1',
      );

      final response = await http
          .get(
            uri,
            headers: {
              'User-Agent': 'SmartLogisticsPlatform/1.0 (contact: admin@smartlogistics.vn)',
              'Accept': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final info = determineSpeedLimit(
          data,
          vehicleType: vehicleType,
          truckWeightTons: truckWeightTons,
        );

        // Lưu vào Cache
        putToCache(lat, lon, info);
        return info;
      }
    } catch (e) {
      debugPrint('⚠️ [SpeedLimitService] Không gọi được OSM: $e, sử dụng fallback mặc định');
    }

    // 3. Fallback mặc định an toàn nếu mất mạng
    final defaultInfo = _createDefaultFallback(vehicleType);
    putToCache(lat, lon, defaultInfo);
    return defaultInfo;
  }

  /// Xác định giới hạn tốc độ dựa trên OSM Tags & Quy chuẩn Thông tư 38/2024/TT-BGTVT
  SpeedLimitInfo determineSpeedLimit(
    Map<String, dynamic> osmData, {
    String vehicleType = 'MOTORCYCLE',
    double truckWeightTons = 3.5,
  }) {
    final extra = (osmData['extratags'] as Map<String, dynamic>?) ?? {};
    final address = (osmData['address'] as Map<String, dynamic>?) ?? {};

    // Tên đường
    final roadName = osmData['name'] as String? ??
        address['road'] as String? ??
        address['pedestrian'] as String? ??
        'Đoạn đường không tên';

    // Loại đường OSM
    final roadType = extra['highway'] as String? ?? osmData['type'] as String? ?? 'residential';

    // Các thẻ biển báo tốc độ từ OSM
    final maxspeedRaw = int.tryParse(extra['maxspeed']?.toString() ?? '');
    final hgvSpeedRaw = int.tryParse(extra['maxspeed:hgv']?.toString() ?? '');
    final carSpeedRaw = int.tryParse(extra['maxspeed:motorcar']?.toString() ?? '');

    // Thuộc tính làn đường & hướng đi
    final lanes = int.tryParse(extra['lanes']?.toString() ?? '');
    final onewayStr = extra['oneway']?.toString().toLowerCase();
    final isOneWay = onewayStr == 'yes' || onewayStr == '1';

    // Cấm xe máy? (Cao tốc hoặc có biển cấm)
    final motoStr = extra['motorcycle']?.toString().toLowerCase();
    final isMotorway = roadType == 'motorway' || roadType == 'motorway_link';
    final motorcycleForbidden = isMotorway || motoStr == 'no';

    // Giới hạn tải trọng có điều kiện
    final weightRestriction = extra['maxweight:conditional']?.toString() ?? extra['maxweight']?.toString();

    // Xác định khu vực đông dân cư (dựa vào loại đường)
    final isUrban = roadType != 'motorway' && roadType != 'trunk';

    // --- TẦNG 1: ƯU TIÊN BIỂN BÁO CỤ THỂ TRÊN OSM ---
    if (vehicleType == 'TRUCK' && hgvSpeedRaw != null && hgvSpeedRaw > 0) {
      return SpeedLimitInfo(
        roadName: roadName,
        roadType: roadType,
        speedLimit: hgvSpeedRaw,
        source: 'OSM_MAXSPEED',
        maxspeed: maxspeedRaw,
        truckSpeedLimit: hgvSpeedRaw,
        carSpeedLimit: carSpeedRaw,
        motorcycleForbidden: motorcycleForbidden,
        weightRestriction: weightRestriction,
        lanes: lanes,
        isOneWay: isOneWay,
        isUrban: isUrban,
      );
    }

    if (maxspeedRaw != null && maxspeedRaw > 0) {
      int effectiveLimit = maxspeedRaw;
      // Xe máy ngoài đô thị không được vượt quá 70 km/h (Điều 6 TT 38/2024)
      if (vehicleType == 'MOTORCYCLE' && effectiveLimit > 70) {
        effectiveLimit = 70;
      }
      return SpeedLimitInfo(
        roadName: roadName,
        roadType: roadType,
        speedLimit: effectiveLimit,
        source: 'OSM_MAXSPEED',
        maxspeed: maxspeedRaw,
        truckSpeedLimit: hgvSpeedRaw ?? maxspeedRaw,
        carSpeedLimit: carSpeedRaw ?? maxspeedRaw,
        motorcycleForbidden: motorcycleForbidden,
        weightRestriction: weightRestriction,
        lanes: lanes,
        isOneWay: isOneWay,
        isUrban: isUrban,
      );
    }

    // --- TẦNG 2: QUY CHUẨN NỘI SUY THEO THÔNG TƯ 38/2024/TT-BGTVT ---
    int resolvedLimit = 50; // Mặc định trong đô thị

    if (isMotorway) {
      // Đường cao tốc: 100–120 km/h (áp dụng cho ô tô/xe tải, cấm xe máy)
      resolvedLimit = 100;
    } else if (roadType == 'trunk') {
      // Đại lộ / Quốc lộ chính ngoài đô thị (như Xa lộ Hà Nội, QL1A, QL22)
      final bool isMultiLane = isOneWay || (lanes != null && lanes >= 2);
      if (vehicleType == 'MOTORCYCLE') {
        resolvedLimit = isMultiLane ? 70 : 60; // Điều 6 TT 38/2024
      } else {
        // Xe tải trung chuyển kho
        if (truckWeightTons <= 3.5) {
          resolvedLimit = isMultiLane ? 90 : 80;
        } else {
          resolvedLimit = isMultiLane ? 80 : 70;
        }
      }
    } else if (roadType == 'primary') {
      // Trục đường lớn đô thị (như Võ Văn Ngân, Phạm Văn Đồng)
      final bool isMultiLane = isOneWay || (lanes != null && lanes >= 2);
      resolvedLimit = isMultiLane ? 60 : 50; // Điều 5 TT 38/2024
    } else if (roadType == 'secondary' || roadType == 'tertiary') {
      // Đường liên quận / đường nội đô (như Đặng Văn Bi)
      final bool isMultiLane = isOneWay || (lanes != null && lanes >= 2);
      resolvedLimit = isMultiLane ? 60 : 50;
    } else if (roadType == 'living_street' || roadType == 'service') {
      // Ngõ hẻm / đường nội bộ trong kho bãi
      resolvedLimit = 30;
    } else {
      // Đường khu dân cư thông thường
      resolvedLimit = 50;
    }

    return SpeedLimitInfo(
      roadName: roadName,
      roadType: roadType,
      speedLimit: resolvedLimit,
      source: 'TT_38_2024_FALLBACK',
      maxspeed: maxspeedRaw,
      truckSpeedLimit: hgvSpeedRaw,
      carSpeedLimit: carSpeedRaw,
      motorcycleForbidden: motorcycleForbidden,
      weightRestriction: weightRestriction,
      lanes: lanes,
      isOneWay: isOneWay,
      isUrban: isUrban,
    );
  }

  /// Nạp trước giới hạn tốc độ cho toàn bộ lộ trình (GỌI 1 LẦN DUY NHẤT khi bắt đầu hoặc reroute)
  Future<Map<int, SpeedLimitInfo>> prefetchForRoute(
    List<NavStep> steps,
    String vehicleType, {
    double truckWeightTons = 3.5,
  }) async {
    final Map<int, SpeedLimitInfo> resultMap = {};
    if (steps.isEmpty) return resultMap;

    debugPrint('🚀 [SpeedLimitService] Bắt đầu nạp tốc độ cho ${steps.length} chặng (Loại xe: $vehicleType)...');

    for (int i = 0; i < steps.length; i++) {
      final step = steps[i];

      // Lấy tọa độ trung điểm của chặng đường
      final midLat = (step.startLocation.latitude + step.endLocation.latitude) / 2.0;
      final midLon = (step.startLocation.longitude + step.endLocation.longitude) / 2.0;

      // Kiểm tra cache trước
      final cached = getFromCache(midLat, midLon);
      if (cached != null) {
        resultMap[step.index] = cached;
        continue;
      }

      // Nếu chưa có trong cache thì gọi API
      try {
        final info = await fetchSpeedLimitForLocation(
          midLat,
          midLon,
          vehicleType: vehicleType,
          truckWeightTons: truckWeightTons,
        );
        resultMap[step.index] = info;

        // Chờ 300ms giữa các request để tuân thủ Rate Limit của OpenStreetMap Nominatim
        if (i < steps.length - 1) {
          await Future.delayed(const Duration(milliseconds: 300));
        }
      } catch (e) {
        resultMap[step.index] = _createDefaultFallback(vehicleType);
      }
    }

    debugPrint('✅ [SpeedLimitService] Đã nạp thành công tốc độ cho ${resultMap.length} chặng đường');
    return resultMap;
  }

  /// Fallback an toàn khi không có mạng
  SpeedLimitInfo _createDefaultFallback(String vehicleType) {
    return SpeedLimitInfo(
      roadName: 'Tuyến đường đô thị',
      roadType: 'residential',
      speedLimit: 50,
      source: 'DEFAULT',
      isUrban: true,
    );
  }
}
