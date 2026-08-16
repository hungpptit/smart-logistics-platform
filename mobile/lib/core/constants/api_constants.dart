import '../config/app_config.dart';

/// Centralized API Endpoints & Third-Party API Keys for Mobile App
class ApiConstants {
  // Third-Party API Keys
  static const String goongApiKey = 'eTwacoQyptGn7akdN8psZ68iNvMGD4xFd45Vu4X9';

  // Base Socket Gateway Server URL
  static String get socketServerUrl =>
      AppConfig.baseUrl.replaceAll('/api/v1', '').replaceAll('/api', '');

  // OSRM Public Routing URL
  static String osrmRoutingUrl(String coords) =>
      'https://router.project-osrm.org/route/v1/driving/$coords?overview=full&geometries=geojson';

  // Barcode 1D Generator API URL
  static String barcodeUrl(String code) =>
      'https://bwipjs-api.metafloor.com/?bcid=code128&text=$code&scale=2&height=10';

  // Authentication Endpoints
  static String get login => '${AppConfig.baseUrl}/auth/login';
  static String get register => '${AppConfig.baseUrl}/auth/register';
  static String get verifyOtp => '${AppConfig.baseUrl}/auth/verify-otp';
  static String get resendOtp => '${AppConfig.baseUrl}/auth/resend-otp';
  static String get resetPassword => '${AppConfig.baseUrl}/auth/reset-password';
  static String get refresh => '${AppConfig.baseUrl}/auth/refresh';
  static String get me => '${AppConfig.baseUrl}/auth/me';
  static String get updateProfile => '${AppConfig.baseUrl}/auth/profile';

  // Route & Shipper Dispatch Endpoints
  static String get routes => '${AppConfig.baseUrl}/routes';
  static String routeDetail(String id) => '${AppConfig.baseUrl}/routes/$id';
  static String routeStart(String id) => '${AppConfig.baseUrl}/routes/$id/start';
  static String routeComplete(String id) => '${AppConfig.baseUrl}/routes/$id/complete';
  static String routeReject(String id) => '${AppConfig.baseUrl}/routes/$id/reject';
  static String get dutyStatus => '${AppConfig.baseUrl}/drivers/duty-status';

  // Shipment & Tote Endpoints
  static String shipmentStatus(String id) => '${AppConfig.baseUrl}/shipments/$id/status';
  static String get loadTote => '${AppConfig.baseUrl}/shipments/load-tote';
  static String totePackages(String toteCode) => '${AppConfig.baseUrl}/orders/tote/$toteCode/packages';

  static String get customerAddresses => '${AppConfig.baseUrl}/customers/me/addresses';
  static String get forgotPassword => '${AppConfig.baseUrl}/auth/forgot-password';

  // Location Endpoints
  static String locationAutocomplete(String input) =>
      '${AppConfig.baseUrl}/locations/autocomplete?input=${Uri.encodeComponent(input)}';
  static String get locationProvinces => '${AppConfig.baseUrl}/locations/provinces';
  static String locationWards(String provinceCode) =>
      '${AppConfig.baseUrl}/locations/provinces/$provinceCode/wards';
  static String locationPlaceDetail(String placeId) =>
      '${AppConfig.baseUrl}/locations/place-detail?placeId=$placeId';

  // Order Endpoints
  static String get orders => '${AppConfig.baseUrl}/orders';
  static String orderDetail(String id) => '${AppConfig.baseUrl}/orders/$id';
  static String orderByCode(String code) => '${AppConfig.baseUrl}/orders/by-code/$code';
  static String cancelOrder(String id) => '${AppConfig.baseUrl}/orders/$id/cancel';
  static String orderStatus(String idOrCode) => '${AppConfig.baseUrl}/orders/$idOrCode/status';
  static String get calculateFee => '${AppConfig.baseUrl}/orders/calculate-fee';
  static String get calculatePricing => '${AppConfig.baseUrl}/orders/calculate-pricing';
  static String payOrder(String id) => '${AppConfig.baseUrl}/orders/$id/pay';
}
