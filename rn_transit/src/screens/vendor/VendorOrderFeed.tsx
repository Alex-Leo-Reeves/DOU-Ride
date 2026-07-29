import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useMarketplaceStore } from '../../stores/marketplaceStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../config/theme';

export default function VendorOrderFeed() {
  const { user } = useAuthStore();
  const { vendorOrders, isLoading, fetchVendorOrders, acceptOrder, markReady } = useMarketplaceStore();
  const [tab, setTab] = useState<'incoming' | 'preparing' | 'ready'>('incoming');

  useEffect(() => { fetchVendorOrders(user?.token); }, []);

  const filtered = vendorOrders.filter(o => {
    const s = (o.status ?? '') as string;
    if (tab === 'incoming') return s === 'pending' || s === 'accepted';
    if (tab === 'preparing') return s === 'preparing';
    return s === 'ready_for_pickup' || s === 'in_transit';
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
      <View style={{ padding: Spacing.lg, borderBottomWidth: 2, borderBottomColor: Colors.black }}>
        <Text style={{ fontSize: FontSize.xxxl, fontWeight: 'bold' }}>Order Feed</Text>
        <View style={{ flexDirection: 'row', marginTop: 12, gap: 4 }}>
          {(['incoming', 'preparing', 'ready'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {isLoading && vendorOrders.length === 0 ? <ActivityIndicator color={Colors.black} style={{ marginTop: 40 }} /> : (
        <FlatList data={filtered} keyExtractor={(_, i) => String(i)} contentContainerStyle={{ padding: Spacing.lg }}
          ListEmptyComponent={<Text style={{ color: Colors.grey, textAlign: 'center', marginTop: 40 }}>No orders</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.badge}><Text style={styles.badgeText}>{(item.status ?? '').replace(/_/g, ' ').toUpperCase()}</Text></View>
              <Text style={{ fontWeight: '500', marginTop: 8 }}>{item.studentName}</Text>
              <Text style={{ fontWeight: 'bold' }}>₦{item.totalAmount ?? 0}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {tab === 'incoming' && <TouchableOpacity style={styles.actionBtn} onPress={() => acceptOrder(item.id ?? '', user?.token)}><Text style={styles.actionBtnText}>Accept</Text></TouchableOpacity>}
                {tab === 'preparing' && <TouchableOpacity style={styles.actionBtn} onPress={() => markReady(item.id ?? '', user?.token)}><Text style={styles.actionBtnText}>Mark Ready</Text></TouchableOpacity>}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.sm, borderWidth: 2, borderColor: Colors.black },
  tabActive: { backgroundColor: Colors.black },
  tabText: { fontWeight: 'bold', fontSize: FontSize.sm, color: Colors.black },
  tabTextActive: { color: Colors.white },
  card: { borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 12, marginBottom: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: Colors.warning, backgroundColor: Colors.warning + '20' },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: Colors.warning },
  actionBtn: { backgroundColor: Colors.black, paddingVertical: 8, paddingHorizontal: 16, borderRadius: BorderRadius.sm },
  actionBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.sm },
});
