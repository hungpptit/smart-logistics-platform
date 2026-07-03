import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';

class CreateOrderTab extends StatefulWidget {
  final VoidCallback onOrderCreated;

  const CreateOrderTab({
    super.key,
    required this.onOrderCreated,
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

  String _pkgType = 'box'; // 'box', 'document', 'pallet'
  String _serviceLevel = 'express'; // 'express', 'standard'
  String _paymentMethod = 'prepaid'; // 'prepaid', 'cod'

  // Pricing calculation
  double _basePrice = 18.00;
  double _serviceFee = 5.50;
  double _fuelTax = 1.49;
  double _totalCost = 24.99;

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _weightController.addListener(_calculatePrice);
    _lengthController.addListener(_calculatePrice);
    _widthController.addListener(_calculatePrice);
    _heightController.addListener(_calculatePrice);
  }

  @override
  void dispose() {
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
    super.dispose();
  }

  void _calculatePrice() {
    final weight = double.tryParse(_weightController.text) ?? 0.0;
    final length = double.tryParse(_lengthController.text) ?? 0.0;
    final width = double.tryParse(_widthController.text) ?? 0.0;
    final height = double.tryParse(_heightController.text) ?? 0.0;

    // Volumetric weight factor: (L * W * H) / 5000
    final volWeight = (length * width * height) / 5000.0;
    final chargeableWeight = weight > volWeight ? weight : volWeight;

    setState(() {
      if (chargeableWeight <= 0) {
        _basePrice = 12.00;
      } else {
        _basePrice = 12.00 + (chargeableWeight * 1.2);
      }

      if (_serviceLevel == 'express') {
        _serviceFee = 5.50;
      } else {
        _serviceFee = 0.00;
      }

      _fuelTax = (_basePrice + _serviceFee) * 0.06;
      _totalCost = _basePrice + _serviceFee + _fuelTax;
    });
  }

  void _submitForm() {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isSubmitting = true;
      });

