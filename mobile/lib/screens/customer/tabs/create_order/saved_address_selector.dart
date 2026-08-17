import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/app_styles.dart';
import '../../../../services/auth_service.dart';

/// Widget chọn nhanh địa chỉ người gửi đã lưu cho khách hàng (Shopee style)
class SavedAddressSelector extends StatelessWidget {
  final List<Map<String, dynamic>> savedAddresses;
  final String? selectedAddressId;
  final bool isLoading;
  final ValueChanged<Map<String, dynamic>> onSelectAddress;
  final VoidCallback onSelectManual;
  final VoidCallback onRefreshAddresses;

  const SavedAddressSelector({
    super.key,
    required this.savedAddresses,
    required this.selectedAddressId,
    required this.isLoading,
    required this.onSelectAddress,
    required this.onSelectManual,
    required this.onRefreshAddresses,
  });

  void _showAddAddressDialog(BuildContext context) {
    final addressLineController = TextEditingController();
    final wardController = TextEditingController();
    final provinceController = TextEditingController();
    String selectedType = 'HOME';
    bool isDefault = false;
    bool dialogLoading = false;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogCtx, setDialogState) {
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
                    child: const Icon(Icons.add_location_alt, color: AppColors.logisticsRed, size: 20.0),
                  ),
                  const SizedBox(width: 8.0),
                  Text(
                    'Thêm địa chỉ mới',
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
                  onPressed: dialogLoading ? null : () => Navigator.pop(ctx),
                  child: Text('Hủy', style: AppTypography.labelLg.copyWith(color: AppColors.secondary)),
                ),
                ElevatedButton(
                  onPressed: dialogLoading
                      ? null
                      : () async {
                          final addrLine = addressLineController.text.trim();
                          final ward = wardController.text.trim();
                          final prov = provinceController.text.trim();

                          if (addrLine.isEmpty || ward.isEmpty || prov.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Vui lòng điền đầy đủ các thông tin địa chỉ')),
                            );
                            return;
                          }

                          setDialogState(() {
                            dialogLoading = true;
                          });

                          final res = await AuthService.addAddress(
                            addressLine1: addrLine,
                            ward: ward,
                            province: prov,
                            addressType: selectedType,
                            isDefault: isDefault,
                          );

                          if (context.mounted) {
                            Navigator.pop(ctx);
                            if (res['success'] == true) {
                              onRefreshAddresses();
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(res['message'] ?? 'Thêm địa chỉ thành công!'),
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
                          width: 18.0,
                          height: 18.0,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text('Lưu địa chỉ', style: AppTypography.button.copyWith(color: AppColors.pureWhite)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return Container(
        padding: const EdgeInsets.all(12.0),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF2F2),
          borderRadius: BorderRadius.circular(12.0),
          border: Border.all(color: const Color(0xFFFEE2E2)),
        ),
        child: const Row(
          children: [
            SizedBox(
              width: 16.0,
              height: 16.0,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.logisticsRed),
            ),
            SizedBox(width: 10.0),
            Text(
              'Đang tải sổ địa chỉ đã lưu...',
              style: TextStyle(fontSize: 12.0, color: AppColors.logisticsRed, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(12.0),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: const Color(0xFFFEE2E2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.bookmark_outline, size: 16.0, color: AppColors.logisticsRed),
                  const SizedBox(width: 6.0),
                  Text(
                    savedAddresses.isEmpty
                        ? 'SỔ ĐỊA CHỈ NGƯỜI GỬI'
                        : 'CHỌN ĐỊA CHỈ LẤY HÀNG ĐÃ LƯU (${savedAddresses.length})',
                    style: AppTypography.labelMd.copyWith(
                      color: AppColors.logisticsRed,
                      fontWeight: FontWeight.bold,
                      fontSize: 11.0,
                      letterSpacing: 0.3,
                    ),
                  ),
                ],
              ),
              InkWell(
                onTap: () => _showAddAddressDialog(context),
                borderRadius: BorderRadius.circular(6.0),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 2.0),
                  child: Row(
                    children: [
                      const Icon(Icons.add, size: 14.0, color: AppColors.logisticsRed),
                      const SizedBox(width: 2.0),
                      Text(
                        'Thêm mới',
                        style: AppTypography.labelMd.copyWith(
                          color: AppColors.logisticsRed,
                          fontWeight: FontWeight.bold,
                          fontSize: 11.0,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          if (selectedAddressId != null && selectedAddressId!.isNotEmpty) ...[
            const SizedBox(height: 2.0),
            const Text(
              '(Đã chọn & có thể chỉnh sửa tùy ý bên dưới)',
              style: TextStyle(fontSize: 10.0, color: Colors.grey, fontStyle: FontStyle.italic),
            ),
          ],

          const SizedBox(height: 10.0),

          // Horizontal list of saved addresses cards
          if (savedAddresses.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14.0, horizontal: 12.0),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8.0),
                border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, size: 18.0, color: Colors.grey.shade500),
                  const SizedBox(width: 8.0),
                  Expanded(
                    child: Text(
                      'Bạn chưa có địa chỉ lưu sẵn. Nhập thông tin bên dưới hoặc bấm "+ Thêm mới".',
                      style: TextStyle(fontSize: 11.0, color: Colors.grey.shade600),
                    ),
                  ),
                ],
              ),
            )
          else
            SizedBox(
              height: 110.0,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                itemCount: savedAddresses.length + 1, // +1 for "Manual input" card
                separatorBuilder: (context, index) => const SizedBox(width: 8.0),
                itemBuilder: (ctx, index) {
                  // Last card is "Manual Input" option
                  if (index == savedAddresses.length) {
                    final bool isManualSelected = selectedAddressId == null;
                    return InkWell(
                      onTap: onSelectManual,
                      borderRadius: BorderRadius.circular(10.0),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: 140.0,
                        padding: const EdgeInsets.all(10.0),
                        decoration: BoxDecoration(
                          color: isManualSelected ? Colors.white : Colors.white.withValues(alpha: 0.7),
                          borderRadius: BorderRadius.circular(10.0),
                          border: Border.all(
                            color: isManualSelected ? AppColors.logisticsRed : Colors.grey.shade300,
                            width: isManualSelected ? 1.8 : 1.0,
                          ),
                          boxShadow: isManualSelected
                              ? [BoxShadow(color: AppColors.logisticsRed.withValues(alpha: 0.12), blurRadius: 4, offset: const Offset(0, 2))]
                              : null,
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.edit_note,
                              size: 24.0,
                              color: isManualSelected ? AppColors.logisticsRed : Colors.grey.shade600,
                            ),
                            const SizedBox(height: 6.0),
                            Text(
                              'Nhập địa chỉ khác',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 11.0,
                                fontWeight: FontWeight.bold,
                                color: isManualSelected ? AppColors.logisticsRed : Colors.grey.shade700,
                              ),
                            ),
                            Text(
                              'Gõ tay tự do',
                              style: TextStyle(fontSize: 9.0, color: Colors.grey.shade500),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  final item = savedAddresses[index];
                  final itemId = (item['addressId'] ?? item['id'] ?? item['address']?['id'])?.toString() ?? '';
                  final isSelected = selectedAddressId != null && selectedAddressId == itemId;

                  final addrObj = item['address'] is Map ? item['address'] as Map<String, dynamic> : item;
                  final isDefault = item['isDefault'] == true;
                  final addrType = item['addressType'] ?? 'HOME';
                  final contactName = item['contactName'] ?? addrObj['contactName'] ?? 'Địa chỉ';
                  final contactPhone = item['contactPhone'] ?? addrObj['contactPhone'] ?? '';

                  final wardStr = addrObj['wardRelation']?['fullName'] ?? addrObj['wardRelation']?['name'] ?? addrObj['wardName'] ?? addrObj['ward'] ?? '';
                  final provStr = addrObj['wardRelation']?['province']?['fullName'] ?? addrObj['wardRelation']?['province']?['name'] ?? addrObj['provinceName'] ?? addrObj['province'] ?? '';
                  final line1 = addrObj['addressLine1'] ?? '';
                  final fullAddress = [line1, wardStr, provStr].where((s) => s.toString().trim().isNotEmpty).join(', ');

                  return InkWell(
                    onTap: () => onSelectAddress(item),
                    borderRadius: BorderRadius.circular(10.0),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 220.0,
                      padding: const EdgeInsets.all(10.0),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10.0),
                        border: Border.all(
                          color: isSelected ? AppColors.logisticsRed : Colors.grey.shade300,
                          width: isSelected ? 1.8 : 1.0,
                        ),
                        boxShadow: isSelected
                            ? [BoxShadow(color: AppColors.logisticsRed.withValues(alpha: 0.15), blurRadius: 6, offset: const Offset(0, 2))]
                            : [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 2, offset: const Offset(0, 1))],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          // Top row: Check radio + Badge + Name
                          Row(
                            children: [
                              Container(
                                width: 16.0,
                                height: 16.0,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isSelected ? AppColors.logisticsRed : Colors.transparent,
                                  border: Border.all(
                                    color: isSelected ? AppColors.logisticsRed : Colors.grey.shade400,
                                    width: 1.5,
                                  ),
                                ),
                                child: isSelected
                                    ? const Icon(Icons.check, size: 11.0, color: Colors.white)
                                    : null,
                              ),
                              const SizedBox(width: 6.0),
                              if (isDefault)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5.0, vertical: 1.5),
                                  margin: const EdgeInsets.only(right: 4.0),
                                  decoration: BoxDecoration(
                                    color: AppColors.logisticsRed,
                                    borderRadius: BorderRadius.circular(4.0),
                                  ),
                                  child: const Text(
                                    'Mặc định',
                                    style: TextStyle(color: Colors.white, fontSize: 9.0, fontWeight: FontWeight.bold),
                                  ),
                                )
                              else
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5.0, vertical: 1.5),
                                  margin: const EdgeInsets.only(right: 4.0),
                                  decoration: BoxDecoration(
                                    color: Colors.grey.shade100,
                                    borderRadius: BorderRadius.circular(4.0),
                                    border: Border.all(color: Colors.grey.shade300),
                                  ),
                                  child: Text(
                                    addrType == 'HOME' ? 'Nhà riêng' : 'Văn phòng',
                                    style: TextStyle(color: Colors.grey.shade700, fontSize: 9.0, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              Expanded(
                                child: Text(
                                  contactName,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11.0, color: AppColors.deepOnyx),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),

                          // Middle: Full address
                          Text(
                            fullAddress.isNotEmpty ? fullAddress : 'Chưa có địa chỉ chi tiết',
                            style: TextStyle(fontSize: 10.0, color: Colors.grey.shade600, height: 1.2),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),

                          // Bottom: Phone number
                          if (contactPhone.toString().isNotEmpty)
                            Text(
                              'SĐT: $contactPhone',
                              style: TextStyle(fontSize: 9.5, color: Colors.grey.shade500, fontWeight: FontWeight.w500),
                              overflow: TextOverflow.ellipsis,
                            )
                          else
                            const SizedBox.shrink(),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
