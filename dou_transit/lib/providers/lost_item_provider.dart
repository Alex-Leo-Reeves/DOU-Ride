import 'package:flutter/foundation.dart';
import 'package:dou_transit/services/api_service.dart';
import 'package:dou_transit/providers/auth_provider.dart';

/// Provider for Lost & Found feature.
/// Handles all API interactions for lost items — student reporting,
/// driver return flow, and admin trigger.
class LostItemProvider extends ChangeNotifier {
  final AuthProvider _authProvider;

  bool _isLoading = false;
  String? _error;

  // Student's own lost items
  List<Map<String, dynamic>> _myItems = [];
  // Driver's assigned lost items
  List<Map<String, dynamic>> _driverItems = [];

  LostItemProvider(this._authProvider);

  bool get isLoading => _isLoading;
  String? get error => _error;
  List<Map<String, dynamic>> get myItems => _myItems;
  List<Map<String, dynamic>> get driverItems => _driverItems;

  String? get _token => _authProvider.token;
  String get _userId => _authProvider.userId ?? '';

  // ============================================================
  // REPORT A LOST ITEM (Student)
  // ============================================================
  Future<bool> reportLostItem({
    required String tripId,
    required String description,
    String category = 'Other',
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/lost/report',
        body: {
          'tripId': tripId,
          'description': description,
          'category': category,
        },
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      _isLoading = false;
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
  // FETCH MY LOST ITEMS (Student)
  // ============================================================
  Future<void> fetchMyItems() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.get('/api/lost/my-items', token: _token);
      if (result.containsKey('error')) {
        _error = result['error'] as String?;
      } else {
        _myItems = _parseList(result);
      }
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  // ============================================================
  // FETCH DRIVER LOST ITEMS (Driver)
  // ============================================================
  Future<void> fetchDriverItems() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.get('/api/lost/driver-items', token: _token);
      if (result.containsKey('error')) {
        _error = result['error'] as String?;
      } else {
        _driverItems = _parseList(result);
      }
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  // ============================================================
  // RETURN ITEM TO STUDENT AFFAIRS (Driver)
  // ============================================================
  Future<bool> returnItem(String itemId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/lost/return/$itemId',
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Remove from driver's list
      _driverItems.removeWhere((i) => i['id'] == itemId);
      _isLoading = false;
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
  // ADMIN TRIGGER LOST ITEM CLAIM
  // ============================================================
  Future<bool> adminTriggerLostItem({
    required String studentMatric,
    required String description,
    String category = 'Other',
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/lost/admin-trigger',
        body: {
          'studentMatric': studentMatric,
          'description': description,
          'category': category,
        },
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      _isLoading = false;
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
  // HELPER: Parse JSON response that might be a list
  // ============================================================
  List<Map<String, dynamic>> _parseList(Map<String, dynamic> response) {
    for (final entry in response.entries) {
      if (entry.value is List) {
        return (entry.value as List)
            .map((e) => e as Map<String, dynamic>)
            .toList();
      }
    }
    if (response.containsKey('id') || response.containsKey('description')) {
      return [response];
    }
    return [];
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
