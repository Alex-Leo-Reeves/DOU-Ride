import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useLostItemStore } from '../../stores/lostItemStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../config/theme';

const categories = ['Phone', 'Wallet', 'ID Card', 'Book', 'Bag', 'Clothing', 'Keys', 'Other'];

export default function AdminTriggerLostItemScreen() {
  const { user } = useAuthStore();
  const { adminTriggerLostItem, isLoading } = useLostItemStore();
  const [matric, setMatric] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Phone');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!matric.trim() || !description.trim()) return;
    const ok = await adminTriggerLostItem({ studentMatric: matric.trim(), description: description.trim(), category }, user?.token);
    if (ok) setSubmitted(true);
  };

  if (submitted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 80 }}>✅</Text>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginVertical: 16 }}>Claim Created!</Text>
        <Text style={{ color: Colors.grey }}>Lost item claim registered for {matric}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => { setSubmitted(false); setMatric(''); setDescription(''); }}><Text style={styles.btnText}>Done</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Text style={{ fontSize: FontSize.xxxl, fontWeight: 'bold' }}>Trigger Lost Item Claim</Text>
        <View style={styles.infoBox}><Text style={styles.infoText}>Use this for phone-less students who walk into Student Affairs.</Text></View>
        <Text style={styles.label}>Student's Matric Number</Text>
        <TextInput style={styles.input} placeholder="e.g. DOU/2021/SCI/1234" value={matric} onChangeText={setMatric} autoCapitalize="characters" />
        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>{categories.map(c => (
          <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}</View>
        <Text style={styles.label}>Describe the Item</Text>
        <TextInput style={styles.textArea} value={description} onChangeText={setDescription} placeholder="Describe the item..." multiline maxLength={500} />
        <TouchableOpacity style={[styles.btn, isLoading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnText}>Create Lost Item Claim</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  infoBox: { padding: 12, backgroundColor: Colors.warning + '20', borderWidth: 1, borderColor: Colors.warning, borderRadius: BorderRadius.sm, marginBottom: 20 },
  infoText: { fontSize: FontSize.sm, color: Colors.warning },
  label: { fontWeight: 'bold', fontSize: FontSize.md, marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 14, fontSize: FontSize.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm },
  chipActive: { backgroundColor: Colors.black },
  chipText: { fontSize: FontSize.sm, fontWeight: '500' },
  chipTextActive: { color: Colors.white },
  textArea: { borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 14, fontSize: FontSize.md, minHeight: 100, textAlignVertical: 'top' },
  btn: { backgroundColor: Colors.black, padding: 16, borderRadius: BorderRadius.sm, alignItems: 'center', marginTop: 24 },
  btnText: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.lg },
});
