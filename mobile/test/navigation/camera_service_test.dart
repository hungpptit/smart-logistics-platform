import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:velocity_mobile/services/camera_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('CameraService & Proximity Alert Tests', () {
    late CameraService cameraService;

    setUp(() {
      cameraService = CameraService();
    });

    test('Loads 36 HCMC traffic cameras offline fallback successfully', () async {
      final cameras = await cameraService.loadCameras();
      expect(cameras.length, greaterThanOrEqualTo(36));
      expect(cameras.any((c) => c.code == 'CAM_HCMC_BT_01'), isTrue);
      expect(cameras.any((c) => c.code == 'CAM_HCMC_TD_01'), isTrue);
    });

    test('2-tier Spatial Detection detects Ngã tư Hàng Xanh when car approaches within 300m', () async {
      await cameraService.loadCameras();

      // Vị trí xe đang chạy trên Điện Biên Phủ, cách Ngã tư Hàng Xanh ~150m (10.8005, 106.7110)
      const carNearHangXanh = LatLng(10.8005, 106.7110);
      final result = cameraService.findNearbyAlertCamera(
        currentPosition: carNearHangXanh,
        searchRadiusMeters: 450.0,
      );

      expect(result, isNotNull);
      expect(result!.camera.code, equals('CAM_HCMC_BT_01'));
      expect(result.distanceMeters, lessThan(350.0));
      expect(result.camera.name, contains('Hàng Xanh'));
    });

    test('Bounding Box fast filter completely ignores District 1 / Binh Thanh cameras when car is in Thu Duc', () async {
      await cameraService.loadCameras();

      // Vị trí xe đang ở Ngã tư Thủ Đức (10.8505, 106.7715)
      const carInThuDuc = LatLng(10.8505, 106.7715);
      final result = cameraService.findNearbyAlertCamera(
        currentPosition: carInThuDuc,
        searchRadiusMeters: 450.0,
      );

      expect(result, isNotNull);
      expect(result!.camera.code, equals('CAM_HCMC_TD_01'));
      expect(result.camera.district, contains('Thủ Đức'));
      // Đảm bảo không bị nhầm sang camera Hàng Xanh hay Quận 1
      expect(result.camera.code, isNot(equals('CAM_HCMC_BT_01')));
      expect(result.camera.code, isNot(equals('CAM_HCMC_Q1_01')));
    });

    test('Returns null when car is in an area with no cameras within search radius', () async {
      await cameraService.loadCameras();

      // Giữa biển Cần Giờ hoặc tọa độ xa không có camera (10.4000, 106.9000)
      const carInRemoteArea = LatLng(10.4000, 106.9000);
      final result = cameraService.findNearbyAlertCamera(
        currentPosition: carInRemoteArea,
        searchRadiusMeters: 450.0,
      );

      expect(result, isNull);
    });
  });
}
