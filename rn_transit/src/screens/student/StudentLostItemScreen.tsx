import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { useLostItemStore } from '../../stores/lostItemStore';
import { useRideStore } from '../../stores/rideStore';

const categories = ['Phone', 'Wallet', 'ID Card', 'Book', 'Bag', 'Clothing', 'Keys', 'Other'];

export default function StudentLostItemScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { reportLostItem, isLoading } = useLostItemStore();
  const { currentTripId, destinationName } = useRideStore();
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Phone');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim() || !currentTripId) return;
    const ok = await reportLostItem({ tripId: currentTripId, description: description.trim(), category }, user?.userId ?? '', user?.token);
    if (ok) setSubmitted(true);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContent}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Item Reported!</Text>
          <Text style={{ color: Colors.grey, textAlign: 'center', marginBottom: 24 }}>The driver has been notified.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate(Routes.studentLostItems)}><Text style={styles.primaryBtnText}>Track My Items</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: Colors.grey, marginTop: 16 }}>Done</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>Report Lost Item</Text>
        <View style={styles.infoBox}><Text style={styles.infoText}>Report items you left behind in a Keke.</Text></View>

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {categories.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Describe the Item</Text>
        <TextInput style={styles.textArea} value={description} onChangeText={setDescription} placeholder="E.g. Black Samsung phone..." multiline maxLength={500} />
        <TouchableOpacity style={[styles.primaryBtn, isLoading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryBtnText}>Report Lost Item</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: Spacing.lg },
  backText: { fontSize: FontSize.lg, color: Colors.black, fontWeight: '600', marginBottom: 16 },
  title: { fontSize: FontSize.xxxl, fontWeight: 'bold', marginBottom: 16 },
  infoBox: { padding: 12, backgroundColor: Colors.warning + '20', borderWidth: 1, borderColor: Colors.warning, borderRadius: BorderRadius.sm, marginBottom: 20 },
  infoText: { fontSize: FontSize.sm, color: Colors.warning },
  label: { fontWeight: 'bold', fontSize: FontSize.md, marginBottom: 8, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm },
  chipActive: { backgroundColor: Colors.black },
  chipText: { fontSize: FontSize.sm, fontWeight: '500' },
  chipTextActive: { color: Colors.white },
  textArea: { borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 14, fontSize: FontSize.md, minHeight: 100, textAlignVertical: 'top' },
  primaryBtn: { backgroundColor: Colors.black, padding: 16, borderRadius: BorderRadius.sm, alignItems: 'center', marginTop: 24 },
  primaryBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.lg },
  successContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successIcon: { fontSize: 80, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
});
