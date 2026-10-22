import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import '../core/constants/api_constants.dart';
import '../navigation/traffic_camera.dart';
import 'auth_service.dart';

class CameraNearbyResult {
  final TrafficCamera camera;
  final double distanceMeters;

  CameraNearbyResult({required this.camera, required this.distanceMeters});
}

class CameraService {
  static final CameraService _instance = CameraService._internal();
  factory CameraService() => _instance;
  CameraService._internal();

  List<TrafficCamera> _cameras = [];
  bool _isLoaded = false;

  List<TrafficCamera> get cameras => _cameras;

  /// Tải danh sách camera từ Backend API (kèm fallback Offline TP.HCM)
  Future<List<TrafficCamera>> loadCameras({bool forceRefresh = false}) async {
    if (_isLoaded && !forceRefresh && _cameras.isNotEmpty) {
      return _cameras;
    }

    // 1. Thử gọi API Backend nếu có kết nối
    try {
      final token = await AuthService.getToken();
      if (token != null) {
        final uri = Uri.parse(ApiConstants.trafficCameras);
        debugPrint('📡 [CameraService] Gọi API: $uri');
        final response = await http.get(
          uri,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
        ).timeout(const Duration(seconds: 4));

        if (response.statusCode == 200) {
          final body = jsonDecode(response.body);
          if (body['success'] == true && body['data'] is List) {
            final List list = body['data'];
            _cameras = list.map((item) => TrafficCamera.fromJson(item)).toList();
            _isLoaded = true;
            debugPrint('✅ [CameraService] Đã tải ${_cameras.length} camera từ Backend');
            return _cameras;
          }
        }
      }
    } catch (e) {
      debugPrint('⚠️ [CameraService] Không tải được từ Backend, chuyển sang Offline fallback: $e');
    }

    // 2. Fallback: Nạp 36 camera TP.HCM chuẩn có sẵn offline
    if (_cameras.isEmpty) {
      _cameras = _getOfflineHcmcCameras();
      _isLoaded = true;
      debugPrint('📍 [CameraService] Đã nạp ${_cameras.length} camera TP.HCM từ dữ liệu Offline chuẩn');
    }

    return _cameras;
  }

  /// Thuật toán tìm Camera gần nhất (2 tầng tối ưu: Bounding Box O(1) + WGS-84 Distance)
  CameraNearbyResult? findNearbyAlertCamera({
    required LatLng currentPosition,
    double searchRadiusMeters = 500.0,
  }) {
    if (_cameras.isEmpty) return null;

    // Tầng 1: Lọc thô bằng Bounding Box siêu tốc (~600m tương đương 0.006 độ)
    const double deltaDegree = 0.006;
    final double carLat = currentPosition.latitude;
    final double carLng = currentPosition.longitude;

    TrafficCamera? closestCam;
    double minDistance = double.infinity;

    for (final cam in _cameras) {
      if (!cam.isActive) continue;

      // Loại bỏ ngay lập tức 99% camera ở các quận huyện khác
      if ((cam.latitude - carLat).abs() > deltaDegree ||
          (cam.longitude - carLng).abs() > deltaDegree) {
        continue;
      }

      // Tầng 2: Đo khoảng cách trắc địa WGS-84 chính xác đến từng mét
      final double distance = Geolocator.distanceBetween(
        carLat,
        carLng,
        cam.latitude,
        cam.longitude,
      );

      cam.currentDistanceMeters = distance;

      if (distance <= searchRadiusMeters && distance < minDistance) {
        minDistance = distance;
        closestCam = cam;
      }
    }

    if (closestCam != null) {
      return CameraNearbyResult(camera: closestCam, distanceMeters: minDistance);
    }
    return null;
  }

  /// Reset trạng thái đã thông báo cho toàn bộ camera khi bắt đầu cuốc mới
  void resetAnnouncements() {
    for (final cam in _cameras) {
      cam.isAnnounced = false;
      cam.currentDistanceMeters = null;
    }
  }

