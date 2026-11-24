import 'dart:io';
import 'package:flutter/material.dart';

class AttachedImageBar extends StatelessWidget {
  final File imageFile;
  final VoidCallback onClear;

  const AttachedImageBar({
    super.key,
    required this.imageFile,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 6.0),
      color: Colors.grey.shade100,
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8.0),
            child: Image.file(imageFile, width: 44.0, height: 44.0, fit: BoxFit.cover),
          ),
          const SizedBox(width: 10.0),
          const Expanded(
            child: Text(
              'Đã đính kèm ảnh sự cố',
              style: TextStyle(fontSize: 12.0, fontWeight: FontWeight.w500),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 18.0, color: Colors.grey),
            onPressed: onClear,
          ),
        ],
      ),
    );
  }
}
