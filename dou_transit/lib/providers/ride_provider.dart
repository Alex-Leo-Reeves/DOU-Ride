import 'package:flutter/foundation.dart';
import 'package:dou_transit/services/api_service.dart';
import 'package:dou_transit/providers/auth_provider.dart';

class RideProvider extends ChangeNotifier {
  final AuthProvider _authProvider;

  String? _currentTripId;
  String _tripStatus = 'idle';
  String? _boardingPin;
  bool _isLoading = false;
  String? _error;
  double? _totalFare;
  String? _driverName;
  int? _driverFleetNumber;
  String? _destinationName;

  // Passenger payment tracking
  List<Map<String, dynamic>> _passengers = [];
  double _totalPaid = 0.0;
  bool _allPaid = false;

  RideProvider(this._authProvider);

  String? get currentTripId => _currentTripId;
  String get tripStatus => _tripStatus;
  String? get boardingPin => _boardingPin;
  bool get isLoading => _isLoading;
  String? get error => _error;
  double? get totalFare => _totalFare;
  String? get driverName => _driverName;
  int? get driverFleetNumber => _driverFleetNumber;
  String? get destinationName => _destinationName;

  // Passenger payment feed
  List<Map<String, dynamic>> get passengers => _passengers;
  double get totalPaid => _totalPaid;
  bool get allPaid => _allPaid;

  String get _userId => _authProvider.userId ?? '';
  String? get _token => _authProvider.token;

  bool get isIdle => _tripStatus == 'idle';
  bool get isRequested => _tripStatus == 'requested';
  bool get isAccepted => _tripStatus == 'accepted';
  bool get isBoarding => _tripStatus == 'boarding';
  bool get isInProgress => _tripStatus == 'in_progress';
  bool get isCompleted => _tripStatus == 'completed';
  bool get isNoShow => _tripStatus == 'no_show';

  /// Request a ride — creates a trip or queue entry depending on student's location.
  Future<Map<String, dynamic>?> requestRide({
    required String destinationId,
    int seats = 1,
    String tripType = 'standard',
    String? destinationName,
  }) async {
    if (_userId.isEmpty) return null;

    _isLoading = true;
    _error = null;
    _destinationName = destinationName;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/rides/request',
        body: {
          'destinationId': destinationId,
          'seatsRequested': seats,
          'tripType': tripType,
        },
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return null;
      }

      _currentTripId = result['tripId'] as String?;
      _boardingPin = result['boardingPin'] as String?;
      _tripStatus = result['status'] as String? ?? 'requested';
      _totalFare = (result['totalFare'] as num?)?.toDouble();
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  /// Driver accepts a ride.
  Future<bool> acceptRide(String tripId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/rides/accept/$tripId',
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      _tripStatus = 'accepted';
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

  /// Board a ride with 4-digit PIN.
  Future<bool> boardRide(String tripId, String pin) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/rides/board',
        body: {'tripId': tripId, 'boardingPin': pin},
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      _tripStatus = 'boarding';
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

  /// Complete a ride.
  Future<bool> completeRide(String tripId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/rides/complete/$tripId',
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      _tripStatus = 'completed';
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

  /// Report no-show — triggered when the 120s countdown expires.
  Future<bool> reportNoShow(String tripId, String pin) async {
    _isLoading = true;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/rides/no-show',
        body: {'tripId': tripId, 'boardingPin': pin},
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      _tripStatus = 'no_show';
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

  /// Generate a QR pay link.
  Future<Map<String, dynamic>?> generatePayLink(String tripId, {double? amount}) async {
    try {
      final result = await ApiService.post(
        '/api/rides/pay-link/generate',
        body: {'tripId': tripId, 'amount': amount},
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        notifyListeners();
        return null;
      }

      return result;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  /// Scan a QR pay link (student pays via wallet).
  Future<bool> scanPayLink(String qrData) async {
    _isLoading = true;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/rides/pay-link/scan',
        body: {'qrData': qrData},
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

  /// Fetch passengers for a trip (driver uses this to see payment feed).
  Future<bool> fetchPassengers(String tripId) async {
    try {
      final result = await ApiService.get(
        '/api/rides/$tripId/passengers',
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        notifyListeners();
        return false;
      }

      _passengers = (result['passengers'] as List<dynamic>?)
              ?.map((p) => p as Map<String, dynamic>)
              .toList() ??
          [];
      _totalPaid = (result['totalPaid'] as num?)?.toDouble() ?? 0.0;
      _allPaid = result['allPaid'] as bool? ?? false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Clear ride (driver marks trip done, waives unpaid fares).
  Future<bool> clearRide(String tripId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/rides/clear/$tripId',
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      _tripStatus = 'completed';
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

  /// Set driver info (called when ride is accepted/accepted by driver).
  void setDriverInfo({String? name, int? fleetNumber, double? fare}) {
    _driverName = name;
    _driverFleetNumber = fleetNumber;
    if (fare != null) _totalFare = fare;
    notifyListeners();
  }

  void setTripStatus(String status) {
    _tripStatus = status;
    notifyListeners();
  }

  void setCurrentTrip(String tripId, {String? pin, double? fare, String? status}) {
    _currentTripId = tripId;
    if (pin != null) _boardingPin = pin;
    if (fare != null) _totalFare = fare;
    if (status != null) _tripStatus = status;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  /// Reset the ride state completely.
  void reset() {
    _currentTripId = null;
    _tripStatus = 'idle';
    _boardingPin = null;
    _error = null;
    _totalFare = null;
    _driverName = null;
    _driverFleetNumber = null;
    _destinationName = null;
    _passengers = [];
    _totalPaid = 0.0;
    _allPaid = false;
    notifyListeners();
  }
}
