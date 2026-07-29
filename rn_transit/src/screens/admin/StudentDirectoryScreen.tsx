import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../../config/theme';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';

export default function StudentDirectoryScreen() {
  const { user } = useAuthStore();
  const { students, isLoading, fetchStudents } = useAdminStore();
  const [search, setSearch] = useState('');

  useEffect(() => { fetchStudents(user?.token); }, []);

  const filtered = students.filter(s => {
    const name = (s.name ?? '').toLowerCase();
    const matric = (s.matricNumber ?? '').toLowerCase();
    const q = search.toLowerCase();
    return !q || name.includes(q) || matric.includes(q);
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
      <View style={{ padding: Spacing.lg, borderBottomWidth: 2, borderBottomColor: Colors.black }}>
        <Text style={{ fontSize: FontSize.xxxl, fontWeight: 'bold' }}>Student Directory</Text>
        <TextInput style={styles.search} placeholder="Search by name or matric" value={search} onChangeText={setSearch} />
      </View>
      {isLoading ? <ActivityIndicator color={Colors.black} style={{ marginTop: 40 }} /> : (
        <FlatList data={filtered} keyExtractor={(_, i) => String(i)} contentContainerStyle={{ padding: Spacing.lg }}
          ListEmptyComponent={<Text style={{ color: Colors.grey, textAlign: 'center', marginTop: 40 }}>{search ? 'No matches' : 'No students'}</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                <Text style={{ color: Colors.grey }}>{item.matricNumber} — {item.department}</Text>
                <Text style={{ color: Colors.grey, fontSize: FontSize.sm }}>₦{0}</Text>
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
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.lightGrey, flexDirection: 'row' },
});
