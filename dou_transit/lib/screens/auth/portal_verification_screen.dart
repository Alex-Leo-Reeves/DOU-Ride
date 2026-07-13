import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:dou_transit/config/theme.dart';

/// Result returned after successful DOU portal scraping.
class PortalScrapeResult {
  final String matricNumber;
  final String fullName;
  final String department;
  final String faculty;
  final String level;
  final String email;

  PortalScrapeResult({
    required this.matricNumber,
    required this.fullName,
    required this.department,
    required this.faculty,
    required this.level,
    required this.email,
  });
}

/// Screen that opens the DOU Student Portal in a WebView,
/// lets the student log in, and scrapes their profile info
/// (matric number, name, department, faculty, level)
/// for auto-filling the registration form.
class PortalVerificationScreen extends StatefulWidget {
  const PortalVerificationScreen({super.key});

  @override
  State<PortalVerificationScreen> createState() => _PortalVerificationScreenState();
}

class _PortalVerificationScreenState extends State<PortalVerificationScreen> {
  InAppWebViewController? _webViewController;
  bool _isLoading = true;
  double _progress = 0;
  String? _portalUrl;
  PortalScrapeResult? _result;
  String? _error;

  // DOU Portal URL — replace with actual portal URL
  static const String douPortalUrl = 'https://dou.edu.ng/portal';

  void _navigateToPortal() {
    setState(() => _portalUrl = douPortalUrl);
  }

  Future<void> _injectScraper() async {
    if (_webViewController == null) return;

    // Wait for page to fully load before injecting
    await Future.delayed(const Duration(seconds: 3));

    // JavaScript to scrape student profile info from the DOU portal page.
    // Attempts multiple common portal layouts to extract fields.
    const scraperJs = '''
(function() {
  try {
    let name = '';
    let matric = '';
    let dept = '';
    let faculty = '';
    let level = '';
    let email = '';

    // Helper to extract label-value pairs from any container
    function extractFromPairs(container, labelSel, valueSel) {
      container.querySelectorAll(labelSel).forEach(el => {
        const label = el.innerText.trim().toLowerCase();
        const value = (el.querySelector(valueSel)?.innerText || el.nextElementSibling?.innerText || '').trim();
        if (label.includes('name') || label.includes('full name') || label.includes('student name')) name = value;
        if (label.includes('matric') || label.includes('reg number') || label.includes('admission') || label.includes('reg no')) matric = value;
        if (label.includes('department') || label.includes('dept')) dept = value;
        if (label.includes('faculty')) faculty = value;
        if (label.includes('level') || label.includes('year') || label.includes('class')) level = value;
        if (label.includes('email')) email = value;
      });
    }

    // Layout 1: Profile table with headers
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length >= 2) {
          const label = cells[0].innerText.trim().toLowerCase();
          const value = cells[cells.length - 1].innerText.trim();
          if (label.includes('name') || label.includes('student')) name = value;
          if (label.includes('matric') || label.includes('reg number') || label.includes('admission') || label.includes('reg no')) matric = value;
          if (label.includes('department') || label.includes('dept')) dept = value;
          if (label.includes('faculty')) faculty = value;
          if (label.includes('level') || label.includes('year') || label.includes('class')) level = value;
          if (label.includes('email')) email = value;
        }
      });
    });

    // Layout 2: Definition list / detail list
    if (!name) {
      document.querySelectorAll('.student-details, .profile-details, .student-info, .details-list').forEach(container => {
        extractFromPairs(container, 'dt, .label, .field-label, .info-label', 'dd, .value, .field-value');
      });
    }

    // Layout 3: Individual label-value divs
    if (!name) {
      document.querySelectorAll('.info-row, .detail-row, .field-row, .profile-row').forEach(row => {
        const label = (row.querySelector('.label, .field-label, .info-label, dt')?.innerText || '').trim().toLowerCase();
        const value = (row.querySelector('.value, .field-value, .info-value, dd')?.innerText || '').trim();
        if (label.includes('name') || label.includes('full name') || label.includes('student name')) name = value;
        if (label.includes('matric') || label.includes('reg number') || label.includes('reg no') || label.includes('admission')) matric = value;
        if (label.includes('department') || label.includes('dept')) dept = value;
        if (label.includes('faculty')) faculty = value;
        if (label.includes('level') || label.includes('year') || label.includes('class')) level = value;
        if (label.includes('email')) email = value;
      });
    }

    // Layout 4: Input fields with student data
    if (!name) {
      document.querySelectorAll('input[name], input[id]').forEach(input => {
        const id = (input.id || '').toLowerCase();
        const nameAttr = (input.name || '').toLowerCase();
        const val = input.value.trim();
        if (id.includes('name') || nameAttr.includes('name')) name = val;
        if (id.includes('matric') || nameAttr.includes('matric') || id.includes('regno') || id.includes('reg_no')) matric = val;
        if (id.includes('department') || nameAttr.includes('department')) dept = val;
        if (id.includes('faculty') || nameAttr.includes('faculty')) faculty = val;
        if (id.includes('level') || nameAttr.includes('level') || id.includes('year') || id.includes('class')) level = val;
        if (id.includes('email') || nameAttr.includes('email')) email = val;
      });
    }

    // Layout 5: Heading contains student name
    if (!name) {
      const h1 = document.querySelector('h1, h2, .page-title, .student-name');
      if (h1) name = h1.innerText.trim();
    }

    return JSON.stringify({name: name, matric: matric, department: dept, faculty: faculty, level: level, email: email});
  } catch(e) {
    return JSON.stringify({error: e.message});
  }
})();
''';

    try {
      final resultJson = await _webViewController!.evaluateJavascript(source: scraperJs);
      final result = jsonDecode(resultJson.toString());

      if (result is Map && result.containsKey('error')) {
        debugPrint('[PortalScraper] JS error: ${result['error']}');
        return;
      }

      if (result is Map) {
        final name = result['name']?.toString() ?? '';
        final matric = result['matric']?.toString() ?? '';
        final dept = result['department']?.toString() ?? '';
        final faculty = result['faculty']?.toString() ?? '';
        final level = result['level']?.toString() ?? '';
        final email = result['email']?.toString() ?? '';

        if (name.isNotEmpty && matric.isNotEmpty) {
          setState(() {
            _result = PortalScrapeResult(
              matricNumber: matric,
              fullName: name,
              department: dept,
              faculty: faculty,
              level: level,
              email: email,
            );
          });
        }
      }
    } catch (e) {
      debugPrint('[PortalScraper] Injection error: $e');
    }
  }

