import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/routes.dart';
import 'package:dou_transit/providers/lost_item_provider.dart';
import 'package:dou_transit/providers/ride_provider.dart';

/// Screen for reporting a lost item after a ride.
/// Student selects the trip, describes the item, picks a category.
class StudentLostItemReportScreen extends StatefulWidget {
  const StudentLostItemReportScreen({super.key});

  @override
  State<StudentLostItemReportScreen> createState() => _StudentLostItemReportScreenState();
}

class _StudentLostItemReportScreenState extends State<StudentLostItemReportScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  String _selectedCategory = 'Phone';
  String? _selectedTripId;
  bool _submitted = false;

  static const List<Map<String, dynamic>> _categories = [
    {'id': 'Phone', 'icon': Icons.phone_android},
    {'id': 'Wallet', 'icon': Icons.account_balance_wallet},
    {'id': 'ID Card', 'icon': Icons.badge},
    {'id': 'Book', 'icon': Icons.book},
    {'id': 'Bag', 'icon': Icons.backpack},
    {'id': 'Clothing', 'icon': Icons.checkroom},
    {'id': 'Keys', 'icon': Icons.vpn_key},
    {'id': 'Other', 'icon': Icons.search},
  ];

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submitReport() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedTripId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No completed trip selected')),
      );
      return;
    }

    final provider = context.read<LostItemProvider>();
    final success = await provider.reportLostItem(
      tripId: _selectedTripId!,
      description: _descriptionController.text.trim(),
      category: _selectedCategory,
    );

    if (!mounted) return;

    if (success) {
      setState(() => _submitted = true);
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) Navigator.of(context).pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(provider.error ?? 'Failed to report lost item')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final rideProvider = context.watch<RideProvider>();
    final lostProvider = context.watch<LostItemProvider>();

    if (_submitted) {
      return Scaffold(
        appBar: AppBar(title: const Text('Lost & Found')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.check_circle, size: 80, color: DouTheme.success),
                const SizedBox(height: 24),
                const Text('Item Reported!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                const Text('The driver has been notified. '
                    'You can track the status of your lost items.',
                    textAlign: TextAlign.center, style: TextStyle(color: DouTheme.grey)),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () => Navigator.pushNamed(context, AppRoutes.studentLostItems),
                  icon: const Icon(Icons.visibility),
                  label: const Text('Track My Items'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Done'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Report Lost Item')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Info card
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: DouTheme.warning.withOpacity(0.1),
                border: Border.all(color: DouTheme.warning, width: 1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info, color: DouTheme.warning),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Report items you left behind in a Keke. The driver will be notified immediately.',
                      style: TextStyle(fontSize: 12, color: DouTheme.warning),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Trip selector
            const Text('Trip', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border.all(color: DouTheme.black, width: 1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.directions_car, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          rideProvider.destinationName ?? 'Your last completed trip',
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                        if (rideProvider.currentTripId != null)
                          Text(
                            'Trip #${rideProvider.currentTripId!.substring(0, 8)}',
                            style: const TextStyle(fontSize: 11, color: DouTheme.grey),
                          ),
                      ],
                    ),
                  ),
                  if (rideProvider.currentTripId != null)
                    TextButton(
                      onPressed: () => setState(() {
                        _selectedTripId = rideProvider.currentTripId;
                      }),
                      child: Text(
                        _selectedTripId != null ? 'Selected' : 'Select',
                        style: TextStyle(
                          color: _selectedTripId != null ? DouTheme.success : DouTheme.black,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Category chips
            const Text('Item Category', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _categories.map((cat) {
                final id = cat['id'] as String;
                final isSelected = _selectedCategory == id;
                return GestureDetector(
                  onTap: () => setState(() => _selectedCategory = id),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? DouTheme.black : DouTheme.white,
                      border: Border.all(color: DouTheme.black, width: 1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(cat['icon'] as IconData, size: 16,
                            color: isSelected ? DouTheme.white : DouTheme.black),
                        const SizedBox(width: 6),
                        Text(id, style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: isSelected ? DouTheme.white : DouTheme.black,
                        )),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),

            // Description
            const Text('Describe the Item', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _descriptionController,
              maxLines: 4,
              maxLength: 500,
              decoration: InputDecoration(
                hintText: 'E.g. Black Samsung phone with a cracked screen...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: DouTheme.black, width: 1),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: DouTheme.black, width: 1),
                ),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Please describe the item';
                if (v.trim().length < 5) return 'Please be more specific (at least 5 characters)';
                return null;
              },
            ),
            const SizedBox(height: 24),

            // Submit button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: lostProvider.isLoading ? null : _submitReport,
                child: lostProvider.isLoading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: DouTheme.white))
                    : const Text('Report Lost Item', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
