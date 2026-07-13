import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/providers/lost_item_provider.dart';

/// Admin screen for triggering a lost item claim on behalf of a
/// phone-less student who walked into Student Affairs.
class AdminTriggerLostItemScreen extends StatefulWidget {
  const AdminTriggerLostItemScreen({super.key});

  @override
  State<AdminTriggerLostItemScreen> createState() => _AdminTriggerLostItemScreenState();
}

class _AdminTriggerLostItemScreenState extends State<AdminTriggerLostItemScreen> {
  final _formKey = GlobalKey<FormState>();
  final _matricController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _selectedCategory = 'Phone';
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
    _matricController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final provider = context.read<LostItemProvider>();
    final success = await provider.adminTriggerLostItem(
      studentMatric: _matricController.text.trim(),
      description: _descriptionController.text.trim(),
      category: _selectedCategory,
    );

    if (!mounted) return;

    if (success) {
      setState(() => _submitted = true);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(provider.error ?? 'Failed to create claim')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LostItemProvider>();

    if (_submitted) {
      return Scaffold(
        appBar: AppBar(title: const Text('Lost Item Claim')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.check_circle, size: 80, color: DouTheme.success),
                const SizedBox(height: 24),
                const Text('Claim Created!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Text(
                  'Lost item claim registered for ${_matricController.text.trim()}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: DouTheme.grey),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
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
      appBar: AppBar(title: const Text('Trigger Lost Item Claim')),
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
                      'Use this for phone-less students who walk into Student Affairs '
                      'reporting a lost item. Enter their matric number and item details.',
                      style: TextStyle(fontSize: 12, color: DouTheme.warning),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Matric number
            const Text("Student's Matric Number", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _matricController,
              decoration: const InputDecoration(
                hintText: 'e.g. DOU/2021/SCI/1234',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.all(Radius.circular(8)),
                  borderSide: BorderSide(color: DouTheme.black, width: 1),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.all(Radius.circular(8)),
                  borderSide: BorderSide(color: DouTheme.black, width: 1),
                ),
              ),
              textCapitalization: TextCapitalization.characters,
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Enter the student\'s matric number';
                if (v.trim().length < 5) return 'Invalid matric number';
                return null;
              },
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
              decoration: const InputDecoration(
                hintText: 'E.g. Blue notebook, red cover, "Physics 101" written on front...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.all(Radius.circular(8)),
                  borderSide: BorderSide(color: DouTheme.black, width: 1),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.all(Radius.circular(8)),
                  borderSide: BorderSide(color: DouTheme.black, width: 1),
                ),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Please describe the item';
                if (v.trim().length < 5) return 'Please be more specific';
                return null;
              },
            ),
            const SizedBox(height: 24),

            // Submit button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: provider.isLoading ? null : _submit,
                child: provider.isLoading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: DouTheme.white))
                    : const Text('Create Lost Item Claim', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
