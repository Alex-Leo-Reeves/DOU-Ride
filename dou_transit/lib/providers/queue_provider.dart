import 'package:flutter/foundation.dart';
import 'package:dou_transit/services/api_service.dart';
import 'package:dou_transit/providers/auth_provider.dart';

class QueueProvider extends ChangeNotifier {
  final AuthProvider _authProvider;

  int? _ticketNumber;
  int _studentsAhead = 0;
  int _estimatedWaitMinutes = 0;
  String? _destinationName;
  String _queueStatus = 'idle'; // idle, waiting, called, boarding, completed, cancelled, no_show
  bool _isLoading = false;
  String? _error;

  QueueProvider(this._authProvider);

  int? get ticketNumber => _ticketNumber;
  int get studentsAhead => _studentsAhead;
  int get estimatedWaitMinutes => _estimatedWaitMinutes;
  String? get destinationName => _destinationName;
  String get queueStatus => _queueStatus;
  bool get isLoading => _isLoading;
  String? get error => _error;

  String get _userId => _authProvider.userId ?? '';
  String? get _token => _authProvider.token;

  bool get isWaiting => _queueStatus == 'waiting';
  bool get isCalled => _queueStatus == 'called';
  bool get isBoarding => _queueStatus == 'boarding';

  /// Join the virtual queue for a destination.
  Future<bool> joinQueue(String destinationId, {int seats = 1, String? destinationName}) async {
    if (_userId.isEmpty) return false;

    _isLoading = true;
    _error = null;
    _destinationName = destinationName;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/queue/join',
        body: {
          'destinationId': destinationId,
          'seatsRequested': seats,
        },
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      _ticketNumber = result['ticketNumber'] as int?;
      _studentsAhead = result['studentsAhead'] as int? ?? 0;
      _estimatedWaitMinutes = result['estimatedWaitMinutes'] as int? ?? 0;
      _queueStatus = 'waiting';
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

  /// Get current queue position from backend.
  Future<void> getPosition() async {
    if (_userId.isEmpty) return;

    _isLoading = true;
    notifyListeners();

    try {
      final result = await ApiService.get(
        '/api/queue/position/$_userId',
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return;
      }

      _ticketNumber = result['ticketNumber'] as int?;
      _studentsAhead = result['studentsAhead'] as int? ?? 0;
      _estimatedWaitMinutes = result['estimatedWaitMinutes'] as int? ?? 0;
      _destinationName = result['destinationName'] as String?;
      _queueStatus = result['status'] as String? ?? 'waiting';
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  /// Called when the driver calls the student's ticket.
  void setCalled({
    required String tripId,
    required String boardingPin,
    String? driverName,
    int? fleetNumber,
    String? keekeRegistration,
  }) {
    _queueStatus = 'called';
    notifyListeners();
  }

  /// Mark as boarding after PIN verified.
  void setBoarding() {
    _queueStatus = 'boarding';
    notifyListeners();
  }

  /// Leave/cancel queue.
  void leaveQueue() {
    reset();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void reset() {
    _ticketNumber = null;
    _studentsAhead = 0;
    _estimatedWaitMinutes = 0;
    _destinationName = null;
    _queueStatus = 'idle';
    _isLoading = false;
    _error = null;
    notifyListeners();
  }
}
