import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius } from '../../config/theme';
import { useAuthStore } from '../../stores/authStore';
import { useLostItemStore } from '../../stores/lostItemStore';

export default function DriverLostItemsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { driverItems, isLoading, fetchDriverItems, returnItem } = useLostItemStore();

  useEffect(() => { fetchDriverItems(user?.token); }, []);

  const handleReturn = (id: string) => {
    Alert.alert('Return to Student Affairs?', 'Confirm you have dropped this item.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm Return', style: 'default', onPress: async () => { await returnItem(id, user?.token); fetchDriverItems(user?.token); }},
    ]);
  };

  const statusColor = (s: string) => ({ reported: Colors.warning, acknowledged: Colors.warning, dropped_off: Colors.success, collected: Colors.grey, closed: Colors.grey })[s] ?? Colors.grey;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity><Text style={styles.title}>Lost & Found Items</Text></View>
      {isLoading && driverItems.length === 0 ? <ActivityIndicator color={Colors.black} style={{ marginTop: 40 }} /> : (
        <FlatList data={driverItems} keyExtractor={(_, i) => String(i)} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchDriverItems(user?.token)} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={{ fontSize: 48 }}>✅</Text><Text style={{ color: Colors.grey, marginTop: 12 }}>No lost items reported on your trips</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.badge, { borderColor: statusColor(item.status ?? 'reported') }]}><Text style={[styles.badgeText, { color: statusColor(item.status ?? 'reported') }]}>{item.status?.toUpperCase()}</Text></View>
                <Text style={styles.catText}>{item.category}</Text>
              </View>
              <Text style={styles.desc}>{item.description}</Text>
              <Text style={styles.meta}>{item.studentName} ({item.matricNumber})</Text>
              <Text style={styles.meta}>Trip to: {item.destinationName}</Text>
              {item.status === 'reported' && <TouchableOpacity style={styles.returnBtn} onPress={() => handleReturn(item.id ?? '')}><Text style={styles.returnBtnText}>Dropped at Student Affairs</Text></TouchableOpacity>}
              {item.status === 'dropped_off' && <Text style={{ color: Colors.success, fontWeight: 'bold', marginTop: 8 }}>✅ Already returned</Text>}
            </View>
          )}
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
  cardTop: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  catText: { fontSize: 10, color: Colors.grey },
  desc: { fontSize: FontSize.md, fontWeight: '500', marginBottom: 6 },
  meta: { fontSize: FontSize.sm, color: Colors.grey },
  returnBtn: { backgroundColor: Colors.success, padding: 12, borderRadius: BorderRadius.sm, marginTop: 8 },
  returnBtnText: { color: Colors.white, fontWeight: 'bold', textAlign: 'center' },
  empty: { alignItems: 'center', marginTop: 60 },
});
