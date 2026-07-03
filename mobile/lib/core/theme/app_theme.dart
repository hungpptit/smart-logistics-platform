import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_typography.dart';
import 'app_styles.dart';

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      primaryColor: AppColors.logisticsRed,
      scaffoldBackgroundColor: AppColors.cloudGray,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        onPrimary: AppColors.onPrimary,
        primaryContainer: AppColors.primaryContainer,
        onPrimaryContainer: AppColors.onPrimaryContainer,
        secondary: AppColors.secondary,
        onSecondary: AppColors.onSecondary,
        secondaryContainer: AppColors.secondaryContainer,
        onSecondaryContainer: AppColors.onSecondaryContainer,
        tertiary: AppColors.tertiary,
        onTertiary: AppColors.onTertiary,
        tertiaryContainer: AppColors.tertiaryContainer,
        onTertiaryContainer: AppColors.onTertiaryContainer,
        error: AppColors.error,
        onError: AppColors.onError,
        errorContainer: AppColors.errorContainer,
        onErrorContainer: AppColors.onErrorContainer,
        background: AppColors.background,
        onBackground: AppColors.onBackground,
        surface: AppColors.surface,
        onSurface: AppColors.onSurface,
        surfaceVariant: AppColors.surfaceVariant,
        outline: AppColors.outline,
        outlineVariant: AppColors.outlineVariant,
      ),
      
      // Typography mapping to material text theme
      textTheme: TextTheme(
        displayLarge: AppTypography.displayLg,
        headlineLarge: AppTypography.headlineLg,
        headlineMedium: AppTypography.headlineMd,
        bodyLarge: AppTypography.bodyLg,
        bodyMedium: AppTypography.bodyMd,
        labelLarge: AppTypography.labelLg,
        labelMedium: AppTypography.labelMd,
      ),
      
      // Elevated Button Theme (Solid logistics-red, uppercase bold text, rounded default border)
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.logisticsRed,
          foregroundColor: AppColors.pureWhite,
          elevation: 2,
          padding: const EdgeInsets.symmetric(
            horizontal: AppStyles.gutterMobile,
            vertical: AppStyles.baseSpacing * 1.5,
          ),
          textStyle: AppTypography.button,
          shape: RoundedRectangleBorder(
            borderRadius: AppStyles.roundedDefault,
          ),
        ),
      ),

      // Outlined Button Theme (Deep onyx outline and text)
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.deepOnyx,
          side: const BorderSide(color: AppColors.deepOnyx, width: 1.0),
          padding: const EdgeInsets.symmetric(
            horizontal: AppStyles.gutterMobile,
            vertical: AppStyles.baseSpacing * 1.5,
          ),
          textStyle: AppTypography.button,
          shape: RoundedRectangleBorder(
            borderRadius: AppStyles.roundedDefault,
          ),
        ),
      ),

      // Input Field Theme (Oversized with 1px border, 2px red border on focus)
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.pureWhite,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppStyles.gutterMobile,
          vertical: AppStyles.baseSpacing * 2.0,
        ),
        hintStyle: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
        labelStyle: AppTypography.labelLg.copyWith(color: AppColors.deepOnyx),
        border: OutlineInputBorder(
          borderRadius: AppStyles.roundedDefault,
          borderSide: const BorderSide(color: AppColors.surfaceContainerHighest, width: 1.0),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppStyles.roundedDefault,
          borderSide: const BorderSide(color: AppColors.surfaceContainerHighest, width: 1.0),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppStyles.roundedDefault,
          borderSide: const BorderSide(color: AppColors.logisticsRed, width: 2.0),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppStyles.roundedDefault,
          borderSide: const BorderSide(color: AppColors.error, width: 1.0),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: AppStyles.roundedDefault,
          borderSide: const BorderSide(color: AppColors.error, width: 2.0),
        ),
      ),
    );
  }
}
