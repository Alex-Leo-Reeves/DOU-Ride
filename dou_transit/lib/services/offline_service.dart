import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'dart:math';
import 'dart:typed_data';

/// Offline resilience service.
/// Handles:
///   1. Offline boarding pass storage (encrypted)
///   2. Local transaction queue with pending sync
///   3. Emergency SMS fallback
///   4. OSM tile caching management
///   5. Network-aware graceful degradation
class OfflineService {
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage();

  // Storage keys
  static const String _boardingPassPrefix = 'boarding_pass_';
  static const String _transactionQueueKey = 'offline_tx_queue';
  static const String _lastSyncKey = 'last_offline_sync';
  static const String _emergencySmsQueueKey = 'emergency_sms_queue';

  // Connectivity
  static final Connectivity _connectivity = Connectivity();
  static bool _isOnline = true;
  static StreamSubscription? _connectivitySubscription;

  // Tile cache directory
  static String? _tileCacheDir;

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /// Initialize offline service. Call once at app startup.
  static Future<void> initialize() async {
    // Set up tile cache directory
    final dir = await getTemporaryDirectory();
    _tileCacheDir = '${dir.path}/tile_cache';

    // Create tile cache directory
    final tileDir = Directory(_tileCacheDir!);
    if (!await tileDir.exists()) {
      await tileDir.create(recursive: true);
    }

    // Listen for connectivity changes
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen((results) {
      final wasOffline = !_isOnline;
      _isOnline = !results.contains(ConnectivityResult.none);

      if (wasOffline && _isOnline) {
        debugPrint('[Offline] Connection restored — attempting sync');
        syncPendingTransactions();
      }
    });

    // Check initial connectivity
    final result = await _connectivity.checkConnectivity();
    _isOnline = !result.contains(ConnectivityResult.none);

    debugPrint('[Offline] Service initialized. Online: $_isOnline');
  }

  static void dispose() {
    _connectivitySubscription?.cancel();
  }

  static bool get isOnline => _isOnline;

  // ============================================================
  // OFFLINE BOARDING PASSES
  // ============================================================

  /// Save an encrypted boarding pass locally.
  static Future<void> saveBoardingPass({
    required String tripId,
    required String boardingPass,
    required String pin,
    required String destinationName,
    required int fleetNumber,
    required double fare,
    required int expiresAt,
  }) async {
    final passData = jsonEncode({
      'tripId': tripId,
      'boardingPass': boardingPass,
      'pin': pin,
      'destinationName': destinationName,
      'fleetNumber': fleetNumber,
      'fare': fare,
      'expiresAt': expiresAt,
      'savedAt': DateTime.now().millisecondsSinceEpoch,
    });

    await _secureStorage.write(key: '$_boardingPassPrefix$tripId', value: passData);
    debugPrint('[Offline] Boarding pass saved for trip $tripId');
  }

  /// Retrieve a saved boarding pass by trip ID.
  static Future<Map<String, dynamic>?> getBoardingPass(String tripId) async {
    final data = await _secureStorage.read(key: '$_boardingPassPrefix$tripId');
    if (data == null) return null;

    try {
      final pass = jsonDecode(data) as Map<String, dynamic>;
      final expiresAt = pass['expiresAt'] as int;

      // Check if expired
      if (DateTime.now().millisecondsSinceEpoch > expiresAt) {
        await _secureStorage.delete(key: '$_boardingPassPrefix$tripId');
        debugPrint('[Offline] Boarding pass for trip $tripId expired, deleted');
        return null;
      }

      return pass;
    } catch (e) {
      debugPrint('[Offline] Error reading boarding pass: $e');
      return null;
    }
  }

  /// Get all saved boarding passes (active, non-expired).
  static Future<List<Map<String, dynamic>>> getAllBoardingPasses() async {
    final all = await _secureStorage.readAll();
    final passes = <Map<String, dynamic>>[];

    for (final entry in all.entries) {
      if (entry.key.startsWith(_boardingPassPrefix)) {
        try {
          final pass = jsonDecode(entry.value) as Map<String, dynamic>;
          final expiresAt = pass['expiresAt'] as int;

          if (DateTime.now().millisecondsSinceEpoch <= expiresAt) {
            passes.add(pass);
          } else {
            await _secureStorage.delete(key: entry.key);
          }
        } catch (_) {}
      }
    }

    return passes;
  }

