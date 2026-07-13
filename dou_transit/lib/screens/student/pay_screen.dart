import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/routes.dart';
import 'package:dou_transit/config/api_config.dart';
import 'package:dou_transit/providers/ride_provider.dart';
import 'package:dou_transit/providers/wallet_provider.dart';

/// Student Pay screen — QR scanner + Driver ID fallback
/// Students scan the driver's QR pay link to pay via wallet.
class StudentPayScreen extends StatefulWidget {
  const StudentPayScreen({super.key});

  @override
  State<StudentPayScreen> createState() => _StudentPayScreenState();
}

class _StudentPayScreenState extends State<StudentPayScreen> {
  MobileScannerController _scannerController = MobileScannerController();
  bool _isProcessing = false;
  bool _scanSuccessful = false;
  String? _scannedDriverInfo;
  String? _errorMessage;

  // Fallback manual entry
  final _fleetController = TextEditingController();
  final _amountController = TextEditingController(text: '100');
  bool _showFallback = false;

  @override
  void dispose() {
    _scannerController.dispose();
    _fleetController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _handleQrScan(String qrData) async {
    if (_isProcessing || _scanSuccessful) return;

    setState(() {
      _isProcessing = true;
      _errorMessage = null;
      _scannedDriverInfo = qrData;
    });

    // Try parsing the QR data as JSON
    String? driverId;
    double? amount;
    try {
      final parsed = jsonDecode(qrData) as Map<String, dynamic>;
      driverId = parsed['driver_id'] as String?;
      amount = (parsed['amount'] as num?)?.toDouble();
      if (driverId == null) {
        setState(() {
          _errorMessage = 'Invalid QR code format';
          _isProcessing = false;
        });
        return;
      }
    } catch (_) {
      // If it's not JSON, treat the whole QR data as the pay link identifier
      driverId = qrData;
    }

    // Process payment
    final ride = context.read<RideProvider>();
    final success = await ride.scanPayLink(qrData);

    if (mounted) {
      setState(() {
        _isProcessing = false;
        if (success) {
          _scanSuccessful = true;
          // Refresh wallet balance
          context.read<WalletProvider>().fetchBalance();
        } else {
          _errorMessage = ride.error ?? 'Payment failed. Try again or use Driver ID.';
        }
      });
    }
  }

  Future<void> _payByFleetNumber() async {
    final fleetNumber = _fleetController.text.trim();
    final amountText = _amountController.text.trim();
    final amount = double.tryParse(amountText) ?? ApiConfig.insideCampusFare;

    if (fleetNumber.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter the driver\'s fleet number')),
      );
      return;
    }

    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    // Build a minimal QR data blob with the fleet number
    // The driver_id will be resolved by the backend from fleet_number
    final qrData = jsonEncode({
      'fleet_number': int.tryParse(fleetNumber) ?? 0,
      'amount': amount,
      'driver_id': 'fleet-$fleetNumber', // marker for fleet-based lookup
    });

    final ride = context.read<RideProvider>();
    final success = await ride.scanPayLink(qrData);

    if (mounted) {
      setState(() {
        _isProcessing = false;
        if (success) {
          _scanSuccessful = true;
          context.read<WalletProvider>().fetchBalance();
        } else {
          _errorMessage = ride.error ?? 'Driver not found. Check fleet number.';
        }
      });
    }
  }

  void _reset() {
    setState(() {
      _scanSuccessful = false;
      _errorMessage = null;
      _scannedDriverInfo = null;
      _isProcessing = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final ride = context.watch<RideProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pay Driver'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          TextButton(
            onPressed: () => setState(() => _showFallback = !_showFallback),
            child: Text(
              _showFallback ? 'QR Scanner' : 'Manual Entry',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: _scanSuccessful
            ? _SuccessView(onDone: () {
                ride.reset();
                Navigator.pushReplacementNamed(context, AppRoutes.studentHome);
              })
            : _showFallback
                ? _ManualEntryView(
                    fleetController: _fleetController,
                    amountController: _amountController,
                    isProcessing: _isProcessing,
                    errorMessage: _errorMessage,
                    onSubmit: _payByFleetNumber,
                  )
                : _ScannerView(
                    controller: _scannerController,
                    isProcessing: _isProcessing,
                    errorMessage: _errorMessage,
                    onDetect: _handleQrScan,
                    onReset: _reset,
                  ),
      ),
    );
  }
}

// ============================================================
// QR SCANNER VIEW
// ============================================================

class _ScannerView extends StatelessWidget {
  final MobileScannerController controller;
  final bool isProcessing;
  final String? errorMessage;
  final Function(String) onDetect;
  final VoidCallback onReset;

