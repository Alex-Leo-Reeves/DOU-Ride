import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Network state provider for graceful degradation.
/// Wraps connectivity_plus into a ChangeNotifier so widgets
/// can react to connectivity changes.
class OfflineState extends ChangeNotifier {
  bool _isOnline = true;
  StreamSubscription? _subscription;

  bool get isOnline => _isOnline;
  bool get isOffline => !_isOnline;

  OfflineState() {
    _subscription = Connectivity().onConnectivityChanged.listen((results) {
      final wasOnline = _isOnline;
      _isOnline = !results.contains(ConnectivityResult.none);

      if (wasOnline != _isOnline) {
        debugPrint('[OfflineState] Network changed: ${_isOnline ? "ONLINE" : "OFFLINE"}');
        notifyListeners();
      }
    });

    // Check initial state
    Connectivity().checkConnectivity().then((results) {
      _isOnline = !results.contains(ConnectivityResult.none);
      if (!_isOnline) {
        notifyListeners();
      }
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
