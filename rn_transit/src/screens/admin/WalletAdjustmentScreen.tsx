import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';

export default function WalletAdjustmentScreen() {
  const { user } = useAuthStore();
  const { isLoading, error, adjustWallet } = useAdminStore();
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isCredit, setIsCredit] = useState(true);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!userId || !amt || !reason.trim()) return;
    const finalAmount = isCredit ? amt : -amt;
    const ok = await adjustWallet(userId.trim(), finalAmount, reason.trim(), user?.token);
    if (ok) { setUserId(''); setAmount(''); setReason(''); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Text style={{ fontSize: FontSize.xxxl, fontWeight: 'bold', textAlign: 'center' }}>Wallet Adjustment</Text>
        <Text style={{ color: Colors.grey, textAlign: 'center', marginBottom: 24 }}>Credit or debit any user's wallet.</Text>

        <View style={styles.toggle}>
          <TouchableOpacity style={[styles.toggleBtn, isCredit && { backgroundColor: Colors.success }]} onPress={() => setIsCredit(true)}>
            <Text style={[styles.toggleText, { color: isCredit ? Colors.white : Colors.black }]}>CREDIT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, !isCredit && { backgroundColor: Colors.error }]} onPress={() => setIsCredit(false)}>
            <Text style={[styles.toggleText, { color: !isCredit ? Colors.white : Colors.black }]}>DEBIT</Text>
          </TouchableOpacity>
        </View>

        <TextInput style={styles.input} placeholder="User ID (UUID)" value={userId} onChangeText={setUserId} />
        <TextInput style={styles.input} placeholder="Amount (₦)" keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <TextInput style={styles.input} placeholder="Reason" value={reason} onChangeText={setReason} multiline />

        {error && <Text style={{ color: Colors.error, marginBottom: 8 }}>{error}</Text>}
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: isCredit ? Colors.success : Colors.error }]} onPress={submit} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.submitText}>{isCredit ? 'CREDIT' : 'DEBIT'} WALLET</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  toggleText: { fontWeight: 'bold', fontSize: FontSize.md },
  input: { borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 14, fontSize: FontSize.md, marginBottom: 12 },
  submitBtn: { padding: 16, borderRadius: BorderRadius.sm, alignItems: 'center', marginTop: 8 },
  submitText: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.lg },
});
