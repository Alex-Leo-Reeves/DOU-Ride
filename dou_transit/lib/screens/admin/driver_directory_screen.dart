import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/providers/admin_provider.dart';

/// Driver directory with search, suspend, unsuspend
class DriverDirectoryScreen extends StatefulWidget {
  const DriverDirectoryScreen({super.key});

  @override
  State<DriverDirectoryScreen> createState() => _DriverDirectoryScreenState();
}

class _DriverDirectoryScreenState extends State<DriverDirectoryScreen> {
  final _searchCtrl = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().fetchDrivers();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _filtered(List<Map<String, dynamic>> drivers) {
    if (_searchQuery.isEmpty) return drivers;
    return drivers.where((d) {
      final name = (d['fullName'] as String? ?? '').toLowerCase();
      final fleet = (d['fleetNumber'] as int? ?? 0).toString();
      final keke = (d['kekeRegistration'] as String? ?? '').toLowerCase();
      final query = _searchQuery.toLowerCase();
      return name.contains(query) || fleet.contains(query) || keke.contains(query);
    }).toList();
  }

  Future<void> _suspendDriver(Map<String, dynamic> driver) async {
    final reasonCtrl = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Suspend Driver'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Suspend ${driver['fullName']} (Fleet #${driver['fleetNumber']})'),
            const SizedBox(height: 12),
            TextField(
              controller: reasonCtrl,
              decoration: const InputDecoration(labelText: 'Suspension reason'),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, reasonCtrl.text.trim()),
            style: ElevatedButton.styleFrom(backgroundColor: DouTheme.error),
            child: const Text('SUSPEND', style: TextStyle(color: DouTheme.white)),
          ),
        ],
      ),
    );

    if (result != null && result.isNotEmpty && mounted) {
      final success = await context.read<AdminProvider>().suspendDriver(
        driver['id'] as String,
        result,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(success ? 'Driver suspended' : 'Failed to suspend'),
          backgroundColor: success ? DouTheme.success : DouTheme.error,
        ));
      }
    }
  }

  Future<void> _unsuspendDriver(String userId) async {
    final admin = context.read<AdminProvider>();
    final success = await admin.unsuspendUser(userId);
    if (success) {
      await admin.fetchDrivers();
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(success ? 'Driver unsuspended' : 'Failed to unsuspend'),
        backgroundColor: success ? DouTheme.success : DouTheme.error,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AdminProvider>();
    final filtered = _filtered(admin.drivers);

    return Scaffold(
      appBar: AppBar(title: const Text('Driver Directory')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                labelText: 'Search by name, fleet #, or keke',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
              ),
              onChanged: (v) => setState(() => _searchQuery = v),
            ),
          ),

          if (admin.error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(admin.error!, style: const TextStyle(color: DouTheme.error)),
            ),

          Expanded(
            child: admin.isLoading
                ? const Center(child: CircularProgressIndicator(color: DouTheme.black))
                : filtered.isEmpty
                    ? const Center(child: Text('No drivers found', style: TextStyle(color: DouTheme.grey)))
                    : RefreshIndicator(
                        onRefresh: () => admin.fetchDrivers(),
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (_, i) {
                            final d = filtered[i];
                            final isSuspended = d['isSuspended'] as bool? ?? false;
                            final name = d['fullName'] as String? ?? '';
                            final fleet = d['fleetNumber'] as int? ?? 0;
                            final keke = d['kekeRegistration'] as String? ?? '';
                            final status = d['driverStatus'] as String? ?? 'offline';

                            return Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                            const SizedBox(width: 6),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: _statusColor(status).withOpacity(0.1),
                                                borderRadius: BorderRadius.circular(4),
                                                border: Border.all(color: _statusColor(status)),
                                              ),
                                              child: Text(status.toUpperCase(), style: TextStyle(fontSize: 8, color: _statusColor(status), fontWeight: FontWeight.bold)),
                                            ),
                                            if (isSuspended) ...[
                                              const SizedBox(width: 6),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: DouTheme.error.withOpacity(0.1),
                                                  borderRadius: BorderRadius.circular(4),
                                                  border: Border.all(color: DouTheme.error),
                                                ),
                                                child: const Text('SUSPENDED', style: TextStyle(fontSize: 8, color: DouTheme.error, fontWeight: FontWeight.bold)),
                                              ),
                                            ],
                                          ],
                                        ),
                                        const SizedBox(height: 2),
                                        Text('Fleet #$fleet | $keke', style: const TextStyle(fontSize: 13, color: DouTheme.grey)),
                                      ],
                                    ),
                                  ),
                                  if (!isSuspended)
                                    IconButton(
                                      icon: const Icon(Icons.block, color: DouTheme.error, size: 20),
                                      onPressed: () => _suspendDriver(d),
                                      tooltip: 'Suspend',
                                    ),
                                  if (isSuspended)
                                    IconButton(
                                      icon: const Icon(Icons.check_circle, color: DouTheme.success, size: 20),
                                      onPressed: () => _unsuspendDriver(d['id'] as String),
                                      tooltip: 'Unsuspend',
                                    ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'idle': return DouTheme.success;
      case 'en_route': return DouTheme.warning;
      case 'with_passengers': return DouTheme.black;
      case 'offline': return DouTheme.grey;
      default: return DouTheme.grey;
    }
  }
}
