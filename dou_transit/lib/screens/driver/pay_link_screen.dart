import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/routes.dart';
import 'package:dou_transit/providers/ride_provider.dart';
import 'package:dou_transit/providers/wallet_provider.dart';
import 'package:dou_transit/widgets/passenger_payment_feed.dart';

/// Driver Pay Link screen — QR code generation, passenger payment feed,
/// and "Clear Ride" button.
class DriverPayLinkScreen extends StatefulWidget {
  const DriverPayLinkScreen({super.key});

  @override
  State<DriverPayLinkScreen> createState() => _DriverPayLinkScreenState();
}

class _DriverPayLinkScreenState extends State<DriverPayLinkScreen>
    with WidgetsBindingObserver {
  String? _qrCodeData;
  int? _fleetNumber;
  double _amount = 100.0;
  bool _isGenerating = false;
  bool _linkActive = false;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _generatePayLink();
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _generatePayLink() async {
    final ride = context.read<RideProvider>();
    final tripId = ride.currentTripId;
    if (tripId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No active trip to generate pay link for')),
      );
      return;
    }

    setState(() => _isGenerating = true);

    final result = await ride.generatePayLink(tripId, amount: _amount);

    if (mounted) {
      setState(() {
        _isGenerating = false;
        if (result != null) {
          _qrCodeData = result['qrCodeData'] as String?;
          _fleetNumber = result['fleetNumber'] as int?;
          _linkActive = true;
          // Start polling passengers
          _startPolling(tripId);
        }
      });

      if (result == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ride.error ?? 'Failed to generate pay link')),
        );
      }
    }
  }

  void _startPolling(String tripId) {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted) {
        context.read<RideProvider>().fetchPassengers(tripId);
      }
    });
    // Initial fetch
    context.read<RideProvider>().fetchPassengers(tripId);
  }

  Future<void> _deactivateLink() async {
    setState(() => _linkActive = false);
    _pollTimer?.cancel();
  }

  Future<void> _clearRide() async {
    final ride = context.read<RideProvider>();
    final tripId = ride.currentTripId;
    if (tripId == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: DouTheme.white,
        title: const Text('Clear Ride?'),
        content: const Text(
          'This will mark the ride as completed. Unpaid passenger fares will be waived.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: DouTheme.error),
            child: const Text('CLEAR RIDE',
                style: TextStyle(color: DouTheme.white)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      _pollTimer?.cancel();
      final success = await ride.clearRide(tripId);
      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Ride cleared successfully!'),
              backgroundColor: DouTheme.success,
            ),
          );
          Navigator.pushReplacementNamed(context, AppRoutes.driverHome);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(ride.error ?? 'Failed to clear ride')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final ride = context.watch<RideProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Handoff'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pushReplacementNamed(context, AppRoutes.driverHome),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            tooltip: 'Lost & Found',
            onPressed: () => Navigator.pushNamed(context, AppRoutes.driverLostItems),
          ),
          if (_linkActive)
            TextButton.icon(
              onPressed: _deactivateLink,
              icon: const Icon(Icons.link_off, size: 16),
              label: const Text('Deactivate'),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // =============================
            // QR CODE CARD
            // =============================
            _QrCodeCard(
              qrData: _qrCodeData,
              fleetNumber: _fleetNumber,
              amount: _amount,
              isActive: _linkActive,
              isGenerating: _isGenerating,
              onGenerate: _generatePayLink,
            ),

            const SizedBox(height: 16),

            // =============================
            // AMOUNT SELECTOR
            // =============================
            if (_linkActive)
              _AmountSelector(
                amount: _amount,
                onChanged: (v) => setState(() => _amount = v),
              ),

            const SizedBox(height: 16),

            // =============================
            // PASSENGER PAYMENT FEED
            // =============================
            if (ride.currentTripId != null && _linkActive) ...[
              const Text(
                'Passenger Payments',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 300,
                child: PassengerPaymentFeed(
                  passengers: ride.passengers,
                  totalPaid: ride.totalPaid,
                  allPaid: ride.allPaid,
                ),
              ),
            ],

            const SizedBox(height: 24),

            // =============================
            // CLEAR RIDE BUTTON
            // =============================
            if (_linkActive)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: ride.isLoading ? null : _clearRide,
                  icon: ride.isLoading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: DouTheme.white,
                          ),
                        )
                      : const Icon(Icons.stop_circle_outlined),
                  label: const Text(
                    'CLEAR RIDE',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: DouTheme.error,
                    foregroundColor: DouTheme.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),

            // =============================
            // GET PAID: SHOW STATS
            // =============================
            if (ride.passengers.isNotEmpty) ...[
              const SizedBox(height: 16),
              DouCard(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _StatItem(
                      label: 'Passengers',
                      value: '${ride.passengers.length}',
                      icon: Icons.people,
                    ),
                    _StatItem(
                      label: 'Paid',
                      value: '₦${ride.totalPaid.toStringAsFixed(0)}',
                      icon: Icons.payments,
                    ),
                    _StatItem(
                      label: 'Unpaid',
                      value:
                          '${ride.passengers.where((p) => p['paymentStatus'] != 'paid').length}',
                      icon: Icons.hourglass_empty,
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ============================================================
// QR CODE CARD
// ============================================================

class _QrCodeCard extends StatelessWidget {
  final String? qrData;
  final int? fleetNumber;
  final double amount;
  final bool isActive;
  final bool isGenerating;
  final VoidCallback onGenerate;

  const _QrCodeCard({
    required this.qrData,
    required this.fleetNumber,
    required this.amount,
    required this.isActive,
    required this.isGenerating,
    required this.onGenerate,
  });

  @override
  Widget build(BuildContext context) {
    return DouCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Text(
            'Fleet #$fleetNumber',
            style: const TextStyle(fontSize: 14, color: DouTheme.grey),
          ),
          const SizedBox(height: 12),

          if (isGenerating)
            const SizedBox(
              width: 48,
              height: 48,
              child: CircularProgressIndicator(color: DouTheme.black),
            )
          else if (qrData != null && isActive)
            Column(
              children: [
                // QR Code
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: DouTheme.white,
                    border: Border.all(color: DouTheme.black, width: 2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: QrImageView(
                    data: qrData!,
                    version: QrVersions.auto,
                    size: 200,
                    backgroundColor: DouTheme.white,
                    eyeStyle: const QrEyeStyle(
                      eyeShape: QrEyeShape.square,
                      color: DouTheme.black,
                    ),
                    dataModuleStyle: const QrDataModuleStyle(
                      dataModuleShape: QrDataModuleShape.square,
                      color: DouTheme.black,
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Fleet & amount info
                Text(
                  'Keke Fleet #$fleetNumber',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '₦${amount.toStringAsFixed(0)} per passenger',
                  style: const TextStyle(fontSize: 14, color: DouTheme.grey),
                ),
                const SizedBox(height: 12),

                // Active badge
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: DouTheme.success.withOpacity(0.1),
                    border: Border.all(color: DouTheme.success, width: 1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle,
                          size: 14, color: DouTheme.success),
                      SizedBox(width: 4),
                      Text(
                        'Active — Show to students',
                        style: TextStyle(
                          fontSize: 12,
                          color: DouTheme.success,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 12),

                // Copy QR data (for fallback)
                OutlinedButton.icon(
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: qrData!));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Pay link copied!')),
                    );
                  },
                  icon: const Icon(Icons.copy, size: 16),
                  label: const Text('Copy Pay Link'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 8),
                  ),
                ),
              ],
            )
          else
            Column(
              children: [
                const Icon(Icons.qr_code_2, size: 80, color: DouTheme.grey),
                const SizedBox(height: 12),
                const Text(
                  'No active pay link',
                  style: TextStyle(fontSize: 16, color: DouTheme.grey),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: onGenerate,
                  child: const Text('Generate Pay Link'),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

// ============================================================
// AMOUNT SELECTOR
// ============================================================

class _AmountSelector extends StatelessWidget {
  final double amount;
  final ValueChanged<double> onChanged;

  const _AmountSelector({
    required this.amount,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    const amounts = [100.0, 200.0, 300.0, 500.0, 1500.0];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Amount per passenger',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: amounts.map((a) {
            final selected = amount == a;
            return GestureDetector(
              onTap: () => onChanged(a),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: selected ? DouTheme.black : DouTheme.white,
                  border: Border.all(color: DouTheme.black, width: 2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '₦${a.toStringAsFixed(0)}',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: selected ? DouTheme.white : DouTheme.black,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

// ============================================================
// STAT ITEM
// ============================================================

class _StatItem extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _StatItem({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, size: 24, color: DouTheme.black),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: DouTheme.grey),
        ),
      ],
    );
  }
}