  /// Remove a boarding pass after use.
  static Future<void> removeBoardingPass(String tripId) async {
    await _secureStorage.delete(key: '$_boardingPassPrefix$tripId');
  }

  // ============================================================
  // LOCAL TRANSACTION QUEUE
  // ============================================================

  /// Queue a transaction for later sync when offline.
  /// [endpoint] = e.g. '/api/rides/pay-link/scan'
  /// [body] = the JSON request body
  /// [localId] = optional unique ID for dedup
  static Future<void> queueTransaction({
    required String endpoint,
    required Map<String, dynamic> body,
    String? localId,
  }) async {
    final tx = {
      'localId': localId ?? '${DateTime.now().millisecondsSinceEpoch}_${Random().nextInt(9999)}',
      'endpoint': endpoint,
      'body': body,
      'queuedAt': DateTime.now().millisecondsSinceEpoch,
      'status': 'pending',
    };

    final queue = await _getTransactionQueue();
    queue.add(tx);
    await _saveTransactionQueue(queue);

    debugPrint('[Offline] Transaction queued: $endpoint');
  }

  /// Get all pending transactions.
  static Future<List<Map<String, dynamic>>> getPendingTransactions() async {
    final queue = await _getTransactionQueue();
    return queue.where((tx) => tx['status'] == 'pending').toList();
  }

