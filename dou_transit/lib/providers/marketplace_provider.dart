import 'package:flutter/foundation.dart';
import 'package:dou_transit/services/api_service.dart';
import 'package:dou_transit/providers/auth_provider.dart';

class MarketplaceProvider extends ChangeNotifier {
  final AuthProvider _authProvider;

  bool _isLoading = false;
  String? _error;

  List<Map<String, dynamic>> _vendors = [];
  List<Map<String, dynamic>> _products = [];
  List<Map<String, dynamic>> _myOrders = [];
  List<Map<String, dynamic>> _vendorOrders = [];
  List<Map<String, dynamic>> _driverDeliveries = [];

  MarketplaceProvider(this._authProvider);

  bool get isLoading => _isLoading;
  String? get error => _error;
  List<Map<String, dynamic>> get vendors => _vendors;
  List<Map<String, dynamic>> get products => _products;
  List<Map<String, dynamic>> get myOrders => _myOrders;
  List<Map<String, dynamic>> get vendorOrders => _vendorOrders;
  List<Map<String, dynamic>> get driverDeliveries => _driverDeliveries;

  String? get _token => _authProvider.token;

  Future<void> fetchVendors() async {
    _isLoading = true; _error = null; notifyListeners();
    try {
      final r = await ApiService.get('/api/marketplace/vendors', token: _token);
      _vendors = r.containsKey('error') ? [] : _parseList(r);
    } catch (e) { _error = e.toString(); }
    _isLoading = false; notifyListeners();
  }

  Future<void> fetchProducts(String vendorId) async {
    _isLoading = true; _error = null; notifyListeners();
    try {
      final r = await ApiService.get('/api/marketplace/products/$vendorId', token: _token);
      _products = r.containsKey('error') ? [] : _parseList(r);
    } catch (e) { _error = e.toString(); }
    _isLoading = false; notifyListeners();
  }

  Future<Map<String, dynamic>?> placeOrder({
    required String vendorId,
    required List<Map<String, dynamic>> items,
    String? notes,
    double? dropoffLat,
    double? dropoffLng,
  }) async {
    _isLoading = true; _error = null; notifyListeners();
    try {
      final r = await ApiService.post('/api/marketplace/order', token: _token, body: {
        'vendorId': vendorId,
        'items': items,
        if (notes != null) 'notes': notes,
        if (dropoffLat != null) 'dropoffLat': dropoffLat,
        if (dropoffLng != null) 'dropoffLng': dropoffLng,
      });
      if (r.containsKey('error')) { _error = r['error'] as String?; _isLoading = false; notifyListeners(); return null; }
      _isLoading = false; notifyListeners();
      return r;
    } catch (e) { _error = e.toString(); _isLoading = false; notifyListeners(); return null; }
  }

  Future<bool> acceptOrder(String orderId) async {
    _isLoading = true; notifyListeners();
    try {
      final r = await ApiService.post('/api/marketplace/accept-order', token: _token, body: {'orderId': orderId});
      if (r.containsKey('error')) { _error = r['error'] as String?; _isLoading = false; notifyListeners(); return false; }
      await fetchVendorOrders(); return true;
    } catch (e) { _error = e.toString(); _isLoading = false; notifyListeners(); return false; }
  }

  Future<bool> markReady(String orderId) async {
    _isLoading = true; notifyListeners();
    try {
      final r = await ApiService.post('/api/marketplace/ready/$orderId', token: _token);
      if (r.containsKey('error')) { _error = r['error'] as String?; _isLoading = false; notifyListeners(); return false; }
      await fetchVendorOrders(); return true;
    } catch (e) { _error = e.toString(); _isLoading = false; notifyListeners(); return false; }
  }

  Future<bool> assignDriver(String orderId, String driverId) async {
    _isLoading = true; notifyListeners();
    try {
      final r = await ApiService.post('/api/marketplace/assign-driver', token: _token, body: {'orderId': orderId, 'driverId': driverId});
      if (r.containsKey('error')) { _error = r['error'] as String?; _isLoading = false; notifyListeners(); return false; }
      return true;
    } catch (e) { _error = e.toString(); _isLoading = false; notifyListeners(); return false; }
  }

  Future<bool> deliverOrder(String orderId, String pin) async {
    _isLoading = true; notifyListeners();
    try {
      final r = await ApiService.post('/api/marketplace/deliver', token: _token, body: {'orderId': orderId, 'packagePin': pin});
      if (r.containsKey('error')) { _error = r['error'] as String?; _isLoading = false; notifyListeners(); return false; }
      await fetchDriverDeliveries(); return true;
    } catch (e) { _error = e.toString(); _isLoading = false; notifyListeners(); return false; }
  }

  Future<void> fetchMyOrders() async {
    _isLoading = true; _error = null; notifyListeners();
    try { final r = await ApiService.get('/api/marketplace/my-orders', token: _token); _myOrders = r.containsKey('error') ? [] : _parseList(r); }
    catch (e) { _error = e.toString(); } _isLoading = false; notifyListeners();
  }

  Future<void> fetchVendorOrders() async {
    _isLoading = true; _error = null; notifyListeners();
    try { final r = await ApiService.get('/api/marketplace/vendor-orders', token: _token); _vendorOrders = r.containsKey('error') ? [] : _parseList(r); }
    catch (e) { _error = e.toString(); } _isLoading = false; notifyListeners();
  }

  Future<void> fetchDriverDeliveries() async {
    _isLoading = true; _error = null; notifyListeners();
    try { final r = await ApiService.get('/api/marketplace/driver-deliveries', token: _token); _driverDeliveries = r.containsKey('error') ? [] : _parseList(r); }
    catch (e) { _error = e.toString(); } _isLoading = false; notifyListeners();
  }

  List<Map<String, dynamic>> _parseList(Map<String, dynamic> response) {
    for (final e in response.entries) { if (e.value is List) return (e.value as List).map((x) => x as Map<String, dynamic>).toList(); }
    return [];
  }

  void clearError() { _error = null; notifyListeners(); }
}
