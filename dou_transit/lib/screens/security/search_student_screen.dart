import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/routes.dart';
import 'package:dou_transit/services/api_service.dart';
import 'package:dou_transit/providers/auth_provider.dart';
import 'package:dou_transit/widgets/report_driver_sheet.dart';

/// Security screen to look up a student by matric number and view their status,
/// or report them.
class SearchStudentScreen extends StatefulWidget {
  const SearchStudentScreen({super.key});

  @override
  State<SearchStudentScreen> createState() => _SearchStudentScreenState();
}

class _SearchStudentScreenState extends State<SearchStudentScreen> {
  final _matricCtrl = TextEditingController();
  bool _isSearching = false;
  Map<String, dynamic>? _result;
  String? _error;

  @override
  void dispose() {
    _matricCtrl.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final matric = _matricCtrl.text.trim();
    if (matric.isEmpty) return;

    setState(() {
      _isSearching = true;
      _error = null;
      _result = null;
    });

    final auth = context.read<AuthProvider>();
    final result = await ApiService.post(
      '/api/security/lookup',
      body: {'matricNumber': matric},
      token: auth.token,
    );

    if (mounted) {
      if (result.containsKey('error')) {
        setState(() {
          _error = result['error'] as String;
          _isSearching = false;
        });
      } else {
        setState(() {
          _result = result;
          _isSearching = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Search Student'),
        actions: [
          TextButton.icon(
            onPressed: () => Navigator.pushReplacementNamed(context, AppRoutes.securityScanner),
            icon: const Icon(Icons.qr_code_scanner, size: 16),
            label: const Text('Scan'),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Search field
            TextField(
              controller: _matricCtrl,
              decoration: InputDecoration(
                labelText: 'Matric Number',
                hintText: 'e.g. DOU/2023/1234',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _matricCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _matricCtrl.clear();
                          setState(() {
                            _result = null;
                            _error = null;
                          });
                        },
                      )
                    : null,
              ),
              onSubmitted: (_) => _search(),
            ),
            const SizedBox(height: 16),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isSearching ? null : _search,
                icon: _isSearching
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: DouTheme.white))
                    : const Icon(Icons.search),
                label: const Text('LOOK UP', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 24),

            // Error
            if (_error != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: DouTheme.error.withOpacity(0.1),
                  border: Border.all(color: DouTheme.error, width: 1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_error!, style: const TextStyle(color: DouTheme.error)),
              ),

            // Result
            if (_result != null) ...[
              const SizedBox(height: 16),
              _StudentProfileCard(
                profile: _result!,
                onReport: () => ReportDriverSheet.show(
                  context,
                  targetId: _result!['id'] as String? ?? '',
                  targetName: _result!['fullName'] as String? ?? _result!['full_name'] as String? ?? 'Unknown',
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StudentProfileCard extends StatelessWidget {
  final Map<String, dynamic> profile;
  final VoidCallback? onReport;

  const _StudentProfileCard({required this.profile, this.onReport});

  @override
  Widget build(BuildContext context) {
    final fullName = profile['fullName'] as String? ?? profile['full_name'] as String? ?? 'Unknown';
    final matric = profile['matricNumber'] as String? ?? profile['matric_number'] as String? ?? '';
    final department = profile['department'] as String? ?? '';
    final faculty = profile['faculty'] as String? ?? '';
    final isSuspended = profile['isSuspended'] as bool? ?? profile['is_suspended'] as bool? ?? false;
    final isVerified = profile['isVerified'] as bool? ?? profile['is_verified'] as bool? ?? false;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: DouTheme.white,
        border: Border.all(
          color: isSuspended ? DouTheme.error : DouTheme.black,
          width: 2,
        ),
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(
            color: DouTheme.black26,
            offset: const Offset(4, 4),
            blurRadius: 0,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Status badge
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isSuspended
                      ? DouTheme.error.withOpacity(0.1)
                      : DouTheme.success.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(
                    color: isSuspended ? DouTheme.error : DouTheme.success,
                  ),
                ),
                child: Text(
                  isSuspended ? 'SUSPENDED' : 'ACTIVE',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: isSuspended ? DouTheme.error : DouTheme.success,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              if (isVerified)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: DouTheme.success.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: DouTheme.success),
                  ),
                  child: const Text(
                    'VERIFIED',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: DouTheme.success),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),

          // Name
          Text(fullName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          // Details
          _detailRow('Matric Number', matric),
          if (department.isNotEmpty) _detailRow('Department', department),
          if (faculty.isNotEmpty) _detailRow('Faculty', faculty),

          const SizedBox(height: 16),

          // Report button
          if (onReport != null)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onReport,
                icon: const Icon(Icons.warning, size: 16),
                label: const Text('REPORT STUDENT', style: TextStyle(fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: DouTheme.error,
                  side: const BorderSide(color: DouTheme.error),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: DouTheme.grey, fontSize: 13)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        ],
      ),
    );
  }
}
