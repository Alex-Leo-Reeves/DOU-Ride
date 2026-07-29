import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { useLostItemStore } from '../../stores/lostItemStore';

export default function StudentLostItemsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { myItems, isLoading, fetchMyItems } = useLostItemStore();

  useEffect(() => { fetchMyItems(user?.token); }, []);

  const statusLabel = (s: string) => { const m: Record<string, string> = { reported: 'REPORTED', acknowledged: 'SEARCHING', dropped_off: 'AT STUDENT AFFAIRS', collected: 'COLLECTED', closed: 'CLOSED' }; return m[s] ?? s; };
  const statusColor = (s: string) => { const m: Record<string, string> = { reported: Colors.warning, acknowledged: Colors.warning, dropped_off: Colors.info, collected: Colors.success, closed: Colors.grey }; return m[s] ?? Colors.grey; };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>My Lost Items</Text>
        <TouchableOpacity onPress={() => navigation.navigate(Routes.studentLostItem)}><Text style={styles.addBtn}>+</Text></TouchableOpacity>
      </View>
      {isLoading && myItems.length === 0 ? <ActivityIndicator style={{ marginTop: 40 }} color={Colors.black} /> : (
        <FlatList
          data={myItems}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchMyItems(user?.token)} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={{ fontSize: 48 }}>🔍</Text><Text style={{ color: Colors.grey, marginTop: 12 }}>No lost items reported</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.badge, { borderColor: statusColor(item.status ?? 'reported'), backgroundColor: statusColor(item.status ?? 'reported') + '20' }]}>
                  <Text style={[styles.badgeText, { color: statusColor(item.status ?? 'reported') }]}>{statusLabel(item.status ?? 'reported')}</Text>
                </View>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
              <Text style={styles.desc}>{item.description}</Text>
              <Text style={styles.meta}>Driver: {item.driverName ?? 'N/A'} {item.fleetNumber ? `#${item.fleetNumber}` : ''}</Text>
              <Text style={styles.date}>{item.createdAt ? item.createdAt.substring(0, 10) : ''}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 2, borderBottomColor: Colors.black },
  backBtn: { fontSize: FontSize.md, color: Colors.black, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: 'bold' },
  addBtn: { fontSize: 24, fontWeight: 'bold' },
  list: { padding: Spacing.lg },
  card: { borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 12, marginBottom: 10 },
  cardTop: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  categoryText: { fontSize: 10, color: Colors.grey },
  desc: { fontSize: FontSize.md, fontWeight: '500', marginBottom: 6 },
  meta: { fontSize: FontSize.sm, color: Colors.grey },
  date: { fontSize: 11, color: Colors.lightGrey, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 60 },
});
