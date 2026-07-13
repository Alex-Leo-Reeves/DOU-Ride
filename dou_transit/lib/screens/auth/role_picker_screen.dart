import 'package:flutter/material.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/routes.dart';

/// Picker screen for Admin / Security / Vendor roles.
/// These roles can't self-register — they log in with accounts created in Supabase.
class RolePickerScreen extends StatelessWidget {
  const RolePickerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DouTheme.white,
      appBar: AppBar(title: const Text('Staff Access')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const Spacer(),
              const Icon(Icons.admin_panel_settings, size: 64, color: DouTheme.black),
              const SizedBox(height: 16),
              const Text(
                'Staff & Admin Portal',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Select your role to sign in',
                style: TextStyle(fontSize: 15, color: DouTheme.grey),
              ),
              const Spacer(),

              // Admin
              _RoleOptionCard(
                icon: Icons.admin_panel_settings,
                title: 'Student Affairs (Admin)',
                subtitle: 'Dashboard, student & driver management',
                onTap: () => Navigator.pushNamed(context, AppRoutes.staffLogin),
              ),
              const SizedBox(height: 12),

              // Security
              _RoleOptionCard(
                icon: Icons.security,
                title: 'Security Gate',
                subtitle: 'QR scanner, student search, reports',
                onTap: () => Navigator.pushNamed(context, AppRoutes.guardLogin),
              ),
              const SizedBox(height: 12),

              // Vendor
              _RoleOptionCard(
                icon: Icons.store,
                title: 'Vendor',
                subtitle: 'Manage products and fulfill orders',
                onTap: () => Navigator.pushNamed(context, AppRoutes.login),
              ),

              const Spacer(),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Back', style: TextStyle(color: DouTheme.grey)),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleOptionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _RoleOptionCard({
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
          padding: const EdgeInsets.all(20),
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
                width: 48, height: 48,
                decoration: BoxDecoration(
                  color: DouTheme.black,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: DouTheme.white, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.bold, color: DouTheme.black,
                    )),
                    const SizedBox(height: 2),
                    Text(subtitle, style: const TextStyle(fontSize: 13, color: DouTheme.grey)),
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
