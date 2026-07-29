import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:dou_transit/config/api_config.dart';

/// Centralized HTTP service for all backend API calls.
class ApiService {
  /// Uses [ApiConfig.baseUrl] which can be overridden at build time
  /// via --dart-define=API_BASE_URL=... or defaults to the Render URL.
  static String get baseUrl => ApiConfig.baseUrl;

  /// Check if the backend is reachable.
  /// Returns null on success or an error message string.
  static Future<String?> checkBackendReachable() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/health'))
          .timeout(const Duration(seconds: 8));
      if (response.statusCode >= 200 && response.statusCode < 500) return null;
      return 'Backend responded with status ${response.statusCode}';
    } on SocketException {
      return 'Cannot reach backend at $baseUrl';
    } on http.ClientException {
      return 'Connection failed to $baseUrl';
    } catch (e) {
      return e.toString();
    }
  }

  static Future<Map<String, dynamic>> get(
    String endpoint, {
    String? token,
  }) async {
    try {
      final headers = <String, String>{
        'Content-Type': 'application/json',
      };
      if (token != null) headers['Authorization'] = 'Bearer $token';

      final response = await http
          .get(Uri.parse('$baseUrl$endpoint'), headers: headers)
          .timeout(const Duration(seconds: 15));

      return _handleResponse(response);
    } on SocketException {
      return {'error': 'No internet connection', '_backendUnreachable': true};
    } catch (e) {
      return {'error': e.toString(), '_backendUnreachable': true};
    }
  }

  static Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    try {
      final headers = <String, String>{
        'Content-Type': 'application/json',
      };
      if (token != null) headers['Authorization'] = 'Bearer $token';

      final response = await http
          .post(
            Uri.parse('$baseUrl$endpoint'),
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 15));

      return _handleResponse(response);
    } on SocketException {
      return {'error': 'No internet connection', '_backendUnreachable': true};
    } catch (e) {
      return {'error': e.toString(), '_backendUnreachable': true};
    }
  }

  static Future<Map<String, dynamic>> put(
    String endpoint, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    try {
      final headers = <String, String>{
        'Content-Type': 'application/json',
      };
      if (token != null) headers['Authorization'] = 'Bearer $token';

      final response = await http
          .put(
            Uri.parse('$baseUrl$endpoint'),
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 15));

      return _handleResponse(response);
    } on SocketException {
      return {'error': 'No internet connection', '_backendUnreachable': true};
    } catch (e) {
      return {'error': e.toString(), '_backendUnreachable': true};
    }
  }

  static Future<Map<String, dynamic>> delete(
    String endpoint, {
    String? token,
  }) async {
    try {
      final headers = <String, String>{
        'Content-Type': 'application/json',
      };
      if (token != null) headers['Authorization'] = 'Bearer $token';

      final response = await http
          .delete(Uri.parse('$baseUrl$endpoint'), headers: headers)
          .timeout(const Duration(seconds: 15));

      return _handleResponse(response);
    } on SocketException {
      return {'error': 'No internet connection', '_backendUnreachable': true};
    } catch (e) {
      return {'error': e.toString(), '_backendUnreachable': true};
    }
  }

  /// Internal: parse JSON response. Handles both JSON objects and arrays.
  static Map<String, dynamic> _handleResponse(http.Response response) {
    final decoded = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (decoded is Map<String, dynamic>) {
        return decoded;
      } else if (decoded is List) {
        // Wrap array responses in a "data" key so callers always get a Map
        return {'data': decoded};
      }
      return {'data': decoded};
    } else {
      final map = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
      return {
        'error': map['error'] ?? 'Request failed',
        'details': map['details'] ?? 'Status ${response.statusCode}',
      };
    }
  }
}
