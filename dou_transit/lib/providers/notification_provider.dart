import 'package:flutter/foundation.dart';

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
    // TODO: ApiService.post('/api/notifications/register-token', body: {'userId': ..., 'token': token, 'platform': platform})
    notifyListeners();
  }

  Future<void> fetchHistory(String userId) async {
    _isLoading = true;
    notifyListeners();
    // TODO: ApiService.get('/api/notifications/history/$userId')
    _notifications = [
      {'id': 'n1', 'title': 'Queue Called!', 'body': 'Your Keke is ready!', 'isRead': false, 'createdAt': '2026-07-13T04:00:00Z'},
      {'id': 'n2', 'title': 'Payment Received', 'body': '₦100 received', 'isRead': true, 'createdAt': '2026-07-12T15:00:00Z'},
    ];
    _unreadCount = _notifications.where((n) => n['isRead'] == false).length;
    _isLoading = false;
    notifyListeners();
  }

  Future<void> markRead(String notificationId) async {
    // TODO: ApiService.post('/api/notifications/mark-read/$notificationId')
    final idx = _notifications.indexWhere((n) => n['id'] == notificationId);
    if (idx >= 0) {
      _notifications[idx]['isRead'] = true;
      _unreadCount = _notifications.where((n) => n['isRead'] == false).length;
      notifyListeners();
    }
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