  const _ScannerView({
    required this.controller,
    required this.isProcessing,
    this.errorMessage,
    required this.onDetect,
    required this.onReset,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Scanner area
        Expanded(
          child: Stack(
            children: [
              MobileScanner(
                controller: controller,
                onDetect: (capture) {
                  final barcode = capture.barcode;
                  if (barcode.rawValue != null) {
                    controller.stop();
                    onDetect(barcode.rawValue!);
                  }
                },
              ),

              // Scanner overlay frame
              Center(
                child: Container(
                  width: 250,
                  height: 250,
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: isProcessing ? DouTheme.grey : DouTheme.black,
                      width: 3,
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: isProcessing
                      ? const Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                width: 40,
                                height: 40,
                                child: CircularProgressIndicator(
                                  color: DouTheme.black,
                                ),
                              ),
                              SizedBox(height: 12),
                              Text(
                                'Processing payment...',
                                style: TextStyle(
                                  color: DouTheme.black,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        )
                      : null,
                ),
              ),

              // Instructions
              Positioned(
                left: 0,
                right: 0,
                bottom: 40,
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 8,
                    ),
                    color: DouTheme.black.withOpacity(0.7),
                    child: const Text(
                      'Scan the driver\'s QR code to pay',
                      style: TextStyle(
                        color: DouTheme.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Error / status area
        Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              if (errorMessage != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: DouTheme.error.withOpacity(0.1),
                    border: Border.all(color: DouTheme.error, width: 1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline,
                          color: DouTheme.error, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          errorMessage!,
                          style: const TextStyle(
                            color: DouTheme.error,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              // Hint text
              const Text(
                'Make sure the driver\'s pay link is active',
                style: TextStyle(
                  color: DouTheme.grey,
                  fontSize: 12,
                ),
              ),

              if (errorMessage != null) ...[
                const SizedBox(height: 8),
                TextButton.icon(
                  onPressed: () {
                    controller.start();
                    onReset();
                  },
                  icon: const Icon(Icons.refresh, size: 18),
                  label: const Text('Try Again'),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

// ============================================================
// MANUAL ENTRY VIEW (Driver ID / Fleet number fallback)
// ============================================================

class _ManualEntryView extends StatelessWidget {
  final TextEditingController fleetController;
  final TextEditingController amountController;
  final bool isProcessing;
  final String? errorMessage;
  final VoidCallback onSubmit;

  const _ManualEntryView({
    required this.fleetController,
    required this.amountController,
    required this.isProcessing,
    this.errorMessage,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 24),

          // Icon
          Center(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: DouTheme.lightGrey.withOpacity(0.3),
                border: Border.all(color: DouTheme.black, width: 2),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.directions_car, size: 40, color: DouTheme.black),
            ),
          ),
          const SizedBox(height: 24),

          const Text(
            'Enter Driver Details',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          const Text(
            'Ask the driver for their fleet number',
            style: TextStyle(fontSize: 14, color: DouTheme.grey),
          ),
          const SizedBox(height: 24),

          // Fleet number
          TextField(
            controller: fleetController,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(
              labelText: 'Driver Fleet Number',
              hintText: 'e.g. 42',
              prefixIcon: Icon(Icons.tag),
            ),
          ),
          const SizedBox(height: 16),

          // Amount
          TextField(
            controller: amountController,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(
              labelText: 'Amount (₦)',
              hintText: '100',
              prefixIcon: Icon(Icons.money),
            ),
          ),
          const SizedBox(height: 16),

          // Error
          if (errorMessage != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: DouTheme.error.withOpacity(0.1),
                border: Border.all(color: DouTheme.error, width: 1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline,
                      color: DouTheme.error, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      errorMessage!,
                      style: const TextStyle(color: DouTheme.error, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),

          const Spacer(),

          // Pay button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: isProcessing ? null : onSubmit,
              icon: isProcessing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: DouTheme.white,
                      ),
                    )
                  : const Icon(Icons.payments),
              label: Text(
                isProcessing ? 'Processing...' : 'PAY NOW',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// SUCCESS VIEW
// ============================================================

class _SuccessView extends StatelessWidget {
  final VoidCallback onDone;

  const _SuccessView({required this.onDone});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Success checkmark
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: DouTheme.success.withOpacity(0.1),
                border: Border.all(color: DouTheme.success, width: 3),
                borderRadius: BorderRadius.circular(50),
              ),
              child: const Icon(
                Icons.check_circle,
                size: 60,
                color: DouTheme.success,
              ),
            ),
            const SizedBox(height: 24),

            const Text(
              'Payment Successful!',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),

            const Text(
              'The driver has been notified and your wallet has been debited.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: DouTheme.grey,
              ),
            ),
            const SizedBox(height: 32),

            // Wallet balance
            Consumer<WalletProvider>(
              builder: (_, wallet, __) => Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: DouTheme.black, width: 2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'Wallet Balance: ',
                      style: TextStyle(fontSize: 16),
                    ),
                    Text(
                      wallet.formattedBalance,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),

            // Done button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onDone,
                child: const Text(
                  'DONE',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
