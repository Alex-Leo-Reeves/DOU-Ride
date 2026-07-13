import 'package:flutter/foundation.dart';
import 'package:dou_transit/services/api_service.dart';
import 'package:dou_transit/providers/auth_provider.dart';

/// Admin provider — handles all Student Affairs API interactions
class AdminProvider extends ChangeNotifier {
  final AuthProvider _authProvider;

  bool _isLoading = false;
  String? _error;

  // Analytics
  int _activeKekes = 0;
  int _tripsToday = 0;
  int _pendingBankApprovals = 0;
  double _platformRevenue = 0.0;
  int _pendingReports = 0;
  int _pendingLostItems = 0;

  // Lists
  List<Map<String, dynamic>> _drivers = [];
  List<Map<String, dynamic>> _students = [];
  List<Map<String, dynamic>> _reports = [];
  List<Map<String, dynamic>> _lostItems = [];
  List<Map<String, dynamic>> _emergencies = [];

  AdminProvider(this._authProvider);

  bool get isLoading => _isLoading;
  String? get error => _error;
  int get activeKekes => _activeKekes;
  int get tripsToday => _tripsToday;
  int get pendingBankApprovals => _pendingBankApprovals;
  double get platformRevenue => _platformRevenue;
  int get pendingReports => _pendingReports;
  int get pendingLostItems => _pendingLostItems;
  List<Map<String, dynamic>> get drivers => _drivers;
  List<Map<String, dynamic>> get students => _students;
  List<Map<String, dynamic>> get reports => _reports;
  List<Map<String, dynamic>> get lostItems => _lostItems;
  List<Map<String, dynamic>> get emergencies => _emergencies;

  String? get _token => _authProvider.token;

  // ============================================================
  // FETCH DASHBOARD ANALYTICS
  // ============================================================
  Future<void> fetchAnalytics() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.get('/api/admin/analytics', token: _token);
      if (result.containsKey('error')) {
        _error = result['error'] as String?;
      } else {
        _activeKekes = result['activeKekes'] as int? ?? 0;
        _tripsToday = result['tripsToday'] as int? ?? 0;
        _pendingBankApprovals = result['pendingBankApprovals'] as int? ?? 0;
        _platformRevenue = (result['platformRevenue'] as num?)?.toDouble() ?? 0.0;
        final pendingActions = result['pendingActions'] as Map<String, dynamic>? ?? {};
        _pendingReports = pendingActions['incidentReports'] as int? ?? 0;
        _pendingLostItems = pendingActions['lostItemClaims'] as int? ?? 0;
      }
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  // ============================================================
  // FETCH DRIVERS LIST
  // ============================================================
  Future<void> fetchDrivers() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.get('/api/admin/drivers', token: _token);
      if (result.containsKey('error')) {
        _error = result['error'] as String?;
      } else if (result.containsKey('message')) {
        _error = result['message'] as String?;
      } else {
        // The API returns a list directly (not wrapped in a key)
        _drivers = _parseList(result);
      }
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  // ============================================================
  // FETCH STUDENTS LIST
  // ============================================================
  Future<void> fetchStudents() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.get('/api/admin/students', token: _token);
      if (result.containsKey('error')) {
        _error = result['error'] as String?;
      } else {
        _students = _parseList(result);
      }
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  // ============================================================
  // FETCH REPORTS
  // ============================================================
  Future<void> fetchReports() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.get('/api/admin/reports', token: _token);
      if (result.containsKey('error')) {
        _error = result['error'] as String?;
      } else {
        _reports = _parseList(result);
      }
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  // ============================================================
  // FETCH LOST ITEMS
  // ============================================================
  Future<void> fetchLostItems() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.get('/api/admin/lost-items', token: _token);
      if (result.containsKey('error')) {
        _error = result['error'] as String?;
      } else {
        _lostItems = _parseList(result);
      }
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  // ============================================================
  // FETCH EMERGENCIES
  // ============================================================
  Future<void> fetchEmergencies() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.get('/api/admin/emergencies', token: _token);
      if (result.containsKey('error')) {
        _error = result['error'] as String?;
      } else {
        _emergencies = _parseList(result);
      }
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  // ============================================================
  // SUSPEND DRIVER
  // ============================================================
  Future<bool> suspendDriver(String driverId, String reason) async {
    _isLoading = true;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/admin/suspend-driver',
        body: {'driverId': driverId, 'reason': reason},
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      await fetchDrivers();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // ============================================================
  // SUSPEND STUDENT
  // ============================================================
  Future<bool> suspendStudent(String studentId, String reason) async {
    _isLoading = true;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/admin/suspend-student',
        body: {'studentId': studentId, 'reason': reason},
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      await fetchStudents();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // ============================================================
  // UNSUSPEND USER
  // ============================================================
  Future<bool> unsuspendUser(String userId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/admin/unsuspend/$userId',
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // ============================================================
  // APPROVE BANK CHANGE
  // ============================================================
  Future<bool> approveBankChange(String driverId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/admin/approve-bank-change',
        body: {'driverId': driverId},
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      _pendingBankApprovals = (_pendingBankApprovals - 1).clamp(0, _pendingBankApprovals);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // ============================================================
  // ADJUST WALLET (credit/debit)
  // ============================================================
  Future<bool> adjustWallet(String userId, double amount, String reason) async {
    _isLoading = true;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/admin/credit-wallet',
        body: {'userId': userId, 'amount': amount, 'reason': reason},
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // ============================================================
  // RESOLVE REPORT
  // ============================================================
  Future<bool> resolveReport(String reportId) async {
    try {
      final result = await ApiService.post(
        '/api/admin/resolve-report/$reportId',
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        notifyListeners();
        return false;
      }

      _reports.removeWhere((r) => r['id'] == reportId);
      _pendingReports = (_pendingReports - 1).clamp(0, _pendingReports);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // ============================================================
  // CLOSE LOST ITEM
  // ============================================================
  Future<bool> closeLostItem(String itemId) async {
    try {
      final result = await ApiService.post(
        '/api/admin/lost-item/close/$itemId',
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        notifyListeners();
        return false;
      }

      _lostItems.removeWhere((i) => i['id'] == itemId);
      _pendingLostItems = (_pendingLostItems - 1).clamp(0, _pendingLostItems);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // ============================================================
  // HELPER: Parse JSON response that might be a list
  // ============================================================
  List<Map<String, dynamic>> _parseList(Map<String, dynamic> response) {
    // Some endpoints return list directly; others wrap in a key
    for (final entry in response.entries) {
      if (entry.value is List) {
        return (entry.value as List)
            .map((e) => e as Map<String, dynamic>)
            .toList();
      }
    }
    // If the response itself looks like a single item, wrap it
    if (response.containsKey('id') || response.containsKey('fullName')) {
      return [response];
    }
    return [];
  }

  // ============================================================
  // HELPERS
  // ============================================================
  void clearError() {
    _error = null;
    notifyListeners();
  }

  String get formattedRevenue => '₦${_platformRevenue.toStringAsFixed(2)}';
}
