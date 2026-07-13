import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/routes.dart';
import 'package:dou_transit/services/api_service.dart';
import 'package:dou_transit/providers/auth_provider.dart';

/// Result screen shown after scanning a QR code at the security gate.
/// Displays green (cleared) or red (suspended) with user details.
class ScanResultScreen extends StatefulWidget {
  const ScanResultScreen({super.key});

  @override
  State<ScanResultScreen> createState() => _ScanResultScreenState();
}

class _ScanResultScreenState extends State<ScanResultScreen> {
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _profileData;
  bool _isCleared = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_isLoading) {
      _lookupUser();
    }
  }

  Future<void> _lookupUser() async {
    final args = ModalRoute.of(context)?.settings.arguments
        as Map<String, dynamic>?;
    final driverId = args?['driverId'] as String?;
    final studentMatric = args?['studentMatric'] as String?;
    final rawData = args?['rawData'] as String?;

    if (driverId == null && studentMatric == null) {
      setState(() {
        _error = 'No identifiable data found in scan';
        _isLoading = false;
      });
      return;
    }

    final auth = context.read<AuthProvider>();
    final token = auth.token;

    try {
      // Look up user via backend
      final result = await ApiService.post(
        '/api/security/lookup',
        body: {
          if (driverId != null) 'driverId': driverId,
          if (studentMatric != null) 'matricNumber': studentMatric,
          if (rawData != null) 'rawData': rawData,
        },
        token: token,
      );

      if (mounted) {
        if (result.containsKey('error')) {
          setState(() {
            _error = result['error'] as String;
            _isLoading = false;
          });
        } else {
          setState(() {
            _profileData = result;
            _isCleared = result['isCleared'] as bool? ?? true;
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Lookup failed: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _isLoading
          ? DouTheme.black
          : _isCleared
              ? DouTheme.success
              : DouTheme.error,
      appBar: AppBar(
        title: const Text('Gate Scan Result'),
        backgroundColor: Colors.transparent,
        foregroundColor: DouTheme.white,
        automaticallyImplyLeading: false,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pushReplacementNamed(context, AppRoutes.securityScanner);
            },
            child: const Text(
              'Scan Again',
              style: TextStyle(color: DouTheme.white, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(color: DouTheme.white),
                    SizedBox(height: 16),
                    Text(
                      'Looking up user...',
                      style: TextStyle(
                        color: DouTheme.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              )
            : _error != null
                ? _ErrorView(
                    error: _error!,
                    onRetry: () {
                      setState(() {
                        _isLoading = true;
                        _error = null;
                      });
                      _lookupUser();
                    },
                  )
                : _ResultView(
                    profile: _profileData!,
                    isCleared: _isCleared,
                    onScanAgain: () {
                      Navigator.pushReplacementNamed(
                          context, AppRoutes.securityScanner);
                    },
                    onReport: () {
                      Navigator.pushNamed(
                        context,
                        AppRoutes.securityResult,
                        arguments: {...?_profileData, 'report': true},
                      );
                    },
                  ),
      ),
    );
  }
}

// ============================================================
// RESULT VIEW (green/red)
// ============================================================

class _ResultView extends StatelessWidget {
  final Map<String, dynamic> profile;
  final bool isCleared;
  final VoidCallback onScanAgain;
  final VoidCallback onReport;

  const _ResultView({
    required this.profile,
    required this.isCleared,
    required this.onScanAgain,
    required this.onReport,
  });

  @override
  Widget build(BuildContext context) {
    final fullName = profile['fullName'] as String? ?? profile['full_name'] as String? ?? 'Unknown';
    final role = profile['role'] as String? ?? 'student';
    final matric = profile['matricNumber'] as String? ?? profile['matric_number'] as String? ?? '';
    final fleetNumber = profile['fleetNumber'] as int? ?? profile['fleet_number'] as int?;
    final status = profile['status'] as String? ?? '';
    final isStudent = role == 'student';

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Large status icon
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: DouTheme.white.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isCleared ? Icons.check_circle : Icons.cancel,
                size: 60,
                color: DouTheme.white,
              ),
            ),
            const SizedBox(height: 24),

            // Status text
            Text(
              isCleared ? 'ACCESS GRANTED' : 'ACCESS DENIED',
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: DouTheme.white,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 32),

            // Profile card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: DouTheme.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: DouTheme.black, width: 2),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name
                  Text(
                    fullName,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: DouTheme.black,
                    ),
                  ),
                  const SizedBox(height: 4),

                  // Role badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: DouTheme.black,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      role.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 10,
                        color: DouTheme.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Details
                  if (isStudent && matric.isNotEmpty)
                    _DetailRow(label: 'Matric', value: matric),
                  if (!isStudent && fleetNumber != null)
                    _DetailRow(label: 'Fleet #', value: '$fleetNumber'),
                  if (status.isNotEmpty)
                    _DetailRow(label: 'Status', value: status),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Action buttons
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: onScanAgain,
                icon: const Icon(Icons.qr_code_scanner, color: DouTheme.white),
                label: const Text(
                  'SCAN AGAIN',
                  style: TextStyle(
                    color: DouTheme.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: DouTheme.black,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Report button
            if (!isCleared)
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onReport,
                  icon: const Icon(Icons.warning, color: DouTheme.white),
                  label: const Text(
                    'REPORT DRIVER',
                    style: TextStyle(
                      color: DouTheme.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: DouTheme.white, width: 2),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ============================================================
// ERROR VIEW
// ============================================================

class _ErrorView extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;

  const _ErrorView({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: DouTheme.white.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.error_outline, size: 48, color: DouTheme.white),
            ),
            const SizedBox(height: 24),
            Text(
              error,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16, color: DouTheme.white),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, color: DouTheme.white),
              label: const Text(
                'Retry',
                style: TextStyle(color: DouTheme.white),
              ),
              style: ElevatedButton.styleFrom(backgroundColor: DouTheme.black),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================
// DETAIL ROW
// ============================================================

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: DouTheme.grey,
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: DouTheme.black,
            ),
          ),
        ],
      ),
    );
  }
}
