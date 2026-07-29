import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../config/theme';

export default function LostItemManagementScreen() {
  const { user } = useAuthStore();
  const { lostItems, isLoading, fetchLostItems, closeLostItem } = useAdminStore();

  useEffect(() => { fetchLostItems(user?.token); }, []);

  const statusColor = (s: string) => ({ reported: Colors.warning, acknowledged: Colors.warning, dropped_off: Colors.success, collected: Colors.grey, closed: Colors.grey })[s] ?? Colors.grey;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
      <View style={{ padding: Spacing.lg, borderBottomWidth: 2, borderBottomColor: Colors.black }}>
        <Text style={{ fontSize: FontSize.xxxl, fontWeight: 'bold' }}>Lost & Found</Text>
      </View>
      {isLoading ? <ActivityIndicator color={Colors.black} style={{ marginTop: 40 }} /> : (
        <FlatList data={lostItems} keyExtractor={(_, i) => String(i)} contentContainerStyle={{ padding: Spacing.lg }}
          ListEmptyComponent={<Text style={{ color: Colors.grey, textAlign: 'center', marginTop: 40 }}>No lost items reported</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <View style={[styles.badge, { borderColor: statusColor(item.status ?? 'reported') }]}>
                  <Text style={[styles.badgeText, { color: statusColor(item.status ?? 'reported') }]}>{(item.status ?? '').toUpperCase().replace(/_/g, ' ')}</Text>
                </View>
                <Text style={{ fontSize: 10, color: Colors.grey }}>{item.category}</Text>
              </View>
              <Text style={{ fontWeight: '500' }}>{item.description ?? item.itemDescription}</Text>
              <Text style={{ color: Colors.grey, fontSize: FontSize.sm }}>{item.studentName} {item.driverName ? `| ${item.driverName}` : ''}</Text>
              {(item.status === 'reported' || item.status === 'dropped_off') && (
                <TouchableOpacity style={styles.resolveBtn} onPress={() => closeLostItem(item.id ?? '', user?.token)}>
                  <Text style={styles.resolveBtnText}>Mark Collected</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 12, marginBottom: 8 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  resolveBtn: { backgroundColor: Colors.success, padding: 10, borderRadius: BorderRadius.sm, marginTop: 8 },
  resolveBtnText: { color: Colors.white, fontWeight: 'bold', textAlign: 'center', fontSize: FontSize.sm },
});