      // Simulate network request
      Future.delayed(const Duration(milliseconds: 1500), () {
        if (mounted) {
          setState(() {
            _isSubmitting = false;
          });

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.green),
                  const SizedBox(width: 12.0),
                  Text(
                    'Đơn hàng đã được tạo thành công!',
                    style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite),
                  ),
                ],
              ),
              backgroundColor: AppColors.deepOnyx,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
            ),
          );

          widget.onOrderCreated();
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(
          horizontal: AppStyles.marginMobile,
          vertical: 24.0,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Text(
              'Đơn hàng mới',
              style: AppTypography.headlineLgMobile.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.deepOnyx,
              ),
            ),
            const SizedBox(height: 6.0),
            Text(
              'Hoàn thành các chi tiết bên dưới để lên lịch giao hàng qua mạng lưới toàn cầu của chúng tôi.',
              style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
            ),
            const SizedBox(height: 28.0),

            // Section 1: Pickup Info
            _buildSectionHeader(1, 'Thông tin lấy hàng'),
            const SizedBox(height: 12.0),
            _buildFormCard(
              children: [
                _buildTextField('Họ tên người gửi', 'Tên đầy đủ hoặc Tên công ty', _senderNameController),
                const SizedBox(height: 16.0),
                _buildTextField('Số điện thoại', '+84 000 000 000', _senderPhoneController, isPhone: true),
                const SizedBox(height: 16.0),
                _buildTextField('Địa chỉ lấy hàng', 'Đường, Phường/Xã, Quận/Huyện, Tỉnh/TP', _senderAddressController, suffixIcon: Icons.location_on),
                const SizedBox(height: 16.0),
                // Map placeholder
                Container(
                  height: 160.0,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    borderRadius: AppStyles.roundedLg,
                    image: const DecorationImage(
                      image: NetworkImage(
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuBA7wuMKQ3bCtusx6h3TmG_5ih690vvBkWgg-mG0tjfNyojNU_soIGDpiljg04QCs3ZniyIFoo7V6ZOgN263TQXnOAZsd_GrjpuOaBu0wW_GlIiGOOrV3ykYuCeeSr7zesmAAaon6DdBcGqgL1fLnAgX4f5VPYzGqfV2H-fjZubgwL710fFJzz9wdD_9e2xDdC6k9CXkq528MAj5v_mE3qDaxujj6xWPUcNfuVfaZLjr4em-MldY1Ho-g',
                      ),
                      fit: BoxFit.cover,
                    ),
                  ),
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: AppStyles.roundedLg,
                      color: Colors.black.withValues(alpha: 0.1),
                    ),
                    padding: const EdgeInsets.all(12.0),
                    alignment: Alignment.bottomRight,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 6.0),
                      decoration: BoxDecoration(
                        color: AppColors.pureWhite,
                        borderRadius: BorderRadius.circular(20.0),
                        boxShadow: AppStyles.ambientShadow,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.near_me, size: 14.0, color: AppColors.deepOnyx),
                          const SizedBox(width: 6.0),
                          Text(
                            'Ghim bản đồ',
                            style: AppTypography.labelMd.copyWith(color: AppColors.deepOnyx, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
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
                _buildTextField('Địa chỉ giao hàng', 'Đường, Phường/Xã, Quận/Huyện, Tỉnh/TP', _receiverAddressController, suffixIcon: Icons.location_on),
              ],
            ),
            const SizedBox(height: 28.0),

            // Section 3: Package Details
            _buildSectionHeader(3, 'Chi tiết kiện hàng'),
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
                Text(
                  'Loại kiện hàng',
                  style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx),
                ),
                const SizedBox(height: 10.0),
                Row(
                  children: [
                    Expanded(child: _buildPackageTypeRadio('box', Icons.inventory_2, 'Thùng/Kiện')),
                    const SizedBox(width: 8.0),
                    Expanded(child: _buildPackageTypeRadio('document', Icons.description, 'Tài liệu')),
                    const SizedBox(width: 8.0),
                    Expanded(child: _buildPackageTypeRadio('pallet', Icons.inventory, 'Pallet')),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 28.0),

            // Section 4: Service & Payment
            _buildSectionHeader(4, 'Gói dịch vụ'),
            const SizedBox(height: 12.0),
            _buildServiceRadio('express', 'Velocity Express', 'Giao hàng trong 24-48 giờ kèm định vị GPS.', '\$24.99', true),
            const SizedBox(height: 12.0),
            _buildServiceRadio('standard', 'Velocity Standard', 'Giao hàng trong 3-5 ngày làm việc. Tiết kiệm.', '\$12.50', false),
            const SizedBox(height: 20.0),

            // Payment Method Card
            _buildFormCard(
              children: [
                Text(
                  'Phương thức thanh toán',
                  style: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12.0),
                Row(
                  children: [
                    Radio<String>(
                      value: 'prepaid',
                      groupValue: _paymentMethod,
                      activeColor: AppColors.logisticsRed,
                      onChanged: (val) {
                        setState(() {
                          _paymentMethod = val!;
                        });
                      },
                    ),
                    Expanded(
                      child: Text('Thanh toán ngay (Thẻ/Ví)', style: AppTypography.bodyMd),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Radio<String>(
                      value: 'cod',
                      groupValue: _paymentMethod,
                      activeColor: AppColors.logisticsRed,
                      onChanged: (val) {
                        setState(() {
                          _paymentMethod = val!;
                        });
                      },
                    ),
                    Expanded(
                      child: Text('Thanh toán khi nhận hàng (COD)', style: AppTypography.bodyMd),
                    ),
                  ],
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
                  _buildSummaryRow('Giá cước cơ bản', '\$${_basePrice.toStringAsFixed(2)}'),
                  const SizedBox(height: 8.0),
                  _buildSummaryRow('Phụ phí hỏa tốc', '\$${_serviceFee.toStringAsFixed(2)}'),
                  const SizedBox(height: 8.0),
                  _buildSummaryRow('Thuế nhiên liệu (6%)', '\$${_fuelTax.toStringAsFixed(2)}'),
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
                        '\$${_totalCost.toStringAsFixed(2)}',
                        style: AppTypography.headlineMd.copyWith(color: AppColors.logisticsRed, fontWeight: FontWeight.bold, fontSize: 22.0),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28.0),

            // Action Buttons
            SizedBox(
              width: double.infinity,
              height: 52.0,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submitForm,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.logisticsRed,
                  foregroundColor: AppColors.pureWhite,
                  shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
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
                          Text('XÁC NHẬN TẠO ĐƠN', style: AppTypography.button.copyWith(color: AppColors.pureWhite)),
                          const SizedBox(width: 8.0),
                          const Icon(Icons.arrow_forward, size: 16.0),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 32.0),
          ],
        ),
      ),
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

  Widget _buildTextField(
    String label,
    String placeholder,
    TextEditingController controller, {
    bool isPhone = false,
    bool isNumber = false,
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
            if (value == null || value.trim().isEmpty) {
              return 'Trường này không được để trống';
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

  Widget _buildPackageTypeRadio(String value, IconData icon, String label) {
    final isSelected = _pkgType == value;
    return GestureDetector(
      onTap: () {
        setState(() {
          _pkgType = value;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14.0),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryContainer.withValues(alpha: 0.1) : AppColors.pureWhite,
          borderRadius: AppStyles.roundedLg,
          border: Border.all(
            color: isSelected ? AppColors.logisticsRed : AppColors.surfaceContainerHighest,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: isSelected ? AppColors.logisticsRed : AppColors.secondary),
            const SizedBox(height: 6.0),
            Text(
              label,
              style: AppTypography.labelMd.copyWith(
                color: isSelected ? AppColors.logisticsRed : AppColors.deepOnyx,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildServiceRadio(
    String value,
    String title,
    String desc,
    String price,
    bool fastest,
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
              groupValue: _serviceLevel,
              activeColor: AppColors.logisticsRed,
              onChanged: (val) {
                setState(() {
                  _serviceLevel = val!;
                  _calculatePrice();
                });
              },
            ),
            const SizedBox(width: 8.0),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      if (fastest)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                          decoration: BoxDecoration(
                            color: AppColors.logisticsRed,
                            borderRadius: BorderRadius.circular(4.0),
                          ),
                          child: Text(
                            'NHANH NHẤT',
                            style: AppTypography.labelMd.copyWith(color: AppColors.pureWhite, fontSize: 8.0, fontWeight: FontWeight.bold),
                          ),
                        )
                      else
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceContainerLow,
                            borderRadius: BorderRadius.circular(4.0),
                          ),
                          child: Text(
                            'TIẾT KIỆM',
                            style: AppTypography.labelMd.copyWith(color: AppColors.secondary, fontSize: 8.0, fontWeight: FontWeight.bold),
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
}
