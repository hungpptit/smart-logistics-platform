import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'screens/auth/welcome_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/customer/customer_dashboard.dart';
import 'screens/driver/driver_dashboard.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Velocity Logistics',
      theme: AppTheme.lightTheme,
      initialRoute: '/',
      routes: {
        '/': (context) => const WelcomeScreen(),
        '/login': (context) => const LoginScreen(),
        '/register': (context) => const RegisterScreen(),
        '/customer/dashboard': (context) => const CustomerDashboard(),
        '/driver/dashboard': (context) => const DriverDashboard(),
      },
      debugShowCheckedModeBanner: false,
    );
  }
}
