import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { useAuthStore } from '../../stores/authStore';
import { useMarketplaceStore } from '../../stores/marketplaceStore';

export default function StudentMarketplaceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { vendors, products, isLoading, fetchVendors, fetchProducts, placeOrder } = useMarketplaceStore();
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedVendorName, setSelectedVendorName] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderPin, setOrderPin] = useState('');

  useEffect(() => { fetchVendors(user?.token); }, []);

  const place = async () => {
    if (!selectedVendorId) return;
    const items = Object.entries(cart).filter(([_, qty]) => qty > 0).map(([pid, qty]) => ({ productId: pid, quantity: qty }));
    if (items.length === 0) return;
    const result = await placeOrder({ vendorId: selectedVendorId, items }, user?.userId ?? '', user?.token);
    if (result) { setOrderPlaced(true); setOrderPin(result.pin as string ?? ''); }
  };

  if (orderPlaced) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContent}><Text style={{ fontSize: 80 }}>✅</Text><Text style={styles.successTitle}>Order Placed!</Text><Text style={{ fontSize: 32, fontWeight: 'bold', letterSpacing: 8 }}>{orderPin}</Text><Text style={{ color: Colors.grey, textAlign: 'center' }}>Share this PIN with the driver.</Text><TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}><Text style={styles.primaryBtnText}>Done</Text></TouchableOpacity></View>
      </SafeAreaView>
    );
  }

  if (selectedVendorId) {
    const total = products.reduce((sum, p) => sum + ((p.price ?? 0) * (cart[p.id ?? ''] ?? 0)), 0);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}><TouchableOpacity onPress={() => { setSelectedVendorId(null); setCart({}); }}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity><Text style={styles.title}>{selectedVendorName}</Text></View>
        <FlatList data={products} keyExtractor={(_, i) => String(i)} contentContainerStyle={styles.list} renderItem={({ item }) => {
          const qty = cart[item.id ?? ''] ?? 0;
          return (<View style={styles.productRow}><View style={{ flex: 1 }}><Text style={{ fontWeight: 'bold' }}>{item.name}</Text><Text style={{ fontSize: FontSize.sm, color: Colors.grey }}>₦{item.price}</Text></View><View style={styles.qtyRow}><TouchableOpacity style={styles.qtyBtn} onPress={() => setCart(c => ({ ...c, [item.id ?? '']: Math.max(0, qty - 1) }))}><Text style={styles.qtyBtnText}>-</Text></TouchableOpacity><Text style={{ fontWeight: 'bold', marginHorizontal: 8 }}>{qty}</Text><TouchableOpacity style={styles.qtyBtn} onPress={() => setCart(c => ({ ...c, [item.id ?? '']: qty + 1 }))}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity></View></View>);
        }} />
        {total > 0 && <View style={styles.cartBar}><Text style={{ fontWeight: 'bold', fontSize: FontSize.lg }}>Total: ₦{total}</Text><TouchableOpacity style={styles.primaryBtn} onPress={place}><Text style={styles.primaryBtnText}>Place Order</Text></TouchableOpacity></View>}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity><Text style={styles.title}>Marketplace</Text></View>
      {isLoading ? <ActivityIndicator style={{ marginTop: 40 }} color={Colors.black} /> : (
        <FlatList data={vendors} numColumns={2} keyExtractor={(_, i) => String(i)} contentContainerStyle={styles.grid} columnWrapperStyle={{ gap: 12 }} renderItem={({ item }) => (
          <TouchableOpacity style={styles.vendorCard} onPress={() => { setSelectedVendorId(item.id ?? ''); setSelectedVendorName(item.fullName ?? 'Vendor'); fetchProducts(item.id ?? '', user?.token); }}>
            <Text style={{ fontSize: 40 }}>🏪</Text><Text style={{ fontWeight: 'bold', marginTop: 8, textAlign: 'center' }}>{item.fullName ?? 'Vendor'}</Text>
          </TouchableOpacity>
        )} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 2, borderBottomColor: Colors.black, gap: 12 },
  backBtn: { fontSize: FontSize.md, color: Colors.black, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: 'bold', flex: 1 },
  grid: { padding: Spacing.lg },
  vendorCard: { flex: 1, borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 20, alignItems: 'center', ...Shadows.sm, marginBottom: 12 },
  list: { padding: Spacing.lg },
  productRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 12, marginBottom: 8 },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { width: 28, height: 28, backgroundColor: Colors.black, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: Colors.white, fontWeight: 'bold' },
  cartBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderTopWidth: 2, borderTopColor: Colors.black },
  primaryBtn: { backgroundColor: Colors.black, paddingVertical: 12, paddingHorizontal: 24, borderRadius: BorderRadius.sm },
  primaryBtnText: { color: Colors.white, fontWeight: 'bold' },
  successContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  successTitle: { fontSize: 24, fontWeight: 'bold' },
});