  /// Bộ dữ liệu 36 Camera phạt nguội TP.HCM Offline phòng khi mất mạng
  List<TrafficCamera> _getOfflineHcmcCameras() {
    return [
      TrafficCamera(code: 'CAM_HCMC_TD_01', name: 'Camera Xa Lộ Hà Nội - Ngã tư Thủ Đức', address: 'Giao lộ Xa Lộ Hà Nội - Võ Văn Ngân, TP. Thủ Đức', latitude: 10.850721, longitude: 106.771912, warningDistance: 400, district: 'Thành phố Thủ Đức'),
      TrafficCamera(code: 'CAM_HCMC_TD_02', name: 'Camera Mai Chí Thọ - Hầm Thủ Thiêm', address: 'Đại lộ Mai Chí Thọ, Phường An Phú, TP. Thủ Đức', latitude: 10.771215, longitude: 106.708534, warningDistance: 350, district: 'Thành phố Thủ Đức'),
      TrafficCamera(code: 'CAM_HCMC_TD_03', name: 'Camera Nút giao Cát Lái - Mai Chí Thọ', address: 'Nút giao Cát Lái, TP. Thủ Đức', latitude: 10.803522, longitude: 106.745618, warningDistance: 400, district: 'Thành phố Thủ Đức'),
      TrafficCamera(code: 'CAM_HCMC_TD_04', name: 'Camera Xa Lộ Hà Nội - Cầu Rạch Chiếc', address: 'Chân cầu Rạch Chiếc, TP. Thủ Đức', latitude: 10.817654, longitude: 106.757821, warningDistance: 450, district: 'Thành phố Thủ Đức'),
      TrafficCamera(code: 'CAM_HCMC_TD_05', name: 'Camera Ngã tư Bình Thái', address: 'Võ Nguyên Giáp giao Đỗ Xuân Hợp, TP. Thủ Đức', latitude: 10.835412, longitude: 106.764512, warningDistance: 350, district: 'Thành phố Thủ Đức'),
      TrafficCamera(code: 'CAM_HCMC_TD_06', name: 'Camera Đường Nguyễn Duy Trinh - Vòng xoay Phú Hữu', address: 'Vòng xoay Phú Hữu, TP. Thủ Đức', latitude: 10.793812, longitude: 106.791245, warningDistance: 350, district: 'Thành phố Thủ Đức'),
      TrafficCamera(code: 'CAM_HCMC_TD_07', name: 'Camera Ngã ba Cát Lái - Đồng Văn Cống', address: 'Đồng Văn Cống, TP. Thủ Đức', latitude: 10.776123, longitude: 106.769845, warningDistance: 400, district: 'Thành phố Thủ Đức'),
      TrafficCamera(code: 'CAM_HCMC_TD_08', name: 'Camera Ngã tư Tây Hòa (RMK)', address: 'Võ Nguyên Giáp giao Tây Hòa, TP. Thủ Đức', latitude: 10.825612, longitude: 106.761245, warningDistance: 350, district: 'Thành phố Thủ Đức'),
      TrafficCamera(code: 'CAM_HCMC_TD_09', name: 'Camera Nút giao Trạm 2 - Suối Tiên', address: 'Quốc Lộ 1A giao Xa Lộ Hà Nội, TP. Thủ Đức', latitude: 10.865412, longitude: 106.797821, warningDistance: 450, district: 'Thành phố Thủ Đức'),
      TrafficCamera(code: 'CAM_HCMC_TD_10', name: 'Camera Đường Lê Văn Việt - Đình Phong Phú', address: 'Lê Văn Việt giao Đình Phong Phú, TP. Thủ Đức', latitude: 10.846512, longitude: 106.779812, warningDistance: 300, district: 'Thành phố Thủ Đức'),
      TrafficCamera(code: 'CAM_HCMC_BT_01', name: 'Camera Ngã tư Hàng Xanh', address: 'Điện Biên Phủ giao Xô Viết Nghệ Tĩnh, Q. Bình Thạnh', latitude: 10.801625, longitude: 106.711831, warningDistance: 350, district: 'Bình Thạnh'),
      TrafficCamera(code: 'CAM_HCMC_BT_02', name: 'Camera Chân Cầu Sài Gòn (về Bình Thạnh)', address: 'Điện Biên Phủ, Phường 22, Q. Bình Thạnh', latitude: 10.798512, longitude: 106.721415, warningDistance: 400, district: 'Bình Thạnh'),
      TrafficCamera(code: 'CAM_HCMC_BT_03', name: 'Camera Phạm Văn Đồng - Phan Văn Trị', address: 'Phạm Văn Đồng giao Phan Văn Trị, Q. Bình Thạnh', latitude: 10.820512, longitude: 106.697845, warningDistance: 450, district: 'Bình Thạnh'),
      TrafficCamera(code: 'CAM_HCMC_BT_04', name: 'Camera Cầu Bình Triệu 1 & 2', address: 'Quốc Lộ 13, Chân cầu Bình Triệu, Q. Bình Thạnh', latitude: 10.816421, longitude: 106.712541, warningDistance: 350, district: 'Bình Thạnh'),
      TrafficCamera(code: 'CAM_HCMC_Q1_01', name: 'Camera Ngã tư Nguyễn Thái Học - Trần Hưng Đạo', address: 'Trần Hưng Đạo giao Nguyễn Thái Học, Quận 1', latitude: 10.765412, longitude: 106.694821, warningDistance: 300, district: 'Quận 1'),
      TrafficCamera(code: 'CAM_HCMC_Q1_02', name: 'Camera Ngã tư Hai Bà Trưng - Điện Biên Phủ', address: 'Hai Bà Trưng giao Điện Biên Phủ, Quận 1', latitude: 10.789512, longitude: 106.694215, warningDistance: 300, district: 'Quận 1'),
      TrafficCamera(code: 'CAM_HCMC_Q1_03', name: 'Camera Đại lộ Võ Văn Kiệt - Cầu Calmette', address: 'Võ Văn Kiệt giao Calmette, Quận 1', latitude: 10.768412, longitude: 106.702512, warningDistance: 400, district: 'Quận 1'),
      TrafficCamera(code: 'CAM_HCMC_Q3_01', name: 'Camera Vòng xoay Dân Chủ', address: 'Vòng xoay Dân Chủ, CMT8 - Võ Thị Sáu - 3/2, Quận 3', latitude: 10.778512, longitude: 106.681245, warningDistance: 300),
      TrafficCamera(code: 'CAM_HCMC_Q3_02', name: 'Camera Nam Kỳ Khởi Nghĩa - Lý Chính Thắng', address: 'Nam Kỳ Khởi Nghĩa giao Lý Chính Thắng, Quận 3', latitude: 10.790412, longitude: 106.685412, warningDistance: 300),
      TrafficCamera(code: 'CAM_HCMC_PN_01', name: 'Camera Ngã tư Phú Nhuận', address: 'Phan Đình Phùng giao Phan Đăng Lưu, Q. Phú Nhuận', latitude: 10.799712, longitude: 106.680612, warningDistance: 300),
      TrafficCamera(code: 'CAM_HCMC_PN_02', name: 'Camera Hoàng Văn Thụ - Nguyễn Văn Trỗi', address: 'Hoàng Văn Thụ giao Nguyễn Văn Trỗi, Q. Phú Nhuận', latitude: 10.798124, longitude: 106.671245, warningDistance: 350),
      TrafficCamera(code: 'CAM_HCMC_GV_01', name: 'Camera Phạm Văn Đồng - Vòng xoay Nguyễn Kiệm', address: 'Phạm Văn Đồng giao Nguyễn Kiệm, Q. Gò Vấp', latitude: 10.817412, longitude: 106.678912, warningDistance: 450),
      TrafficCamera(code: 'CAM_HCMC_GV_02', name: 'Camera Ngã sáu Gò Vấp', address: 'Quang Trung - Nguyễn Oanh - Nguyễn Kiệm, Q. Gò Vấp', latitude: 10.828512, longitude: 106.677845, warningDistance: 300),
      TrafficCamera(code: 'CAM_HCMC_Q5_01', name: 'Camera Đại lộ Võ Văn Kiệt - Cầu Chà Và', address: 'Võ Văn Kiệt giao Cầu Chà Và, Quận 5', latitude: 10.751124, longitude: 106.657512, warningDistance: 400),
      TrafficCamera(code: 'CAM_HCMC_Q5_02', name: 'Camera Nguyễn Tri Phương - An Dương Vương', address: 'Nguyễn Tri Phương giao An Dương Vương, Quận 5', latitude: 10.756412, longitude: 106.668512, warningDistance: 300),
      TrafficCamera(code: 'CAM_HCMC_Q6_01', name: 'Camera Vòng xoay Cây Gõ', address: 'Hồng Bàng giao Ba Tháng Hai, Quận 6', latitude: 10.755812, longitude: 106.647812, warningDistance: 300),
      TrafficCamera(code: 'CAM_HCMC_Q10_01', name: 'Camera Ngã sáu Cộng Hòa', address: 'Nguyễn Văn Cừ - Hùng Vương - Lý Thái Tổ, Quận 10', latitude: 10.763512, longitude: 106.681245, warningDistance: 300),
      TrafficCamera(code: 'CAM_HCMC_Q7_01', name: 'Camera Nguyễn Văn Linh - Nguyễn Thị Thập', address: 'Nguyễn Văn Linh giao Nguyễn Thị Thập, Quận 7', latitude: 10.730412, longitude: 106.715312, warningDistance: 450),
      TrafficCamera(code: 'CAM_HCMC_Q7_02', name: 'Camera Nguyễn Văn Linh - Nguyễn Hữu Thọ', address: 'Nguyễn Văn Linh giao Nguyễn Hữu Thọ, Quận 7', latitude: 10.732512, longitude: 106.703215, warningDistance: 450),
      TrafficCamera(code: 'CAM_HCMC_Q7_03', name: 'Camera Chân Cầu Phú Mỹ (Phía Q7)', address: 'Đường dẫn Cầu Phú Mỹ, Quận 7', latitude: 10.741245, longitude: 106.738512, warningDistance: 500),
      TrafficCamera(code: 'CAM_HCMC_TB_01', name: 'Camera Vòng xoay Lăng Cha Cả', address: 'Cộng Hòa - Hoàng Văn Thụ, Q. Tân Bình', latitude: 10.801245, longitude: 106.659812, warningDistance: 350),
      TrafficCamera(code: 'CAM_HCMC_TB_02', name: 'Camera Trường Chinh - Mũi tàu Cộng Hòa', address: 'Trường Chinh giao Cộng Hòa, Q. Tân Bình', latitude: 10.812412, longitude: 106.638512, warningDistance: 350),
      TrafficCamera(code: 'CAM_HCMC_Q12_01', name: 'Camera Nút giao Ngã tư An Sương', address: 'Quốc Lộ 1A giao QL22 - Trường Chinh, Quận 12', latitude: 10.846512, longitude: 106.619812, warningDistance: 500),
      TrafficCamera(code: 'CAM_HCMC_Q12_02', name: 'Camera Ngã tư Ga (Quốc Lộ 1A)', address: 'Quốc Lộ 1A giao Hà Huy Giáp, Quận 12', latitude: 10.865412, longitude: 106.681245, warningDistance: 450),
      TrafficCamera(code: 'CAM_HCMC_BC_01', name: 'Camera Quốc lộ 1A - Nguyễn Văn Linh', address: 'Quốc Lộ 1A giao Nguyễn Văn Linh, Huyện Bình Chánh', latitude: 10.686512, longitude: 106.594712, warningDistance: 500),
      TrafficCamera(code: 'CAM_HCMC_BTAN_01', name: 'Camera Vòng xoay An Lạc', address: 'Quốc Lộ 1A giao Kinh Dương Vương, Q. Bình Tân', latitude: 10.725412, longitude: 106.602512, warningDistance: 450),
    ];
  }
}
