import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/services/offline_state.dart';

/// Offline banner that appears at the top when the device has no internet.
/// Shows sync status when connection is restored.
class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<OfflineState>(
      builder: (context, offline, _) {
        if (offline.isOnline) return const SizedBox.shrink();

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          color: DouTheme.error,
          child: Row(
            children: [
              const Icon(Icons.wifi_off, color: DouTheme.white, size: 18),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'You are offline. Transactions will be queued and synced when connection returns.',
                  style: TextStyle(color: DouTheme.white, fontSize: 12),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Sync status indicator — shows pending items and a manual sync button.
class SyncStatusIndicator extends StatelessWidget {
  final int pendingCount;
  final String? lastSyncTime;
  final bool isOnline;
  final VoidCallback? onSync;

  const SyncStatusIndicator({
    super.key,
    required this.pendingCount,
    this.lastSyncTime,
    required this.isOnline,
    this.onSync,
  });

  @override
  Widget build(BuildContext context) {
    if (pendingCount == 0 && isOnline) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: DouTheme.success.withOpacity(0.1),
          border: Border.all(color: DouTheme.success, width: 1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            const Icon(Icons.cloud_done, color: DouTheme.success, size: 20),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'All synced',
                style: TextStyle(fontSize: 13, color: DouTheme.success),
              ),
            ),
            if (lastSyncTime != null)
              Text(
                lastSyncTime!,
                style: const TextStyle(fontSize: 11, color: DouTheme.grey),
              ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: DouTheme.warning.withOpacity(0.1),
        border: Border.all(color: DouTheme.warning, width: 1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            isOnline ? Icons.sync : Icons.wifi_off,
            color: isOnline ? DouTheme.warning : DouTheme.error,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isOnline
                      ? '$pendingCount pending transactions'
                      : 'Offline — $pendingCount queued',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                ),
                if (lastSyncTime != null)
                  Text(
                    'Last sync: $lastSyncTime',
                    style: const TextStyle(fontSize: 11, color: DouTheme.grey),
                  ),
              ],
            ),
          ),
          if (isOnline && onSync != null)
            TextButton(
              onPressed: onSync,
              child: const Text('Sync Now', style: TextStyle(fontSize: 12)),
            ),
        ],
      ),
    );
  }
}
