import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/services/api_service.dart';
import 'package:dou_transit/providers/notification_provider.dart';

/// Service for managing FCM tokens and push notifications (Android).
/// Also handles iOS PWA web push subscription detection.
class FcmService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  static String? _currentToken;

  /// Initialize FCM and request permissions.
  static Future<void> initialize() async {
    // Request notification permissions (Android 13+, iOS)
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      debugPrint('[FCM] Notification permission denied');
      return;
    }

    debugPrint('[FCM] Notification permission granted');

    // Initialize local notifications channel
    const androidChannel = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const initSettings = InitializationSettings(
      android: androidChannel,
      iOS: iosSettings,
    );
    await _localNotifications.initialize(initSettings);

    // Get the FCM token
    _currentToken = await _messaging.getToken();
    debugPrint('[FCM] Token: $_currentToken');

    // Listen for token refresh
    _messaging.onTokenRefresh.listen((token) {
      _currentToken = token;
      debugPrint('[FCM] Token refreshed: $token');
    });

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Handle notification taps when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    // Check if app was opened from a terminated notification
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }
  }

  /// Register the FCM token with the backend API.
  /// Called from AuthProvider after login/registration.
  static Future<void> registerToken(String userId, {String platform = 'android'}) async {
    if (_currentToken == null) {
      debugPrint('[FCM] No token to register');
      return;
    }
    try {
      final result = await ApiService.post('/api/notifications/register-token', body: {
        'userId': userId,
        'token': _currentToken!,
        'platform': platform,
      });
      if (result.containsKey('error')) {
        debugPrint('[FCM] Token registration failed: ${result['error']}');
      } else {
        debugPrint('[FCM] Token registered for user $userId ($platform)');
      }
    } catch (e) {
      debugPrint('[FCM] Token registration error: $e');
    }
  }

  static String? get currentToken => _currentToken;

  static void _handleForegroundMessage(RemoteMessage message) {
    debugPrint('[FCM] Foreground message: ${message.notification?.title}');
    final notification = message.notification;
    if (notification != null) {
      _showLocalNotification(
        notification.title ?? 'DOU Transit',
        notification.body ?? '',
        message.data,
      );
    }
  }

  static void _handleNotificationTap(RemoteMessage message) {
    debugPrint('[FCM] Notification tapped: ${message.data}');
    // Navigation is handled by the service worker for iOS PWA,
    // and by this handler for Android.
    final type = message.data['type'];
    // The app can navigate based on type (queue_called -> queue screen, etc.)
  }

  static Future<void> _showLocalNotification(
    String title,
    String body,
    Map<String, dynamic> data,
  ) async {
    const androidDetails = AndroidNotificationDetails(
      'dou_transit_default',
      'DOU Transit Notifications',
      channelDescription: 'Ride queue updates, payments, and alerts',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
      enableVibration: true,
      playSound: true,
    );
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title,
      body,
      details,
      payload: data['type'] ?? '',
    );
  }
}
