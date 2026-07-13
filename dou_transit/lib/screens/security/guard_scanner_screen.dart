import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/routes.dart';
import 'package:dou_transit/services/api_service.dart';
import 'package:dou_transit/providers/auth_provider.dart';

/// Guard scanner — full-screen QR camera for scanning student/driver QR codes.
/// Scans boarding PINs, fleet QR codes, student IDs — validates status instantly.
class GuardScannerScreen extends StatefulWidget {
  const GuardScannerScreen({super.key});

  @override
  State<GuardScannerScreen> createState() => _GuardScannerScreenState();
}

class _GuardScannerScreenState extends State<GuardScannerScreen> {
  MobileScannerController _scannerController = MobileScannerController();
  bool _torchOn = false;
  bool _isProcessing = false;

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  Future<void> _handleScan(String rawValue) async {
    if (_isProcessing) return;

    setState(() => _isProcessing = true);

    // Try to parse as JSON
    String? driverId;
    String? studentMatric;
    String? tripId;

    try {
      final parsed = jsonDecode(rawValue) as Map<String, dynamic>;
      driverId = parsed['driver_id'] as String?;
      studentMatric = parsed['matric'] as String?;
      tripId = parsed['trip_id'] as String?;
    } catch (_) {
      // Treat raw value as a student matric or fleet identifier
      if (rawValue.length <= 10 && RegExp(r'^\d+$').hasMatch(rawValue)) {
        // It's likely a fleet number
        driverId = rawValue;
      } else {
        // Treat as matric number
        studentMatric = rawValue;
      }
    }

    // Navigate to result screen with scanned data
    if (mounted) {
      Navigator.pushReplacementNamed(
        context,
        AppRoutes.securityResult,
        arguments: {
          'driverId': driverId,
          'studentMatric': studentMatric,
          'tripId': tripId,
          'rawData': rawValue,
        },
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DouTheme.black,
      appBar: AppBar(
        title: const Text('Gate Scanner'),
        backgroundColor: DouTheme.black,
        foregroundColor: DouTheme.white,
        automaticallyImplyLeading: false,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: Icon(
              _torchOn ? Icons.flash_on : Icons.flash_off,
              color: DouTheme.white,
            ),
            onPressed: () {
              _scannerController.toggleTorch();
              setState(() => _torchOn = !_torchOn);
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          // Full-screen QR scanner
          MobileScanner(
            controller: _scannerController,
            fit: BoxFit.cover,
            onDetect: (capture) {
              final barcode = capture.barcode;
              if (barcode.rawValue != null && !_isProcessing) {
                _scannerController.stop();
                _handleScan(barcode.rawValue!);
              }
            },
          ),

          // Scanner overlay
          Center(
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                border: Border.all(
                  color: _isProcessing ? DouTheme.grey : Colors.cyanAccent,
                  width: 3,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: _isProcessing
                  ? const Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 40,
                            height: 40,
                            child: CircularProgressIndicator(color: DouTheme.white),
                          ),
                          SizedBox(height: 12),
                          Text(
                            'Verifying...',
                            style: TextStyle(color: DouTheme.white, fontWeight: FontWeight.bold),
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
            bottom: 80,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                color: DouTheme.black.withOpacity(0.75),
                child: const Text(
                  'Scan student ID, boarding PIN, or driver QR',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: DouTheme.white,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),

          // Manual entry button
          Positioned(
            left: 0,
            right: 0,
            bottom: 16,
            child: Center(
              child: OutlinedButton.icon(
                onPressed: () => _showManualEntry(context),
                icon: const Icon(Icons.keyboard, color: DouTheme.white),
                label: const Text(
                  'Enter Manually',
                  style: TextStyle(color: DouTheme.white),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: DouTheme.white),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showManualEntry(BuildContext context) {
    final matricCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: DouTheme.white,
        title: const Text('Enter Matric Number'),
        content: TextField(
          controller: matricCtrl,
          decoration: const InputDecoration(
            hintText: 'e.g. DOU/2023/1234',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final matric = matricCtrl.text.trim();
              if (matric.isNotEmpty) {
                Navigator.pop(ctx);
                _scannerController.stop();
                _handleScan(matric);
              }
            },
            child: const Text('Look Up'),
          ),
        ],
      ),
    );
  }
}
