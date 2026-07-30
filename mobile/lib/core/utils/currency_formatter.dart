/// Helper utility to format currency consistently across Mobile App (VNĐ)
String formatCurrency(num? amount) {
  if (amount == null) return '0 đ';
  final int value = amount.round();
  final String str = value.toString();
  final RegExp reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
  final String result = str.replaceAllMapped(reg, (Match m) => '${m[1]}.');
  return '$result đ';
}
