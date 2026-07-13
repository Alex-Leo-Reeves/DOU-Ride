import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:dou_transit/services/fcm_service.dart';

class AuthProvider extends ChangeNotifier {
  String? _userId;
  String? _fullName;
  String? _role;
  String? _token;
  bool _isLoggedIn = false;
  bool _needsOnboarding = false;
  bool _isSuspended = false;
  String? _suspensionReason;
  bool _isLoading = false;
  bool _fcmRegistered = false;

  // Getters
  String? get userId => _userId;
  String? get fullName => _fullName;
  String? get role => _role;
  String? get token => _token;
  bool get isLoggedIn => _isLoggedIn;
  bool get needsOnboarding => _needsOnboarding;
  bool get isSuspended => _isSuspended;
  String? get suspensionReason => _suspensionReason;
  bool get isLoading => _isLoading;
  bool get fcmRegistered => _fcmRegistered;

  bool get isStudent => _role == 'student';
  bool get isDriver => _role == 'driver';
  bool get isSecurity => _role == 'security';
  bool get isAdmin => _role == 'admin';
  bool get isVendor => _role == 'vendor';
  bool get isDeveloper => _role == 'developer';

  final String baseUrl = 'http://10.0.2.2:8080';

  Future<bool> login(String emailOrPhone, String password) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'emailOrPhone': emailOrPhone,
          'password': password,
        }),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _userId = data['userId'];
        _token = data['token'];
        _role = data['role'];
        _fullName = data['fullName'];
        _needsOnboarding = data['needsOnboarding'] ?? false;
        _isLoggedIn = true;
        _isSuspended = false;
        _isLoading = false;
        notifyListeners();
        _registerFcm();
        return true;
      }
    } catch (e) {
      debugPrint('Login error: $e');
    }
    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> registerStudent(Map<String, dynamic> req) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/register/student'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(req),
      );
      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        _userId = data['userId'];
        _token = data['token'];
        _role = 'student';
        _fullName = data['fullName'];
        _isLoggedIn = true;
        _isLoading = false;
        notifyListeners();
        _registerFcm();
        return true;
      }
    } catch (e) {
      debugPrint('Register error: $e');
    }
    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> registerDriver(Map<String, dynamic> req) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/register/driver'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(req),
      );
      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        _userId = data['userId'];
        _token = data['token'];
        _role = 'driver';
        _fullName = data['fullName'];
        _isLoggedIn = true;
        _isLoading = false;
        notifyListeners();
        _registerFcm();
        return true;
      }
    } catch (e) {
      debugPrint('Driver register error: $e');
    }
    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> developerAccess(String username, String password) async {
    _isLoading = true;
    notifyListeners();
    try {
      // Developers use email-based login (admin creates them in Supabase)
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'emailOrPhone': username,
          'password': password,
        }),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['role'] == 'developer') {
          _userId = data['userId'];
          _token = data['token'];
          _role = 'developer';
          _fullName = data['fullName'];
          _isLoggedIn = true;
          _isLoading = false;
          notifyListeners();
          _registerFcm();
          return true;
        }
      }
    } catch (e) {
      debugPrint('Developer access error: $e');
    }
    _isLoading = false;
    notifyListeners();
    return false;
  }

  /// Register the FCM push notification token with the backend.
  Future<void> _registerFcm() async {
    if (_userId == null || _fcmRegistered) return;
    final token = FcmService.currentToken;
    if (token == null) {
      debugPrint('[Auth] No FCM token available yet, will retry');
      // Try again after a short delay in case token just initialized
      await Future.delayed(const Duration(seconds: 3));
      final retryToken = FcmService.currentToken;
      if (retryToken == null) return;
      await FcmService.registerToken(_userId!, platform: _role ?? 'android');
      _fcmRegistered = true;
      return;
    }
    await FcmService.registerToken(_userId!, platform: _role ?? 'android');
    _fcmRegistered = true;
  }

  void logout() {
    _userId = null;
    _fullName = null;
    _role = null;
    _token = null;
    _isLoggedIn = false;
    _needsOnboarding = false;
    _isSuspended = false;
    _suspensionReason = null;
    notifyListeners();
  }

  void setSuspended(bool suspended, {String? reason}) {
    _isSuspended = suspended;
    _suspensionReason = reason;
    notifyListeners();
  }
}
