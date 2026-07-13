import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/providers/marketplace_provider.dart';

class StudentMarketplaceScreen extends StatefulWidget {
  const StudentMarketplaceScreen({super.key});

  @override
  State<StudentMarketplaceScreen> createState() => _StudentMarketplaceScreenState();
}

class _StudentMarketplaceScreenState extends State<StudentMarketplaceScreen> {
  String? _selectedVendorId;
  String? _selectedVendorName;
  final Map<String, int> _cart = {}; // productId -> quantity
  String? _notes;
  bool _orderPlaced = false;
  String? _orderPin;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MarketplaceProvider>().fetchVendors();
    });
  }

  Future<void> _placeOrder() async {
    if (_selectedVendorId == null || _cart.isEmpty) return;

    final items = _cart.entries
        .where((e) => e.value > 0)
        .map((e) => {'productId': e.key, 'quantity': e.value})
        .toList();

    final mp = context.read<MarketplaceProvider>();
    final result = await mp.placeOrder(vendorId: _selectedVendorId!, items: items);

    if (!mounted) return;
    if (result != null) {
      setState(() {
        _orderPlaced = true;
        _orderPin = result['pin'] as String?;
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(mp.error ?? 'Failed to place order')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final mp = context.watch<MarketplaceProvider>();

    if (_orderPlaced) {
      return Scaffold(
        appBar: AppBar(title: const Text('Marketplace')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.check_circle, size: 80, color: DouTheme.success),
                const SizedBox(height: 24),
                const Text('Order Placed!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Text('Delivery PIN: $_orderPin', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, letterSpacing: 8)),
                const SizedBox(height: 8),
                const Text('Share this PIN with the driver for delivery confirmation.',
                    textAlign: TextAlign.center, style: TextStyle(color: DouTheme.grey)),
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
      appBar: AppBar(title: const Text('Marketplace')),
      body: mp.isLoading && mp.vendors.isEmpty
          ? const Center(child: CircularProgressIndicator(color: DouTheme.black))
          : _selectedVendorId == null
              ? _VendorGrid(
                  vendors: mp.vendors,
                  onSelect: (id, name) => setState(() {
                    _selectedVendorId = id;
                    _selectedVendorName = name;
                    _cart.clear();
                    mp.fetchProducts(id);
                  }),
                )
              : _ProductList(
                  vendorName: _selectedVendorName ?? '',
                  products: mp.products,
                  cart: _cart,
                  notes: _notes,
                  onQuantityChanged: (pid, qty) => setState(() => _cart[pid] = qty),
                  onNotesChanged: (n) => setState(() => _notes = n),
                  onBack: () => setState(() {
                    _selectedVendorId = null;
                    _selectedVendorName = null;
                    _cart.clear();
                  }),
                  onPlaceOrder: _cart.isNotEmpty ? _placeOrder : null,
                  isLoading: mp.isLoading,
                ),
    );
  }
}

class _VendorGrid extends StatelessWidget {
  final List<Map<String, dynamic>> vendors;
  final Function(String id, String name) onSelect;

  const _VendorGrid({required this.vendors, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    if (vendors.isEmpty) {
      return const Center(child: Text('No vendors available', style: TextStyle(color: DouTheme.grey)));
    }

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.2,
      ),
      itemCount: vendors.length,
      itemBuilder: (_, i) {
        final v = vendors[i];
        final name = v['fullName'] as String? ?? 'Vendor';
        final id = v['id'] as String? ?? '';

        return GestureDetector(
          onTap: () => onSelect(id, name),
          child: Container(
            decoration: BoxDecoration(
              color: DouTheme.white,
              border: Border.all(color: DouTheme.black, width: 2),
              borderRadius: BorderRadius.circular(8),
              boxShadow: const [BoxShadow(color: DouTheme.black26, offset: Offset(2, 2), blurRadius: 0)],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.store, size: 40),
                const SizedBox(height: 8),
                Text(name, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ProductList extends StatelessWidget {
  final String vendorName;
  final List<Map<String, dynamic>> products;
  final Map<String, int> cart;
  final String? notes;
  final Function(String pid, int qty) onQuantityChanged;
  final Function(String n) onNotesChanged;
  final VoidCallback onBack;
  final VoidCallback? onPlaceOrder;
  final bool isLoading;

  const _ProductList({
    required this.vendorName,
    required this.products,
    required this.cart,
    required this.notes,
    required this.onQuantityChanged,
    required this.onNotesChanged,
    required this.onBack,
    this.onPlaceOrder,
    required this.isLoading,
  });

  double get _total {
    double t = 0;
    for (final p in products) {
      final pid = p['id'] as String? ?? '';
      final qty = cart[pid] ?? 0;
      if (qty > 0) {
        t += (p['price'] as num?)?.toDouble() ?? 0 * qty;
      }
    }
    return t;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              IconButton(icon: const Icon(Icons.arrow_back), onPressed: onBack),
              const SizedBox(width: 8),
              Expanded(child: Text(vendorName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
            ],
          ),
        ),
        // Products
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: products.length + 1, // +1 for notes
            itemBuilder: (_, i) {
              if (i == products.length) {
                return Padding(
                  padding: const EdgeInsets.only(top: 8, bottom: 16),
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Order notes (optional)',
                      border: OutlineInputBorder(borderSide: BorderSide(color: DouTheme.black)),
                    ),
                    onChanged: onNotesChanged,
                    maxLines: 2,
                  ),
                );
              }
              final p = products[i];
              final pid = p['id'] as String? ?? '';
              final name = p['name'] as String? ?? '';
              final desc = p['description'] as String? ?? '';
              final price = (p['price'] as num?)?.toDouble() ?? 0.0;
              final qty = cart[pid] ?? 0;

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: DouTheme.white,
                  border: Border.all(color: DouTheme.black, width: 1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                          if (desc.isNotEmpty) Text(desc, style: const TextStyle(fontSize: 12, color: DouTheme.grey)),
                          Text('₦${price.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    Row(
                      children: [
                        _QtyButton(label: '-', onTap: qty > 0 ? () => onQuantityChanged(pid, qty - 1) : null),
                        const SizedBox(width: 8),
                        Text('$qty', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(width: 8),
                        _QtyButton(label: '+', onTap: () => onQuantityChanged(pid, qty + 1)),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        // Cart bottom bar
        if (_total > 0)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: DouTheme.white,
              border: Border(top: BorderSide(color: DouTheme.black, width: 2)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text('Total: ₦${_total.toStringAsFixed(0)}',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ),
                SizedBox(
                  height: 44,
                  child: ElevatedButton(
                    onPressed: isLoading ? null : onPlaceOrder,
                    child: isLoading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: DouTheme.white))
                        : const Text('Place Order'),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _QtyButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;

  const _QtyButton({required this.label, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 28, height: 28,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          border: Border.all(color: DouTheme.black, width: 1),
          borderRadius: BorderRadius.circular(4),
          color: onTap != null ? DouTheme.black : DouTheme.lightGrey,
        ),
        child: Text(label, style: TextStyle(
          fontWeight: FontWeight.bold,
          color: onTap != null ? DouTheme.white : DouTheme.grey,
        )),
      ),
    );
  }
}
