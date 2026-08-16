import 'package:latlong2/latlong.dart';

/// Centralized General App Constants for Mobile App
class AppConstants {
  // Storage Keys for Secure Storage
  static const String tokenKey = 'jwt_token';
  static const String refreshTokenKey = 'jwt_refresh_token';
  static const String usernameKey = 'user_name';
  static const String userEmailKey = 'user_email';
  static const String userRoleKey = 'user_role';
  static const String isLinehaulDriverKey = 'is_linehaul_driver';
  static const String driverLicenseClassKey = 'driver_license_class';
  static const String driverTypesKey = 'driver_types';

  // Default Coordinates & Map Config
  static const LatLng defaultHcmLocation = LatLng(10.8231, 106.6297);
  static const double defaultZoom = 14.5;

  // Operational Defaults
  static const num defaultShippingFee = 31000;
  static const double defaultPackageWeight = 1.0;
  static const double defaultPackageVolume = 0.004;

  // Placeholder Asset & Image URLs
  static const String defaultAvatarUrl =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuANja3zeifum0i91jCsi1-_rLWN0_ur9Ei6pA-ZxEPasd_19VmvkBs8CuqUFMDDQ2J6ik0bKTzHOS1_5RPPn9jFMe7y8tqHuda7--IK3SCCIUD_jcGs413LNup-Rzhiui3n8lajNT-9XPixzsacUjRFf5RVBc-5zXZ8ZDut-fQk13E2KARZqDv1oYLNF9F9cascOR5F-0YAjkVDoko8Dt8j-l95YugQOZz4P33L5WNtcdPuOJeM9fIA4Q';

  static const String drawerHeaderAvatarUrl =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDaWHdHbndbzOw4N3alsZ0z3J-w93wa6FWG0Q6Mp5m902BW4jN33bpQDQiqk_rVSh_ns09HEeSO5MIj_mNnycfXUi3PPny9SmTCThXKB8uEGlZkLkjxunNqeEybkNkVXHZGTkOsxME2AFgoJlCIyXyuG0qDEkDIWdCOWbmTZdRZVpZq8X8CtXnvzK1U51fq5o3kpE9CroH1dpIXGVvndc2ODZG4cZJcvFf_ruulEJBnUJopunvUx8zr7g';

  static const String placeholderProofImageUrl =
      'https://picsum.photos/id/10/400/200';
}
