import 'dart:async';
import 'dart:math' show cos, sqrt;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:file_picker/file_picker.dart';
import 'package:csv/csv.dart';
import 'package:excel/excel.dart' hide Border;
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../services/location_service.dart';
import '../../../services/order_service.dart';
import 'create_order/order_step_indicator.dart';
import 'create_order/form_section_header.dart';
import 'create_order/service_option_card.dart';
import 'create_order/map_preview_widget.dart';
import 'create_order/segmented_toggle.dart';
import 'create_order/price_summary_card.dart';

class CreateOrderTab extends StatefulWidget {
  final VoidCallback onOrderCreated;
  final int initialOrderType;

  const CreateOrderTab({
    super.key,
    required this.onOrderCreated,
    this.initialOrderType = 0,
  });

  @override
  State<CreateOrderTab> createState() => _CreateOrderTabState();
}

class _CreateOrderTabState extends State<CreateOrderTab> {
  final _formKey = GlobalKey<FormState>();

  // Form Fields
  final _senderNameController = TextEditingController();
  final _senderPhoneController = TextEditingController();
  final _senderAddressController = TextEditingController();
  final _receiverNameController = TextEditingController();
  final _receiverPhoneController = TextEditingController();
  final _receiverAddressController = TextEditingController();

  // Package Fields (Step 3)
  final _descriptionController = TextEditingController();
  final _declaredValueController = TextEditingController();
  final _weightController = TextEditingController();
  final _lengthController = TextEditingController();
  final _widthController = TextEditingController();
  final _heightController = TextEditingController();
  final _tempController = TextEditingController();

  // Payment & Logistics Fields (Step 4)
  final _codController = TextEditingController();
  bool _isFragilePackage = false;

  // New Fields Matching DB & Web Form Steps
  String _pickupType = 'PICKUP'; // 'PICKUP', 'DROP_OFF'
  String _pickupDateOption = 'TODAY'; // 'TODAY', 'TOMORROW'
  String _pickupShiftOption = 'MORNING'; // 'MORNING', 'AFTERNOON'
  String _feePayer = 'SENDER'; // 'SENDER', 'RECEIVER'
  String _paymentMethodCode = 'CASH'; // 'CASH', 'COD', 'BANK_TRANSFER', 'E_WALLET'
  String _serviceLevel = 'EXPRESS'; // 'EXPRESS', 'STANDARD', 'SAVING', 'COLD_CHAIN'

  // Address Autocomplete Suggestions
  List<AddressPrediction> _senderSuggestions = [];
  List<AddressPrediction> _receiverSuggestions = [];
  bool _showSenderSuggestions = false;
  bool _showReceiverSuggestions = false;
  bool _loadingSenderSuggestions = false;
  bool _loadingReceiverSuggestions = false;

  // Debounce timers
  Timer? _senderDebounceTimer;
  Timer? _receiverDebounceTimer;

  // Location Dropdowns State
  String? _senderProvinceCode;
  String? _senderWardCode;
  List<Map<String, dynamic>> _senderProvinces = [];
  List<Map<String, dynamic>> _senderWards = [];

  String? _receiverProvinceCode;
  String? _receiverWardCode;
  List<Map<String, dynamic>> _receiverProvinces = [];
  List<Map<String, dynamic>> _receiverWards = [];

  // Live Map Coordinates & Controllers
  double _senderLat = 10.776889;
  double _senderLng = 106.700806;
  final MapController _senderMapController = MapController();

  double _receiverLat = 10.776889;
  double _receiverLng = 106.700806;
  final MapController _receiverMapController = MapController();

  // Pricing calculation in VNĐ
  double _basePrice = 20000.0;
  double _serviceFee = 0.0;
  double _fuelTax = 0.0;
  double _totalCost = 20000.0;

  bool _isSubmitting = false;
  int _currentStep = 0;

  int _orderType = 0; // 0 = Đơn lẻ, 1 = Hàng loạt
  bool _isImported = false;
  bool _isBulkSubmitting = false;
  List<Map<String, dynamic>> _importedOrders = [];
  List<String> _bulkCreatedCodes = [];

  void _nextStep() {
    FocusScope.of(context).unfocus();

    if (_currentStep == 0) {
      bool isFormValid = _formKey.currentState?.validate() ?? false;
      bool isProvinceSenderValid = _senderProvinceCode != null;
      bool isWardSenderValid = _senderWardCode != null;
      bool isProvinceReceiverValid = _receiverProvinceCode != null;
      bool isWardReceiverValid = _receiverWardCode != null;

      if (!isFormValid || !isProvinceSenderValid || !isWardSenderValid || !isProvinceReceiverValid || !isWardReceiverValid) {
        String msg = 'Vui lòng điền đầy đủ và chính xác các thông tin còn thiếu!';
        if (!isProvinceSenderValid || !isWardSenderValid) {
          msg = 'Vui lòng chọn Tỉnh/TP và Phường/Xã của Người gửi!';
        } else if (!isProvinceReceiverValid || !isWardReceiverValid) {
          msg = 'Vui lòng chọn Tỉnh/TP và Phường/Xã của Người nhận!';
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('⚠️ $msg'),
            backgroundColor: Colors.red.shade700,
            duration: const Duration(seconds: 3),
          ),
        );
        return;
      }
    } else if (_currentStep == 1) {
      if (!(_formKey.currentState?.validate() ?? false)) {
        return;
      }
    }