  Future<void> _retryScrape() async {
    _result = null;
    setState(() => _error = null);
    await _injectScraper();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DouTheme.white,
      appBar: AppBar(
        title: const Text('Verify via Portal'),
        actions: [
          if (_result != null)
            TextButton(
              onPressed: () => Navigator.pop(context, _result),
              child: const Text('Use This', style: TextStyle(color: DouTheme.success, fontWeight: FontWeight.bold)),
            ),
          if (_result == null && _portalUrl != null)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _retryScrape,
              tooltip: 'Retry scraping',
            ),
        ],
      ),
      body: Column(
        children: [
          // Instructions
          Container(
            padding: const EdgeInsets.all(12),
            color: DouTheme.black,
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: DouTheme.white, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _result != null
                        ? 'Profile found! Tap "Use This" to continue.'
                        : _portalUrl == null
                            ? 'Tap "Open Portal" to log into the DOU student portal.'
                            : 'Log into the portal. Your profile will be auto-detected.',
                    style: const TextStyle(fontSize: 13, color: DouTheme.white),
                  ),
                ),
              ],
            ),
          ),

          // Result preview
          if (_result != null)
            Container(
              margin: const EdgeInsets.all(12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: DouTheme.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: DouTheme.success, width: 2),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.check_circle, color: DouTheme.success, size: 20),
                      SizedBox(width: 8),
                      Text('Verified Profile', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ],
                  ),
                  const Divider(),
                  _infoRow('Name', _result!.fullName),
                  _infoRow('Matric', _result!.matricNumber),
                  _infoRow('Department', _result!.department),
                  _infoRow('Faculty', _result!.faculty),
                  _infoRow('Level', _result!.level.isNotEmpty ? _result!.level : 'N/A'),
                  if (_result!.email.isNotEmpty) _infoRow('Email', _result!.email),
                ],
              ),
            )
          else if (_error != null)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: DouTheme.error.withAlpha(25),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: DouTheme.error),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error, color: DouTheme.error, size: 20),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_error!, style: const TextStyle(color: DouTheme.error, fontSize: 13))),
                  ],
                ),
              ),
            ),

          // WebView
          Expanded(
            child: _portalUrl != null
                ? Stack(
                    children: [
                      InAppWebView(
                        initialUrlRequest: URLRequest(url: WebUri(_portalUrl!)),
                        initialOptions: InAppWebViewGroupOptions(
                          crossPlatform: InAppWebViewOptions(
                            javaScriptEnabled: true,
                            javaScriptCanOpenWindowsAutomatically: false,
                            useWideViewPort: true,
                            supportZoom: false,
                          ),
                          android: AndroidInAppWebViewOptions(
                            useHybridComposition: true,
                            allowContentAccess: true,
                            allowFileAccess: true,
                          ),
                          ios: IOSInAppWebViewOptions(
                            allowsInlineMediaPlayback: true,
                          ),
                        ),
                        onWebViewCreated: (ctrl) {
                          _webViewController = ctrl;
                        },
                        onLoadStart: (ctrl, url) {
                          setState(() => _isLoading = true);
                        },
                        onLoadStop: (ctrl, url) async {
                          setState(() => _isLoading = false);
                          if (url != null && _result == null) {
                            await _injectScraper();
                          }
                        },
                        onProgressChanged: (ctrl, progress) {
                          setState(() => _progress = progress / 100);
                        },
                        onConsoleMessage: (ctrl, msg) {
                          debugPrint('[PortalWebView] ${msg.message}');
                        },
                      ),

                      if (_isLoading)
                        Positioned(
                          top: 0, left: 0, right: 0,
                          child: LinearProgressIndicator(
                            value: _progress,
                            backgroundColor: DouTheme.lightGrey,
                            valueColor: const AlwaysStoppedAnimation<Color>(DouTheme.black),
                          ),
                        ),
                    ],
                  )
                : Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.school, size: 64, color: DouTheme.lightGrey),
                        const SizedBox(height: 24),
                        const Text(
                          'Open the DOU Portal to verify\nyour student details automatically.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 15, color: DouTheme.grey),
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton.icon(
                          onPressed: _navigateToPortal,
                          icon: const Icon(Icons.open_in_browser),
                          label: const Text('Open Portal'),
                          style: ElevatedButton.styleFrom(minimumSize: const Size(200, 48)),
                        ),
                        const SizedBox(height: 16),
                        TextButton(
                          onPressed: () => Navigator.pop(context, null),
                          child: const Text('Skip portal verification',
                              style: TextStyle(color: DouTheme.grey, fontSize: 13)),
                        ),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: const TextStyle(fontSize: 13, color: DouTheme.grey)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}
