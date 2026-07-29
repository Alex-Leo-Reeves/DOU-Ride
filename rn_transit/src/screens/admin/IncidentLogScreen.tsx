import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../config/theme';

export default function IncidentLogScreen() {
  const { user } = useAuthStore();
  const { reports, isLoading, fetchReports } = useAdminStore();

  useEffect(() => { fetchReports(user?.token); }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
      <View style={{ padding: Spacing.lg, borderBottomWidth: 2, borderBottomColor: Colors.black }}>
        <Text style={{ fontSize: FontSize.xxxl, fontWeight: 'bold' }}>Incident Reports</Text>
      </View>
      {isLoading ? <ActivityIndicator color={Colors.black} style={{ marginTop: 40 }} /> : (
        <FlatList data={reports} keyExtractor={(_, i) => String(i)} contentContainerStyle={{ padding: Spacing.lg }}
          ListEmptyComponent={<Text style={{ color: Colors.grey, textAlign: 'center', marginTop: 40 }}>No reports</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <View style={[styles.badge, { borderColor: item.status === 'resolved' ? Colors.success : Colors.warning }]}>
                  <Text style={[styles.badgeText, { color: item.status === 'resolved' ? Colors.success : Colors.warning }]}>{(item.status ?? '').toUpperCase()}</Text>
                </View>
                <Text style={{ fontWeight: 'bold', fontSize: FontSize.sm }}>{(item.incidentType ?? '').toUpperCase()}</Text>
              </View>
              <Text>Reporter: {item.reporterName}</Text>
              {item.targetName && <Text style={{ color: Colors.grey }}>Target: {item.targetName}</Text>}
              {item.description && <Text style={{ color: Colors.grey, fontSize: FontSize.sm }}>{item.description}</Text>}
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
});
