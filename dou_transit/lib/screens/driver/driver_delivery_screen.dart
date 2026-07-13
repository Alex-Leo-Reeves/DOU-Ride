import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/providers/marketplace_provider.dart';

class DriverDeliveryScreen extends StatefulWidget {
  const DriverDeliveryScreen({super.key});

  @override
  State<DriverDeliveryScreen> createState() => _DriverDeliveryScreenState();
}

class _DriverDeliveryScreenState extends State<DriverDeliveryScreen> {
  final Map<String, TextEditingController> _pinControllers = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MarketplaceProvider>().fetchDriverDeliveries();
    });
  }

  @override
  void dispose() {
    for (final c in _pinControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _deliver(String orderId) async {
    final controller = _pinControllers[orderId];
    final pin = controller?.text.trim() ?? '';
    if (pin.length != 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter the 3-digit delivery PIN')),
      );
      return;
    }

    final mp = context.read<MarketplaceProvider>();
    final success = await mp.deliverOrder(orderId, pin);

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Delivery confirmed!'), backgroundColor: DouTheme.success),
      );
      controller?.clear();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(mp.error ?? 'Invalid PIN or delivery failed')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final mp = context.watch<MarketplaceProvider>();
    final deliveries = mp.driverDeliveries;

    return Scaffold(
      appBar: AppBar(title: const Text('My Deliveries')),
      body: RefreshIndicator(
        onRefresh: () => mp.fetchDriverDeliveries(),
        child: mp.isLoading && deliveries.isEmpty
            ? const Center(child: CircularProgressIndicator(color: DouTheme.black))
            : deliveries.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.inventory_2_outlined, size: 64, color: DouTheme.grey),
                        SizedBox(height: 16),
                        Text('No deliveries assigned', style: TextStyle(color: DouTheme.grey)),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: deliveries.length,
                    itemBuilder: (_, i) {
                      final d = deliveries[i];
                      final id = d['id'] as String? ?? '';
                      final status = d['status'] as String? ?? '';
                      final vendorName = d['vendorName'] as String? ?? '';
                      final studentName = d['studentName'] as String? ?? '';
                      final studentPhone = d['studentPhone'] as String? ?? '';
                      final totalAmount = (d['totalAmount'] as num?)?.toDouble() ?? 0.0;
                      final isInTransit = status == 'in_transit';
                      final isDelivered = status == 'delivered';

                      if (!_pinControllers.containsKey(id)) {
                        _pinControllers[id] = TextEditingController();
                      }

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: DouTheme.white,
                          border: Border.all(
                            color: isDelivered ? DouTheme.success : DouTheme.black,
                            width: isDelivered ? 2 : 1,
                          ),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Status badge
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
                                    status.replaceAll('_', ' ').toUpperCase(),
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _statusColor(status)),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),

                            // Vendor
                            Row(children: [
                              const Icon(Icons.store, size: 16, color: DouTheme.grey),
                              const SizedBox(width: 4),
                              Text('Pickup: $vendorName', style: const TextStyle(fontWeight: FontWeight.w500)),
                            ]),
                            const SizedBox(height: 4),

                            // Student
                            Row(children: [
                              const Icon(Icons.person, size: 16, color: DouTheme.grey),
                              const SizedBox(width: 4),
                              Text('Deliver to: $studentName'),
                              if (studentPhone.isNotEmpty) ...[
                                const SizedBox(width: 4),
                                Text('($studentPhone)', style: const TextStyle(color: DouTheme.grey)),
                              ],
                            ]),
                            const SizedBox(height: 4),

                            // Amount
                            Row(children: [
                              const Icon(Icons.payments, size: 16, color: DouTheme.grey),
                              const SizedBox(width: 4),
                              Text('₦${totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                            ]),

                            if (isDelivered)
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
                                      Text('Delivered successfully', style: TextStyle(fontSize: 12, color: DouTheme.success)),
                                    ],
                                  ),
                                ),
                              ),

                            if (isInTransit) ...[
                              const SizedBox(height: 12),
                              // PIN entry
                              Row(
                                children: [
                                  Expanded(
                                    child: TextField(
                                      controller: _pinControllers[id],
                                      decoration: const InputDecoration(
                                        hintText: '3-digit PIN',
                                        hintStyle: TextStyle(fontSize: 14),
                                        border: OutlineInputBorder(borderSide: BorderSide(color: DouTheme.black)),
                                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                      ),
                                      keyboardType: TextInputType.number,
                                      maxLength: 3,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 8),
                                      buildCounter: (_, {required int currentLength, required bool isFocused, required int? maxLength}) => null,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  ElevatedButton(
                                    onPressed: () => _deliver(id),
                                    style: ElevatedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                    ),
                                    child: const Text('Deliver', style: TextStyle(fontSize: 12)),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  Color _statusColor(String s) {
    if (s.contains('transit')) return DouTheme.info;
    if (s.contains('delivered')) return DouTheme.success;
    if (s.contains('ready')) return DouTheme.warning;
    return DouTheme.grey;
  }
}
