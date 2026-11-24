import 'package:flutter/material.dart';

/// Helper utility for consistent floating SnackBars across the app
class AppSnackBar {
  static void show(
    BuildContext context, {
    required Widget content,
    Color? backgroundColor,
    SnackBarBehavior behavior = SnackBarBehavior.floating,
    Duration duration = const Duration(seconds: 3),
    EdgeInsetsGeometry margin = const EdgeInsets.all(16.0),
    ShapeBorder? shape = const RoundedRectangleBorder(
      borderRadius: BorderRadius.all(Radius.circular(10.0)),
    ),
    SnackBarAction? action,
    bool clearPrevious = true,
    bool immediateClear = false,
  }) {
    final messenger = ScaffoldMessenger.of(context);
    if (clearPrevious) {
      if (immediateClear) {
        messenger.clearSnackBars();
      } else {
        messenger.hideCurrentSnackBar();
      }
    }
    messenger.showSnackBar(
      SnackBar(
        content: content,
        backgroundColor: backgroundColor,
        behavior: behavior,
        duration: duration,
        margin: margin,
        shape: shape,
        action: action,
      ),
    );
  }
}
