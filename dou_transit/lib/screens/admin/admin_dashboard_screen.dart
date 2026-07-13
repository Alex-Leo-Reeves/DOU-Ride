import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/routes.dart';
import 'package:dou_transit/providers/admin_provider.dart';
import 'package:dou_transit/providers/auth_provider.dart';

/// Admin (Student Affairs) dashboard — analytics overview
class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().fetchAnalytics();
    });
  }

  Future<void> _refresh() async {
    await context.read<AdminProvider>().fetchAnalytics();
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AdminProvider>();
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Student Affairs'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Center(
              child: Text(
                auth.fullName?.split(' ').first ?? 'Admin',
                style: const TextStyle(fontSize: 14, color: DouTheme.grey),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (admin.error != null)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: DouTheme.error.withOpacity(0.1),
                  border: Border.all(color: DouTheme.error),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(admin.error!, style: const TextStyle(color: DouTheme.error)),
              ),

            // Stats grid
            Row(
              children: [
                Expanded(child: _StatCard(
                  icon: Icons.directions_car,
                  label: 'Active Kekes',
                  value: '${admin.activeKekes}',
                )),
                const SizedBox(width: 8),
                Expanded(child: _StatCard(
                  icon: Icons.route,
                  label: 'Trips Today',
                  value: '${admin.tripsToday}',
                )),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: _StatCard(
                  icon: Icons.account_balance,
                  label: 'Revenue Today',
                  value: admin.formattedRevenue,
                )),
                const SizedBox(width: 8),
                Expanded(child: _StatCard(
                  icon: Icons.pending_actions,
                  label: 'Bank Approvals',
                  value: '${admin.pendingBankApprovals}',
                  highlight: admin.pendingBankApprovals > 0,
                )),
              ],
            ),
            const SizedBox(height: 24),

            // Pending actions
            const Text('Pending Actions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            DouCard(
              padding: const EdgeInsets.all(16),
              onTap: () => Navigator.pushNamed(context, AppRoutes.adminReports),
              child: Row(
                children: [
                  Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(
                      color: DouTheme.warning.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.warning, color: DouTheme.warning),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Incident Reports', style: TextStyle(fontWeight: FontWeight.bold)),
                        Text('${admin.pendingReports} pending', style: const TextStyle(color: DouTheme.grey, fontSize: 13)),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right),
                ],
              ),
            ),
            const SizedBox(height: 8),

            DouCard(
              padding: const EdgeInsets.all(16),
              onTap: () => Navigator.pushNamed(context, AppRoutes.adminLostItems),
              child: Row(
                children: [
                  Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(
                      color: DouTheme.warning.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.search, color: DouTheme.warning),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Lost & Found Claims', style: TextStyle(fontWeight: FontWeight.bold)),
                        Text('${admin.pendingLostItems} pending', style: const TextStyle(color: DouTheme.grey, fontSize: 13)),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right),
                ],
              ),
            ),
            const SizedBox(height: 8),

            DouCard(
              padding: const EdgeInsets.all(16),
              onTap: () => Navigator.pushNamed(context, AppRoutes.adminLostItemTrigger),
              child: Row(
                children: [
                  Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(
                      color: DouTheme.info.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.person_add_alt, color: DouTheme.info),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Trigger Claim for Student', style: TextStyle(fontWeight: FontWeight.bold)),
                        const Text('Phone-less student walk-in',
                            style: TextStyle(color: DouTheme.grey, fontSize: 13)),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right),
                ],
              ),
            ),
            const SizedBox(height: 8),

            DouCard(
              padding: const EdgeInsets.all(16),
              onTap: () => Navigator.pushNamed(context, AppRoutes.adminEmergencies),
              child: Row(
                children: [
                  Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(
                      color: DouTheme.error.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.emergency, color: DouTheme.error),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Emergency Incidents', style: TextStyle(fontWeight: FontWeight.bold)),
                        const Text('View live tracking', style: TextStyle(color: DouTheme.grey, fontSize: 13)),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Directory section
            const Text('Directory', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: DouCard(
                    padding: const EdgeInsets.all(16),
                    onTap: () => Navigator.pushNamed(context, AppRoutes.adminDrivers),
                    child: Column(
                      children: [
                        const Icon(Icons.directions_car, size: 32),
                        const SizedBox(height: 8),
                        const Text('Drivers', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        Text('${admin.drivers.length} total', style: const TextStyle(color: DouTheme.grey, fontSize: 12)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: DouCard(
                    padding: const EdgeInsets.all(16),
                    onTap: () => Navigator.pushNamed(context, AppRoutes.adminStudents),
                    child: Column(
                      children: [
                        const Icon(Icons.school, size: 32),
                        const SizedBox(height: 8),
                        const Text('Students', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        Text('${admin.students.length} total', style: const TextStyle(color: DouTheme.grey, fontSize: 12)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Wallet management
            const Text('Finance', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            DouCard(
              padding: const EdgeInsets.all(16),
              onTap: () => Navigator.pushNamed(context, AppRoutes.adminWallet),
              child: Row(
                children: [
                  Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(
                      color: DouTheme.success.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.account_balance_wallet, color: DouTheme.success),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Wallet Adjustment', style: TextStyle(fontWeight: FontWeight.bold)),
                        Text('${admin.pendingBankApprovals} bank changes pending',
                            style: const TextStyle(color: DouTheme.grey, fontSize: 13)),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Logout
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  auth.logout();
                  Navigator.pushNamedAndRemoveUntil(
                    context, AppRoutes.roleSelection, (_) => false,
                  );
                },
                icon: const Icon(Icons.logout, size: 18),
                label: const Text('Logout'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: DouTheme.error,
                  side: const BorderSide(color: DouTheme.error),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool highlight;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: highlight ? DouTheme.warning.withOpacity(0.1) : DouTheme.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: highlight ? DouTheme.warning : DouTheme.black,
          width: highlight ? 2 : 1,
        ),
        boxShadow: const [
          BoxShadow(color: DouTheme.black26, offset: Offset(2, 2), blurRadius: 0),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 24, color: highlight ? DouTheme.warning : DouTheme.black),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          Text(label, style: const TextStyle(fontSize: 12, color: DouTheme.grey)),
        ],
      ),
    );
  }
}