    setState(() {
      _currentStep++;
    });
  }

  void _prevStep() {
    setState(() {
      _currentStep--;
    });
  }

  @override
  void initState() {
    super.initState();
    _orderType = widget.initialOrderType;
    _weightController.addListener(_calculatePrice);
    _lengthController.addListener(_calculatePrice);
    _widthController.addListener(_calculatePrice);
    _heightController.addListener(_calculatePrice);
    _tempController.addListener(_calculatePrice);
    _codController.addListener(_calculatePrice);
    _declaredValueController.addListener(_calculatePrice);

    _initAddressListeners();
    _initDataAndLocate();
  }

  Future<void> _initDataAndLocate() async {
    final provs = await LocationService.fetchProvinces();
    if (mounted) {
      setState(() {
        _senderProvinces = provs;
        _receiverProvinces = provs;
      });
      debugPrint('✅ [CreateOrderTab] Đã nạp ${provs.length} Tỉnh/TP.');
    }
  }

  void _initAddressListeners() {
    _senderAddressController.addListener(() {
      final query = _senderAddressController.text;
      if (query.trim().length < 3) {
        _senderDebounceTimer?.cancel();
        if (mounted) setState(() => _senderSuggestions = []);
        return;
      }
      _senderDebounceTimer?.cancel();
      _senderDebounceTimer = Timer(const Duration(milliseconds: 500), () async {
        if (!mounted || !_showSenderSuggestions) return;
        if (mounted) setState(() => _loadingSenderSuggestions = true);
        final results = await LocationService.fetchAutocomplete(query);
        if (mounted) {
          setState(() {
            _senderSuggestions = results;
            _loadingSenderSuggestions = false;
          });
        }
      });
    });

    _receiverAddressController.addListener(() {
      final query = _receiverAddressController.text;
      if (query.trim().length < 3) {
        _receiverDebounceTimer?.cancel();
        if (mounted) setState(() => _receiverSuggestions = []);
        return;
      }
      _receiverDebounceTimer?.cancel();
      _receiverDebounceTimer = Timer(const Duration(milliseconds: 500), () async {
        if (!mounted || !_showReceiverSuggestions) return;
        if (mounted) setState(() => _loadingReceiverSuggestions = true);
        final results = await LocationService.fetchAutocomplete(query);
        if (mounted) {
          setState(() {
            _receiverSuggestions = results;
            _loadingReceiverSuggestions = false;
          });
        }
      });
    });
  }

  Future<void> _handleSelectSuggestion({
    required AddressPrediction item,
    required bool isSender,
  }) async {
    setState(() {
      if (isSender) {
        _showSenderSuggestions = false;
        _senderSuggestions = [];
        _senderAddressController.text = item.description;
      } else {
        _showReceiverSuggestions = false;
        _receiverSuggestions = [];
        _receiverAddressController.text = item.description;
      }
    });

    if (item.placeId.startsWith('dyn-') || item.placeId.startsWith('vn-')) {
      return;
    }

    try {
      final detail = await LocationService.fetchPlaceDetail(item.placeId);
      if (detail == null || !mounted) return;

      final formattedAddress = detail['formatted_address'] as String? ?? item.description;
      final compound = detail['compound'] as Map<String, dynamic>?;

      final provinces = isSender ? _senderProvinces : _receiverProvinces;
      String? matchedProvinceCode = isSender ? _senderProvinceCode : _receiverProvinceCode;
      String? matchedWardCode = isSender ? _senderWardCode : _receiverWardCode;
      List<Map<String, dynamic>> matchedWards = [];

      if (compound != null) {
        final provinceName = compound['province'] as String?;
        if (provinceName != null && provinceName.isNotEmpty) {
          final matchedP = provinces.firstWhere(
            (p) {
              final pName = (p['fullName'] ?? p['name'] ?? '') as String;
              return pName.toLowerCase().contains(provinceName.toLowerCase()) ||
                  provinceName.toLowerCase().contains(pName.toLowerCase());
            },
            orElse: () => {},
          );
          if (matchedP.isNotEmpty) {
            matchedProvinceCode = matchedP['code'] as String?;
          }
        }

        if (matchedProvinceCode != null) {
          matchedWards = await LocationService.fetchWards(matchedProvinceCode);

          final communeName = compound['commune'] as String?;
          if (communeName != null && communeName.isNotEmpty && matchedWards.isNotEmpty) {
            final matchedW = matchedWards.firstWhere(
              (w) {
                final wName = (w['fullName'] ?? w['name'] ?? '') as String;
                return wName.toLowerCase().contains(communeName.toLowerCase()) ||
                    communeName.toLowerCase().contains(wName.toLowerCase());
              },
              orElse: () => {},
            );
            if (matchedW.isNotEmpty) {
              matchedWardCode = matchedW['code'] as String?;
            }
          }
        }
      }

      final loc = detail['geometry']?['location'];
      if (loc != null) {
        final double? lat = (loc['lat'] as num?)?.toDouble();
        final double? lng = (loc['lng'] as num?)?.toDouble();
        if (lat != null && lng != null) {
          if (isSender) {
            _senderLat = lat;
            _senderLng = lng;
            _senderMapController.move(LatLng(lat, lng), 15.0);
          } else {
            _receiverLat = lat;
            _receiverLng = lng;
            _receiverMapController.move(LatLng(lat, lng), 15.0);
          }
        }
      }

      if (!mounted) return;
      setState(() {
        if (isSender) {
          _senderAddressController.text = formattedAddress;
          if (matchedProvinceCode != null) {
            _senderProvinceCode = matchedProvinceCode;
            _senderWards = matchedWards;
          }
          if (matchedWardCode != null) _senderWardCode = matchedWardCode;
        } else {
          _receiverAddressController.text = formattedAddress;
          if (matchedProvinceCode != null) {
            _receiverProvinceCode = matchedProvinceCode;
            _receiverWards = matchedWards;
          }
          if (matchedWardCode != null) _receiverWardCode = matchedWardCode;
        }
      });
    } catch (_) {}
  }

  bool _isLocatingSender = false;
  bool _isLocatingReceiver = false;

  Future<void> _locateCurrentPosition({required bool isSender}) async {
    if ((isSender && _isLocatingSender) || (!isSender && _isLocatingReceiver)) return;

    setState(() {
      if (isSender) {
        _isLocatingSender = true;
      } else {
        _isLocatingReceiver = true;
      }
    });

    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Vui lòng bật dịch vụ vị trí GPS trên thiết bị')),
          );
        }
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return;
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      if (!mounted) return;
      setState(() {
        if (isSender) {
          _senderLat = pos.latitude;
          _senderLng = pos.longitude;
          _senderMapController.move(LatLng(pos.latitude, pos.longitude), 15.0);
        } else {
          _receiverLat = pos.latitude;
          _receiverLng = pos.longitude;
          _receiverMapController.move(LatLng(pos.latitude, pos.longitude), 15.0);
        }
      });

      final rev = await LocationService.reverseGeocode(pos.latitude, pos.longitude);
      if (rev != null && mounted) {
        final shortAddress = rev['shortAddress'] as String? ?? '';
        final formattedAddress = rev['formattedAddress'] as String? ?? '';
        final displayAddress = shortAddress.isNotEmpty ? shortAddress : formattedAddress;

        if (mounted) {
          setState(() {
            if (isSender && displayAddress.isNotEmpty) {
              _senderAddressController.text = displayAddress;
            } else if (!isSender && displayAddress.isNotEmpty) {
              _receiverAddressController.text = displayAddress;
            }
          });
        }
      }
    } catch (e) {
      debugPrint('Error getting location: $e');
    } finally {
      if (mounted) {
        setState(() {
          if (isSender) {
            _isLocatingSender = false;
          } else {
            _isLocatingReceiver = false;
          }
        });
      }
    }
  }

  @override
  void dispose() {
    _senderDebounceTimer?.cancel();
    _receiverDebounceTimer?.cancel();
    _priceCalcDebounce?.cancel();
    _senderNameController.dispose();
    _senderPhoneController.dispose();
    _senderAddressController.dispose();
    _receiverNameController.dispose();
    _receiverPhoneController.dispose();
    _receiverAddressController.dispose();
    _descriptionController.dispose();
    _declaredValueController.dispose();
    _weightController.dispose();
    _lengthController.dispose();
    _widthController.dispose();
    _heightController.dispose();
    _tempController.dispose();
    _codController.dispose();
    super.dispose();
  }

  double _calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const p = 0.017453292519943295;
    final a = 0.5 - cos((lat2 - lat1) * p) / 2 +
        cos(lat1 * p) * cos(lat2 * p) * (1 - cos((lon2 - lon1) * p)) / 2;
    return 12742 * sqrt(a);
  }

  Timer? _priceCalcDebounce;

  void _calculatePrice() {
    if (_priceCalcDebounce?.isActive ?? false) _priceCalcDebounce!.cancel();
    _priceCalcDebounce = Timer(const Duration(milliseconds: 400), () async {
      final weight = double.tryParse(_weightController.text) ?? 1.0;
      final length = double.tryParse(_lengthController.text) ?? 10.0;
      final width = double.tryParse(_widthController.text) ?? 10.0;
      final height = double.tryParse(_heightController.text) ?? 10.0;
      final declaredVal = double.tryParse(_declaredValueController.text) ?? 0.0;

      final volWeight = (length * width * height) / 5000.0;
      final chargeableWeight = weight > volWeight ? weight : volWeight;

      final distance = _calculateDistance(_senderLat, _senderLng, _receiverLat, _receiverLng);

      if (chargeableWeight <= 0) return;

      final res = await OrderService.calculatePricing(
        serviceCode: _serviceLevel.toUpperCase(),
        distanceKm: distance,
        totalWeightKg: chargeableWeight,
        isFragile: _isFragilePackage,
        codAmount: _paymentMethodCode == 'COD' ? (double.tryParse(_codController.text) ?? 0.0) : 0.0,
      );

      if (mounted) {
        if (res['success'] == true) {
          final data = res['data'];
          setState(() {
            _basePrice = double.tryParse(data['basePrice'].toString()) ?? 20000.0;
            _serviceFee = double.tryParse((data['distanceFee'] ?? 0.0).toString()) ?? 0.0;
            _fuelTax = double.tryParse((data['weightFee'] ?? 0.0).toString()) ?? 0.0;
            final insuranceFee = double.tryParse((data['insuranceFee'] ?? 0.0).toString()) ?? 0.0;
            final fragileSurcharge = double.tryParse((data['fragileSurcharge'] ?? 0.0).toString()) ?? 0.0;
            _serviceFee += fragileSurcharge;
            _fuelTax += insuranceFee;

            _totalCost = double.tryParse(data['totalAmount'].toString()) ?? (_basePrice + _serviceFee + _fuelTax);
          });
        } else {
          _calculatePriceClientSide(
            serviceCode: _serviceLevel.toUpperCase(),
            distanceKm: distance,
            totalWeightKg: chargeableWeight,
            isFragile: _isFragilePackage,
            codAmount: _paymentMethodCode == 'COD' ? (double.tryParse(_codController.text) ?? 0.0) : 0.0,
            declaredValue: declaredVal,
          );
        }
      }
    });
  }

  void _calculatePriceClientSide({
    required String serviceCode,
    required double distanceKm,
    required double totalWeightKg,
    required bool isFragile,
    required double codAmount,
    required double declaredValue,
  }) {
    double base = 20000.0;
    double freeDist = 2.0;
    double rateDist = 5000.0;
    double freeWt = 1.0;
    double rateWt = 3000.0;

    switch (serviceCode) {
      case 'EXPRESS':
        base = 35000.0;
        rateDist = 8000.0;
        rateWt = 5000.0;
        break;
      case 'SAVING':
        base = 15000.0;
        rateDist = 3000.0;
        rateWt = 2000.0;
        break;
      case 'COLD_CHAIN':
        base = 60000.0;
        rateDist = 12000.0;
        rateWt = 8000.0;
        break;
      case 'STANDARD':
      default:
        base = 20000.0;
        rateDist = 5000.0;
        rateWt = 3000.0;
        break;
    }

    double billableDistance = (distanceKm - freeDist) > 0 ? (distanceKm - freeDist) : 0.0;
    double distanceFee = billableDistance * rateDist;

    double billableWeight = (totalWeightKg - freeWt) > 0 ? (totalWeightKg - freeWt) : 0.0;
    double weightFee = billableWeight * rateWt;

    double fragileSurcharge = isFragile ? 15000.0 : 0.0;
    double insuranceFee = declaredValue > 0 ? declaredValue * 0.005 : 0.0;

    setState(() {
      _basePrice = base;
      _serviceFee = distanceFee + fragileSurcharge;
      _fuelTax = weightFee + insuranceFee;
      _totalCost = base + distanceFee + weightFee + fragileSurcharge + insuranceFee;
    });
  }

  void _submitForm() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() {
      _isSubmitting = true;
    });

    final String senderProvinceName = _senderProvinces.firstWhere(
      (p) => '${p['code']}' == _senderProvinceCode,
      orElse: () => {'fullName': 'Hồ Chí Minh', 'name': 'Hồ Chí Minh'},
    )['fullName'] ?? 'Hồ Chí Minh';

    final String senderWardName = _senderWards.firstWhere(
      (w) => '${w['code']}' == _senderWardCode,
      orElse: () => {'fullName': '', 'name': ''},
    )['fullName'] ?? '';

    final String receiverProvinceName = _receiverProvinces.firstWhere(
      (p) => '${p['code']}' == _receiverProvinceCode,
      orElse: () => {'fullName': 'Hồ Chí Minh', 'name': 'Hồ Chí Minh'},
    )['fullName'] ?? 'Hồ Chí Minh';

    final String receiverWardName = _receiverWards.firstWhere(
      (w) => '${w['code']}' == _receiverWardCode,
      orElse: () => {'fullName': '', 'name': ''},
    )['fullName'] ?? '';

    final weight = double.tryParse(_weightController.text) ?? 1.0;
    final length = double.tryParse(_lengthController.text) ?? 10.0;
    final width = double.tryParse(_widthController.text) ?? 10.0;
    final height = double.tryParse(_heightController.text) ?? 10.0;
    final declaredVal = double.tryParse(_declaredValueController.text) ?? 0.0;
    final codVal = double.tryParse(_codController.text) ?? 0.0;

    final now = DateTime.now();
    final pickupDate = _pickupDateOption == 'TOMORROW' ? now.add(const Duration(days: 1)) : now;
    final pickupHour = _pickupShiftOption == 'AFTERNOON' ? 14 : 9;
    final scheduledPickupAt = DateTime(pickupDate.year, pickupDate.month, pickupDate.day, pickupHour, 0).toIso8601String();

    final Map<String, dynamic> payload = {
      'serviceCode': _serviceLevel.toUpperCase(),
      'feePayer': _feePayer,
      'paymentMethod': _paymentMethodCode,
      'pickupType': _pickupType,
      'scheduledPickupAt': scheduledPickupAt,
      'codAmount': codVal,
      'senderContact': {
        'fullName': _senderNameController.text.trim().isNotEmpty ? _senderNameController.text.trim() : 'Kho hàng Khách hàng',
        'phone': _senderPhoneController.text.trim().isNotEmpty ? _senderPhoneController.text.trim() : '0900000000',
      },
      'receiverContact': {
        'fullName': _receiverNameController.text.trim(),
        'phone': _receiverPhoneController.text.trim(),
      },
      'pickupAddress': {
        'addressLine1': _senderAddressController.text.trim(),
        'province': senderProvinceName,
        'ward': senderWardName,
        'wardCode': _senderWardCode,
        'latitude': _senderLat,
        'longitude': _senderLng,
      },
      'deliveryAddress': {
        'addressLine1': _receiverAddressController.text.trim(),
        'province': receiverProvinceName,
        'ward': receiverWardName,
        'wardCode': _receiverWardCode,
        'latitude': _receiverLat,
        'longitude': _receiverLng,
      },
      'packages': [
        {
          'weight': weight,
          'length': length,
          'width': width,
          'height': height,
          'isFragile': _isFragilePackage,
          'description': _descriptionController.text.trim().isNotEmpty ? _descriptionController.text.trim() : 'Hàng hóa tổng hợp',
          'declaredValue': declaredVal,
          'temperatureRequirement': _tempController.text.isNotEmpty ? _tempController.text.trim() : null,
        }
      ],
    };

    final result = await OrderService.createOrder(payload);
    if (!mounted) return;

    setState(() {
      _isSubmitting = false;
    });

    if (result['success'] == true && result['data'] != null) {
      final orderData = result['data'];
      final String generatedOrderCode = orderData['orderCode'] ?? orderData['trackingCode'] ?? orderData['id'] ?? 'ORD-SLP';
      final String pickupTimeStr = 'Hẹn lấy hàng: ${_pickupDateOption == 'TOMORROW' ? 'Ngày mai' : 'Hôm nay'} ca ${_pickupShiftOption == 'AFTERNOON' ? 'Chiều (13:00 - 18:00)' : 'Sáng (08:00 - 12:00)'}';

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (BuildContext context) {
          return Dialog(
            backgroundColor: AppColors.pureWhite,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24.0)),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 28.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: const BoxDecoration(
                      color: Color(0xFFDCFCE7),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check_circle_rounded,
                      color: Color(0xFF166534),
                      size: 48,
                    ),
                  ),
                  const SizedBox(height: 18.0),
                  Text(
                    'TẠO ĐƠN HÀNG THÀNH CÔNG!',
                    style: AppTypography.headlineMd.copyWith(
                      color: AppColors.deepOnyx,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8.0),
                  Text(
                    'Đơn hàng của bạn đã được ghi nhận trên hệ thống SLP.',
                    style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20.0),

                  Container(
                    padding: const EdgeInsets.all(16.0),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(16.0),
                      border: Border.all(color: AppColors.surfaceContainerHigh),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Mã vận đơn:', style: AppTypography.labelMd.copyWith(color: AppColors.secondary)),
                            SelectableText(
                              generatedOrderCode,
                              style: AppTypography.headlineMd.copyWith(
                                color: AppColors.logisticsRed,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 20.0),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Tổng tiền cước:', style: AppTypography.labelMd.copyWith(color: AppColors.secondary)),
                            Text(
                              formatCurrency(_totalCost),
                              style: AppTypography.bodyLg.copyWith(
                                color: AppColors.deepOnyx,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14.0),

                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(20.0),
                    ),
                    child: Text(
                      pickupTimeStr,
                      style: AppTypography.labelLg.copyWith(
                        color: const Color(0xFF92400E),
                        fontWeight: FontWeight.bold,
                        fontSize: 12.0,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 24.0),

                  SizedBox(
                    width: double.infinity,
                    height: 50.0,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.of(context).pop();
                        widget.onOrderCreated();
                      },
                      icon: const Icon(Icons.check, color: AppColors.pureWhite, size: 20.0),
                      label: Text(
                        'HOÀN TẤT',
                        style: AppTypography.button.copyWith(
                          color: AppColors.pureWhite,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.deepOnyx,
                        foregroundColor: AppColors.pureWhite,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12.0),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      );
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ ${result['message'] ?? 'Không thể tạo đơn hàng. Vui lòng thử lại.'}'),
            backgroundColor: Colors.red.shade700,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  // --- EXCEL BULK IMPORT PARSER (26 COLUMNS FULLY SUPPORTED) ---
  Future<void> _pickFile() async {
    try {
      final res = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['xlsx', 'xls', 'csv'],
        withData: true,
      );

      if (res == null || res.files.isEmpty) return;

      final file = res.files.first;
      final bytes = file.bytes;
      if (bytes == null) return;

      final ext = file.extension?.toLowerCase();

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(
          child: CircularProgressIndicator(color: AppColors.logisticsRed),
        ),
      );

      List<Map<String, dynamic>> parsedOrders = [];

      try {
        if (ext == 'csv') {
          final content = String.fromCharCodes(bytes);
          final rows = const CsvToListConverter(eol: '\n').convert(content);

          for (int i = 1; i < rows.length; i++) {
            final row = rows[i];
            if (row.length < 5) continue;

            final String rName = row.length > 5 ? row[5]?.toString().trim() ?? '' : row[0]?.toString().trim() ?? '';
            final String rPhone = row.length > 6 ? row[6]?.toString().trim() ?? '' : row[1]?.toString().trim() ?? '';
            final String rAddr = row.length > 7 ? row[7]?.toString().trim() ?? '' : row[2]?.toString().trim() ?? '';
            final String rWard = row.length > 8 ? row[8]?.toString().trim() ?? '' : '';
            final String rProv = row.length > 9 ? row[9]?.toString().trim() ?? '' : 'Thành phố Hồ Chí Minh';

            if (rName.isEmpty || rPhone.isEmpty || rAddr.isEmpty) continue;

            parsedOrders.add({
              'senderName': row.length > 0 ? row[0]?.toString().trim() ?? '' : '',
              'senderPhone': row.length > 1 ? row[1]?.toString().trim() ?? '' : '',
              'senderAddress': row.length > 2 ? row[2]?.toString().trim() ?? '' : '',
              'senderWard': row.length > 3 ? row[3]?.toString().trim() ?? '' : '',
              'senderProvince': row.length > 4 ? row[4]?.toString().trim() ?? '' : '',
              'receiverName': rName,
              'receiverPhone': rPhone,
              'deliveryAddressText': rAddr,
              'receiverWard': rWard,
              'receiverProvince': rProv,
              'description': row.length > 10 ? row[10]?.toString().trim() ?? 'Hàng hóa tổng hợp' : 'Hàng hóa',
              'weight': double.tryParse(row.length > 11 ? row[11]?.toString().trim() ?? '1.0' : '1.0') ?? 1.0,
              'length': double.tryParse(row.length > 12 ? row[12]?.toString().trim() ?? '10' : '10') ?? 10.0,
              'width': double.tryParse(row.length > 13 ? row[13]?.toString().trim() ?? '10' : '10') ?? 10.0,
              'height': double.tryParse(row.length > 14 ? row[14]?.toString().trim() ?? '10' : '10') ?? 10.0,
              'declaredValue': double.tryParse(row.length > 15 ? row[15]?.toString().trim() ?? '0' : '0') ?? 0.0,
              'isFragile': row.length > 16 && (row[16]?.toString().trim().toLowerCase() == 'có' || row[16]?.toString().trim().toLowerCase() == 'true'),
              'serviceCode': row.length > 18 && row[18].toString().contains('EXPRESS') ? 'EXPRESS' : 'STANDARD',
              'feePayer': row.length > 22 && row[22].toString().contains('RECEIVER') ? 'RECEIVER' : 'SENDER',
              'paymentMethod': row.length > 23 && row[23].toString().contains('COD') ? 'COD' : 'CASH',
              'codAmount': double.tryParse(row.length > 24 ? row[24]?.toString().trim() ?? '0' : '0') ?? 0.0,
            });
          }
        } else if (ext == 'xlsx' || ext == 'xls') {
          final excel = Excel.decodeBytes(bytes);
          final sheet = excel.tables[excel.tables.keys.first];
          if (sheet != null) {
            for (int i = 1; i < sheet.rows.length; i++) {
              final row = sheet.rows[i];
              if (row.length < 5) continue;

              final String rName = row.length > 5 ? row[5]?.value?.toString().trim() ?? '' : row[0]?.value?.toString().trim() ?? '';
              final String rPhone = row.length > 6 ? row[6]?.value?.toString().trim() ?? '' : row[1]?.value?.toString().trim() ?? '';
              final String rAddr = row.length > 7 ? row[7]?.value?.toString().trim() ?? '' : row[2]?.value?.toString().trim() ?? '';
              final String rWard = row.length > 8 ? row[8]?.value?.toString().trim() ?? '' : '';
              final String rProv = row.length > 9 ? row[9]?.value?.toString().trim() ?? '' : 'Thành phố Hồ Chí Minh';

              if (rName.isEmpty || rPhone.isEmpty || rAddr.isEmpty) continue;

              parsedOrders.add({
                'senderName': row.length > 0 ? row[0]?.value?.toString().trim() ?? '' : '',
                'senderPhone': row.length > 1 ? row[1]?.value?.toString().trim() ?? '' : '',
                'senderAddress': row.length > 2 ? row[2]?.value?.toString().trim() ?? '' : '',
                'senderWard': row.length > 3 ? row[3]?.value?.toString().trim() ?? '' : '',
                'senderProvince': row.length > 4 ? row[4]?.value?.toString().trim() ?? '' : '',
                'receiverName': rName,
                'receiverPhone': rPhone,
                'deliveryAddressText': rAddr,
                'receiverWard': rWard,
                'receiverProvince': rProv,
                'description': row.length > 10 ? row[10]?.value?.toString().trim() ?? 'Hàng hóa tổng hợp' : 'Hàng hóa',
                'weight': double.tryParse(row.length > 11 ? row[11]?.value?.toString().trim() ?? '1.0' : '1.0') ?? 1.0,
                'length': double.tryParse(row.length > 12 ? row[12]?.value?.toString().trim() ?? '10' : '10') ?? 10.0,
                'width': double.tryParse(row.length > 13 ? row[13]?.value?.toString().trim() ?? '10' : '10') ?? 10.0,
                'height': double.tryParse(row.length > 14 ? row[14]?.value?.toString().trim() ?? '10' : '10') ?? 10.0,
                'declaredValue': double.tryParse(row.length > 15 ? row[15]?.value?.toString().trim() ?? '0' : '0') ?? 0.0,
                'isFragile': row.length > 16 && (row[16]?.value?.toString().trim().toLowerCase() == 'có' || row[16]?.value?.toString().trim().toLowerCase() == 'true'),
                'serviceCode': row.length > 18 && row[18]?.value?.toString().contains('EXPRESS') == true ? 'EXPRESS' : 'STANDARD',
                'feePayer': row.length > 22 && row[22]?.value?.toString().contains('RECEIVER') == true ? 'RECEIVER' : 'SENDER',
                'paymentMethod': row.length > 23 && row[23]?.value?.toString().contains('COD') == true ? 'COD' : 'CASH',
                'codAmount': double.tryParse(row.length > 24 ? row[24]?.value?.toString().trim() ?? '0' : '0') ?? 0.0,
              });
            }
          }
        }
      } catch (_) {
        parsedOrders = [];
      }

      if (mounted) Navigator.pop(context);

      if (parsedOrders.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('⚠️ Không đọc được dữ liệu. Vui lòng sử dụng file mẫu MAU_FILE_TAO_DON_HANG_LOAT_SLP.xlsx',
                style: AppTypography.labelMd.copyWith(color: AppColors.pureWhite),
              ),
              backgroundColor: AppColors.deepOnyx,
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 4),
            ),
          );
        }
        return;
      }

      if (mounted) {
        setState(() {
          _isImported = true;
          _importedOrders = parsedOrders;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Đã đọc thành công ${parsedOrders.length} đơn hàng từ file Excel!'),
            backgroundColor: const Color(0xFF166534),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        try { Navigator.pop(context); } catch (_) {}
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi đọc file: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _submitBulkOrders() async {
    setState(() {
      _isBulkSubmitting = true;
    });

    final String defaultSenderName = _senderNameController.text.trim().isNotEmpty ? _senderNameController.text.trim() : 'Kho hàng Khách hàng';
    final String defaultSenderPhone = _senderPhoneController.text.trim().isNotEmpty ? _senderPhoneController.text.trim() : '0900000000';
    final String defaultSenderAddress = _senderAddressController.text.trim().isNotEmpty ? _senderAddressController.text.trim() : '100 Nguyễn Du';
    final String defaultSenderProv = _senderProvinces.firstWhere(
      (p) => '${p['code']}' == _senderProvinceCode,
      orElse: () => {'fullName': 'Thành phố Hồ Chí Minh'},
    )['fullName'] ?? 'Thành phố Hồ Chí Minh';
    final String defaultSenderWard = _senderWards.firstWhere(
      (w) => '${w['code']}' == _senderWardCode,
      orElse: () => {'fullName': 'Phường Bến Thành'},
    )['fullName'] ?? 'Phường Bến Thành';

    final List<String> codes = [];
    for (final order in _importedOrders) {
      final sName = (order['senderName'] as String?).toString().trim().isNotEmpty ? order['senderName'] : defaultSenderName;
      final sPhone = (order['senderPhone'] as String?).toString().trim().isNotEmpty ? order['senderPhone'] : defaultSenderPhone;
      final sAddr = (order['senderAddress'] as String?).toString().trim().isNotEmpty ? order['senderAddress'] : defaultSenderAddress;
      final sWard = (order['senderWard'] as String?).toString().trim().isNotEmpty ? order['senderWard'] : defaultSenderWard;
      final sProv = (order['senderProvince'] as String?).toString().trim().isNotEmpty ? order['senderProvince'] : defaultSenderProv;

      final payload = {
        'serviceCode': order['serviceCode'] ?? 'STANDARD',
        'feePayer': order['feePayer'] ?? 'SENDER',
        'paymentMethod': order['paymentMethod'] ?? 'CASH',
        'pickupType': 'PICKUP',
        'codAmount': order['codAmount'] ?? 0.0,
        'senderContact': {
          'fullName': sName,
          'phone': sPhone,
        },
        'receiverContact': {
          'fullName': order['receiverName'],
          'phone': order['receiverPhone'],
        },
        'pickupAddress': {
          'addressLine1': sAddr,
          'province': sProv,
          'ward': sWard,
          'latitude': _senderLat,
          'longitude': _senderLng,
        },
        'deliveryAddress': {
          'addressLine1': order['deliveryAddressText'],
          'province': (order['receiverProvince'] as String?).toString().isNotEmpty ? order['receiverProvince'] : 'Thành phố Hồ Chí Minh',
          'ward': (order['receiverWard'] as String?).toString().isNotEmpty ? order['receiverWard'] : '',
          'latitude': _receiverLat,
          'longitude': _receiverLng,
        },
        'packages': [
          {
            'weight': order['weight'] ?? 1.0,
            'length': order['length'] ?? 10.0,
            'width': order['width'] ?? 10.0,
            'height': order['height'] ?? 10.0,
            'isFragile': order['isFragile'] ?? false,
            'description': order['description'] ?? 'Hàng hóa tổng hợp',
            'declaredValue': order['declaredValue'] ?? 0.0,
          }
        ],
      };

      final res = await OrderService.createOrder(payload);
      if (res['success'] == true && res['data'] != null) {
        final code = res['data']['orderCode'] ?? res['data']['id'] ?? 'ORD-GEN';
        codes.add(code);
      }
    }

    setState(() {
      _isBulkSubmitting = false;
      _bulkCreatedCodes = codes;
    });
  }

  Widget _buildBulkOrderView() {
    if (_bulkCreatedCodes.isNotEmpty) {
      return _buildBulkSuccessView();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(20.0),
          decoration: BoxDecoration(
            color: AppColors.surfaceContainerLow,
            borderRadius: AppStyles.roundedXl,
            border: Border.all(color: AppColors.surfaceContainerHigh),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.upload_file, color: AppColors.logisticsRed, size: 28),
                  const SizedBox(width: 10),
                  Text('Tạo Đơn Hàng Loạt Bằng File Excel', style: AppTypography.headlineMd.copyWith(fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                'Tải file mẫu Excel MAU_FILE_TAO_DON_HANG_LOAT_SLP.xlsx đã được nạp sẵn Menu chọn Tỉnh/TP & Phường/Xã chuẩn từ CSDL.',
                style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: _pickFile,
                  icon: const Icon(Icons.file_open, color: Colors.white),
                  label: const Text('TẢI FILE EXCEL LÊN (XLSX / CSV)', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.logisticsRed,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
        ),
        if (_isImported && _importedOrders.isNotEmpty) ...[
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Danh sách ${_importedOrders.length} đơn nhập từ Excel', style: AppTypography.headlineMd.copyWith(fontWeight: FontWeight.bold)),
              IconButton(
                icon: const Icon(Icons.delete_outline, color: Colors.red),
                onPressed: () {
                  setState(() {
                    _isImported = false;
                    _importedOrders = [];
                  });
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _importedOrders.length,
            itemBuilder: (ctx, idx) {
              final item = _importedOrders[idx];
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: Colors.red.shade50,
                      child: Text('${idx + 1}', style: const TextStyle(color: AppColors.logisticsRed, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${item['receiverName']} - ${item['receiverPhone']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          const SizedBox(height: 2),
                          Text('${item['deliveryAddressText']}, ${item['receiverWard']}, ${item['receiverProvince']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 11)),
                          const SizedBox(height: 2),
                          Text('Hàng: ${item['description']} (${item['weight']}kg)', style: const TextStyle(color: AppColors.logisticsRed, fontSize: 11, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _isBulkSubmitting ? null : _submitBulkOrders,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.deepOnyx,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isBulkSubmitting
                  ? const CircularProgressIndicator(color: Colors.white)
                  : Text('XÁC NHẬN TẠO ${_importedOrders.length} ĐƠN HÀNG', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildBulkSuccessView() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16.0),
          decoration: const BoxDecoration(
            color: Color(0xFFDCFCE7),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.check_circle,
            color: Color(0xFF166534),
            size: 48.0,
          ),
        ),
        const SizedBox(height: 20.0),
        Text('TẠO HÀNG LOẠT THÀNH CÔNG!', style: AppTypography.headlineMd.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8.0),
        Text('Đã khởi tạo thành công ${_bulkCreatedCodes.length} đơn hàng trên hệ thống.', style: AppTypography.bodyMd.copyWith(color: AppColors.secondary)),
        const SizedBox(height: 20.0),
        SizedBox(
          width: double.infinity,
          height: 50.0,
          child: ElevatedButton(
            onPressed: () {
              setState(() {
                _bulkCreatedCodes = [];
                _importedOrders = [];
                _isImported = false;
              });
              widget.onOrderCreated();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.deepOnyx,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.0)),
            ),
            child: const Text('HOÀN TẤT', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(
        horizontal: AppStyles.marginMobile,
        vertical: 24.0,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(bottom: 20.0),
            padding: const EdgeInsets.all(4.0),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerLow,
              borderRadius: BorderRadius.circular(12.0),
              border: Border.all(color: AppColors.surfaceContainerHighest),
            ),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        _orderType = 0;
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12.0),
                      decoration: BoxDecoration(
                        color: _orderType == 0 ? AppColors.logisticsRed : Colors.transparent,
                        borderRadius: BorderRadius.circular(8.0),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'Đơn lẻ',
                        style: AppTypography.labelLg.copyWith(
                          color: _orderType == 0 ? AppColors.pureWhite : AppColors.secondary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        _orderType = 1;
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12.0),
                      decoration: BoxDecoration(
                        color: _orderType == 1 ? AppColors.logisticsRed : Colors.transparent,
                        borderRadius: BorderRadius.circular(8.0),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'Hàng loạt (Excel)',
                        style: AppTypography.labelLg.copyWith(
                          color: _orderType == 1 ? AppColors.pureWhite : AppColors.secondary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (_orderType == 1)
            _buildBulkOrderView()
          else
            Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  OrderStepIndicator(currentStep: _currentStep),
                  const SizedBox(height: 24.0),

                  if (_currentStep == 0) ...[
                    // Section 1: Pickup Info
                    const FormSectionHeader(num: 1, title: 'Thong tin nguoi gui & diem lay hang'),
                    const SizedBox(height: 12.0),
                    FormCard(
                      children: [
                        _buildTextField('Ho ten nguoi gui', 'Ten day du hoac Ten cong ty', _senderNameController),
                        const SizedBox(height: 16.0),
                        _buildTextField('So dien thoai', '+84 000 000 000', _senderPhoneController, isPhone: true),
                        const SizedBox(height: 16.0),
                        _buildAddressFormFieldsGroup(
                          titlePrefix: 'Người gửi',
                          selectedProvinceCode: _senderProvinceCode,
                          selectedWardCode: _senderWardCode,
                          provinces: _senderProvinces,
                          wards: _senderWards,
                          onProvinceChanged: (code) async {
                            setState(() {
                              _senderProvinceCode = code;
                              _senderWardCode = null;
                              _senderWards = [];
                            });
                            if (code != null) {
                              final w = await LocationService.fetchWards(code);
                              if (mounted) {
                                setState(() {
                                  _senderWards = w;
                                });
                              }
                            }
                          },
                          onWardChanged: (code) {
                            setState(() {
                              _senderWardCode = code;
                            });
                          },
                          addressController: _senderAddressController,
                          suggestions: _senderSuggestions,
                          showSuggestions: _showSenderSuggestions,
                          loadingSuggestions: _loadingSenderSuggestions,
                          onFocusChange: (focus) {
                            setState(() {
                              _showSenderSuggestions = focus;
                              if (focus) _showReceiverSuggestions = false;
                            });
                          },
                          onSelectSuggestion: (item) {
                            _handleSelectSuggestion(item: item, isSender: true);
                          },
                        ),
                        const SizedBox(height: 16.0),
                        AddressMapPreview(
                          isSender: true,
                          lat: _senderLat,
                          lng: _senderLng,
                          mapController: _senderMapController,
                          isLocating: _isLocatingSender,
                          onLocate: () => _locateCurrentPosition(isSender: true),
                        ),
                      ],
                    ),
                    const SizedBox(height: 28.0),

                    // Section 2: Delivery Info
                    const FormSectionHeader(num: 2, title: 'Thong tin nguoi nhan & diem giao hang'),
                    const SizedBox(height: 12.0),
                    FormCard(
                      children: [
                        _buildTextField('Ho ten nguoi nhan', 'Ten day du hoac Ten cong ty', _receiverNameController),
                        const SizedBox(height: 16.0),
                        _buildTextField('So dien thoai', '+84 000 000 000', _receiverPhoneController, isPhone: true),
                        const SizedBox(height: 16.0),
                        _buildAddressFormFieldsGroup(
                          titlePrefix: 'Người nhận',
                          selectedProvinceCode: _receiverProvinceCode,
                          selectedWardCode: _receiverWardCode,
                          provinces: _receiverProvinces,
                          wards: _receiverWards,
                          onProvinceChanged: (code) async {
                            setState(() {
                              _receiverProvinceCode = code;
                              _receiverWardCode = null;
                              _receiverWards = [];
                            });
                            if (code != null) {
                              final w = await LocationService.fetchWards(code);
                              if (mounted) {
                                setState(() {
                                  _receiverWards = w;
                                });
                              }
                            }
                          },
                          onWardChanged: (code) {
                            setState(() {
                              _receiverWardCode = code;
                            });
                          },
                          addressController: _receiverAddressController,
                          suggestions: _receiverSuggestions,
                          showSuggestions: _showReceiverSuggestions,
                          loadingSuggestions: _loadingReceiverSuggestions,
                          onFocusChange: (focus) {
                            setState(() {
                              _showReceiverSuggestions = focus;
                              if (focus) _showSenderSuggestions = false;
                            });
                          },
                          onSelectSuggestion: (item) {
                            _handleSelectSuggestion(item: item, isSender: false);
                          },
                        ),
                        const SizedBox(height: 16.0),
                        AddressMapPreview(
                          isSender: false,
                          lat: _receiverLat,
                          lng: _receiverLng,
                          mapController: _receiverMapController,
                          isLocating: _isLocatingReceiver,
                          onLocate: () => _locateCurrentPosition(isSender: false),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32.0),

                    SizedBox(
                      width: double.infinity,
                      height: 52.0,
                      child: ElevatedButton(
                        onPressed: _nextStep,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.logisticsRed,
                          foregroundColor: AppColors.pureWhite,
                          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                          elevation: 0,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('TIẾP TỤC BƯỚC 3', style: AppTypography.button.copyWith(color: AppColors.pureWhite)),
                            const SizedBox(width: 8.0),
                            const Icon(Icons.arrow_forward, size: 16.0),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 32.0),
                  ] else if (_currentStep == 1) ...[
                    // Section 3: Package Details
                    const FormSectionHeader(num: 3, title: 'Thong tin goi hang & bao hiem'),
                    const SizedBox(height: 12.0),
                    FormCard(
                      children: [
                        _buildTextField(
                          'Mo ta chi tiet danh muc hang hoa',
                          'Vi du: Quan ao, Dien thoai, Noi chien...',
                          _descriptionController,
                        ),
                        const SizedBox(height: 16.0),
                        Row(
                          children: [
                            Expanded(
                              child: _buildTextField('Khai giá hàng hóa (VNĐ)', '0.0', _declaredValueController, isNumber: true, isOptional: true),
                            ),
                            const SizedBox(width: 12.0),
                            Expanded(
                              child: _buildTextField('Trọng lượng (kg)', '1.0', _weightController, isNumber: true),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16.0),
                        Row(
                          children: [
                            Expanded(child: _buildTextField('Dài (cm)', '10', _lengthController, isNumber: true)),
                            const SizedBox(width: 8.0),
                            Expanded(child: _buildTextField('Rộng (cm)', '10', _widthController, isNumber: true)),
                            const SizedBox(width: 8.0),
                            Expanded(child: _buildTextField('Cao (cm)', '10', _heightController, isNumber: true)),
                          ],
                        ),
                        const SizedBox(height: 16.0),
                        _buildTextField(
                          'Yêu cầu nhiệt độ (nếu có)',
                          'Ví dụ: -18°C hoặc 2°C - 8°C',
                          _tempController,
                          isOptional: true,
                        ),
                        const SizedBox(height: 16.0),
                        Row(
                          children: [
                            Checkbox(
                              value: _isFragilePackage,
                              activeColor: AppColors.logisticsRed,
                              onChanged: (val) {
                                if (val != null) {
                                  setState(() {
                                    _isFragilePackage = val;
                                    _calculatePrice();
                                  });
                                }
                              },
                            ),
                            Expanded(
                              child: Text(
                                'HÀNG DỄ VỠ / CẦN NHẸ TAY (Phụ thu 15.000đ)',
                                style: AppTypography.bodyMd.copyWith(color: AppColors.deepOnyx, fontWeight: FontWeight.bold, fontSize: 12.0),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 28.0),

                    // Section 4: Service Options
                    const FormSectionHeader(num: 4, title: 'Goi dich vu van chuyen'),
                    const SizedBox(height: 12.0),
                    Column(
                      children: [
                        ServiceOptionCard(
                          code: 'EXPRESS',
                          title: 'Velocity Express (Hoa Toc 2h)',
                          subtitle: 'Giao hang hoa toc trong vong 2h noi tinh.',
                          priceText: '35.000d',
                          isSelected: _serviceLevel == 'EXPRESS',
                          onTap: () => setState(() { _serviceLevel = 'EXPRESS'; _calculatePrice(); }),
                        ),
                        const SizedBox(height: 10.0),
                        ServiceOptionCard(
                          code: 'STANDARD',
                          title: 'Velocity Standard (Tieu Chuan 24h)',
                          subtitle: 'Giao hang tieu chuan trong vong 24h.',
                          priceText: '20.000d',
                          isSelected: _serviceLevel == 'STANDARD',
                          onTap: () => setState(() { _serviceLevel = 'STANDARD'; _calculatePrice(); }),
                        ),
                        const SizedBox(height: 10.0),
                        ServiceOptionCard(
                          code: 'SAVING',
                          title: 'Velocity Saving (Tiet Kiem)',
                          subtitle: 'Cuoc phi toi uu, giao tu 3-5 ngay.',
                          priceText: '15.000d',
                          isSelected: _serviceLevel == 'SAVING',
                          onTap: () => setState(() { _serviceLevel = 'SAVING'; _calculatePrice(); }),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32.0),

                    Row(
                      children: [
                        Expanded(
                          child: SizedBox(
                            height: 52.0,
                            child: OutlinedButton(
                              onPressed: _prevStep,
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.deepOnyx,
                                side: const BorderSide(color: AppColors.surfaceContainerHigh, width: 1.5),
                                shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                              ),
                              child: const Text('QUAY LẠI', style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12.0),
                        Expanded(
                          child: SizedBox(
                            height: 52.0,
                            child: ElevatedButton(
                              onPressed: _nextStep,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.logisticsRed,
                                foregroundColor: AppColors.pureWhite,
                                shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                                elevation: 0,
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text('TIẾP TỤC BƯỚC 4', style: AppTypography.button.copyWith(color: AppColors.pureWhite)),
                                  const SizedBox(width: 8.0),
                                  const Icon(Icons.arrow_forward, size: 16.0),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32.0),
                  ] else ...[
                    // Step 4: Logistics Schedule & Payment Options
                    const FormSectionHeader(num: 4, title: 'Lich hen lay hang & Thanh toan'),
                    const SizedBox(height: 12.0),
                    FormCard(
                      children: [
                        // Hinh thuc gui hang
                        Text('Hinh thuc gui hang', style: AppTypography.labelLg.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8.0),
                        SegmentedToggle<String>(
                          selectedValue: _pickupType,
                          options: const {
                            'PICKUP': 'Shipper lay tan noi',
                            'DROP_OFF': 'Tu gui buu cuc',
                          },
                          onChanged: (val) { setState(() => _pickupType = val); },
                        ),
                        const SizedBox(height: 20.0),

                        // Lịch hẹn lấy hàng (Ngày & Ca lấy)
                        Text('Lịch hẹn Shipper lấy hàng', style: AppTypography.labelLg.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8.0),
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Ngày lấy:', style: AppTypography.labelMd.copyWith(color: AppColors.secondary)),
                                  const SizedBox(height: 4),
                                  DropdownButtonFormField<String>(
                    isExpanded: true,
                                    value: _pickupDateOption,
                                    decoration: InputDecoration(
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    items: const [
                                      DropdownMenuItem(value: 'TODAY', child: Text('Hôm nay', style: TextStyle(fontSize: 12))),
                                      DropdownMenuItem(value: 'TOMORROW', child: Text('Ngày mai', style: TextStyle(fontSize: 12))),
                                    ],
                                    onChanged: (val) {
                                      if (val != null) setState(() => _pickupDateOption = val);
                                    },
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Ca lấy hàng:', style: AppTypography.labelMd.copyWith(color: AppColors.secondary)),
                                  const SizedBox(height: 4),
                                  DropdownButtonFormField<String>(
                    isExpanded: true,
                                    value: _pickupShiftOption,
                                    decoration: InputDecoration(
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    items: const [
                                      DropdownMenuItem(value: 'MORNING', child: Text('Ca Sáng (08h - 12h)', style: TextStyle(fontSize: 11))),
                                      DropdownMenuItem(value: 'AFTERNOON', child: Text('Ca Chiều (13h - 18h)', style: TextStyle(fontSize: 11))),
                                    ],
                                    onChanged: (val) {
                                      if (val != null) setState(() => _pickupShiftOption = val);
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20.0),

                        // Nguoi chiu phi (SENDER / RECEIVER)
                        Text('Nguoi chiu phi ship', style: AppTypography.labelLg.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8.0),
                        SegmentedToggle<String>(
                          selectedValue: _feePayer,
                          options: const {
                            'SENDER': 'Nguoi gui tra (SENDER)',
                            'RECEIVER': 'Nguoi nhan tra (RECEIVER)',
                          },
                          onChanged: (val) { setState(() => _feePayer = val); },
                        ),
                        const SizedBox(height: 20.0),

                        // Phương thức thanh toán
                        Text('Phương thức thanh toán', style: AppTypography.labelLg.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8.0),
                        DropdownButtonFormField<String>(
                    isExpanded: true,
                          value: _paymentMethodCode,
                          decoration: InputDecoration(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'CASH', child: Text('Tiền mặt (CASH)')),
                            DropdownMenuItem(value: 'COD', child: Text('Thu hộ COD (Thanh toán khi nhận hàng)')),
                            DropdownMenuItem(value: 'BANK_TRANSFER', child: Text('Chuyển khoản ngân hàng (BANK_TRANSFER)')),
                            DropdownMenuItem(value: 'E_WALLET', child: Text('Ví điện tử (E_WALLET)')),
                          ],
                          onChanged: (val) {
                            if (val != null) {
                              setState(() {
                                _paymentMethodCode = val;
                                _calculatePrice();
                              });
                            }
                          },
                        ),
                        if (_paymentMethodCode == 'COD') ...[
                          const SizedBox(height: 14.0),
                          _buildTextField(
                            'Số tiền thu hộ COD (VNĐ)',
                            'Nhập số tiền thu hộ từ người nhận...',
                            _codController,
                            isNumber: true,
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 28.0),

                    // Order Price Summary Card
                    PriceSummaryCard(
                      basePrice: _basePrice,
                      serviceFee: _serviceFee,
                      fuelTax: _fuelTax,
                      totalCost: _totalCost,
                      formatCurrency: formatCurrency,
                    ),
                    const SizedBox(height: 32.0),

                    Row(
                      children: [
                        Expanded(
                          child: SizedBox(
                            height: 52.0,
                            child: OutlinedButton(
                              onPressed: _prevStep,
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.deepOnyx,
                                side: const BorderSide(color: AppColors.surfaceContainerHigh, width: 1.5),
                                shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                              ),
                              child: const Text('QUAY LẠI', style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12.0),
                        Expanded(
                          child: SizedBox(
                            height: 52.0,
                            child: ElevatedButton(
                              onPressed: _isSubmitting ? null : _submitForm,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.logisticsRed,
                                foregroundColor: AppColors.pureWhite,
                                shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                                elevation: 0,
                              ),
                              child: _isSubmitting
                                  ? const CircularProgressIndicator(color: Colors.white)
                                  : Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text('ĐỒNG Ý TẠO ĐƠN', style: AppTypography.button.copyWith(color: AppColors.pureWhite, fontWeight: FontWeight.bold)),
                                        const SizedBox(width: 6.0),
                                        const Icon(Icons.check, size: 18.0),
                                      ],
                                    ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32.0),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }
  Widget _buildTextField(
    String label,
    String hint,
    TextEditingController controller, {
    bool isPhone = false,
    bool isNumber = false,
    bool isOptional = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(label, style: AppTypography.labelLg.copyWith(fontWeight: FontWeight.bold)),
            if (!isOptional) const Text(' *', style: TextStyle(color: AppColors.logisticsRed, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 6.0),
        TextFormField(
          controller: controller,
          keyboardType: isPhone
              ? TextInputType.phone
              : isNumber
                  ? TextInputType.number
                  : TextInputType.text,
          validator: (val) {
            if (isOptional) return null;
            if (val == null || val.trim().isEmpty) return 'Vui lòng không để trống ô này';
            return null;
          },
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 12.0),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10.0)),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10.0),
              borderSide: const BorderSide(color: AppColors.logisticsRed, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAddressFormFieldsGroup({
    required String titlePrefix,
    required String? selectedProvinceCode,
    required String? selectedWardCode,
    required List<Map<String, dynamic>> provinces,
    required List<Map<String, dynamic>> wards,
    required ValueChanged<String?> onProvinceChanged,
    required ValueChanged<String?> onWardChanged,
    required TextEditingController addressController,
    required List<AddressPrediction> suggestions,
    required bool showSuggestions,
    required bool loadingSuggestions,
    required ValueChanged<bool> onFocusChange,
    required ValueChanged<AddressPrediction> onSelectSuggestion,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Tỉnh / Thành Phố *', style: AppTypography.labelLg.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6.0),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    value: selectedProvinceCode,
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10.0)),
                    ),
                    hint: const Text('-- Chọn Tỉnh/TP --', style: TextStyle(fontSize: 12.0)),
                    items: provinces.map((p) {
                      return DropdownMenuItem<String>(
                        value: '${p['code']}',
                        child: Text(
                          p['fullName'] ?? p['name'] ?? '',
                          style: const TextStyle(fontSize: 12.0),
                          overflow: TextOverflow.ellipsis,
                        ),
                      );
                    }).toList(),
                    onChanged: onProvinceChanged,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10.0),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Phường / Xã *', style: AppTypography.labelLg.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6.0),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    value: selectedWardCode,
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10.0)),
                    ),
                    hint: const Text('-- Chọn Phường/Xã --', style: TextStyle(fontSize: 12.0)),
                    items: wards.map((w) {
                      return DropdownMenuItem<String>(
                        value: '${w['code']}',
                        child: Text(
                          w['fullName'] ?? w['name'] ?? '',
                          style: const TextStyle(fontSize: 12.0),
                          overflow: TextOverflow.ellipsis,
                        ),
                      );
                    }).toList(),
                    onChanged: onWardChanged,
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16.0),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Địa chỉ chi tiết (Số nhà, đường) *', style: AppTypography.labelLg.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 6.0),
            Focus(
              onFocusChange: onFocusChange,
              child: TextFormField(
                controller: addressController,
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Vui lòng nhập số nhà, đường';
                  return null;
                },
                decoration: InputDecoration(
                  hintText: 'Ví dụ: 123 Nguyễn Trãi',
                  hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 12.0),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10.0)),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10.0),
                    borderSide: const BorderSide(color: AppColors.logisticsRed, width: 1.5),
                  ),
                ),
              ),
            ),
            if (showSuggestions && (loadingSuggestions || suggestions.isNotEmpty)) ...[
              Container(
                margin: const EdgeInsets.only(top: 4.0),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10.0),
                  border: Border.all(color: Colors.grey.shade300),
                  boxShadow: AppStyles.ambientShadow,
                ),
                constraints: const BoxConstraints(maxHeight: 180.0),
                child: loadingSuggestions
                    ? const Padding(
                        padding: EdgeInsets.all(12.0),
                        child: Center(child: CircularProgressIndicator(strokeWidth: 2.0, color: AppColors.logisticsRed)),
                      )
                    : ListView.separated(
                        shrinkWrap: true,
                        itemCount: suggestions.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (ctx, idx) {
                          final item = suggestions[idx];
                          return ListTile(
                            dense: true,
                            leading: const Icon(Icons.location_on, color: AppColors.logisticsRed, size: 18.0),
                            title: Text(item.mainText, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12.0)),
                            subtitle: Text(item.secondaryText, style: const TextStyle(fontSize: 11.0)),
                            onTap: () => onSelectSuggestion(item),
                          );
                        },
                      ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

