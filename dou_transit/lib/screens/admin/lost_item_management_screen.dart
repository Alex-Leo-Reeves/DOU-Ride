import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/providers/admin_provider.dart';

/// Lost & Found item management for admin
class LostItemManagementScreen extends StatefulWidget {
  const LostItemManagementScreen({super.key});

  @override
  State<LostItemManagementScreen> createState() => _LostItemManagementScreenState();
}

class _LostItemManagementScreenState extends State<LostItemManagementScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().fetchLostItems();
    });
  }

  Future<void> _closeItem(String id) async {
    final admin = context.read<AdminProvider>();
    final success = await admin.closeLostItem(id);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(success ? 'Item claim closed' : 'Failed to close'),
        backgroundColor: success ? DouTheme.success : DouTheme.error,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AdminProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Lost & Found')),
      body: RefreshIndicator(
        onRefresh: () => admin.fetchLostItems(),
        child: admin.isLoading
            ? const Center(child: CircularProgressIndicator(color: DouTheme.black))
            : admin.lostItems.isEmpty
                ? const Center(child: Text('No lost items reported', style: TextStyle(color: DouTheme.grey)))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: admin.lostItems.length,
                    itemBuilder: (_, i) {
                      final item = admin.lostItems[i];
                      final studentName = item['studentName'] as String? ?? '';
                      final driverName = item['driverName'] as String? ?? '';
                      final description = item['itemDescription'] as String? ?? item['description'] as String? ?? '';
                      final category = item['category'] as String? ?? 'Other';
                      final status = item['status'] as String? ?? 'reported';
                      final fleetNumber = item['fleetNumber'] as int?;
                      final createdAt = item['createdAt'] as String? ?? '';

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
                                    color: _statusColor(status).withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: _statusColor(status)),
                                  ),
                                  child: Text(
                                    status.toUpperCase().replaceAll('_', ' '),
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _statusColor(status)),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: DouTheme.lightGrey.withOpacity(0.3),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(category, style: const TextStyle(fontSize: 10, color: DouTheme.grey)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(description, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                const Icon(Icons.person, size: 14, color: DouTheme.grey),
                                const SizedBox(width: 4),
                                Text(studentName, style: const TextStyle(fontSize: 13)),
                              ],
                            ),
                            if (driverName.isNotEmpty && driverName != 'N/A')
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Row(
                                  children: [
                                    const Icon(Icons.directions_car, size: 14, color: DouTheme.grey),
                                    const SizedBox(width: 4),
                                    Text('$driverName${fleetNumber != null ? ' (Fleet #$fleetNumber)' : ''}',
                                        style: const TextStyle(fontSize: 12, color: DouTheme.grey)),
                                  ],
                                ),
                              ),
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(_formatDate(createdAt),
                                    style: const TextStyle(fontSize: 11, color: DouTheme.grey)),
                                if (status == 'reported' || status == 'dropped_off')
                                  TextButton(
                                    onPressed: () => _closeItem(item['id'] as String),
                                    child: const Text('Mark Collected', style: TextStyle(fontSize: 13, color: DouTheme.success)),
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

  Color _statusColor(String s) {
    switch (s) {
      case 'reported': return DouTheme.warning;
      case 'acknowledged': return DouTheme.warning;
      case 'dropped_off': return DouTheme.success;
      case 'collected': return DouTheme.grey;
      case 'closed': return DouTheme.grey;
      default: return DouTheme.grey;
    }
  }

  String _formatDate(String iso) {
    try {
      return iso.substring(0, 10) + ' ' + iso.substring(11, 16);
    } catch (_) {
      return iso;
    }
  }
}
