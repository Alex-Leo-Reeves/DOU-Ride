import 'package:flutter/foundation.dart';
import 'package:dou_transit/services/api_service.dart';

class NotificationProvider extends ChangeNotifier {
  String? _fcmToken;
  List<Map<String, dynamic>> _notifications = [];
  int _unreadCount = 0;
  bool _isLoading = false;

  String? get fcmToken => _fcmToken;
  List<Map<String, dynamic>> get notifications => _notifications;
  int get unreadCount => _unreadCount;
  bool get isLoading => _isLoading;

  Future<void> registerToken(String token, {String platform = 'android'}) async {
    _fcmToken = token;
    // Token is registered via FcmService.registerToken() which calls the API
    notifyListeners();
  }

  Future<void> fetchHistory(String userId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final result = await ApiService.get('/api/notifications/history/$userId');
      if (result.containsKey('error')) {
        debugPrint('[NotifProvider] History fetch error: ${result['error']}');
      } else {
        // API returns a list of notifications directly
        final List<dynamic> raw = result['data'] ?? [];
        _notifications = raw.map((n) => Map<String, dynamic>.from(n as Map)).toList();
        _unreadCount = _notifications.where((n) => n['isRead'] == false).length;
      }
    } catch (e) {
      debugPrint('[NotifProvider] History fetch exception: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchUnreadCount(String userId) async {
    try {
      final result = await ApiService.get('/api/notifications/unread-count/$userId');
      _unreadCount = result['unreadCount'] ?? 0;
      notifyListeners();
    } catch (e) {
      debugPrint('[NotifProvider] Unread count error: $e');
    }
  }

  Future<void> markRead(String notificationId) async {
    try {
      final result = await ApiService.post('/api/notifications/mark-read/$notificationId');
      if (result.containsKey('error')) {
        debugPrint('[NotifProvider] Mark read error: ${result['error']}');
      }
    } catch (e) {
      debugPrint('[NotifProvider] Mark read exception: $e');
    }

    // Optimistically update local state
    final idx = _notifications.indexWhere((n) => n['id'] == notificationId);
    if (idx >= 0) {
      _notifications[idx]['isRead'] = true;
      _unreadCount = _notifications.where((n) => n['isRead'] == false).length;
      notifyListeners();
    }
  }

  Future<void> markAllRead(String userId) async {
    try {
      await ApiService.post('/api/notifications/mark-all-read/$userId');
    } catch (e) {
      debugPrint('[NotifProvider] Mark all read exception: $e');
    }

    for (int i = 0; i < _notifications.length; i++) {
      _notifications[i]['isRead'] = true;
    }
    _unreadCount = 0;
    notifyListeners();
  }

  void addPushNotification(Map<String, dynamic> data) {
    _notifications.insert(0, {
      'id': 'push-${DateTime.now().millisecondsSinceEpoch}',
      'title': data['title'] ?? 'DOU Transit',
      'body': data['body'] ?? '',
      'isRead': false,
      'createdAt': DateTime.now().toIso8601String(),
    });
    _unreadCount++;
    notifyListeners();
  }
}
