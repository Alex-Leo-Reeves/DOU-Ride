import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../../config/theme';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';

export default function DriverDirectoryScreen() {
  const { user } = useAuthStore();
  const { drivers, isLoading, fetchDrivers } = useAdminStore();
  const [search, setSearch] = useState('');

  useEffect(() => { fetchDrivers(user?.token); }, []);

  const filtered = drivers.filter(d => {
    const name = (d.name ?? '').toLowerCase();
    const fleet = String(d.fleetNumber ?? '');
    const q = search.toLowerCase();
    return !q || name.includes(q) || fleet.includes(q);
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
      <View style={{ padding: Spacing.lg, borderBottomWidth: 2, borderBottomColor: Colors.black }}>
        <Text style={{ fontSize: FontSize.xxxl, fontWeight: 'bold' }}>Driver Directory</Text>
        <TextInput style={styles.search} placeholder="Search by name, fleet #" value={search} onChangeText={setSearch} />
      </View>
      {isLoading ? <ActivityIndicator color={Colors.black} style={{ marginTop: 40 }} /> : (
        <FlatList data={filtered} keyExtractor={(_, i) => String(i)} contentContainerStyle={{ padding: Spacing.lg }}
          ListEmptyComponent={<Text style={{ color: Colors.grey, textAlign: 'center', marginTop: 40 }}>{search ? 'No matches' : 'No drivers'}</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                <Text style={{ color: Colors.grey }}>Fleet #{item.fleetNumber} | {item.status}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  search: { borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 12, marginTop: 12, fontSize: FontSize.md },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.lightGrey },
});