  /// Sync all pending transactions to the backend.
  static Future<int> syncPendingTransactions() async {
    if (!_isOnline) {
      debugPrint('[Offline] Cannot sync — still offline');
      return 0;
    }

    final pending = await getPendingTransactions();
    if (pending.isEmpty) {
      debugPrint('[Offline] No pending transactions to sync');
      return 0;
    }

    debugPrint('[Offline] Syncing ${pending.length} transactions...');

    try {
      final response = await http.post(
        Uri.parse('http://10.0.2.2:8080/api/offline/sync'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'transactions': pending}),
      );

      if (response.statusCode == 200) {
        // Clear the queue on successful sync
        await _saveTransactionQueue([]);
        await _secureStorage.write(
          key: _lastSyncKey,
          value: DateTime.now().toIso8601String(),
        );

        debugPrint('[Offline] Sync successful — ${pending.length} transactions processed');
        return pending.length;
      } else {
        debugPrint('[Offline] Sync failed: ${response.body}');
        return 0;
      }
    } catch (e) {
      debugPrint('[Offline] Sync error: $e');
      return 0;
    }
  }

  /// Get last sync time.
  static Future<String?> getLastSyncTime() async {
    return await _secureStorage.read(key: _lastSyncKey);
  }

  /// Get total queued transaction count.
  static Future<int> getQueuedCount() async {
    final queue = await _getTransactionQueue();
    return queue.where((tx) => tx['status'] == 'pending').length;
  }

  static Future<List<Map<String, dynamic>>> _getTransactionQueue() async {
    final data = await _secureStorage.read(key: _transactionQueueKey);
    if (data == null) return [];
    try {
      return (jsonDecode(data) as List).cast<Map<String, dynamic>>();
    } catch (e) {
      return [];
    }
  }

  static Future<void> _saveTransactionQueue(List<Map<String, dynamic>> queue) async {
    await _secureStorage.write(key: _transactionQueueKey, value: jsonEncode(queue));
  }

  // ============================================================
  // EMERGENCY SMS FALLBACK
  // ============================================================

  /// Queue an emergency SMS for fallback when offline.
  static Future<Map<String, dynamic>> queueEmergencySms({
    required String phone,
    required double lat,
    required double lng,
    String message = 'I need medical attention at DOU campus!',
  }) async {
    final emergency = {
      'id': 'emerg_${DateTime.now().millisecondsSinceEpoch}',
      'phone': phone,
      'lat': lat,
      'lng': lng,
      'message': message,
      'queuedAt': DateTime.now().millisecondsSinceEpoch,
      'status': 'pending',
    };

    // Save locally
    final queue = await _getEmergencySmsQueue();
    queue.add(emergency);
    await _saveEmergencySmsQueue(queue);

    // If online, send immediately via backend
    if (_isOnline) {
      try {
        final response = await http.post(
          Uri.parse('http://10.0.2.2:8080/api/offline/emergency-sms'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'phone': phone,
            'lat': lat.toString(),
            'lng': lng.toString(),
            'message': message,
          }),
        );

        if (response.statusCode == 200) {
          final result = jsonDecode(response.body);
          emergency['status'] = 'sent';
          emergency['incidentId'] = result['incidentId'];
          await _saveEmergencySmsQueue(await _getEmergencySmsQueue()); // persist update
          return emergency;
        }
      } catch (e) {
        debugPrint('[Offline] Emergency SMS send failed: $e');
      }
    }

    debugPrint('[Offline] Emergency SMS queued: $phone');
    return emergency;
  }

  static Future<List<Map<String, dynamic>>> _getEmergencySmsQueue() async {
    final data = await _secureStorage.read(key: _emergencySmsQueueKey);
    if (data == null) return [];
    try {
      return (jsonDecode(data) as List).cast<Map<String, dynamic>>();
    } catch (e) {
      return [];
    }
  }

  static Future<void> _saveEmergencySmsQueue(List<Map<String, dynamic>> queue) async {
    // Keep only recent entries (last 10)
    final recent = queue.length > 10 ? queue.sublist(queue.length - 10) : queue;
    await _secureStorage.write(key: _emergencySmsQueueKey, value: jsonEncode(recent));
  }

  // ============================================================
  // OSM TILE CACHING
  // ============================================================

  /// Get the tile cache directory path.
  static Future<String> getTileCacheDir() async {
    if (_tileCacheDir == null) {
      final dir = await getTemporaryDirectory();
      _tileCacheDir = '${dir.path}/tile_cache';
    }
    return _tileCacheDir!;
  }

  /// Get cache size in bytes.
  static Future<int> getTileCacheSize() async {
    final dir = Directory(await getTileCacheDir());
    if (!await dir.exists()) return 0;

    int totalSize = 0;
    await for (final entity in dir.list(recursive: true)) {
      if (entity is File) {
        totalSize += await entity.length();
      }
    }
    return totalSize;
  }

  /// Clear the tile cache.
  static Future<void> clearTileCache() async {
    final dir = Directory(await getTileCacheDir());
    if (await dir.exists()) {
      await dir.delete(recursive: true);
      await dir.create(recursive: true);
      debugPrint('[Offline] Tile cache cleared');
    }
  }

  /// Format cache size for display.
  static String formatTileCacheSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  // ============================================================
  // NETWORK STATUS
  // ============================================================

  /// Execute an HTTP request with offline fallback.
  /// If offline, queues the transaction and returns a local-only response.
  static Future<Map<String, dynamic>> executeWithOfflineFallback({
    required String endpoint,
    required Map<String, dynamic> body,
    required String httpMethod, // 'POST', 'PUT', 'DELETE'
  }) async {
    if (_isOnline) {
      try {
        final url = Uri.parse('http://10.0.2.2:8080$endpoint');
        http.Response response;

        switch (httpMethod) {
          case 'GET':
            response = await http.get(url, headers: {'Content-Type': 'application/json'});
            break;
          case 'PUT':
            response = await http.put(url, headers: {'Content-Type': 'application/json'}, body: jsonEncode(body));
            break;
          case 'DELETE':
            response = await http.delete(url, headers: {'Content-Type': 'application/json'});
            break;
          default: // POST
            response = await http.post(url, headers: {'Content-Type': 'application/json'}, body: jsonEncode(body));
        }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          return jsonDecode(response.body) as Map<String, dynamic>;
        }

        return {'error': 'HTTP ${response.statusCode}', 'details': response.body};
      } catch (e) {
        // Network error — fall through to offline queue
        debugPrint('[Offline] Network error on $endpoint: $e');
      }
    }

    // Offline: queue for later
    await queueTransaction(endpoint: endpoint, body: body);
    return {
      'offline': true,
      'message': 'Transaction queued for sync',
      'queuedEndpoint': endpoint,
    };
  }
}
