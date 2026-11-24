/// Utility function to format [DateTime] to "HH:mm"
String formatHHmm(DateTime time) {
  return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
}
