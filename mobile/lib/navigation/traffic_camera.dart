import 'package:latlong2/latlong.dart';

class TrafficCamera {
  final String code;
  final String name;
  final String? address;
  final double latitude;
  final double longitude;
  final double warningDistance; // in meters (default 350m)
  final double? bearing; // direction (0..360), null for all directions
  final String? district;
  final String? city;
  final bool isActive;

  // Runtime state for navigation
  bool isAnnounced;
  double? currentDistanceMeters;

  TrafficCamera({
    required this.code,
    required this.name,
    this.address,
    required this.latitude,
    required this.longitude,
    this.warningDistance = 350.0,
    this.bearing,
    this.district,
    this.city,
    this.isActive = true,
    this.isAnnounced = false,
    this.currentDistanceMeters,
  });

  LatLng get location => LatLng(latitude, longitude);

  factory TrafficCamera.fromJson(Map<String, dynamic> json) {
    return TrafficCamera(
      code: json['code']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Camera giám sát',
      address: json['address']?.toString(),
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      warningDistance: (json['warningDistance'] as num?)?.toDouble() ?? 350.0,
      bearing: (json['bearing'] as num?)?.toDouble(),
      district: json['district']?.toString(),
      city: json['city']?.toString() ?? 'Hồ Chí Minh',
      isActive: json['isActive'] == null ? true : (json['isActive'] == true),
    );
  }

  Map<String, dynamic> toJson() => {
    'code': code,
    'name': name,
    'address': address,
    'latitude': latitude,
    'longitude': longitude,
    'warningDistance': warningDistance,
    'bearing': bearing,
    'district': district,
    'city': city,
    'isActive': isActive,
  };
}
