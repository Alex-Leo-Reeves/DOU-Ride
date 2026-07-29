import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../config/theme';

export default function EmergencyMapScreen() {
  const { user } = useAuthStore();
  const { emergencies, isLoading, fetchEmergencies } = useAdminStore();

  useEffect(() => { fetchEmergencies(user?.token); }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
      <View style={{ padding: Spacing.lg, borderBottomWidth: 2, borderBottomColor: Colors.black }}>
        <Text style={{ fontSize: FontSize.xxxl, fontWeight: 'bold' }}>Emergency Incidents</Text>
      </View>
      {isLoading ? <ActivityIndicator color={Colors.black} style={{ marginTop: 40 }} /> : (
        <FlatList data={emergencies} keyExtractor={(_, i) => String(i)} contentContainerStyle={{ padding: Spacing.lg }}
          ListEmptyComponent={<Text style={{ color: Colors.grey, textAlign: 'center', marginTop: 40 }}>No emergency incidents</Text>}
          renderItem={({ item }) => (
            <View style={[styles.card, (item.status === 'active' || item.status === 'en_route') && { borderColor: Colors.error, borderWidth: 2 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={[styles.badge, { backgroundColor: item.status === 'active' ? Colors.error : Colors.grey }]}>
                  <Text style={[styles.badgeText, { color: Colors.white }]}>{(item.status ?? '').replace(/_/g, ' ').toUpperCase()}</Text>
                </View>
                <Text style={{ fontSize: 11, color: Colors.grey }}>{item.createdAt?.substring(0, 10) ?? ''}</Text>
              </View>
              <Text style={{ fontWeight: 'bold' }}>{item.studentName}</Text>
              <Text style={{ color: Colors.grey }}>{item.studentPhone}</Text>
              {item.driverName && <Text>Driver: {item.driverName} {item.driverFleetNumber ? `#${item.driverFleetNumber}` : ''}</Text>}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 16, marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
});
