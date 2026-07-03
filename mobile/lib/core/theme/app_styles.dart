import 'package:flutter/material.dart';

class AppStyles {
  // Border Radius Constants
  static BorderRadius roundedSm = BorderRadius.circular(2.0); // 0.125rem (2px)
  static BorderRadius roundedDefault = BorderRadius.circular(4.0); // 0.25rem (4px)
  static BorderRadius roundedMd = BorderRadius.circular(6.0); // 0.375rem (6px)
  static BorderRadius roundedLg = BorderRadius.circular(8.0); // 0.5rem (8px)
  static BorderRadius roundedXl = BorderRadius.circular(12.0); // 0.75rem (12px)
  static BorderRadius roundedFull = BorderRadius.circular(9999.0);

  // Spacing & Margin Constants
  static const double baseSpacing = 8.0;
  static const double gutterMobile = 16.0;
  static const double marginMobile = 20.0;
  
  // Custom Box Shadows (extremely soft deep-onyx at 5-8% opacity)
  static List<BoxShadow> softShadow = [
    BoxShadow(
      color: const Color(0xFF161D25).withOpacity(0.06),
      blurRadius: 16.0,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> ambientShadow = [
    BoxShadow(
      color: const Color(0xFF161D25).withOpacity(0.04),
      blurRadius: 8.0,
      offset: const Offset(0, 2),
    ),
  ];
}
