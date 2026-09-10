import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Linking,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Store,
  Clock,
  CheckCircle2,
  Car,
  Phone,
  MapPin,
  Package,
  CookingPot,
  ArrowRight,
  Sparkles,
  LogOut,
  TrendingUp,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useMarketplaceStore } from '../../stores/marketplaceStore';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { DouCard } from '../../components/DouCard';

export default function VendorOrderFeed() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user, logout: authLogout } = useAuthStore();
  const { vendorOrders, isLoading, fetchVendorOrders, acceptOrder, markReady } = useMarketplaceStore();
  const [tab, setTab] = useState<'incoming' | 'preparing' | 'ready'>('incoming');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchVendorOrders(user?.token);
    const interval = setInterval(() => {
      fetchVendorOrders(user?.token);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchVendorOrders(user?.token);
  };

  const handleAccept = async (orderId: string) => {
    setProcessingId(orderId);
    await acceptOrder(orderId, user?.token);
    setProcessingId(null);
  };

  const handleMarkReady = async (orderId: string) => {
    setProcessingId(orderId);
    await markReady(orderId, user?.token);
    setProcessingId(null);
  };

  const filtered = vendorOrders.filter((o) => {
    const s = (o.status ?? '') as string;
    if (tab === 'incoming') return s === 'pending' || s === 'accepted';
    if (tab === 'preparing') return s === 'preparing';
    return s === 'ready_for_pickup' || s === 'in_transit' || s === 'delivered';
  });

  const totalSales = vendorOrders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceLight} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.storeIconWrap}>
            <Store size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.storeName}>{user?.fullName ?? 'Mummy B Kitchen'}</Text>
            <View style={styles.statusPill}>
              <View style={styles.greenPulse} />
              <Text style={styles.statusPillText}>Accepting Orders • DOU Asaba</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            authLogout();
            navigation.reset({ index: 0, routes: [{ name: Routes.roleSelection }] });
          }}
        >
          <LogOut size={16} color={Colors.slate600} />
        </TouchableOpacity>
      </View>

      {/* Sales Summary Strip */}
      <View style={styles.salesStrip}>
        <View style={styles.salesItem}>
          <Text style={styles.salesLabel}>Today's Orders</Text>
          <Text style={styles.salesValue}>{vendorOrders.length}</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.salesItem}>
          <Text style={styles.salesLabel}>Total Revenue</Text>
          <Text style={[styles.salesValue, { color: Colors.success }]}>
            ₦{totalSales.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* 3-Stage Kanban Tabs */}
      <View style={styles.tabSection}>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'incoming' && styles.tabButtonActive]}
          onPress={() => setTab('incoming')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'incoming' && styles.tabTextActive]}>
            Incoming (
            {vendorOrders.filter((o) => o.status === 'pending' || o.status === 'accepted').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, tab === 'preparing' && styles.tabButtonActive]}
          onPress={() => setTab('preparing')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'preparing' && styles.tabTextActive]}>
            Preparing ({vendorOrders.filter((o) => o.status === 'preparing').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, tab === 'ready' && styles.tabButtonActive]}
          onPress={() => setTab('ready')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'ready' && styles.tabTextActive]}>
            Ready & In Transit
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {isLoading && vendorOrders.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Syncing store order queue...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package size={50} color={Colors.slate300} />
              <Text style={styles.emptyTitle}>No Orders in this Queue</Text>
              <Text style={styles.emptySub}>
                New student orders will ring in automatically with sound.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isProcessing = processingId === item.id;
            const items = item.items || [
              { name: 'Jollof Rice + Fried Chicken', quantity: 1, price: 1200 },
              { name: 'Cold Maltina', quantity: 1, price: 400 },
            ];

            return (
              <DouCard variant="elevated" padding={Spacing.md} style={styles.orderCard}>
                {/* Order Header */}
                <View style={styles.orderCardHeader}>
                  <View>
                    <Text style={styles.studentName}>{item.studentName || 'Student Order'}</Text>
                    <View style={styles.locationRow}>
                      <MapPin size={12} color={Colors.slate500} />
                      <Text style={styles.locationText}>
                        {item.deliveryDestination || 'NDDC Hostel Gate, Campus'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.totalBadge}>
                    <Text style={styles.totalText}>₦{(item.totalAmount ?? 1600).toLocaleString()}</Text>
                  </View>
                </View>

                {/* Items Manifest */}
                <View style={styles.itemsBox}>
                  {items.map((it: any, idx: number) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemQty}>{it.quantity || 1}x</Text>
                      <Text style={styles.itemName}>{it.name || it.item}</Text>
                      <Text style={styles.itemPrice}>₦{((it.price || 0) * (it.quantity || 1)).toLocaleString()}</Text>
                    </View>
                  ))}
                </View>

                {/* Handshake Security PIN when Ready */}
                {(tab === 'ready' || item.status === 'ready_for_pickup') && (
                  <View style={styles.kekeHandshakeBox}>
                    <View style={styles.handshakeLeft}>
                      <Car size={16} color={Colors.primary} />
                      <View>
                        <Text style={styles.handshakeTitle}>Assigned Keke Escort</Text>
                        <Text style={styles.handshakeSub}>
                          {item.driverFleetNumber ? `Fleet #${item.driverFleetNumber}` : 'Waiting for Keke dispatch'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.pinTag}>
                      <Text style={styles.pinLabel}>PACKAGE PIN</Text>
                      <Text style={styles.pinCode}>{item.packagePin || '305'}</Text>
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  {tab === 'incoming' && (
                    <TouchableOpacity
                      style={styles.actionPrimaryBtn}
                      onPress={() => handleAccept(item.id)}
                      disabled={isProcessing}
                      activeOpacity={0.8}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <>
                          <CookingPot size={16} color={Colors.white} />
                          <Text style={styles.actionPrimaryBtnText}>Accept & Start Cooking</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {tab === 'preparing' && (
                    <TouchableOpacity
                      style={[styles.actionPrimaryBtn, { backgroundColor: Colors.secondary }]}
                      onPress={() => handleMarkReady(item.id)}
                      disabled={isProcessing}
                      activeOpacity={0.8}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <>
                          <CheckCircle2 size={16} color={Colors.white} />
                          <Text style={styles.actionPrimaryBtnText}>Packed • Call Keke Courier</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </DouCard>
            );
          }}
        />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  storeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    fontSize: FontSize.base,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  greenPulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.success,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate500,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salesStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  salesItem: {
    flex: 1,
    alignItems: 'center',
  },
  stripDivider: {
    width: 1,
    backgroundColor: Colors.slate200,
  },
  salesLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate500,
    textTransform: 'uppercase',
  },
  salesValue: {
    fontSize: FontSize.base,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
    marginTop: 2,
  },
  tabSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate600,
  },
  tabTextActive: {
    color: Colors.white,
    fontFamily: 'Inter_600SemiBold',
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate500,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.xs,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate700,
    marginTop: Spacing.sm,
  },
  emptySub: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate400,
    textAlign: 'center',
  },
  orderCard: {
    marginBottom: Spacing.xs,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  studentName: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate600,
  },
  totalBadge: {
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  totalText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  itemsBox: {
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.md,
    padding: 10,
    gap: 6,
    marginBottom: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemQty: {
    width: 28,
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  itemName: {
    flex: 1,
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate800,
  },
  itemPrice: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate600,
  },
  kekeHandshakeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary + '08',
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
    marginBottom: Spacing.sm,
  },
  handshakeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  handshakeTitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  handshakeSub: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: Colors.primary,
  },
  pinTag: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  pinLabel: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate500,
  },
  pinCode: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
    letterSpacing: 1.5,
  },
  actionRow: {
    marginTop: 2,
  },
  actionPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  actionPrimaryBtnText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
});
