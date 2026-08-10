import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class PulsingScanLine extends StatefulWidget {
  const PulsingScanLine({super.key});

  @override
  State<PulsingScanLine> createState() => _PulsingScanLineState();
}

class _PulsingScanLineState extends State<PulsingScanLine>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 40.0, end: 240.0).animate(_controller);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Positioned(
          top: _animation.value,
          left: 40.0,
          right: 40.0,
          child: Container(
            height: 2.0,
            decoration: BoxDecoration(
              color: AppColors.logisticsRed,
              boxShadow: [
                BoxShadow(
                  color: AppColors.logisticsRed.withValues(alpha: 0.5),
                  blurRadius: 4.0,
                  spreadRadius: 2.0,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
