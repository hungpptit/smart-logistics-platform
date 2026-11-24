/// Utility class to format markdown text for driver chat display
class ChatMarkdownFormatter {
  static String format(String rawText) {
    if (rawText.isEmpty) return rawText;

    String text = rawText;

    // 1. Chuẩn hóa: Nếu dòng đã có gạch đầu dòng (- hoặc *) trước Bước X thì chuẩn hóa để không bị đúp bullet
    text = text.replaceAllMapped(
      RegExp(r'(?:^|\n)\s*[-*]\s*(\*{0,2}(Bước\s*\d+:?|Lưu ý:?)\*{0,2})', caseSensitive: false),
      (m) => '\n\n- ${m[1]}',
    );

    // 2. Nếu "Bước X:" dính liền trong câu mà chưa có gạch đầu dòng: Tách thành mục danh sách
    text = text.replaceAllMapped(
      RegExp(r'([^\n-*])\s*(\*{0,2}(Bước\s*\d+:?|Lưu ý:?)\*{0,2})', caseSensitive: false),
      (m) => '${m[1]}\n\n- ${m[2]}',
    );

    // 3. Xóa các gạch đầu dòng mồ côi (dòng chỉ có dấu - hoặc *)
    text = text.replaceAll(RegExp(r'^\s*[-*]\s*$', multiLine: true), '');

    // 4. Chuyển các dấu xuống dòng đơn lẻ thành \n\n để Markdown ngắt dòng đẹp mắt
    text = text.replaceAll(RegExp(r'(?<!\n)\n(?!\n)'), '\n\n');

    return text.trim();
  }
}
