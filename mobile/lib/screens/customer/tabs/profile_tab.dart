import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/theme/app_styles.dart';
import '../../../services/auth_service.dart';

class ProfileTab extends StatefulWidget {
  const ProfileTab({super.key});

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  String _username = 'Khách hàng';
  String _email = 'loading...';
  String _phone = 'loading...';
  List<Map<String, dynamic>> _addresses = [];

  @override
  void initState() {
    super.initState();
    _loadProfileData();
  }

  Future<void> _loadProfileData() async {
    final username = await AuthService.getStoredUsername();
    final email = await AuthService.getStoredEmail();
    final phone = await AuthService.getStoredPhone();
    final addresses = await AuthService.fetchAddresses();

    if (mounted) {
      setState(() {
        if (username != null && username.isNotEmpty) _username = username;
        if (email != null && email.isNotEmpty) _email = email;
        if (phone != null && phone.isNotEmpty) {
          _phone = phone;
        } else {
          _phone = 'Chưa thiết lập';
        }
        _addresses = addresses;
      });
    }
  }

  void _showAddressDialog({Map<String, dynamic>? editItem}) {
    final bool isEditing = editItem != null;
    final addrObj = isEditing && editItem['address'] is Map
        ? editItem['address'] as Map<String, dynamic>
        : (editItem ?? {});

    final customerId = (editItem?['customerId'] ?? '').toString();
    final addressId = (editItem?['addressId'] ?? editItem?['id'] ?? addrObj['id'] ?? '').toString();

    final contactNameController = TextEditingController(
      text: editItem?['contactName'] ?? addrObj['contactName'] ?? _username,
    );
    final contactPhoneController = TextEditingController(
      text: editItem?['contactPhone'] ?? addrObj['contactPhone'] ?? (_phone != 'Chưa thiết lập' ? _phone : ''),
    );
    final addressLineController = TextEditingController(
      text: addrObj['addressLine1'] ?? '',
    );
    final wardController = TextEditingController(
      text: addrObj['wardRelation']?['fullName'] ?? addrObj['wardRelation']?['name'] ?? addrObj['wardName'] ?? addrObj['ward'] ?? '',
    );
    final provinceController = TextEditingController(
      text: addrObj['wardRelation']?['province']?['fullName'] ?? addrObj['wardRelation']?['province']?['name'] ?? addrObj['provinceName'] ?? addrObj['province'] ?? '',
    );

    String selectedType = editItem?['addressType'] ?? 'HOME';
    if (selectedType != 'HOME' && selectedType != 'WORK') {
      selectedType = 'HOME';
    }
    bool isDefault = editItem?['isDefault'] == true;
    bool dialogLoading = false;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: AppColors.pureWhite,
              surfaceTintColor: Colors.transparent,
              shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
              title: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6.0),
                    decoration: BoxDecoration(
                      color: AppColors.logisticsRed.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isEditing ? Icons.edit_location_alt : Icons.add_location_alt,
                      color: AppColors.logisticsRed,
                      size: 20.0,
                    ),
                  ),
                  const SizedBox(width: 8.0),
                  Text(
                    isEditing ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới',
                    style: AppTypography.headlineMd.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.deepOnyx,
                      fontSize: 16.0,
                    ),
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Contact Name
                    Text('Tên người liên hệ', style: AppTypography.labelMd.copyWith(color: AppColors.deepOnyx)),
                    const SizedBox(height: 6.0),
                    TextField(
                      controller: contactNameController,
                      decoration: InputDecoration(
                        hintText: 'VD: Nguyễn Văn A',
                        border: OutlineInputBorder(borderRadius: AppStyles.roundedLg),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
                      ),
                    ),
                    const SizedBox(height: 12.0),

                    // Contact Phone
                    Text('Số điện thoại liên hệ', style: AppTypography.labelMd.copyWith(color: AppColors.deepOnyx)),
                    const SizedBox(height: 6.0),
                    TextField(
                      controller: contactPhoneController,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        hintText: 'VD: 0901234567',
                        border: OutlineInputBorder(borderRadius: AppStyles.roundedLg),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
                      ),
                    ),
                    const SizedBox(height: 12.0),

                    // Address Line 1
                    Text('Địa chỉ (Số nhà, tên đường) *', style: AppTypography.labelMd.copyWith(color: AppColors.deepOnyx)),
                    const SizedBox(height: 6.0),
                    TextField(
                      controller: addressLineController,
                      decoration: InputDecoration(
                        hintText: 'VD: 120 Lê Lợi',
                        border: OutlineInputBorder(borderRadius: AppStyles.roundedLg),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
                      ),
                    ),
                    const SizedBox(height: 12.0),

                    // Ward
                    Text('Phường / Xã *', style: AppTypography.labelMd.copyWith(color: AppColors.deepOnyx)),
                    const SizedBox(height: 6.0),
                    TextField(
                      controller: wardController,
                      decoration: InputDecoration(
                        hintText: 'VD: Phường Bến Thành',
                        border: OutlineInputBorder(borderRadius: AppStyles.roundedLg),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
                      ),
                    ),
                    const SizedBox(height: 12.0),

                    // Province
                    Text('Tỉnh / Thành phố *', style: AppTypography.labelMd.copyWith(color: AppColors.deepOnyx)),
                    const SizedBox(height: 6.0),
                    TextField(
                      controller: provinceController,
                      decoration: InputDecoration(
                        hintText: 'VD: Hồ Chí Minh',
                        border: OutlineInputBorder(borderRadius: AppStyles.roundedLg),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
                      ),
                    ),
                    const SizedBox(height: 12.0),

                    // Address Type
                    Text('Loại địa chỉ', style: AppTypography.labelMd.copyWith(color: AppColors.deepOnyx)),
                    const SizedBox(height: 6.0),
                    DropdownButtonFormField<String>(
                      initialValue: selectedType,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: AppStyles.roundedLg),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12.0),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'HOME', child: Text('Nhà riêng')),
                        DropdownMenuItem(value: 'WORK', child: Text('Văn phòng / Kho')),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          setDialogState(() {
                            selectedType = val;
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 12.0),

                    // Default Checkbox
                    Row(
                      children: [
                        Checkbox(
                          value: isDefault,
                          activeColor: AppColors.logisticsRed,
                          onChanged: (val) {
                            if (val != null) {
                              setDialogState(() {
                                isDefault = val;
                              });
                            }
                          },
                        ),
                        Text(
                          'Đặt làm địa chỉ mặc định',
                          style: AppTypography.bodyMd.copyWith(color: AppColors.deepOnyx),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: dialogLoading ? null : () => Navigator.pop(context),
                  child: Text('Hủy', style: AppTypography.labelLg.copyWith(color: AppColors.secondary)),
                ),
                ElevatedButton(
                  onPressed: dialogLoading
                      ? null
                      : () async {
                          final addrLine = addressLineController.text.trim();
                          final ward = wardController.text.trim();
                          final prov = provinceController.text.trim();
                          final cName = contactNameController.text.trim();
                          final cPhone = contactPhoneController.text.trim();

                          if (addrLine.isEmpty || ward.isEmpty || prov.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Vui lòng điền đầy đủ các thông tin địa chỉ')),
                            );
                            return;
                          }

                          setDialogState(() {
                            dialogLoading = true;
                          });

                          Map<String, dynamic> res;
                          if (isEditing && customerId.isNotEmpty && addressId.isNotEmpty) {
                            res = await AuthService.updateAddress(
                              customerId: customerId,
                              addressId: addressId,
                              addressLine1: addrLine,
                              ward: ward,
                              province: prov,
                              contactName: cName,
                              contactPhone: cPhone,
                              addressType: selectedType,
                              isDefault: isDefault,
                            );
                          } else {
                            res = await AuthService.addAddress(
                              addressLine1: addrLine,
                              ward: ward,
                              province: prov,
                              contactName: cName,
                              contactPhone: cPhone,
                              addressType: selectedType,
                              isDefault: isDefault,
                            );
                          }

                          if (context.mounted) {
                            Navigator.pop(context);
                            if (res['success'] == true) {
                              _loadProfileData();
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(res['message'] ?? (isEditing ? 'Cập nhật địa chỉ thành công!' : 'Thêm địa chỉ thành công!')),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(res['message'] ?? 'Có lỗi xảy ra'),
                                  backgroundColor: AppColors.logisticsRed,
                                ),
                              );
                            }
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.logisticsRed,
                    shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                  ),
                  child: dialogLoading
                      ? const SizedBox(
                          width: 20.0,
                          height: 20.0,
                          child: CircularProgressIndicator(color: AppColors.pureWhite, strokeWidth: 2.0),
                        )
                      : Text(isEditing ? 'Cập nhật' : 'Lưu', style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _confirmDeleteAddress(Map<String, dynamic> item) {
    final customerId = (item['customerId'] ?? '').toString();
    final addressId = (item['addressId'] ?? item['id'] ?? item['address']?['id'] ?? '').toString();

    if (customerId.isEmpty || addressId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không tìm thấy mã định danh địa chỉ để xóa')),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: AppColors.pureWhite,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedXl),
          title: Text(
            'Xác nhận xóa',
            style: AppTypography.headlineMd.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.deepOnyx,
            ),
          ),
          content: const Text(
            'Bạn có chắc chắn muốn xóa địa chỉ này khỏi sổ địa chỉ không?',
            style: TextStyle(fontSize: 14.0),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('Hủy', style: AppTypography.labelLg.copyWith(color: AppColors.secondary)),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(ctx);
                final res = await AuthService.deleteAddress(customerId: customerId, addressId: addressId);
                if (mounted) {
                  if (res['success'] == true) {
                    _loadProfileData();
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(res['message'] ?? 'Xóa địa chỉ thành công!'),
                        backgroundColor: Colors.green,
                      ),
                    );
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(res['message'] ?? 'Xóa địa chỉ thất bại'),
                        backgroundColor: AppColors.logisticsRed,
                      ),
                    );
                  }
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.logisticsRed,
                shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
              ),
              child: Text('Xóa', style: AppTypography.labelLg.copyWith(color: AppColors.pureWhite)),
            ),
          ],
        );
      },
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
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Profile Header
          const SizedBox(height: 12.0),
          Stack(
            alignment: Alignment.bottomRight,
            children: [
              Container(
                width: 110.0,
                height: 110.0,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.pureWhite, width: 4.0),
                  boxShadow: AppStyles.ambientShadow,
                  image: const DecorationImage(
                    image: NetworkImage(
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuCMVneF7Mp_WYnKxaqBM7A0LzI3B4l1jOX2gVlfAtTxApIyuAyQ2OHLEJRk4t807hb11XbZ3b4cey-A8rPySQyhi2216ZoxpGnEgVVIW1M04xkDTf9dGYwZb5DHU0QblWk_I0Cd0o2o2hzfypfFE4tM8Q_pwekHkh4gr-hsleBCO1JPkB6r8xWPDkDP2THhpbxinZH_KZlPxTcKINiYKHgQLHDx97XpmYVqlsK_9d3UveEaIzQo6sfj6w',
                    ),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              Positioned(
                bottom: 2.0,
                right: 2.0,
                child: Container(
                  padding: const EdgeInsets.all(6.0),
                  decoration: const BoxDecoration(
                    color: AppColors.logisticsRed,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.edit,
                    color: AppColors.pureWhite,
                    size: 14.0,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16.0),

          // Name and Member Tier Badge
          Text(
            _username,
            style: AppTypography.headlineLgMobile.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.deepOnyx,
            ),
          ),
          const SizedBox(height: 6.0),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 4.0),
            decoration: BoxDecoration(
              color: AppColors.primaryContainer.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20.0),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.star, color: AppColors.logisticsRed, size: 14.0),
                const SizedBox(width: 4.0),
                Text(
                  'Thành viên Velocity',
                  style: AppTypography.labelMd.copyWith(
                    color: AppColors.logisticsRed,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28.0),

          // Contact Details Card
          Container(
            padding: const EdgeInsets.all(16.0),
            decoration: BoxDecoration(
              color: AppColors.pureWhite,
              borderRadius: AppStyles.roundedXl,
              border: Border.all(color: AppColors.surfaceContainer),
              boxShadow: AppStyles.ambientShadow,
            ),
            child: Column(
              children: [
                _buildContactRow(Icons.phone, 'Số điện thoại', _phone),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12.0),
                  child: Divider(height: 1.0, color: AppColors.surfaceContainerHighest),
                ),
                _buildContactRow(Icons.mail, 'Email', _email),
              ],
            ),
          ),
          const SizedBox(height: 24.0),

          // Saved Addresses
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Sổ địa chỉ đã lưu (${_addresses.length})',
                style: AppTypography.headlineMd.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.deepOnyx,
                  fontSize: 18.0,
                ),
              ),
              InkWell(
                onTap: () => _showAddressDialog(),
                borderRadius: BorderRadius.circular(6.0),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
                  child: Row(
                    children: [
                      const Icon(Icons.add, size: 16.0, color: AppColors.logisticsRed),
                      const SizedBox(width: 4.0),
                      Text(
                        'Thêm mới',
                        style: AppTypography.labelMd.copyWith(
                          color: AppColors.logisticsRed,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12.0),
          _addresses.isNotEmpty
              ? Container(
                  decoration: BoxDecoration(
                    color: AppColors.pureWhite,
                    borderRadius: AppStyles.roundedXl,
                    border: Border.all(color: AppColors.surfaceContainer),
                    boxShadow: AppStyles.ambientShadow,
                  ),
                  child: ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _addresses.length,
                    separatorBuilder: (context, index) => const Divider(height: 1.0, color: AppColors.surfaceContainer),
                    itemBuilder: (context, index) {
                      final item = _addresses[index];
                      return _buildAddressRow(item);
                    },
                  ),
                )
              : Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 24.0),
                  decoration: BoxDecoration(
                    color: AppColors.pureWhite,
                    borderRadius: AppStyles.roundedXl,
                    border: Border.all(color: AppColors.surfaceContainer),
                    boxShadow: AppStyles.ambientShadow,
                  ),
                  child: Column(
                    children: [
                      Icon(
                        Icons.map_outlined,
                        size: 48.0,
                        color: AppColors.secondary.withValues(alpha: 0.3),
                      ),
                      const SizedBox(height: 12.0),
                      Text(
                        'Chưa có địa chỉ lưu trữ',
                        style: AppTypography.headlineMd.copyWith(
                          color: AppColors.deepOnyx,
                          fontWeight: FontWeight.bold,
                          fontSize: 15.0,
                        ),
                      ),
                      const SizedBox(height: 6.0),
                      Text(
                        'Thêm địa chỉ nhà riêng hoặc văn phòng để đặt giao nhận hàng nhanh chóng hơn.',
                        style: AppTypography.bodyMd.copyWith(
                          color: AppColors.secondary,
                          fontSize: 13.0,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16.0),
                      SizedBox(
                        height: 36.0,
                        child: OutlinedButton.icon(
                          onPressed: () {
                            _showAddressDialog();
                          },
                          icon: const Icon(Icons.add, size: 16.0, color: AppColors.logisticsRed),
                          label: Text(
                            'Thêm địa chỉ mới',
                            style: AppTypography.labelMd.copyWith(
                              color: AppColors.logisticsRed,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.logisticsRed, width: 1.2),
                            shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
                            padding: const EdgeInsets.symmetric(horizontal: 16.0),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
          const SizedBox(height: 28.0),

          // Action Buttons
          SizedBox(
            width: double.infinity,
            height: 48.0,
            child: OutlinedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.lock_reset, size: 18.0),
              label: const Text('Đổi mật khẩu'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.deepOnyx,
                side: const BorderSide(color: AppColors.deepOnyx, width: 1.5),
                shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
              ),
            ),
          ),
          const SizedBox(height: 12.0),
          SizedBox(
            width: double.infinity,
            height: 48.0,
            child: ElevatedButton.icon(
              onPressed: () async {
                await AuthService.clearAuthData();
                if (context.mounted) {
                  Navigator.of(context).pushReplacementNamed('/');
                }
              },
              icon: const Icon(Icons.logout, size: 18.0),
              label: const Text('Đăng xuất'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                foregroundColor: AppColors.logisticsRed,
                shadowColor: Colors.transparent,
                side: const BorderSide(color: AppColors.logisticsRed, width: 1.5),
                shape: RoundedRectangleBorder(borderRadius: AppStyles.roundedLg),
              ),
            ),
          ),
          const SizedBox(height: 40.0),

          // Version Footer
          Text(
            'Phiên bản 4.2.0 (Build 99283)',
            style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
          ),
          const SizedBox(height: 4.0),
          Text(
            '© 2024 Velocity Logistics. Bảo lưu mọi quyền.',
            style: AppTypography.labelMd.copyWith(color: AppColors.secondary, fontSize: 10.0),
          ),
          const SizedBox(height: 20.0),
        ],
      ),
    );
  }

  Widget _buildContactRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Container(
          width: 40.0,
          height: 40.0,
          decoration: const BoxDecoration(
            color: AppColors.surfaceContainerLow,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: AppColors.logisticsRed, size: 20.0),
        ),
        const SizedBox(width: 14.0),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: AppTypography.labelMd.copyWith(color: AppColors.secondary),
            ),
            const SizedBox(height: 2.0),
            Text(
              value,
              style: AppTypography.bodyMd.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.deepOnyx,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildAddressRow(Map<String, dynamic> item) {
    final addrObj = item['address'] is Map ? item['address'] as Map<String, dynamic> : item;
    final isDefault = item['isDefault'] == true;
    final addrType = item['addressType'] ?? 'HOME';
    final contactName = item['contactName'] ?? addrObj['contactName'] ?? '';
    final contactPhone = item['contactPhone'] ?? addrObj['contactPhone'] ?? '';

    final wardStr = addrObj['wardRelation']?['fullName'] ?? addrObj['wardRelation']?['name'] ?? addrObj['wardName'] ?? addrObj['ward'] ?? '';
    final provStr = addrObj['wardRelation']?['province']?['fullName'] ?? addrObj['wardRelation']?['province']?['name'] ?? addrObj['provinceName'] ?? addrObj['province'] ?? '';
    final line1 = addrObj['addressLine1'] ?? '';
    final fullAddress = [line1, wardStr, provStr].where((s) => s.toString().trim().isNotEmpty).join(', ');

    return InkWell(
      onTap: () => _showAddressDialog(editItem: item),
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8.0),
              decoration: BoxDecoration(
                color: isDefault ? AppColors.logisticsRed.withValues(alpha: 0.1) : AppColors.surfaceContainerLow,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.location_on,
                color: isDefault ? AppColors.logisticsRed : AppColors.secondary,
                size: 18.0,
              ),
            ),
            const SizedBox(width: 12.0),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (isDefault)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 2.0),
                          margin: const EdgeInsets.only(right: 6.0),
                          decoration: BoxDecoration(
                            color: AppColors.logisticsRed,
                            borderRadius: BorderRadius.circular(4.0),
                          ),
                          child: const Text(
                            'Mặc định',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 9.0,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 2.0),
                        margin: const EdgeInsets.only(right: 6.0),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainerLow,
                          borderRadius: BorderRadius.circular(4.0),
                          border: Border.all(color: AppColors.surfaceContainerHigh),
                        ),
                        child: Text(
                          addrType == 'HOME' ? 'Nhà riêng' : 'Văn phòng / Kho',
                          style: const TextStyle(
                            color: AppColors.secondary,
                            fontSize: 9.0,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      if (contactName.toString().isNotEmpty)
                        Expanded(
                          child: Text(
                            contactName,
                            style: AppTypography.labelLg.copyWith(
                              color: AppColors.deepOnyx,
                              fontWeight: FontWeight.bold,
                              fontSize: 12.0,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6.0),
                  Text(
                    fullAddress.isNotEmpty ? fullAddress : 'Chưa có địa chỉ chi tiết',
                    style: AppTypography.bodyMd.copyWith(
                      color: AppColors.deepOnyx,
                      fontSize: 12.5,
                      height: 1.3,
                    ),
                  ),
                  if (contactPhone.toString().isNotEmpty) ...[
                    const SizedBox(height: 4.0),
                    Text(
                      'SĐT: $contactPhone',
                      style: AppTypography.labelMd.copyWith(color: AppColors.secondary, fontSize: 11.0),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 4.0),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  onPressed: () => _showAddressDialog(editItem: item),
                  icon: const Icon(Icons.edit_outlined, size: 18.0, color: AppColors.secondary),
                  tooltip: 'Chỉnh sửa',
                  padding: const EdgeInsets.all(6.0),
                  constraints: const BoxConstraints(),
                ),
                IconButton(
                  onPressed: () => _confirmDeleteAddress(item),
                  icon: const Icon(Icons.delete_outline, size: 18.0, color: AppColors.logisticsRed),
                  tooltip: 'Xóa',
                  padding: const EdgeInsets.all(6.0),
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
