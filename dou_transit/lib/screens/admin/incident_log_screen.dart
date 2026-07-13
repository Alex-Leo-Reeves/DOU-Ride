import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/providers/admin_provider.dart';

/// Incident log - real-time report feed from security/students
class IncidentLogScreen extends StatefulWidget {
  const IncidentLogScreen({super.key});

  @override
  State<IncidentLogScreen> createState() => _IncidentLogScreenState();
}

class _IncidentLogScreenState extends State<IncidentLogScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().fetchReports();
    });
  }

  Future<void> _resolveReport(String id) async {
    final admin = context.read<AdminProvider>();
    final success = await admin.resolveReport(id);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(success ? 'Report resolved' : 'Failed to resolve'),
        backgroundColor: success ? DouTheme.success : DouTheme.error,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AdminProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Incident Reports')),
      body: RefreshIndicator(
        onRefresh: () => admin.fetchReports(),
        child: admin.isLoading
            ? const Center(child: CircularProgressIndicator(color: DouTheme.black))
            : admin.reports.isEmpty
                ? const Center(child: Text('No reports', style: TextStyle(color: DouTheme.grey)))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: admin.reports.length,
                    itemBuilder: (_, i) {
                      final r = admin.reports[i];
                      final status = r['status'] as String? ?? 'open';
                      final incidentType = r['incidentType'] as String? ?? r['incident_type'] as String? ?? 'General';
                      final reporterName = r['reporterName'] as String? ?? '';
                      final targetName = r['targetName'] as String? ?? '';
                      final description = r['description'] as String? ?? '';
                      final createdAt = r['createdAt'] as String? ?? '';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: DouTheme.white,
                          border: Border.all(color: DouTheme.black, width: 1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: status == 'resolved' ? DouTheme.success.withOpacity(0.1) : DouTheme.warning.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: status == 'resolved' ? DouTheme.success : DouTheme.warning),
                                  ),
                                  child: Text(
                                    status.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 10, fontWeight: FontWeight.bold,
                                      color: status == 'resolved' ? DouTheme.success : DouTheme.warning,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(incidentType.toUpperCase(),
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text('Reporter: $reporterName', style: const TextStyle(fontSize: 13)),
                            if (targetName.isNotEmpty)
                              Text('Target: $targetName', style: const TextStyle(fontSize: 13, color: DouTheme.grey)),
                            if (description.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(description, style: const TextStyle(fontSize: 12, color: DouTheme.grey)),
                            ],
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(_formatDate(createdAt), style: const TextStyle(fontSize: 11, color: DouTheme.grey)),
                                if (status != 'resolved')
                                  TextButton(
                                    onPressed: () => _resolveReport(r['id'] as String),
                                    child: const Text('Resolve', style: TextStyle(fontSize: 13, color: DouTheme.success)),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  String _formatDate(String iso) {
    try {
      return iso.substring(0, 10) + ' ' + iso.substring(11, 16);
    } catch (_) {
      return iso;
    }
  }
}
