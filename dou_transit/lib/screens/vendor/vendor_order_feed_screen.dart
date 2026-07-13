import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/providers/marketplace_provider.dart';

class VendorOrderFeedScreen extends StatefulWidget {
  const VendorOrderFeedScreen({super.key});

  @override
  State<VendorOrderFeedScreen> createState() => _VendorOrderFeedScreenState();
}

class _VendorOrderFeedScreenState extends State<VendorOrderFeedScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MarketplaceProvider>().fetchVendorOrders();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mp = context.watch<MarketplaceProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Order Feed'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: DouTheme.white,
          unselectedLabelColor: DouTheme.grey,
          indicatorColor: DouTheme.white,
          tabs: const [
            Tab(text: 'Incoming'),
            Tab(text: 'Preparing'),
            Tab(text: 'Ready'),
          ],
        ),
      ),
      body: mp.isLoading && mp.vendorOrders.isEmpty
          ? const Center(child: CircularProgressIndicator(color: DouTheme.black))
          : TabBarView(
              controller: _tabController,
              children: [
                _OrderList(orders: _filterOrders(mp.vendorOrders, ['pending', 'accepted']), emptyMsg: 'No incoming orders', onAccept: (id) => mp.acceptOrder(id)),
                _OrderList(orders: _filterOrders(mp.vendorOrders, ['preparing']), emptyMsg: 'No orders being prepared', onMarkReady: (id) => mp.markReady(id)),
                _OrderList(orders: _filterOrders(mp.vendorOrders, ['ready_for_pickup', 'in_transit']), emptyMsg: 'No ready orders'),
              ],
            ),
    );
  }

  List<Map<String, dynamic>> _filterOrders(List<Map<String, dynamic>> orders, List<String> statuses) {
    return orders.where((o) => statuses.contains(o['status'] as String? ?? '')).toList();
  }
}

class _OrderList extends StatelessWidget {
  final List<Map<String, dynamic>> orders;
  final String emptyMsg;
  final Function(String)? onAccept;
  final Function(String)? onMarkReady;

  const _OrderList({required this.orders, required this.emptyMsg, this.onAccept, this.onMarkReady});

  @override
  Widget build(BuildContext context) {
    if (orders.isEmpty) {
      return Center(child: Text(emptyMsg, style: const TextStyle(color: DouTheme.grey)));
    }

    return RefreshIndicator(
      onRefresh: () => context.read<MarketplaceProvider>().fetchVendorOrders(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: orders.length,
        itemBuilder: (_, i) {
          final o = orders[i];
          final status = o['status'] as String? ?? '';
          final studentName = o['studentName'] as String? ?? '';
          final totalAmount = (o['totalAmount'] as num?)?.toDouble() ?? 0.0;
          final id = o['id'] as String? ?? '';

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
                      child: Text(status.replaceAll('_', ' ').toUpperCase(),
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _statusColor(status))),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(children: [
                  const Icon(Icons.person, size: 16, color: DouTheme.grey),
                  const SizedBox(width: 4),
                  Text(studentName, style: const TextStyle(fontWeight: FontWeight.w500)),
                ]),
                const SizedBox(height: 4),
                Row(children: [
                  const Icon(Icons.payments, size: 16, color: DouTheme.grey),
                  const SizedBox(width: 4),
                  Text('₦${totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                ]),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (status == 'pending' && onAccept != null)
                      ElevatedButton(
                        onPressed: () => onAccept!(id),
                        style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8)),
                        child: const Text('Accept', style: TextStyle(fontSize: 12)),
                      ),
                    if (status == 'accepted' && onMarkReady != null)
                      ElevatedButton(
                        onPressed: () => onMarkReady!(id),
                        style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8)),
                        child: const Text('Mark Ready', style: TextStyle(fontSize: 12)),
                      ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Color _statusColor(String s) {
    if (s.contains('pending') || s.contains('accepted')) return DouTheme.warning;
    if (s.contains('preparing')) return DouTheme.info;
    if (s.contains('ready') || s.contains('transit')) return DouTheme.success;
    return DouTheme.grey;
  }
}
