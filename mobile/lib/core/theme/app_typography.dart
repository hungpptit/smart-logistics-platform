import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTypography {
  static TextStyle displayLg = GoogleFonts.montserrat(
    fontSize: 48.0,
    fontWeight: FontWeight.w700,
    height: 56.0 / 48.0,
    letterSpacing: -0.02 * 48.0,
  );

  static TextStyle headlineLg = GoogleFonts.montserrat(
    fontSize: 32.0,
    fontWeight: FontWeight.w700,
    height: 40.0 / 32.0,
  );

  static TextStyle headlineLgMobile = GoogleFonts.montserrat(
    fontSize: 24.0,
    fontWeight: FontWeight.w700,
    height: 32.0 / 24.0,
  );

  static TextStyle headlineMd = GoogleFonts.montserrat(
    fontSize: 24.0,
    fontWeight: FontWeight.w600,
    height: 32.0 / 24.0,
  );

  static TextStyle bodyLg = GoogleFonts.montserrat(
    fontSize: 18.0,
    fontWeight: FontWeight.w400,
    height: 28.0 / 18.0,
  );

  static TextStyle bodyMd = GoogleFonts.montserrat(
    fontSize: 16.0,
    fontWeight: FontWeight.w400,
    height: 24.0 / 16.0,
  );

  static TextStyle labelLg = GoogleFonts.montserrat(
    fontSize: 14.0,
    fontWeight: FontWeight.w600,
    height: 20.0 / 14.0,
    letterSpacing: 0.01 * 14.0,
  );

  static TextStyle labelMd = GoogleFonts.montserrat(
    fontSize: 12.0,
    fontWeight: FontWeight.w500,
    height: 16.0 / 12.0,
  );

  static TextStyle button = GoogleFonts.montserrat(
    fontSize: 14.0,
    fontWeight: FontWeight.w700,
    height: 20.0 / 14.0,
  );
}
