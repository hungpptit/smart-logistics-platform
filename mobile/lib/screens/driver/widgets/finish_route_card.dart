import 'package:flutter/material.dart';
import '../../../core/theme/app_styles.dart';

class FinishRouteCard extends StatelessWidget {
  final bool isDutyLoading;
  final VoidCallback onFinish;

  const FinishRouteCard({
    super.key,
    required this.isDutyLoading,
    required this.onFinish,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16.0),
          decoration: BoxDecoration(
            color: const Color(0xFFDCFCE7),
            borderRadius: BorderRadius.circular(16.0),
            border: Border.all(color: const Color(0xFF166534), width: 1.5),
            boxShadow: AppStyles.softShadow,
          ),
          child: Column(
            children: [
              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.stars, color: Color(0xFF166534), size: 24),
                  SizedBox(width: 8),
                  Text(
                    'HOAN THANH 100% CAC DIEM DUNG',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF166534),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'Ban da hoan thanh tat ca don hang trong chuyen nay. Bam nut ben duoi de chot ca & giai phong tai xe nhan don tiep theo!',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, color: Color(0xFF15803D)),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  onPressed: isDutyLoading ? null : onFinish,
                  icon: const Icon(Icons.check_circle_outline, size: 20),
                  label: const Text(
                    'CHOT HOAN THANH CHUYEN DI',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 13,
                      letterSpacing: 0.5,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF166534),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16.0),
      ],
    );
  }
}
