import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontSize, BorderRadius, Spacing } from '../config/theme';

interface OfflineBannerProps {
  isOnline: boolean;
}

export function OfflineBanner({ isOnline }: OfflineBannerProps) {
  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerIcon}>📡</Text>
      <Text style={styles.bannerText}>
        You are offline. Transactions will be queued and synced when connection returns.
      </Text>
    </View>
  );
}

interface SyncStatusIndicatorProps {
  pendingCount: number;
  lastSyncTime?: string;
  isOnline: boolean;
  onSync?: () => void;
}

export function SyncStatusIndicator({
  pendingCount,
  lastSyncTime,
  isOnline,
  onSync,
}: SyncStatusIndicatorProps) {
  if (pendingCount === 0 && isOnline) {
    return (
      <View style={[styles.statusCard, styles.statusCardSynced]}>
        <Text style={styles.statusIcon}>✅</Text>
        <Text style={[styles.statusText, { color: Colors.success }]}>All synced</Text>
        {lastSyncTime && <Text style={styles.syncTime}>{lastSyncTime}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.statusCard, styles.statusCardPending]}>
      <Text style={styles.statusIcon}>{isOnline ? '🔄' : '📡'}</Text>
      <View style={styles.statusContent}>
        <Text style={styles.statusText}>
          {isOnline
            ? `${pendingCount} pending transactions`
            : `Offline — ${pendingCount} queued`}
        </Text>
        {lastSyncTime && <Text style={styles.syncTime}>Last sync: {lastSyncTime}</Text>}
      </View>
      {isOnline && onSync && (
        <TouchableOpacity onPress={onSync} style={styles.syncBtn}>
          <Text style={styles.syncBtnText}>Sync Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.error,
  },
  bannerIcon: { fontSize: 18, marginRight: 12 },
  bannerText: {
    flex: 1,
    color: Colors.white,
    fontSize: 12,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statusCardSynced: {
    backgroundColor: 'rgba(46,125,50,0.1)',
    borderColor: Colors.success,
  },
  statusCardPending: {
    backgroundColor: 'rgba(255,160,0,0.1)',
    borderColor: Colors.warning,
  },
  statusIcon: { fontSize: 20, marginRight: 12 },
  statusContent: { flex: 1 },
  statusText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.black,
  },
  syncTime: {
    fontSize: 11,
    color: Colors.grey,
    marginTop: 2,
  },
  syncBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.black,
    borderRadius: BorderRadius.sm,
  },
  syncBtnText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
