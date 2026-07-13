import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/services/offline_service.dart';
import 'package:dou_transit/services/offline_state.dart';
import 'package:dou_transit/widgets/offline_banner.dart';

/// Offline resilience screen.
/// Shows saved boarding passes, pending transaction sync queue,
/// emergency SMS fallback history, tile cache management,
/// and network status.
class OfflineResilienceScreen extends StatefulWidget {
  const OfflineResilienceScreen({super.key});

  @override
  State<OfflineResilienceScreen> createState() => _OfflineResilienceScreenState();
}

class _OfflineResilienceScreenState extends State<OfflineResilienceScreen> {
  List<Map<String, dynamic>> _boardingPasses = [];
  List<Map<String, dynamic>> _pendingTxns = [];
  int _tileCacheSize = 0;
  String? _lastSyncTime;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() => _isLoading = true);

    final passes = await OfflineService.getAllBoardingPasses();
    final txns = await OfflineService.getPendingTransactions();
    final cacheSize = await OfflineService.getTileCacheSize();
    final lastSync = await OfflineService.getLastSyncTime();

    if (!mounted) return;
    setState(() {
      _boardingPasses = passes;
      _pendingTxns = txns;
      _tileCacheSize = cacheSize;
      _lastSyncTime = lastSync;
      _isLoading = false;
    });
  }

  Future<void> _syncNow() async {
    final count = await OfflineService.syncPendingTransactions();
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(count > 0 ? '$count transactions synced' : 'Nothing to sync'),
        backgroundColor: count > 0 ? DouTheme.success : DouTheme.grey,
      ),
    );

    _refresh();
  }

  Future<void> _clearCache() async {
    await OfflineService.clearTileCache();
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Tile cache cleared')),
    );

    _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final offlineState = context.watch<OfflineState>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Offline & Sync'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refresh,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // ============================================================
                // NETWORK STATUS
                // ============================================================
                DouCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Network Status', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: offlineState.isOnline ? DouTheme.success : DouTheme.error,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            offlineState.isOnline ? 'Online' : 'Offline',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: offlineState.isOnline ? DouTheme.success : DouTheme.error,
                            ),
                          ),
                        ],
                      ),
                      if (_lastSyncTime != null) ...[
                        const SizedBox(height: 8),
                        Text('Last sync: $_lastSyncTime', style: const TextStyle(fontSize: 12, color: DouTheme.grey)),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // ============================================================
                // SYNC QUEUE
                // ============================================================
                DouCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.sync, size: 20),
                          const SizedBox(width: 8),
                          const Text('Pending Sync', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          const Spacer(),
                          if (_pendingTxns.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: DouTheme.warning,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '${_pendingTxns.length}',
                                style: const TextStyle(color: DouTheme.white, fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (_pendingTxns.isEmpty)
                        const Text('No pending transactions', style: TextStyle(color: DouTheme.grey))
                      else
                        ...(_pendingTxns.take(5).map((tx) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            children: [
                              const Icon(Icons.hourglass_empty, size: 16, color: DouTheme.grey),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  tx['endpoint'] as String? ?? 'Unknown',
                                  style: const TextStyle(fontSize: 13),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Text(
                                _formatTimestamp(tx['queuedAt'] as int? ?? 0),
                                style: const TextStyle(fontSize: 11, color: DouTheme.grey),
                              ),
                            ],
                          ),
                        ))),
                      if (_pendingTxns.length > 5)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            '+${_pendingTxns.length - 5} more',
                            style: const TextStyle(fontSize: 12, color: DouTheme.grey, fontStyle: FontStyle.italic),
                          ),
                        ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: !offlineState.isOnline ? null : _syncNow,
                          icon: const Icon(Icons.sync, size: 18),
                          label: const Text('Sync Now'),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // ============================================================
                // SAVED BOARDING PASSES
                // ============================================================
                DouCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.confirmation_number, size: 20),
                          const SizedBox(width: 8),
                          const Text('Saved Boarding Passes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          const Spacer(),
                          if (_boardingPasses.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: DouTheme.black,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '${_boardingPasses.length}',
                                style: const TextStyle(color: DouTheme.white, fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (_boardingPasses.isEmpty)
                        const Text('No saved boarding passes', style: TextStyle(color: DouTheme.grey))
                      else
                        ...(_boardingPasses.map((pass) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            border: Border.all(color: DouTheme.black, width: 1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Fleet #${pass['fleetNumber']} → ${pass['destinationName'] ?? 'Unknown'}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              const SizedBox(height: 4),
                              Text('PIN: ${pass['pin'] ?? '----'}', style: const TextStyle(fontSize: 12)),
                              Text(
                                'Expires: ${_formatExpiry(pass['expiresAt'] as int? ?? 0)}',
                                style: TextStyle(fontSize: 11, color: _isExpired(pass['expiresAt'] as int? ?? 0) ? DouTheme.error : DouTheme.grey),
                              ),
                            ],
                          ),
                        ))),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // ============================================================
                // TILE CACHE
                // ============================================================
                DouCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.map, size: 20),
                          SizedBox(width: 8),
                          Text('Map Tile Cache', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Text('Cached size: ', style: TextStyle(fontSize: 14)),
                          Text(
                            OfflineService.formatTileCacheSize(_tileCacheSize),
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _tileCacheSize > 0 ? _clearCache : null,
                          icon: const Icon(Icons.delete_outline, size: 18),
                          label: const Text('Clear Cache'),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // ============================================================
                // INFO
                // ============================================================
                DouCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.info_outline, size: 20),
                          SizedBox(width: 8),
                          Text('How Offline Mode Works', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        '• Boarding passes are saved encrypted on your device\n'
                        '• Ride payments and requests are queued when offline\n'
                        '• Emergency alerts use SMS fallback when offline\n'
                        '• Map tiles are cached for offline navigation\n'
                        '• Everything syncs automatically when you reconnect',
                        style: TextStyle(fontSize: 13, height: 1.5),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
    );
  }

  String _formatTimestamp(int ms) {
    if (ms == 0) return '';
    final dt = DateTime.fromMillisecondsSinceEpoch(ms);
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    return '${diff.inHours}h ago';
  }

  bool _isExpired(int ms) {
    return DateTime.now().millisecondsSinceEpoch > ms;
  }

  String _formatExpiry(int ms) {
    if (_isExpired(ms)) return 'Expired';
    final dt = DateTime.fromMillisecondsSinceEpoch(ms);
    final remaining = dt.difference(DateTime.now());
    if (remaining.inMinutes < 60) return '${remaining.inMinutes} min';
    return '${remaining.inHours}h ${remaining.inMinutes % 60}m';
  }
}
