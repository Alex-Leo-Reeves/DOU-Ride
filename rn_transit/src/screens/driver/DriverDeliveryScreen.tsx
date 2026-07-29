import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius } from '../../config/theme';
import { useAuthStore } from '../../stores/authStore';
import { useMarketplaceStore } from '../../stores/marketplaceStore';

export default function DriverDeliveryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { driverDeliveries, isLoading, fetchDriverDeliveries, deliverOrder } = useMarketplaceStore();
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});

  useEffect(() => { fetchDriverDeliveries(user?.token); }, []);

  const handleDeliver = async (orderId: string) => {
    const pin = pinInputs[orderId]?.trim() ?? '';
    if (pin.length !== 3) { Alert.alert('Error', 'Enter the 3-digit delivery PIN'); return; }
    const ok = await deliverOrder(orderId, pin, user?.token);
    if (ok) { Alert.alert('Delivered!', 'Delivery confirmed.'); setPinInputs(p => ({ ...p, [orderId]: '' })); }
  };

  const statusColor = (s: string) => { if (s.includes('transit')) return Colors.info; if (s.includes('delivered')) return Colors.success; return Colors.warning; };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity><Text style={styles.title}>My Deliveries</Text></View>
      {isLoading && driverDeliveries.length === 0 ? <ActivityIndicator color={Colors.black} style={{ marginTop: 40 }} /> : (
        <FlatList data={driverDeliveries} keyExtractor={(_, i) => String(i)} contentContainerStyle={styles.list}
          ListEmptyComponent={<View style={styles.empty}><Text style={{ fontSize: 48 }}>📦</Text><Text style={{ color: Colors.grey, marginTop: 12 }}>No deliveries assigned</Text></View>}
          renderItem={({ item }) => {
            const delivered = item.status === 'delivered';
            return (<View style={[styles.card, delivered && { borderColor: Colors.success }]}>
              <View style={[styles.badge, { borderColor: statusColor(item.status ?? '') }]}><Text style={[styles.badgeText, { color: statusColor(item.status ?? '') }]}>{(item.status ?? '').replace(/_/g, ' ').toUpperCase()}</Text></View>
              <View style={styles.row}><Text style={{ fontWeight: '500' }}>Pickup: {item.vendorName}</Text></View>
              <View style={styles.row}><Text>Deliver to: {item.studentName} {item.studentPhone ? `(${item.studentPhone})` : ''}</Text></View>
              <View style={styles.row}><Text>₦{item.totalAmount ?? 0}</Text></View>
              {delivered && <Text style={{ color: Colors.success, fontWeight: 'bold', marginTop: 8 }}>✅ Delivered successfully</Text>}
              {item.status === 'in_transit' && (
                <View style={styles.deliverRow}>
                  <TextInput style={styles.pinInput} placeholder="PIN" maxLength={3} keyboardType="numeric" value={pinInputs[item.id ?? ''] ?? ''} onChangeText={t => setPinInputs(p => ({ ...p, [item.id ?? '']: t }))} />
                  <TouchableOpacity style={styles.deliverBtn} onPress={() => handleDeliver(item.id ?? '')}><Text style={styles.deliverBtnText}>Deliver</Text></TouchableOpacity>
                </View>
              )}
            </View>);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 2, borderBottomColor: Colors.black, gap: 12 },
  backBtn: { fontSize: FontSize.md, color: Colors.black, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: 'bold' },
  list: { padding: Spacing.lg },
  card: { borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 12, marginBottom: 10 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, marginBottom: 8 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  row: { marginBottom: 4 },
  deliverRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pinInput: { flex: 1, borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 10, fontSize: 24, fontWeight: 'bold', textAlign: 'center', letterSpacing: 4 },
  deliverBtn: { backgroundColor: Colors.black, paddingHorizontal: 20, borderRadius: BorderRadius.sm, justifyContent: 'center' },
  deliverBtnText: { color: Colors.white, fontWeight: 'bold' },
  empty: { alignItems: 'center', marginTop: 60 },
});
