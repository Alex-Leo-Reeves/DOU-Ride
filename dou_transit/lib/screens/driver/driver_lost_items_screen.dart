import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/providers/lost_item_provider.dart';

/// Driver's lost items screen.
/// Shows items reported on trips this driver was involved in.
/// Driver can mark items as returned to Student Affairs.
class DriverLostItemsScreen extends StatefulWidget {
  const DriverLostItemsScreen({super.key});

  @override
  State<DriverLostItemsScreen> createState() => _DriverLostItemsScreenState();
}

class _DriverLostItemsScreenState extends State<DriverLostItemsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LostItemProvider>().fetchDriverItems();
    });
  }

  Future<void> _returnItem(String itemId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Return to Student Affairs?'),
        content: const Text(
          'Confirm you have dropped this item at the Student Affairs office. '
          'The student will be notified to collect it.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: DouTheme.success),
            child: const Text('Confirm Return'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    final provider = context.read<LostItemProvider>();
    final success = await provider.returnItem(itemId);

    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(success ? 'Item marked as returned. Student notified.' : provider.error ?? 'Failed to return item'),
      backgroundColor: success ? DouTheme.success : DouTheme.error,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LostItemProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Lost & Found Items')),
      body: RefreshIndicator(
        onRefresh: () => provider.fetchDriverItems(),
        child: provider.isLoading && provider.driverItems.isEmpty
            ? const Center(child: CircularProgressIndicator(color: DouTheme.black))
            : provider.driverItems.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.check_circle_outline, size: 64, color: DouTheme.success),
                        SizedBox(height: 16),
                        Text('No lost items reported on your trips',
                            style: TextStyle(color: DouTheme.grey)),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: provider.driverItems.length,
                    itemBuilder: (_, i) {
                      final item = provider.driverItems[i];
                      final id = item['id'] as String? ?? '';
                      final description = item['description'] as String? ?? '';
                      final category = item['category'] as String? ?? 'Other';
                      final status = item['status'] as String? ?? 'reported';
                      final studentName = item['studentName'] as String? ?? '';
                      final matricNumber = item['matricNumber'] as String? ?? '';
                      final destinationName = item['destinationName'] as String? ?? 'N/A';
                      final createdAt = item['createdAt'] as String? ?? '';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
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
                                    _statusLabel(status),
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
                                  child: Text(category,
                                      style: const TextStyle(fontSize: 10, color: DouTheme.grey)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(description,
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                const Icon(Icons.person, size: 14, color: DouTheme.grey),
                                const SizedBox(width: 4),
                                Text(studentName,
                                    style: const TextStyle(fontSize: 13)),
                                if (matricNumber.isNotEmpty) ...[
                                  const SizedBox(width: 4),
                                  Text('($matricNumber)',
                                      style: const TextStyle(fontSize: 11, color: DouTheme.grey)),
                                ],
                              ],
                            ),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                const Icon(Icons.location_on, size: 14, color: DouTheme.grey),
                                const SizedBox(width: 4),
                                Text('Trip to: $destinationName',
                                    style: const TextStyle(fontSize: 12, color: DouTheme.grey)),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(_formatDate(createdAt),
                                style: const TextStyle(fontSize: 11, color: DouTheme.lightGrey)),

                            // Action button
                            if (status == 'reported')
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton.icon(
                                    onPressed: () => _returnItem(id),
                                    icon: const Icon(Icons.store, size: 16),
                                    label: const Text('Dropped at Student Affairs'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: DouTheme.success,
                                      foregroundColor: DouTheme.white,
                                    ),
                                  ),
                                ),
                              ),

                            if (status == 'dropped_off')
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: DouTheme.success.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Row(
                                    children: [
                                      Icon(Icons.check_circle, size: 16, color: DouTheme.success),
                                      SizedBox(width: 6),
                                      Text('Already returned to Student Affairs',
                                          style: TextStyle(fontSize: 12, color: DouTheme.success)),
                                    ],
                                  ),
                                ),
                              ),

                            if (status == 'collected')
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: DouTheme.grey.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Row(
                                    children: [
                                      Icon(Icons.check, size: 16, color: DouTheme.grey),
                                      SizedBox(width: 6),
                                      Text('Student collected the item',
                                          style: TextStyle(fontSize: 12, color: DouTheme.grey)),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  String _statusLabel(String s) {
    switch (s) {
      case 'reported': return 'PENDING';
      case 'acknowledged': return 'LOOKING';
      case 'dropped_off': return 'AT STUDENT AFFAIRS';
      case 'collected': return 'COLLECTED';
      case 'closed': return 'CLOSED';
      default: return s.toUpperCase().replaceAll('_', ' ');
    }
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
