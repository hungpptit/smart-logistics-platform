import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Centralized Order & Route Status Constants and Failure Reasons for Mobile App
class OrderStatusConstants {
  // Order Status Codes
  static const String created = 'CREATED';
  static const String readyForPickup = 'READY_FOR_PICKUP';
  static const String pickupAssigned = 'PICKUP_ASSIGNED';
  static const String picking = 'PICKING';
  static const String pickFailed = 'PICK_FAILED';
  static const String pickedUp = 'PICKED_UP';
  static const String arrivedOriginFacility = 'ARRIVED_ORIGIN_FACILITY';
  static const String readyForDispatch = 'READY_FOR_DISPATCH';
  static const String inTransit = 'IN_TRANSIT';
  static const String atHub = 'AT_HUB';
  static const String outForDelivery = 'OUT_FOR_DELIVERY';
  static const String delivered = 'DELIVERED';
  static const String deliveryFailed = 'DELIVERY_FAILED';
  static const String returning = 'RETURNING';
  static const String returned = 'RETURNED';
  static const String completed = 'COMPLETED';
  static const String cancelled = 'CANCELLED';

  // Mobile Route Display Statuses
  static const String statusInExecution = 'ĐANG THỰC HIỆN';
  static const String statusNext = 'TIẾP THEO';
  static const String statusPickedUp = 'ĐÃ LẤY HÀNG';
  static const String statusDelivered = 'ĐÃ GIAO';
  static const String statusFailed = 'THẤT BẠI';

  // Standard Failure Reasons (Pickup)
  static const List<String> pickupFailureReasons = [
    'Không liên lạc được người gửi',
    'Người gửi hẹn lấy lại sau',
    'Lý do khác',
  ];

  // Standard Failure Reasons (Delivery)
  static const List<String> deliveryFailureReasons = [
    'Không liên lạc được người nhận',
    'Người nhận hẹn lại sau',
    'Lý do khác',
  ];

  // Get User-Friendly Vietnamese Label for Status
  static String getStatusLabel(String status, {bool isPickup = false}) {
    switch (status.toUpperCase()) {
      case created:
        return 'Vừa tạo';
      case readyForPickup:
        return 'Chờ lấy hàng';
      case pickupAssigned:
        return 'Đã phân công lấy hàng';
      case picking:
        return 'Đang lấy hàng';
      case pickFailed:
        return 'Lấy hàng thất bại';
      case pickedUp:
        return 'Đã lấy hàng';
      case arrivedOriginFacility:
      case atHub:
        return 'Đã nhập kho bưu cục';
      case inTransit:
        return 'Đang trung chuyển';
      case outForDelivery:
        return 'Đang đi giao';
      case delivered:
        return 'Đã giao hàng';
      case deliveryFailed:
        return 'Giao hàng thất bại';
      case completed:
        return isPickup ? 'Đã lấy hàng' : 'Đã giao hàng';
      case cancelled:
        return 'Đã hủy';
      case statusInExecution:
        return 'Đang thực hiện';
      case statusNext:
        return 'Tiếp theo';
      case statusPickedUp:
        return 'Đã lấy hàng';
      case statusDelivered:
        return 'Đã giao';
      case statusFailed:
        return 'Thất bại';
      default:
        return status;
    }
  }

  // Get Color for Status Badge
  static Color getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case statusInExecution:
      case picking:
      case outForDelivery:
      case inTransit:
        return AppColors.logisticsRed;
      case statusPickedUp:
      case statusDelivered:
      case delivered:
      case pickedUp:
      case completed:
        return Colors.green.shade700;
      case statusFailed:
      case pickFailed:
      case deliveryFailed:
      case cancelled:
        return AppColors.error;
      case readyForPickup:
      case pickupAssigned:
      case created:
        return Colors.amber.shade800;
      default:
        return AppColors.secondary;
    }
  }
}
