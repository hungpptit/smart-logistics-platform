/// Speed Limit Information Model
/// Chứa thông tin giới hạn tốc độ và quy chuẩn làn đường dựa trên OpenStreetMap (OSM)
/// và Thông tư 38/2024/TT-BGTVT (Bộ Giao thông Vận tải Việt Nam).
class SpeedLimitInfo {
  final String roadName; // Tên đường: "Xa lộ Hà Nội", "Đường Đặng Văn Bi"...
  final String roadType; // OSM highway tag: "trunk", "primary", "secondary", "residential", "motorway"...
  final int speedLimit; // Tốc độ giới hạn hiệu lực cuối cùng (km/h) áp dụng cho loại xe hiện tại
  final String source; // "OSM_MAXSPEED" | "TT_38_2024_FALLBACK" | "DEFAULT"
  final int? maxspeed; // Tag maxspeed gốc từ OSM nếu có
  final int? truckSpeedLimit; // Giới hạn tốc độ xe tải (từ maxspeed:hgv hoặc TT 38/2024)
  final int? carSpeedLimit; // Giới hạn tốc độ ô tô con (từ maxspeed:motorcar)
  final bool motorcycleForbidden; // Cấm xe mô tô / xe gắn máy (ví dụ: đường cao tốc motorway)
  final String? weightRestriction; // Quy định cấm tải (maxweight:conditional)
  final int? lanes; // Số làn xe (từ extratags.lanes)
  final bool isOneWay; // Đường một chiều (từ extratags.oneway)
  final bool isUrban; // Thuộc khu vực đông dân cư
  final DateTime cachedAt; // Thời điểm lưu cache

  SpeedLimitInfo({
    required this.roadName,
    required this.roadType,
    required this.speedLimit,
    required this.source,
    this.maxspeed,
    this.truckSpeedLimit,
    this.carSpeedLimit,
    this.motorcycleForbidden = false,
    this.weightRestriction,
    this.lanes,
    this.isOneWay = false,
    this.isUrban = true,
    DateTime? cachedAt,
  }) : cachedAt = cachedAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'roadName': roadName,
    'roadType': roadType,
    'speedLimit': speedLimit,
    'source': source,
    'maxspeed': maxspeed,
    'truckSpeedLimit': truckSpeedLimit,
    'carSpeedLimit': carSpeedLimit,
    'motorcycleForbidden': motorcycleForbidden,
    'weightRestriction': weightRestriction,
    'lanes': lanes,
    'isOneWay': isOneWay,
    'isUrban': isUrban,
    'cachedAt': cachedAt.toIso8601String(),
  };

  factory SpeedLimitInfo.fromJson(Map<String, dynamic> json) => SpeedLimitInfo(
    roadName: json['roadName'] as String? ?? '',
    roadType: json['roadType'] as String? ?? '',
    speedLimit: json['speedLimit'] as int? ?? 50,
    source: json['source'] as String? ?? 'UNKNOWN',
    maxspeed: json['maxspeed'] as int?,
    truckSpeedLimit: json['truckSpeedLimit'] as int?,
    carSpeedLimit: json['carSpeedLimit'] as int?,
    motorcycleForbidden: json['motorcycleForbidden'] == true,
    weightRestriction: json['weightRestriction'] as String?,
    lanes: json['lanes'] as int?,
    isOneWay: json['isOneWay'] == true,
    isUrban: json['isUrban'] as bool? ?? true,
    cachedAt: json['cachedAt'] != null ? DateTime.tryParse(json['cachedAt'] as String) : null,
  );

  @override
  String toString() =>
      'SpeedLimitInfo(road: $roadName, speed: ${speedLimit}km/h, type: $roadType, src: $source, hgv: $truckSpeedLimit, noMoto: $motorcycleForbidden)';
}
