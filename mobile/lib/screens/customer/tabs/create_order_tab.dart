import 'dart:async';
import 'dart:math' show cos, sqrt;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:file_picker/file_picker.dart';
import 'package:csv/csv.dart';
import 'package:excel/excel.dart' hide Border;
import '../../../core/config/app_config.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';
import '../../../services/location_service.dart';
import '../../../services/order_service.dart';

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
  final _weightController = TextEditingController();
  final _lengthController = TextEditingController();
  final _widthController = TextEditingController();
  final _heightController = TextEditingController();
  final _tempController = TextEditingController();
  final _codController = TextEditingController();
  bool _isFragilePackage = false;

  // Address Autocomplete Suggestions
  List<AddressPrediction> _senderSuggestions = [];
  List<AddressPrediction> _receiverSuggestions = [];
  bool _showSenderSuggestions = false;
  bool _showReceiverSuggestions = false;
  bool _loadingSenderSuggestions = false;
  bool _loadingReceiverSuggestions = false;

  // Debounce timers (500ms like frontend)
  Timer? _senderDebounceTimer;
  Timer? _receiverDebounceTimer;

  // Frontend-Identical Location Dropdowns State (Province -> Ward -> AddressLine1)
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

  String _serviceLevel = 'express'; // 'express', 'standard'
  String _paymentMethod = 'prepaid'; // 'prepaid', 'cod'

  // Pricing calculation
  double _basePrice = 18.00;
  double _serviceFee = 5.50;
  double _fuelTax = 1.49;
  double _totalCost = 24.99;

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
    // 500ms debounce giống frontend
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

  /// Xử lý khi user chọn suggestion - giống hệt logic frontend:
  /// Gọi place-detail API → tự động fill Province & Ward dropdowns
  Future<void> _handleSelectSuggestion({
    required AddressPrediction item,
    required bool isSender,
  }) async {
    // Ẩn suggestions ngay lập tức
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

    // Gọi place-detail API để lấy compound (tỉnh/phường) và lat/lng
    if (item.placeId.startsWith('dyn-') || item.placeId.startsWith('vn-')) {
      // Fallback suggestions - không có place detail thực
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
          // Tìm province match giống frontend
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

        // Fetch wards cho province đã match
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
    } catch (_) {
      // Fallback: chỉ set description nếu place-detail lỗi
    }
  }

  bool _isLocatingSender = false;
  bool _isLocatingReceiver = false;

  /// Định vị GPS vị trí hiện tại
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
      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Quyền truy cập vị trí bị từ chối trong Cài đặt')),
          );
        }
        return;
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

      debugPrint('📍 [GPS] Tọa độ nhận được: lat=${pos.latitude}, lng=${pos.longitude}');

      // Tự động giải mã tọa độ GPS sang Địa chỉ chi tiết ngắn, Tỉnh/TP và Phường/Xã
      final rev = await LocationService.reverseGeocode(pos.latitude, pos.longitude);
      debugPrint('📍 [ReverseGeocode] Kết quả: $rev');
      if (rev != null && mounted) {
        final shortAddress = rev['shortAddress'] as String? ?? '';
        final formattedAddress = rev['formattedAddress'] as String? ?? '';
        final provinceName = rev['province'] as String? ?? '';
        final communeName = rev['commune'] as String? ?? '';

        final displayAddress = shortAddress.isNotEmpty ? shortAddress : formattedAddress;

        String removeAccents(String str) {
          const vietnameseMarks = [
            'aàáảãạâầấẩẫậăằắẳẵặ',
            'AÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ',
            'eèéẻẽẹêềếểễệ',
            'EÈÉẺẽẸÊỀẾỂỄỆ',
            'iìíỉĩị',
            'IÌÍỈĨỊ',
            'oòóỏõọôồốổỗộơờớởỡợ',
            'OÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ',
            'uùúủũụưừứửữự',
            'UÙÚỦŨỤƯỪỨỬỮỰ',
            'yỳýỷỹỵ',
            'YỲÝỶỸỴ',
            'dđ',
            'DĐ'
          ];
          String result = str;
          for (var mark in vietnameseMarks) {
            for (int i = 1; i < mark.length; i++) {
              result = result.replaceAll(mark[i], mark[0]);
            }
          }
          return result;
        }

        String cleanName(String name) {
          var s = removeAccents(name.toLowerCase());
          return s
              .replaceAll('thanh pho', '')
              .replaceAll('tinh', '')
              .replaceAll('phuong', '')
              .replaceAll('xa', '')
              .replaceAll('quan', '')
              .replaceAll('huyen', '')
              .replaceAll('tp.', '')
              .replaceAll('tp', '')
              .trim();
        }

        var provinces = isSender ? _senderProvinces : _receiverProvinces;
        if (provinces.isEmpty) {
          provinces = await LocationService.fetchProvinces();
          if (mounted) {
            setState(() {
              _senderProvinces = provinces;
              _receiverProvinces = provinces;
            });
          }
        }

        String? matchedProvinceCode = isSender ? _senderProvinceCode : _receiverProvinceCode;
        String? matchedWardCode = isSender ? _senderWardCode : _receiverWardCode;
        List<Map<String, dynamic>> matchedWards = [];

        if (provinces.isNotEmpty) {
          final targetClean = cleanName(provinceName);
          final cleanDisplay = cleanName(formattedAddress);

          final matchedP = provinces.firstWhere(
            (p) {
              final pFullName = (p['fullName'] ?? '') as String;
              final pName = (p['name'] ?? '') as String;
              final cleanPFull = cleanName(pFullName);
              final cleanPName = cleanName(pName);

              final matchProvName = targetClean.isNotEmpty &&
                  ((cleanPFull.isNotEmpty && (cleanPFull.contains(targetClean) || targetClean.contains(cleanPFull))) ||
                      (cleanPName.isNotEmpty && (cleanPName.contains(targetClean) || targetClean.contains(cleanPName))));

              final matchDisplay = cleanDisplay.isNotEmpty &&
                  ((cleanPFull.isNotEmpty && cleanDisplay.contains(cleanPFull)) ||
                      (cleanPName.isNotEmpty && cleanDisplay.contains(cleanPName)));

              return matchProvName || matchDisplay;
            },
            orElse: () => {},
          );
          if (matchedP.isNotEmpty) {
            matchedProvinceCode = matchedP['code'] as String?;
            debugPrint('✅ [GPS Match] Đã khớp Tỉnh/TP: ${matchedP['fullName']} (code: $matchedProvinceCode)');
          }
        }

        if (matchedProvinceCode != null) {
          matchedWards = await LocationService.fetchWards(matchedProvinceCode);

          if (matchedWards.isNotEmpty) {
            final targetCommuneClean = cleanName(communeName);
            final cleanDisplay = cleanName(formattedAddress);

            final matchedW = matchedWards.firstWhere(
              (w) {
                final wFullName = (w['fullName'] ?? '') as String;
                final wName = (w['name'] ?? '') as String;
                final cleanWFull = cleanName(wFullName);
                final cleanWName = cleanName(wName);

                final matchCommune = targetCommuneClean.isNotEmpty &&
                    ((cleanWFull.isNotEmpty && (cleanWFull.contains(targetCommuneClean) || targetCommuneClean.contains(cleanWFull))) ||
                        (cleanWName.isNotEmpty && (cleanWName.contains(targetCommuneClean) || targetCommuneClean.contains(cleanWName))));

                final matchDisplay = cleanDisplay.isNotEmpty &&
                    ((cleanWFull.length >= 3 && cleanDisplay.contains(cleanWFull)) ||
                        (cleanWName.length >= 3 && cleanDisplay.contains(cleanWName)));

                return matchCommune || matchDisplay;
              },
              orElse: () => {},
            );
            if (matchedW.isNotEmpty) {
              matchedWardCode = matchedW['code'] as String?;
              debugPrint('✅ [GPS Match] Đã khớp Phường/Xã: ${matchedW['fullName']} (code: $matchedWardCode)');
            }
          }
        }

        if (mounted) {
          setState(() {
            if (isSender) {
              if (displayAddress.isNotEmpty) _senderAddressController.text = displayAddress;
              if (matchedProvinceCode != null) {
                _senderProvinceCode = matchedProvinceCode;
                _senderWards = matchedWards;
              }
              if (matchedWardCode != null) _senderWardCode = matchedWardCode;
            } else {
              if (displayAddress.isNotEmpty) _receiverAddressController.text = displayAddress;
              if (matchedProvinceCode != null) {
                _receiverProvinceCode = matchedProvinceCode;
                _receiverWards = matchedWards;
              }
              if (matchedWardCode != null) _receiverWardCode = matchedWardCode;
            }
          });

          if (matchedProvinceCode != null && matchedWardCode != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('📍 Đã định vị & tự động điền Tỉnh/TP, Phường/Xã thành công!'),
                duration: Duration(seconds: 2),
              ),
            );
          } else if (matchedProvinceCode != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('📍 Đã định vị Tỉnh/TP thành công! Vui lòng chọn Phường/Xã.'),
                duration: Duration(seconds: 2),
              ),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('📍 Đã cập nhật tọa độ trên bản đồ. Vui lòng chọn Tỉnh/Phường thủ công.'),
                duration: Duration(seconds: 2),
              ),
            );
          }
        }
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('📍 Đã định vị ghim bản đồ! Không truy xuất được địa chỉ văn bản.'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error getting current location: $e');
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

  Widget _buildMapPreviewWidget({
    required bool isSender,
    required double lat,
    required double lng,
    required MapController mapController,
  }) {
    final isLocating = isSender ? _isLocatingSender : _isLocatingReceiver;

    return Container(
      height: 180.0,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: AppStyles.roundedLg,
        border: Border.all(color: AppColors.surfaceContainerHighest),
      ),
      child: ClipRRect(
        borderRadius: AppStyles.roundedLg,
        child: Stack(
          children: [
            FlutterMap(
              mapController: mapController,
              options: MapOptions(
                initialCenter: LatLng(lat, lng),
                initialZoom: 15.0,
              ),
              children: [
                TileLayer(
                  urlTemplate: AppConfig.mapTileUrl,
                  userAgentPackageName: 'com.velocity.slp.velocity_mobile',
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: LatLng(lat, lng),
                      width: 40.0,
                      height: 40.0,
                      child: const Icon(
                        Icons.location_on,
                        color: AppColors.logisticsRed,
                        size: 38.0,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            Positioned(
              bottom: 10,
              right: 10,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => _locateCurrentPosition(isSender: isSender),
                  borderRadius: BorderRadius.circular(20.0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
                    decoration: BoxDecoration(
                      color: AppColors.pureWhite,
                      borderRadius: BorderRadius.circular(20.0),
                      boxShadow: AppStyles.ambientShadow,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (isLocating) ...[
                          const SizedBox(
                            width: 14.0,
                            height: 14.0,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.0,
                              color: AppColors.logisticsRed,
                            ),
                          ),
                          const SizedBox(width: 6.0),
                          Text(
                            'Đang định vị...',
                            style: AppTypography.labelMd.copyWith(color: AppColors.logisticsRed, fontWeight: FontWeight.bold),
                          ),
                        ] else ...[
                          const Icon(Icons.my_location, size: 16.0, color: AppColors.deepOnyx),
                          const SizedBox(width: 6.0),
                          Text(
                            'Định vị vị trí',
                            style: AppTypography.labelMd.copyWith(color: AppColors.deepOnyx, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _senderDebounceTimer?.cancel();
    _receiverDebounceTimer?.cancel();
    _senderNameController.dispose();
    _senderPhoneController.dispose();
    _senderAddressController.dispose();
    _receiverNameController.dispose();
    _receiverPhoneController.dispose();
    _receiverAddressController.dispose();
    _weightController.dispose();
    _lengthController.dispose();
    _widthController.dispose();
    _heightController.dispose();
    _tempController.dispose();
    _codController.dispose();
    super.dispose();
  }

  double _calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const p = 0.017453292519943295; // pi / 180
    final a = 0.5 - cos((lat2 - lat1) * p) / 2 +
        cos(lat1 * p) * cos(lat2 * p) *
        (1 - cos((lon2 - lon1) * p)) / 2;
    return 12742 * sqrt(a); // 2 * R; R = 6371 km
  }

  Timer? _priceCalcDebounce;

  void _calculatePrice() {
    if (_priceCalcDebounce?.isActive ?? false) _priceCalcDebounce!.cancel();
    _priceCalcDebounce = Timer(const Duration(milliseconds: 500), () async {
      final weight = double.tryParse(_weightController.text) ?? 0.0;
      final length = double.tryParse(_lengthController.text) ?? 0.0;
      final width = double.tryParse(_widthController.text) ?? 0.0;
      final height = double.tryParse(_heightController.text) ?? 0.0;

      final volWeight = (length * width * height) / 5000.0;
      final chargeableWeight = weight > volWeight ? weight : volWeight;

      final distance = _calculateDistance(_senderLat, _senderLng, _receiverLat, _receiverLng);

      if (chargeableWeight <= 0) return;

      final res = await OrderService.calculatePricing(
        serviceCode: _serviceLevel.toUpperCase(),
        distanceKm: distance,
        totalWeightKg: chargeableWeight,
        isFragile: _isFragilePackage,
        codAmount: _paymentMethod == 'cod' ? (double.tryParse(_codController.text) ?? 0.0) : 0.0,
      );

      if (mounted) {
        if (res['success'] == true) {
          final data = res['data'];
          setState(() {
            _basePrice = double.tryParse(data['basePrice'].toString()) ?? 18.00;
            _serviceFee = double.tryParse((data['distanceFee'] ?? 0.0).toString()) ?? 0.00;
            _fuelTax = double.tryParse((data['weightFee'] ?? 0.0).toString()) ?? 0.00;
            final insuranceFee = double.tryParse((data['insuranceFee'] ?? 0.0).toString()) ?? 0.00;
            final fragileSurcharge = double.tryParse((data['fragileSurcharge'] ?? 0.0).toString()) ?? 0.00;
            _serviceFee += fragileSurcharge;
            _fuelTax += insuranceFee;
            
            _totalCost = double.tryParse(data['totalAmount'].toString()) ?? 24.99;
          });
        } else {
          _calculatePriceClientSide(
            serviceCode: _serviceLevel.toUpperCase(),
            distanceKm: distance,
            totalWeightKg: chargeableWeight,
            isFragile: _isFragilePackage,
            codAmount: _paymentMethod == 'cod' ? (double.tryParse(_codController.text) ?? 0.0) : 0.0,
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
  }) {
    double base = 20000.0;
    double freeDist = 2.0;
    double rateDist = 5000.0;
    double freeWt = 1.0;
    double rateWt = 3000.0;

    switch (serviceCode) {
      case 'EXPRESS':
        base = 35000.0;
        freeDist = 2.0;
        rateDist = 8000.0;
        freeWt = 1.0;
        rateWt = 5000.0;
        break;
      case 'SAVING':
        base = 15000.0;
        freeDist = 2.0;
        rateDist = 3000.0;
        freeWt = 1.0;
        rateWt = 2000.0;
        break;
      case 'COLD_CHAIN':
        base = 60000.0;
        freeDist = 2.0;
        rateDist = 12000.0;
        freeWt = 1.0;
        rateWt = 8000.0;
        break;
      case 'STANDARD':
      default:
        base = 20000.0;
        freeDist = 2.0;
        rateDist = 5000.0;
        freeWt = 1.0;
        rateWt = 3000.0;
        break;
    }

    double billableDistance = (distanceKm - freeDist) > 0 ? (distanceKm - freeDist) : 0.0;
    double distanceFee = (serviceCode == 'EXPRESS' || serviceCode == 'COLD_CHAIN') ? (billableDistance * rateDist) : 0.0;

    double billableWeight = (totalWeightKg - freeWt) > 0 ? (totalWeightKg - freeWt) : 0.0;
    double weightFee = billableWeight * rateWt;

    double fragileSurcharge = isFragile ? 15000.0 : 0.0;

    double insuranceFee = 0.0;
    if (codAmount > 0) {
      insuranceFee = codAmount * 0.005;
      if (insuranceFee > 50000.0) insuranceFee = 50000.0;
    }

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

    final Map<String, dynamic> payload = {
      'serviceCode': _serviceLevel.toUpperCase(),
      'feePayer': 'SENDER',
      'paymentMethod': _paymentMethod == 'cod' ? 'CASH' : 'E_WALLET',
      'pickupType': 'PICKUP',
      'codAmount': _paymentMethod == 'cod' ? (double.tryParse(_codController.text) ?? 0.0) : 0.0,
      'senderContact': {
        'fullName': _senderNameController.text.trim(),
        'phone': _senderPhoneController.text.trim(),
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
      final String generatedOrderCode = orderData['trackingCode'] ?? orderData['orderNumber'] ?? orderData['id'] ?? 'VEL-888';
      final now = DateTime.now();
      final String pickupTimeStr = 'Hẹn lấy: ${now.day}/${now.month}/${now.year} lúc 09:00';

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
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Text(
                        'Tạo đơn thành công!',
                        style: AppTypography.headlineMd.copyWith(
                          color: AppColors.deepOnyx,
                          fontWeight: FontWeight.bold,
                          fontSize: 22.0,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8.0),
                      Text(
                        'Mã QR vận đơn cho đơn hàng\ncủa bạn:',
                        style: AppTypography.bodyMd.copyWith(
                          color: AppColors.secondary,
                          fontSize: 14.0,
                          height: 1.4,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20.0),

                      // QR Container
                      Container(
                        padding: const EdgeInsets.all(12.0),
                        decoration: BoxDecoration(
                          color: AppColors.pureWhite,
                          borderRadius: BorderRadius.circular(16.0),
                          border: Border.all(color: AppColors.surfaceContainerHighest, width: 1.2),
                        ),
                        child: Image.network(
                          'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=$generatedOrderCode',
                          width: 150.0,
                          height: 150.0,
                          loadingBuilder: (context, child, loadingProgress) {
                            if (loadingProgress == null) return child;
                            return const SizedBox(
                              width: 150.0,
                              height: 150.0,
                              child: Center(
                                child: CircularProgressIndicator(
                                  color: AppColors.logisticsRed,
                                  strokeWidth: 2.0,
                                ),
                              ),
                            );
                          },
                          errorBuilder: (context, error, stackTrace) {
                            return Container(
                              width: 150.0,
                              height: 150.0,
                              color: AppColors.cloudGray,
                              child: const Center(
                                child: Icon(Icons.qr_code_scanner, color: AppColors.secondary, size: 40.0),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 16.0),

                      // Red Order Code
                      Text(
                        generatedOrderCode,
                        style: AppTypography.headlineLgMobile.copyWith(
                          color: AppColors.logisticsRed,
                          fontWeight: FontWeight.bold,
                          fontSize: 24.0,
                          letterSpacing: 1.0,
                        ),
                      ),
                      const SizedBox(height: 14.0),

                      // Pickup Date Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerLow,
                          borderRadius: BorderRadius.circular(20.0),
                        ),
                        child: Text(
                          pickupTimeStr,
                          style: AppTypography.labelLg.copyWith(
                            color: AppColors.deepOnyx,
                            fontWeight: FontWeight.bold,
                            fontSize: 13.0,
                          ),
                        ),
                      ),
                      const SizedBox(height: 14.0),

                      // Instruction Note
                      Text(
                        'Vui lòng in nhãn QR này và dán lên gói hàng trước khi Shippers đến lấy.',
                        style: AppTypography.labelMd.copyWith(
                          color: AppColors.secondary,
                          fontSize: 12.0,
                          height: 1.4,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24.0),

                      // Print Button
                      SizedBox(
                        width: double.infinity,
                        height: 50.0,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.of(context).pop(); // close dialog
                            widget.onOrderCreated(); // return to dashboard
                          },
                          icon: const Icon(Icons.print, color: AppColors.pureWhite, size: 20.0),
                          label: Text(
                            'IN NHÃN VẬN ĐƠN',
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
                        'Hàng loạt',
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
                  _buildStepIndicator(),
                  const SizedBox(height: 24.0),

            if (_currentStep == 0) ...[
              // Section 1: Pickup Info
              _buildSectionHeader(1, 'Thông tin lấy hàng'),
              const SizedBox(height: 12.0),
              _buildFormCard(
                children: [
                  _buildTextField('Họ tên người gửi', 'Tên đầy đủ hoặc Tên công ty', _senderNameController),
                  const SizedBox(height: 16.0),
                  _buildTextField('Số điện thoại', '+84 000 000 000', _senderPhoneController, isPhone: true),
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
                  _buildMapPreviewWidget(
                    isSender: true,
                    lat: _senderLat,
                    lng: _senderLng,
                    mapController: _senderMapController,
                  ),
                ],
              ),
              const SizedBox(height: 28.0),

              // Section 2: Delivery Info
              _buildSectionHeader(2, 'Thông tin giao hàng'),
              const SizedBox(height: 12.0),
              _buildFormCard(
                children: [
                  _buildTextField('Họ tên người nhận', 'Tên đầy đủ hoặc Tên công ty', _receiverNameController),
                  const SizedBox(height: 16.0),
                  _buildTextField('Số điện thoại', '+84 000 000 000', _receiverPhoneController, isPhone: true),
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
                  _buildMapPreviewWidget(
                    isSender: false,
                    lat: _receiverLat,
                    lng: _receiverLng,
                    mapController: _receiverMapController,
                  ),
                ],
              ),
              const SizedBox(height: 32.0),

              // Next Button (TIẾP TỤC)
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
                      Text('TIẾP TỤC', style: AppTypography.button.copyWith(color: AppColors.pureWhite)),
                      const SizedBox(width: 8.0),
                      const Icon(Icons.arrow_forward, size: 16.0),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32.0),
            ] else if (_currentStep == 1) ...[
              // Section 3: Package Details
              _buildSectionHeader(1, 'Chi tiết kiện hàng'),
              const SizedBox(height: 12.0),
              _buildFormCard(
                children: [
                  Row(
                    children: [
                      Expanded(child: _buildTextField('Khối lượng (kg)', '0.0', _weightController, isNumber: true)),
                      const SizedBox(width: 12.0),
                      Expanded(child: _buildTextField('Dài (cm)', '0', _lengthController, isNumber: true)),
                    ],
                  ),
                  const SizedBox(height: 16.0),
                  Row(
                    children: [
                      Expanded(child: _buildTextField('Rộng (cm)', '0', _widthController, isNumber: true)),
                      const SizedBox(width: 12.0),
                      Expanded(child: _buildTextField('Cao (cm)', '0', _heightController, isNumber: true)),
                    ],
                  ),
                  const SizedBox(height: 20.0),
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
                          'Hàng dễ vỡ (Phụ thu 15k)',
                          style: AppTypography.bodyMd.copyWith(color: AppColors.deepOnyx),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16.0),
                  _buildTextField(
                    'Yêu cầu nhiệt độ bảo quản (nếu có)',
                    'Ví dụ: -18°C hoặc 2°C - 8°C',
                    _tempController,
                    isOptional: true,
                  ),
                ],
              ),
              const SizedBox(height: 28.0),

              // Section 4: Service Options
              _buildSectionHeader(2, 'Gói dịch vụ'),
              const SizedBox(height: 12.0),
              RadioGroup<String>(
                groupValue: _serviceLevel,
                onChanged: (val) {
                  if (val != null) {
                    setState(() {
                      _serviceLevel = val;
                      _calculatePrice();
                    });
                  }
                },
                child: Column(
                  children: [
                    _buildServiceRadio(
                      'express',
                      'Velocity Express',
                      'Giao hàng hỏa tốc trong vòng 2h nội tỉnh.',
                      '35.000đ',
                      'HOẢ TỐC 2H',
                      AppColors.logisticsRed,
                      AppColors.pureWhite,
                    ),
                    const SizedBox(height: 12.0),
                    _buildServiceRadio(
                      'standard',
                      'Velocity Standard',
                      'Giao hàng tiêu chuẩn trong vòng 24h.',
                      '20.000đ',
                      'TIÊU CHUẨN',
                      const Color(0xFFDBEAFE),
                      const Color(0xFF1E40AF),
                    ),
                    const SizedBox(height: 12.0),
                    _buildServiceRadio(
                      'saving',
                      'Velocity Saving',
                      'Cước phí tối ưu, giao từ 3-5 ngày.',
                      '15.000đ',
                      'TIẾT KIỆM',
                      const Color(0xFFDCFCE7),
                      const Color(0xFF166534),
                    ),
                    const SizedBox(height: 12.0),
                    _buildServiceRadio(
                      'cold_chain',
                      'Velocity Cold Chain',
                      'Đảm bảo dải nhiệt độ tiêu chuẩn bảo quản lạnh.',
                      '60.000đ',
                      'ĐÔNG LẠNH',
                      const Color(0xFFE0F7FA),
                      const Color(0xFF006064),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32.0),

              // Back and Next buttons row
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
                            Text('TIẾP TỤC', style: AppTypography.button.copyWith(color: AppColors.pureWhite)),
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
              // Payment Selection
              _buildSectionHeader(1, 'Phương thức thanh toán'),
              const SizedBox(height: 12.0),
              _buildFormCard(
                children: [
                  RadioGroup<String>(
                    groupValue: _paymentMethod,
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          _paymentMethod = val;
                        });
                      }
                    },
                    child: Column(
                      children: [
                        Row(
                          children: [
                            const Radio<String>(
                              value: 'prepaid',
                              activeColor: AppColors.logisticsRed,
                            ),
                            Expanded(
                              child: Text('Thanh toán ngay (Thẻ/Ví)', style: AppTypography.bodyMd),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            const Radio<String>(
                              value: 'cod',
                              activeColor: AppColors.logisticsRed,
                            ),
                            Expanded(
                              child: Text('Thanh toán khi nhận hàng (COD)', style: AppTypography.bodyMd),
                            ),
                          ],
                        ),
                        if (_paymentMethod == 'cod') ...[
                          const SizedBox(height: 12.0),
                          Padding(
                            padding: const EdgeInsets.only(left: 32.0, right: 16.0),
                            child: _buildTextField(
                              'Số tiền thu hộ COD (đ)',
                              'Nhập số tiền cần thu hộ...',
                              _codController,
                              isNumber: true,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28.0),

              // Order Summary Card
              Container(
                padding: const EdgeInsets.all(20.0),
                decoration: BoxDecoration(
                  color: AppColors.deepOnyx,
                  borderRadius: AppStyles.roundedXl,
                  boxShadow: AppStyles.ambientShadow,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.receipt_long, color: AppColors.logisticsRed),
                        const SizedBox(width: 8.0),
                        Text(
                          'Tóm tắt đơn hàng',
                          style: AppTypography.headlineMd.copyWith(color: AppColors.pureWhite, fontSize: 18.0),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16.0),
                    const Divider(color: Colors.white24),
                    const SizedBox(height: 12.0),
                    _buildSummaryRow('Giá cước cơ bản', '${_basePrice.toStringAsFixed(0)}đ'),
                    const SizedBox(height: 8.0),
                    _buildSummaryRow('Phụ phí cự ly & đặc biệt', '${_serviceFee.toStringAsFixed(0)}đ'),
                    const SizedBox(height: 8.0),
                    _buildSummaryRow('Cước cân nặng & bảo hiểm', '${_fuelTax.toStringAsFixed(0)}đ'),
                    const SizedBox(height: 16.0),
                    const Divider(color: Colors.white24),
                    const SizedBox(height: 12.0),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Tổng cộng',
                          style: AppTypography.headlineMd.copyWith(color: AppColors.pureWhite, fontSize: 18.0),
                        ),
                        Text(
                          '${_totalCost.toStringAsFixed(0)}đ',
                          style: AppTypography.headlineMd.copyWith(color: AppColors.logisticsRed, fontWeight: FontWeight.bold, fontSize: 22.0),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32.0),

              // Back and Submit buttons row
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 52.0,
                      child: OutlinedButton(
                        onPressed: _isSubmitting ? null : _prevStep,
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
                            ? const SizedBox(
                                width: 20.0,
                                height: 20.0,
                                child: CircularProgressIndicator(color: AppColors.pureWhite, strokeWidth: 2.0),
                              )
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text('XÁC NHẬN', style: AppTypography.button.copyWith(color: AppColors.pureWhite)),
                                  const SizedBox(width: 8.0),
                                  const Icon(Icons.check, size: 16.0),
                                ],
                              ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    ],
  ),
);
}

  Widget _buildStepIndicator() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14.0, horizontal: 16.0),
      decoration: BoxDecoration(
        color: AppColors.pureWhite,
        borderRadius: AppStyles.roundedXl,
        boxShadow: AppStyles.ambientShadow,
        border: Border.all(color: AppColors.surfaceContainer),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildStepNode(
            _currentStep >= 1 ? Icons.check : Icons.location_on,
            'Địa chỉ',
            isActive: _currentStep == 0,
            isCompleted: _currentStep > 0,
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 16.0),
              child: Container(
                height: 1.0,
                color: _currentStep >= 1 ? const Color(0xFF22C55E) : AppColors.surfaceContainerHighest,
              ),
            ),
          ),
          _buildStepNode(
            _currentStep >= 2 ? Icons.check : Icons.inventory_2,
            'Kiện hàng',
            isActive: _currentStep == 1,
            isCompleted: _currentStep > 1,
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 16.0),
              child: Container(
                height: 1.0,
                color: _currentStep >= 2 ? const Color(0xFF22C55E) : AppColors.surfaceContainerHighest,
              ),
            ),
          ),
          _buildStepNode(
            Icons.check,
            'Xác nhận',
            isActive: _currentStep == 2,
            isCompleted: false,
          ),
        ],
      ),
    );
  }

  Widget _buildStepNode(
    IconData icon,
    String label, {
    required bool isActive,
    required bool isCompleted,
  }) {
    Color bgColor;
    Color iconColor;
    if (isCompleted) {
      bgColor = const Color(0xFF22C55E); // Green for completed
      iconColor = AppColors.pureWhite;
    } else if (isActive) {
      bgColor = AppColors.logisticsRed; // Red for active
      iconColor = AppColors.pureWhite;
    } else {
      bgColor = AppColors.surfaceContainerLow;
      iconColor = AppColors.secondary;
    }

    final isHighlighted = isActive || isCompleted;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 32.0,
          height: 32.0,
          decoration: BoxDecoration(
            color: bgColor,
            shape: BoxShape.circle,
          ),
          child: Icon(
            icon,
            color: iconColor,
            size: 16.0,
          ),
        ),
        const SizedBox(height: 6.0),
        Text(
          label,
          style: AppTypography.labelMd.copyWith(
            color: isHighlighted ? AppColors.deepOnyx : AppColors.secondary,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
            fontSize: 11.0,
          ),
        ),
      ],
    );
  }

  Widget _buildSectionHeader(int stepNum, String title) {
    return Row(
      children: [
        Container(
          width: 32.0,
          height: 32.0,
          decoration: const BoxDecoration(
            color: AppColors.logisticsRed,
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Text(
            '$stepNum',
            style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite, fontWeight: FontWeight.bold),
          ),
        ),
        const SizedBox(width: 10.0),
        Text(
          title,
          style: AppTypography.headlineMd.copyWith(
            fontWeight: FontWeight.bold,
            color: AppColors.deepOnyx,
            fontSize: 18.0,
          ),
        ),
      ],
    );
  }

  Widget _buildFormCard({required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        color: AppColors.pureWhite,
        borderRadius: AppStyles.roundedXl,
        border: Border.all(color: AppColors.surfaceContainer),
        boxShadow: AppStyles.ambientShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
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
    bool loadingSuggestions = false,
    required ValueChanged<bool> onFocusChange,
    required ValueChanged<AddressPrediction> onSelectSuggestion,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: SearchableSelectWidget(
                label: 'TỈNH / TP',
                placeholder: '-- Chọn Tỉnh/TP --',
                value: selectedProvinceCode,
                items: provinces,
                onChanged: onProvinceChanged,
              ),
            ),
            const SizedBox(width: 10.0),
            Expanded(
              child: SearchableSelectWidget(
                label: 'PHƯỜNG / XÃ',
                placeholder: '-- Chọn Phường/Xã --',
                value: selectedWardCode,
                items: wards,
                disabled: selectedProvinceCode == null,
                onChanged: onWardChanged,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12.0),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'ĐỊA CHỈ CHI TIẾT (SỐ NHÀ, ĐƯỜNG)',
                  style: AppTypography.labelMd.copyWith(
                    color: AppColors.secondary,
                    fontSize: 10.0,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
                if (loadingSuggestions) ...[  
                  const SizedBox(width: 6.0),
                  const SizedBox(
                    width: 10.0,
                    height: 10.0,
                    child: CircularProgressIndicator(
                      strokeWidth: 1.5,
                      color: AppColors.secondary,
                    ),
                  ),
                  const SizedBox(width: 4.0),
                  Text(
                    '(Đang tìm...)',
                    style: AppTypography.labelMd.copyWith(
                      color: AppColors.secondary,
                      fontSize: 9.0,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 4.0),
            TextFormField(
              controller: addressController,
              onTap: () => onFocusChange(true),
              onChanged: (val) {
                onFocusChange(true);
              },
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Vui lòng nhập địa chỉ chi tiết';
                }
                return null;
              },
              decoration: InputDecoration(
                hintText: 'Ví dụ: 123 Nguyễn Trãi',
                hintStyle: AppTypography.bodyMd.copyWith(color: Colors.black26, fontSize: 13.0),
                filled: true,
                fillColor: AppColors.pureWhite,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
                border: OutlineInputBorder(
                  borderRadius: AppStyles.roundedLg,
                  borderSide: const BorderSide(color: AppColors.surfaceContainerHighest),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: AppStyles.roundedLg,
                  borderSide: const BorderSide(color: AppColors.surfaceContainerHighest),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: AppStyles.roundedLg,
                  borderSide: const BorderSide(color: AppColors.logisticsRed),
                ),
              ),
            ),
            if (showSuggestions && suggestions.isNotEmpty) ...[
              const SizedBox(height: 4.0),
              Container(
                constraints: const BoxConstraints(maxHeight: 180.0),
                decoration: BoxDecoration(
                  color: AppColors.pureWhite,
                  borderRadius: AppStyles.roundedLg,
                  border: Border.all(color: AppColors.surfaceContainerHighest),
                  boxShadow: AppStyles.softShadow,
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  padding: EdgeInsets.zero,
                  itemCount: suggestions.length,
                  separatorBuilder: (context, index) => const Divider(height: 1.0, color: AppColors.surfaceContainer),
                  itemBuilder: (context, index) {
                    final item = suggestions[index];
                    return ListTile(
                      dense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 2.0),
                      title: Text(
                        item.description,
                        style: AppTypography.labelMd.copyWith(color: AppColors.deepOnyx, fontSize: 12.0),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
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

  Widget _buildTextField(
    String label,
    String placeholder,
    TextEditingController controller, {
    bool isPhone = false,
    bool isNumber = false,
    bool isOptional = false,
    IconData? suffixIcon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
        ),
        const SizedBox(height: 4.0),
        TextFormField(
          controller: controller,
          keyboardType: isPhone
              ? TextInputType.phone
              : isNumber
                  ? const TextInputType.numberWithOptions(decimal: true)
                  : TextInputType.text,
          validator: (value) {
            if (isOptional && (value == null || value.trim().isEmpty)) {
              return null;
            }
            if (value == null || value.trim().isEmpty) {
              return 'Trường này không được để trống';
            }
            if (isPhone) {
              final cleanPhone = value.replaceAll(RegExp(r'\s+|-'), '');
              final phoneRegExp = RegExp(r'^(0[3|5|7|8|9])+([0-9]{8})$');
              if (!phoneRegExp.hasMatch(cleanPhone)) {
                return 'Số điện thoại 10 số không hợp lệ (Ví dụ: 0912345678)';
              }
            }
            if (isNumber) {
              final numVal = double.tryParse(value);
              if (numVal == null || numVal <= 0) {
                return 'Vui lòng nhập số hợp lệ > 0';
              }
            }
            return null;
          },
          decoration: InputDecoration(
            hintText: placeholder,
            hintStyle: AppTypography.bodyMd.copyWith(color: Colors.black26),
            suffixIcon: suffixIcon != null ? Icon(suffixIcon, color: AppColors.secondary) : null,
            filled: true,
            fillColor: AppColors.pureWhite,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
            border: OutlineInputBorder(
              borderRadius: AppStyles.roundedLg,
              borderSide: const BorderSide(color: AppColors.surfaceContainerHighest),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: AppStyles.roundedLg,
              borderSide: const BorderSide(color: AppColors.surfaceContainerHighest),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: AppStyles.roundedLg,
              borderSide: const BorderSide(color: AppColors.logisticsRed),
            ),
          ),
        ),
      ],
    );
  }



  Widget _buildServiceRadio(
    String value,
    String title,
    String desc,
    String price,
    String badgeLabel,
    Color badgeColor,
    Color badgeTextColor,
  ) {
    final isSelected = _serviceLevel == value;
    return GestureDetector(
      onTap: () {
        setState(() {
          _serviceLevel = value;
          _calculatePrice();
        });
      },
      child: Container(
        padding: const EdgeInsets.all(16.0),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryContainer.withValues(alpha: 0.05) : AppColors.pureWhite,
          borderRadius: AppStyles.roundedXl,
          border: Border.all(
            color: isSelected ? AppColors.logisticsRed : AppColors.surfaceContainerHighest,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Radio<String>(
              value: value,
              activeColor: AppColors.logisticsRed,
            ),
            const SizedBox(width: 8.0),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                        decoration: BoxDecoration(
                          color: badgeColor,
                          borderRadius: BorderRadius.circular(4.0),
                        ),
                        child: Text(
                          badgeLabel,
                          style: AppTypography.labelMd.copyWith(
                            color: badgeTextColor,
                            fontSize: 8.0,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Text(
                        price,
                        style: AppTypography.headlineMd.copyWith(fontSize: 18.0, fontWeight: FontWeight.bold, color: AppColors.deepOnyx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6.0),
                  Text(
                    title,
                    style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4.0),
                  Text(
                    desc,
                    style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: AppTypography.labelMd.copyWith(color: Colors.white70),
        ),
        Text(
          value,
          style: AppTypography.bodyMd.copyWith(color: AppColors.pureWhite, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  Widget _buildBulkOrderView() {
    if (_bulkCreatedCodes.isNotEmpty) {
      return _buildBulkSuccessView();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(1, 'Nhập danh sách đơn hàng'),
        const SizedBox(height: 12.0),
        if (!_isImported) ...[
          GestureDetector(
            onTap: _handleImportFile,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 40.0, horizontal: 20.0),
              decoration: BoxDecoration(
                color: AppColors.pureWhite,
                borderRadius: AppStyles.roundedXl,
                border: Border.all(
                  color: AppColors.surfaceContainerHighest,
                  width: 1.5,
                ),
                boxShadow: AppStyles.ambientShadow,
              ),
              child: Column(
                children: [
                  const Icon(
                    Icons.cloud_upload_outlined,
                    size: 64.0,
                    color: AppColors.logisticsRed,
                  ),
                  const SizedBox(height: 16.0),
                  Text(
                    'Nhấn để tải lên file mẫu Excel/CSV',
                    style: AppTypography.headlineMd.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.deepOnyx,
                      fontSize: 16.0,
                    ),
                  ),
                  const SizedBox(height: 8.0),
                  Text(
                    'Hỗ trợ file mẫu định dạng .xlsx, .csv với các cột: Họ tên, SĐT, Địa chỉ, Cân nặng',
                    style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12.0),
                  TextButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.download, size: 16.0),
                    label: const Text('Tải file Excel mẫu tại đây'),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.logisticsRed,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ] else ...[
          // Summary Banner
          Container(
            padding: const EdgeInsets.all(16.0),
            decoration: BoxDecoration(
              color: AppColors.deepOnyx,
              borderRadius: AppStyles.roundedLg,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${_importedOrders.length} Đơn hàng nhập khẩu',
                  style: AppTypography.labelLg.copyWith(
                    color: AppColors.pureWhite,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  'Tổng cước: \$75.00',
                  style: AppTypography.labelLg.copyWith(
                    color: AppColors.logisticsRed,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16.0),
          
          // List of imported orders
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _importedOrders.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12.0),
            itemBuilder: (context, index) {
              final order = _importedOrders[index];
              return Container(
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: AppColors.pureWhite,
                  borderRadius: AppStyles.roundedLg,
                  border: Border.all(color: AppColors.surfaceContainerHighest),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          order['receiverName'] as String,
                          style: AppTypography.labelLg.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppColors.deepOnyx,
                          ),
                        ),
                        Text(
                          '${order['weight']} kg',
                          style: AppTypography.labelLg.copyWith(
                            color: AppColors.secondary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4.0),
                    Text(
                      'SĐT: ${order['receiverPhone']}',
                      style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
                    ),
                    const SizedBox(height: 4.0),
                    Text(
                      'Đến: ${order['deliveryAddressText']}',
                      style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 24.0),
          
          // Submit and reset actions
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 52.0,
                  child: OutlinedButton(
                    onPressed: () {
                      setState(() {
                        _isImported = false;
                        _importedOrders = [];
                      });
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.deepOnyx,
                      side: const BorderSide(color: AppColors.surfaceContainerHigh, width: 1.5),
                      shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                    ),
                    child: const Text('TẢI FILE KHÁC', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
              const SizedBox(width: 12.0),
              Expanded(
                child: SizedBox(
                  height: 52.0,
                  child: ElevatedButton(
                    onPressed: _isBulkSubmitting ? null : _submitBulkOrders,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.logisticsRed,
                      foregroundColor: AppColors.pureWhite,
                      shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                      elevation: 0,
                    ),
                    child: _isBulkSubmitting
                        ? const SizedBox(
                            width: 24.0,
                            height: 24.0,
                            child: CircularProgressIndicator(
                              color: AppColors.pureWhite,
                              strokeWidth: 2.5,
                            ),
                          )
                        : Text(
                            'TẠO HÀNG LOẠT',
                            style: AppTypography.button.copyWith(
                              fontWeight: FontWeight.bold,
                              fontSize: 16.0,
                            ),
                          ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Future<void> _handleImportFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['csv', 'xlsx', 'xls'],
        withData: true,
      );

      if (result == null || result.files.isEmpty) return;

      final file = result.files.first;
      final ext = file.extension?.toLowerCase() ?? '';
      final bytes = file.bytes;

      if (bytes == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Không đọc được nội dung file.',
                  style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite)),
              backgroundColor: AppColors.error,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
              margin: const EdgeInsets.all(AppStyles.marginMobile),
            ),
          );
        }
        return;
      }

      // Show loading dialog
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => const Center(
            child: Card(
              child: Padding(
                padding: EdgeInsets.all(24.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: AppColors.logisticsRed),
                    SizedBox(height: 16.0),
                    Text('Đang phân tích dữ liệu file...'),
                  ],
                ),
              ),
            ),
          ),
        );
      }

      List<Map<String, dynamic>> parsedOrders = [];

      try {
        if (ext == 'csv') {
          // Parse CSV
          final content = String.fromCharCodes(bytes);
          final rows = const CsvToListConverter(eol: '\n').convert(content);
          // Skip header row (row 0)
          for (int i = 1; i < rows.length; i++) {
            final row = rows[i];
            if (row.length < 4) continue;
            final name = row[0]?.toString().trim() ?? '';
            final phone = row[1]?.toString().trim() ?? '';
            final address = row[2]?.toString().trim() ?? '';
            final weight = double.tryParse(row[3]?.toString().trim() ?? '0') ?? 0.0;
            if (name.isEmpty || phone.isEmpty || address.isEmpty) continue;
            parsedOrders.add({
              'receiverName': name,
              'receiverPhone': phone,
              'deliveryAddressText': address,
              'weight': weight,
            });
          }
        } else if (ext == 'xlsx' || ext == 'xls') {
          // Parse Excel
          final excel = Excel.decodeBytes(bytes);
          final sheet = excel.tables[excel.tables.keys.first];
          if (sheet != null) {
            // Skip header row (row 0)
            for (int i = 1; i < sheet.rows.length; i++) {
              final row = sheet.rows[i];
              if (row.length < 4) continue;
              final name = row[0]?.value?.toString().trim() ?? '';
              final phone = row[1]?.value?.toString().trim() ?? '';
              final address = row[2]?.value?.toString().trim() ?? '';
              final weight = double.tryParse(row[3]?.value?.toString().trim() ?? '0') ?? 0.0;
              if (name.isEmpty || phone.isEmpty || address.isEmpty) continue;
              parsedOrders.add({
                'receiverName': name,
                'receiverPhone': phone,
                'deliveryAddressText': address,
                'weight': weight,
              });
            }
          }
        }
      } catch (_) {
        parsedOrders = [];
      }

      if (mounted) Navigator.pop(context); // Dismiss loading

      if (parsedOrders.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.warning_amber, color: AppColors.logisticsRed),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Không đọc được dữ liệu. Kiểm tra định dạng file:\nCột: Họ tên | SĐT | Địa chỉ | Cân nặng (kg)',
                      style: AppTypography.labelMd.copyWith(color: AppColors.pureWhite),
                    ),
                  ),
                ],
              ),
              backgroundColor: AppColors.deepOnyx,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
              margin: const EdgeInsets.all(AppStyles.marginMobile),
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
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Color(0xFF4ADE80)),
                const SizedBox(width: 8),
                Text(
                  'Đã nhập thành công ${parsedOrders.length} đơn hàng từ file.',
                  style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite),
                ),
              ],
            ),
            backgroundColor: AppColors.deepOnyx,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
            margin: const EdgeInsets.all(AppStyles.marginMobile),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        try { Navigator.pop(context); } catch (_) {}
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Có lỗi khi đọc file: ${e.toString()}',
                style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite)),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
            margin: const EdgeInsets.all(AppStyles.marginMobile),
          ),
        );
      }
    }
  }

  Future<void> _submitBulkOrders() async {
    setState(() {
      _isBulkSubmitting = true;
    });

    final List<String> codes = [];
    for (final order in _importedOrders) {
      final payload = {
        'serviceCode': 'EXPRESS',
        'feePayer': 'SENDER',
        'paymentMethod': 'CASH',
        'pickupType': 'PICKUP',
        'senderContact': {
          'fullName': 'Kho hàng mặc định',
          'phone': '0900000000',
        },
        'receiverContact': {
          'fullName': order['receiverName'],
          'phone': order['receiverPhone'],
        },
        'pickupAddress': {
          'addressLine1': '100 Đường Nguyễn Du',
          'province': 'Thành phố Hồ Chí Minh',
          'ward': 'Phường Bến Thành',
          'wardCode': '26734',
          'latitude': 10.7725,
          'longitude': 106.6980,
        },
        'deliveryAddress': {
          'addressLine1': order['deliveryAddressText'],
          'province': 'Thành phố Hồ Chí Minh',
          'ward': 'Phường Bến Thành',
          'wardCode': '26734',
          'latitude': 10.7725,
          'longitude': 106.6980,
        },
        'packages': [
          {
            'weight': order['weight'],
            'length': 10.0,
            'width': 10.0,
            'height': 10.0,
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
        const SizedBox(height: 24.0),
        Text(
          'Đã tạo hàng loạt thành công!',
          style: AppTypography.headlineLgMobile.copyWith(
            fontWeight: FontWeight.bold,
            color: AppColors.deepOnyx,
          ),
        ),
        const SizedBox(height: 8.0),
        Text(
          'Đã tạo thành công ${_bulkCreatedCodes.length} đơn hàng thực tế vào cơ sở dữ liệu.',
          style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24.0),
        
        // Scrollable list of waybill QR codes
        SizedBox(
          height: 320.0,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            itemCount: _bulkCreatedCodes.length,
            separatorBuilder: (context, index) => const SizedBox(width: 16.0),
            itemBuilder: (context, index) {
              final code = _bulkCreatedCodes[index];
              return Container(
                width: 240.0,
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: AppColors.pureWhite,
                  borderRadius: AppStyles.roundedXl,
                  border: Border.all(color: AppColors.surfaceContainerHighest),
                  boxShadow: AppStyles.ambientShadow,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Vận đơn ${index + 1}',
                      style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
                    ),
                    const SizedBox(height: 4.0),
                    Text(
                      code,
                      style: AppTypography.labelLg.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepOnyx,
                      ),
                    ),
                    const SizedBox(height: 16.0),
                    Container(
                      width: 140.0,
                      height: 140.0,
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.surfaceContainerHighest),
                        borderRadius: BorderRadius.circular(12.0),
                      ),
                      padding: const EdgeInsets.all(8.0),
                      child: Image.network(
                        'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=$code',
                        fit: BoxFit.contain,
                      ),
                    ),
                    const SizedBox(height: 12.0),
                    const Text(
                      'Dán nhãn này lên kiện hàng',
                      style: TextStyle(fontSize: 10.0, color: AppColors.secondary),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        
        const SizedBox(height: 28.0),
        SizedBox(
          width: double.infinity,
          height: 52.0,
          child: ElevatedButton(
            onPressed: () {
              setState(() {
                _bulkCreatedCodes = [];
                _isImported = false;
                _importedOrders = [];
              });
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.deepOnyx,
              foregroundColor: AppColors.pureWhite,
              shape: RoundedRectangleBorder(
                borderRadius: AppStyles.roundedLg,
              ),
            ),
            child: const Text('Tạo tiếp đơn hàng loạt'),
          ),
        ),
      ],
    );
  }
}

class SearchableSelectWidget extends StatefulWidget {
  final String label;
  final String placeholder;
  final String? value;
  final List<Map<String, dynamic>> items;
  final bool disabled;
  final ValueChanged<String?> onChanged;

  const SearchableSelectWidget({
    super.key,
    required this.label,
    required this.placeholder,
    required this.value,
    required this.items,
    required this.onChanged,
    this.disabled = false,
  });

  @override
  State<SearchableSelectWidget> createState() => _SearchableSelectWidgetState();
}

class _SearchableSelectWidgetState extends State<SearchableSelectWidget> {
  void _openSearchDialog() {
    if (widget.disabled || widget.items.isEmpty) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.pureWhite,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.0)),
      ),
      builder: (ctx) {
        String query = '';
        String removeAccents(String str) {
          const vietnameseMarks = [
            'aàáảãạâầấẩẫậăằắẳẵặ',
            'AÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶ',
            'eèéẻẽẹêềếểễệ',
            'EÈÉẺẼẸÊỀẾỂỄỆ',
            'iìíỉĩị',
            'IÌÍỈĨỊ',
            'oòóỏõọôồốổỗộơờớởỡợ',
            'OÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ',
            'uùúủũụưừứửữự',
            'UÙÚỦŨỤƯỪỨỬỮỰ',
            'yỳýỷỹỵ',
            'YỲÝỶỸỴ',
            'dđ',
            'DĐ'
          ];
          String result = str;
          for (var mark in vietnameseMarks) {
            for (int i = 1; i < mark.length; i++) {
              result = result.replaceAll(mark[i], mark[0]);
            }
          }
          return result;
        }

        return StatefulBuilder(
          builder: (context, setModalState) {
            final filtered = widget.items.where((item) {
              final fullName = '${item['fullName'] ?? item['name'] ?? ''}';
              final nameLower = fullName.toLowerCase();
              final nameNoAccent = removeAccents(nameLower);
              final qLower = query.toLowerCase().trim();
              final qNoAccent = removeAccents(qLower);

              return nameLower.contains(qLower) || nameNoAccent.contains(qNoAccent);
            }).toList();

            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
                top: 16,
                left: 16,
                right: 16,
              ),
              child: SizedBox(
                height: MediaQuery.of(ctx).size.height * 0.55,
                child: Column(
                  children: [
                    Container(
                      width: 40.0,
                      height: 4.0,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainerHigh,
                        borderRadius: BorderRadius.circular(2.0),
                      ),
                    ),
                    const SizedBox(height: 12.0),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          widget.label,
                          style: AppTypography.headlineMd.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppColors.deepOnyx,
                            fontSize: 16.0,
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(ctx),
                          icon: const Icon(Icons.close, color: AppColors.secondary, size: 20.0),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8.0),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 2.0),
                      decoration: BoxDecoration(
                        color: AppColors.cloudGray,
                        borderRadius: AppStyles.roundedLg,
                        border: Border.all(color: AppColors.surfaceContainerHighest),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.search, color: AppColors.secondary, size: 18.0),
                          const SizedBox(width: 8.0),
                          Expanded(
                            child: TextField(
                              autofocus: true,
                              decoration: const InputDecoration(
                                hintText: 'Nhập từ khóa tìm kiếm...',
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                isDense: true,
                                contentPadding: EdgeInsets.symmetric(vertical: 10.0),
                              ),
                              style: AppTypography.bodyMd.copyWith(color: AppColors.deepOnyx),
                              onChanged: (val) {
                                setModalState(() {
                                  query = val;
                                });
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12.0),
                    Expanded(
                      child: filtered.isNotEmpty
                          ? ListView.separated(
                              itemCount: filtered.length,
                              separatorBuilder: (_, _) => const Divider(height: 1.0, color: AppColors.surfaceContainer),
                              itemBuilder: (context, index) {
                                final item = filtered[index];
                                final code = '${item['code']}';
                                final name = '${item['fullName'] ?? item['name'] ?? ''}';
                                final isSelected = code == widget.value;

                                return ListTile(
                                  dense: true,
                                  title: Text(
                                    name,
                                    style: AppTypography.bodyMd.copyWith(
                                      color: isSelected ? AppColors.logisticsRed : AppColors.deepOnyx,
                                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                    ),
                                  ),
                                  trailing: isSelected ? const Icon(Icons.check, color: AppColors.logisticsRed, size: 18.0) : null,
                                  onTap: () {
                                    widget.onChanged(code);
                                    Navigator.pop(ctx);
                                  },
                                );
                              },
                            )
                          : Center(
                              child: Text(
                                'Không tìm thấy kết quả',
                                style: AppTypography.labelMd.copyWith(color: AppColors.secondary, fontStyle: FontStyle.italic),
                              ),
                            ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    String? selectedName;
    if (widget.value != null && widget.items.isNotEmpty) {
      final found = widget.items.firstWhere(
        (item) => '${item['code']}' == widget.value,
        orElse: () => {},
      );
      if (found.isNotEmpty) {
        selectedName = '${found['fullName'] ?? found['name'] ?? ''}';
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.label,
          style: AppTypography.labelMd.copyWith(
            color: AppColors.secondary,
            fontSize: 10.0,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 4.0),
        InkWell(
          onTap: widget.disabled ? null : _openSearchDialog,
          borderRadius: AppStyles.roundedLg,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 12.0),
            decoration: BoxDecoration(
              color: widget.disabled ? AppColors.cloudGray : AppColors.pureWhite,
              borderRadius: AppStyles.roundedLg,
              border: Border.all(color: AppColors.surfaceContainerHighest),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    selectedName ?? widget.placeholder,
                    style: AppTypography.bodyMd.copyWith(
                      color: selectedName != null ? AppColors.deepOnyx : Colors.black26,
                      fontSize: 13.0,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Icon(
                  Icons.keyboard_arrow_down,
                  color: widget.disabled ? AppColors.surfaceContainerHigh : AppColors.secondary,
                  size: 20.0,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
