import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/routes.dart';
import 'package:dou_transit/providers/lost_item_provider.dart';

/// Student's lost items tracking screen.
/// Shows all items the student has reported and their current status.
class StudentLostItemsScreen extends StatefulWidget {
  const StudentLostItemsScreen({super.key});

  @override
  State<StudentLostItemsScreen> createState() => _StudentLostItemsScreenState();
}

class _StudentLostItemsScreenState extends State<StudentLostItemsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LostItemProvider>().fetchMyItems();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LostItemProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Lost Items'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => Navigator.pushNamed(context, AppRoutes.studentLostItem),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => provider.fetchMyItems(),
        child: provider.isLoading && provider.myItems.isEmpty
            ? const Center(child: CircularProgressIndicator(color: DouTheme.black))
            : provider.myItems.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.search_off, size: 64, color: DouTheme.grey),
                        const SizedBox(height: 16),
                        const Text('No lost items reported', style: TextStyle(color: DouTheme.grey)),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: () => Navigator.pushNamed(context, AppRoutes.studentLostItem),
                          icon: const Icon(Icons.add),
                          label: const Text('Report an Item'),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: provider.myItems.length + 1, // +1 for header
                    itemBuilder: (_, i) {
                      if (i == 0) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Text(
                            '${provider.myItems.length} item${provider.myItems.length == 1 ? '' : 's'} reported',
                            style: const TextStyle(color: DouTheme.grey, fontSize: 13),
                          ),
                        );
                      }
                      final item = provider.myItems[i - 1];
                      return _LostItemCard(item: item);
                    },
                  ),
      ),
    );
  }
}

class _LostItemCard extends StatelessWidget {
  final Map<String, dynamic> item;

  const _LostItemCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final description = item['description'] as String? ?? '';
    final category = item['category'] as String? ?? 'Other';
    final status = item['status'] as String? ?? 'reported';
    final driverName = item['driverName'] as String? ?? 'N/A';
    final fleetNumber = item['fleetNumber'] as int?;
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
              const Icon(Icons.directions_car, size: 14, color: DouTheme.grey),
              const SizedBox(width: 4),
              Text(driverName,
                  style: const TextStyle(fontSize: 13, color: DouTheme.grey)),
              if (fleetNumber != null) ...[
                const SizedBox(width: 4),
                Text('#$fleetNumber',
                    style: const TextStyle(fontSize: 12, color: DouTheme.grey)),
              ],
            ],
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              const Icon(Icons.location_on, size: 14, color: DouTheme.grey),
              const SizedBox(width: 4),
              Text(destinationName,
                  style: const TextStyle(fontSize: 13, color: DouTheme.grey)),
            ],
          ),
          const SizedBox(height: 2),
          Text(_formatDate(createdAt),
              style: const TextStyle(fontSize: 11, color: DouTheme.lightGrey)),

          // Status-specific actions
          if (status == 'collected')
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
                    Text('Item collected successfully',
                        style: TextStyle(fontSize: 12, color: DouTheme.success)),
                  ],
                ),
              ),
            ),

          if (status == 'dropped_off')
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: DouTheme.info.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.store, size: 16, color: DouTheme.info),
                    SizedBox(width: 6),
                    Expanded(
                      child: Text('Item is at Student Affairs. Bring your ID to collect.',
                          style: TextStyle(fontSize: 12, color: DouTheme.info)),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _statusLabel(String s) {
    switch (s) {
      case 'reported': return 'REPORTED';
      case 'acknowledged': return 'SEARCHING';
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
      case 'dropped_off': return DouTheme.info;
      case 'collected': return DouTheme.success;
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
