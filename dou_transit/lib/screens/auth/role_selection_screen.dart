import 'dart:async';
import 'package:flutter/material.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/routes.dart';

class RoleSelectionScreen extends StatefulWidget {
  const RoleSelectionScreen({super.key});

  @override
  State<RoleSelectionScreen> createState() => _RoleSelectionScreenState();
}

class _RoleSelectionScreenState extends State<RoleSelectionScreen> {
  Timer? _longPressTimer;
  bool _isHolding = false;
  double _holdProgress = 0;

  void _startHold() {
    _isHolding = true;
    _holdProgress = 0;
    _longPressTimer = Timer.periodic(const Duration(milliseconds: 50), (timer) {
      setState(() {
        _holdProgress += 0.01; // 50ms * 100 = 5 seconds
      });
      if (_holdProgress >= 1.0) {
        timer.cancel();
        _isHolding = false;
        _holdProgress = 0;
        Navigator.pushNamed(context, AppRoutes.developerLogin);
      }
    });
  }

  void _cancelHold() {
    _longPressTimer?.cancel();
    setState(() {
      _isHolding = false;
      _holdProgress = 0;
    });
  }

  @override
  void dispose() {
    _longPressTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DouTheme.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const Spacer(flex: 2),
              // Logo with 5-second hold to access developer console
              GestureDetector(
                onLongPressStart: (_) => _startHold(),
                onLongPressEnd: (_) => _cancelHold(),
                onLongPressCancel: _cancelHold,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        color: DouTheme.black,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: DouTheme.black, width: 2),
                      ),
                      child: const Center(
                        child: Text('DOU', style: TextStyle(
                          color: DouTheme.white, fontSize: 24, fontWeight: FontWeight.bold,
                        )),
                      ),
                    ),
                    if (_isHolding)
                      SizedBox(
                        width: 100,
                        height: 100,
                        child: CircularProgressIndicator(
                          value: _holdProgress,
                          strokeWidth: 3,
                          backgroundColor: DouTheme.white.withAlpha(100),
                          valueColor: const AlwaysStoppedAnimation<Color>(DouTheme.white),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Hold 5s for developer',
                style: TextStyle(fontSize: 11, color: DouTheme.lightGrey),
              ),
              const SizedBox(height: 16),
              const Text("Welcome to DOU Transit", style: TextStyle(
                fontSize: 28, fontWeight: FontWeight.bold, color: DouTheme.black,
              )),
              const SizedBox(height: 8),
              const Text(
                'Campus transport made easy',
                style: TextStyle(fontSize: 16, color: DouTheme.grey),
              ),
              const Spacer(flex: 2),

              // Student card
              _RoleCard(
                icon: Icons.school,
                title: 'I am a Student',
                subtitle: 'Request rides, join queues, and pay',
                onTap: () => Navigator.pushNamed(context, AppRoutes.studentRegister),
              ),
              const SizedBox(height: 16),

              // Driver card
              _RoleCard(
                icon: Icons.local_taxi,
                title: 'I am a Driver',
                subtitle: 'Accept rides, earn and manage trips',
                onTap: () => Navigator.pushNamed(context, AppRoutes.driverRegister),
              ),
              const Spacer(flex: 2),

              // Admin / Security / Vendor link → role picker
              TextButton(
                onPressed: () => Navigator.pushNamed(context, AppRoutes.rolePicker),
                child: const Text(
                  'Admin? Security? Vendor? Tap here',
                  style: TextStyle(
                    fontSize: 14, color: DouTheme.grey, decoration: TextDecoration.underline,
                  ),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _RoleCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: DouTheme.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: DouTheme.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: DouTheme.black, width: 2),
              boxShadow: [
                  BoxShadow(color: DouTheme.black.withAlpha(40), offset: const Offset(4, 4), blurRadius: 0),
                ],
          ),
          child: Row(
            children: [
              Container(
                width: 56, height: 56,
                decoration: BoxDecoration(
                  color: DouTheme.black,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: DouTheme.white, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.bold, color: DouTheme.black,
                    )),
                    const SizedBox(height: 4),
                    Text(subtitle, style: const TextStyle(
                      fontSize: 14, color: DouTheme.grey,
                    )),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: DouTheme.black),
            ],
          ),
        ),
      ),
    );
  }
}
