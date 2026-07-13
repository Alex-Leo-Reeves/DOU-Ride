import 'package:flutter/foundation.dart';

class EmergencyProvider extends ChangeNotifier {
  String? _incidentId;
  String _emergencyStatus = 'inactive';
  bool _isLoading = false;

  String? get incidentId => _incidentId;
  String get emergencyStatus => _emergencyStatus;
  bool get isActive => _emergencyStatus == 'active' || _emergencyStatus == 'en_route';
  bool get isLoading => _isLoading;

  Future<bool> triggerEmergency(double lat, double lng, String phone) async {
    _isLoading = true;
    notifyListeners();
    // TODO: ApiService.post('/api/emergency/trigger', body: {...})
    _incidentId = 'emerg-${DateTime.now().millisecondsSinceEpoch}';
    _emergencyStatus = 'active';
    _isLoading = false;
    notifyListeners();
    return true;
  }

  Future<bool> resolveEmergency(String incidentId) async {
    _isLoading = true;
    notifyListeners();
    // TODO: ApiService.post('/api/emergency/resolve', body: {...})
    _emergencyStatus = 'resolved';
    _isLoading = false;
    notifyListeners();
    return true;
  }

  Future<bool> flagAbuse(String incidentId, String reason) async {
    _isLoading = true;
    notifyListeners();
    // TODO: ApiService.post('/api/emergency/flag-abuse', body: {...})
    _emergencyStatus = 'abuse_flagged';
    _isLoading = false;
    notifyListeners();
    return true;
  }

  void reset() {
    _incidentId = null;
    _emergencyStatus = 'inactive';
    notifyListeners();
  }
}
