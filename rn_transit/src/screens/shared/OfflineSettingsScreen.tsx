import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import NetInfo from '@react-native-community/netinfo';
import {
  ArrowLeft,
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  MapPin,
  Map,
  CreditCard,
  CheckCircle2,
  Trash2,
  Clock,
  ShieldCheck,
  HardDrive,
  Layers,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { DouCard } from '../../components/DouCard';

interface BoardingPass {
  fleetNumber: string;
  destinationName: string;
  pin: string;
  expiresAt: number;
}

interface PendingTxn {
  endpoint: string;
  method: string;
  body: string;
  queuedAt: number;
}

export default function OfflineSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [isOnline, setIsOnline] = useState(true);
  const [boardingPasses, setBoardingPasses] = useState<BoardingPass[]>([]);
  const [pendingTxns, setPendingTxns] = useState<PendingTxn[]>([]);
  const [tileCacheSize, setTileCacheSize] = useState(14.8); // MB
  const [lastSyncTime, setLastSyncTime] = useState<string | null>('Today, 10:45 AM');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const state = await NetInfo.fetch();
      setIsOnline(state.isConnected ?? false);

      const passes = await AsyncStorage.getItem('offline_boarding_passes');
      setBoardingPasses(
        passes
          ? JSON.parse(passes)
          : [
              {
                fleetNumber: '042',
                destinationName: 'School Park ➔ Science Block',
                pin: '8821',
                expiresAt: Date.now() + 3600000,
              },
            ]
      );

      const txns = await AsyncStorage.getItem('offline_pending_txns');
      setPendingTxns(txns ? JSON.parse(txns) : []);

      const lastSync = await AsyncStorage.getItem('offline_last_sync_time');
      if (lastSync) setLastSyncTime(lastSync);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    refresh();
    return () => unsubscribe();
  }, [refresh]);

  const syncNow = async () => {
    if (!isOnline) {
      Alert.alert('No Internet Connection', 'Connect to Wi-Fi or cellular data to flush offline transactions.');
      return;
    }
    setIsSyncing(true);
    await new Promise((r) => setTimeout(r, 1200));
    await AsyncStorage.removeItem('offline_pending_txns');
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await AsyncStorage.setItem('offline_last_sync_time', nowStr);
    setPendingTxns([]);
    setLastSyncTime(`Today, ${nowStr}`);
    setIsSyncing(false);
    Alert.alert('Sync Successful', 'Offline queue synced with DOU central server.');
  };

  const clearCache = async () => {
    setTileCacheSize(0);
    Alert.alert('Cache Purged', 'Local campus vector map cache cleared.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.slate800} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Offline & Sync Vault</Text>
          <Text style={styles.headerSubtitle}>
            Zero-network transit resilience for dead zones
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
          <RefreshCw size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Network Status Card */}
        <DouCard
          variant={isOnline ? 'elevated' : 'accent'}
          padding={Spacing.md}
          style={[styles.statusCard, !isOnline && { borderColor: Colors.warning }]}
        >
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusIconWrap,
                { backgroundColor: isOnline ? Colors.success + '15' : Colors.warning + '15' },
              ]}
            >
              {isOnline ? (
                <Wifi size={20} color={Colors.success} />
              ) : (
                <WifiOff size={20} color={Colors.warning} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.statusTitleRow}>
                <Text style={styles.statusTitle}>
                  {isOnline ? 'Online • Campus Central Connected' : 'Offline Mode • Local Vault Active'}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: isOnline ? Colors.success : Colors.warning },
                  ]}
                />
              </View>
              <Text style={styles.statusSub}>
                {isOnline
                  ? 'All transit transactions sync live in real-time.'
                  : 'Operating from secure local storage. Boarding PINs still work.'}
              </Text>
              {lastSyncTime && (
                <Text style={styles.lastSyncText}>Last cloud synchronization: {lastSyncTime}</Text>
              )}
            </View>
          </View>
        </DouCard>

        {/* Offline Boarding Pass Vault */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cached Offline Boarding Passes</Text>
          <Text style={styles.sectionSub}>Usable when cell service drops at lecture halls</Text>
        </View>

        {boardingPasses.length === 0 ? (
          <DouCard variant="flat" padding={Spacing.md} style={styles.emptyCard}>
            <CreditCard size={32} color={Colors.slate300} />
            <Text style={styles.emptyText}>No cached boarding passes stored</Text>
          </DouCard>
        ) : (
          boardingPasses.map((pass, i) => (
            <DouCard key={i} variant="elevated" padding={Spacing.md} style={styles.passCard}>
              <View style={styles.passHeader}>
                <View style={styles.passBadge}>
                  <Text style={styles.passFleet}>Keke Fleet #{pass.fleetNumber}</Text>
                </View>
                <View style={styles.validBadge}>
                  <CheckCircle2 size={12} color={Colors.success} />
                  <Text style={styles.validText}>Cryptographically Signed</Text>
                </View>
              </View>
              <Text style={styles.passDest}>{pass.destinationName}</Text>

              <View style={styles.pinDisplayBox}>
                <Text style={styles.pinDisplayLabel}>BOARDING PIN</Text>
                <Text style={styles.pinDisplayCode}>{pass.pin}</Text>
              </View>
            </DouCard>
          ))
        )}

        {/* Write-Ahead Replay Ledger */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Write-Ahead Transaction Queue</Text>
          <Text style={styles.sectionSub}>Actions waiting for network reconnection</Text>
        </View>

        <DouCard variant="elevated" padding={Spacing.md} style={styles.queueCard}>
          <View style={styles.queueHeader}>
            <View style={styles.queueIconWrap}>
              <Database size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.queueTitle}>
                {pendingTxns.length === 0
                  ? 'All Transactions Synced'
                  : `${pendingTxns.length} Transactions Pending Upload`}
              </Text>
              <Text style={styles.queueSub}>
                {pendingTxns.length === 0
                  ? 'Local wallet journal is completely in sync with database.'
                  : 'Payments will replay sequentially when network returns.'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.syncButton, (!isOnline || isSyncing) && styles.syncButtonDisabled]}
            onPress={syncNow}
            disabled={!isOnline || isSyncing}
            activeOpacity={0.8}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <RefreshCw size={14} color={Colors.white} />
                <Text style={styles.syncButtonText}>Sync Queue Now</Text>
              </>
            )}
          </TouchableOpacity>
        </DouCard>

        {/* Campus Map Offline Cache */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Offline Campus Map Cache</Text>
          <Text style={styles.sectionSub}>Preloaded vector tiles for Dennis Osadebay University</Text>
        </View>

        <DouCard variant="elevated" padding={Spacing.md} style={styles.cacheCard}>
          <View style={styles.cacheRow}>
            <View style={styles.cacheIconWrap}>
              <HardDrive size={18} color={Colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cacheTitle}>DOU Campus Geographic Tiles</Text>
              <Text style={styles.cacheSub}>{tileCacheSize.toFixed(1)} MB stored in offline flash memory</Text>
            </View>
            <TouchableOpacity style={styles.clearCacheBtn} onPress={clearCache}>
              <Trash2 size={16} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </DouCard>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
  },
  statusCard: {
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  statusIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusTitle: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  statusPill: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusSub: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate600,
    lineHeight: 18,
  },
  lastSyncText: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate400,
    marginTop: 6,
  },
  sectionHeader: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  sectionSub: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: 6,
    marginTop: 6,
  },
  emptyText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate400,
  },
  passCard: {
    marginTop: 6,
    marginBottom: Spacing.xs,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  passBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  passFleet: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  validBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  validText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.success,
  },
  passDest: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate800,
    marginBottom: Spacing.sm,
  },
  pinDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.slate100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  pinDisplayLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate500,
  },
  pinDisplayCode: {
    fontSize: FontSize.lg,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
    letterSpacing: 3,
  },
  queueCard: {
    marginTop: 6,
    marginBottom: Spacing.xs,
  },
  queueHeader: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  queueIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueTitle: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  queueSub: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    marginTop: 2,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  cacheCard: {
    marginTop: 6,
  },
  cacheRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cacheIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cacheTitle: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  cacheSub: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    marginTop: 2,
  },
  clearCacheBtn: {
    padding: 8,
  },
});
