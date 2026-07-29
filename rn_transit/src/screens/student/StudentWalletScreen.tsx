import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { DouCard } from '../../components/DouCard';
import { Transaction } from '../../types';

export default function StudentWalletScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { balance, pendingBalance, transactions, isLoading, fetchBalance, deposit, withdraw, transfer, error } = useWalletStore();

  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');

  useEffect(() => { fetchBalance(user?.userId ?? '', user?.token); }, []);

  const formatDate = (iso: string) => {
    try { return iso.substring(0, 10) + ' ' + iso.substring(11, 16); } catch { return iso; }
  };

  const txIcon = (type: string) => {
    const icons: Record<string, string> = { deposit: '💰', withdrawal: '🏦', ride_payment: '🚗', ride_payout: '💵', refund: '↩️', penalty: '⚠️', platform_fee: '⚙️', transfer_in: '📥', transfer_out: '📤' };
    return icons[type] ?? '💳';
  };

  const txLabel = (type: string) => {
    const labels: Record<string, string> = { deposit: 'Deposit', withdrawal: 'Withdrawal', ride_payment: 'Ride Payment', ride_payout: 'Ride Payout', refund: 'Refund', penalty: 'Penalty', platform_fee: 'Platform Fee', transfer_in: 'Transfer In', transfer_out: 'Transfer Out' };
    return labels[type] ?? type;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>Wallet</Text>
        <TouchableOpacity onPress={() => fetchBalance(user?.userId ?? '', user?.token)}><Text style={styles.refreshBtn}>🔄</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchBalance(user?.userId ?? '', user?.token)} />}>
        <DouCard padding={24}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₦{balance.toFixed(2)}</Text>
          {pendingBalance > 0 && <Text style={styles.pendingBadge}>₦{pendingBalance.toFixed(2)} pending</Text>}
        </DouCard>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} onPress={() => setShowDeposit(true)}><Text style={styles.actionIcon}>💰</Text><Text style={styles.actionLabel}>Deposit</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => setShowWithdraw(true)}><Text style={styles.actionIcon}>🏦</Text><Text style={styles.actionLabel}>Withdraw</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => setShowTransfer(true)}><Text style={styles.actionIcon}>📤</Text><Text style={styles.actionLabel}>Transfer</Text></TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Transaction History</Text>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet.{'\n'}Deposit to get started!</Text>
        ) : (
          transactions.map((tx: Transaction, idx: number) => (
            <DouCard key={tx.id || idx} padding={14} style={{ marginBottom: 8 }}>
              <View style={styles.txRow}>
                <View style={styles.txIconBox}><Text style={styles.txIcon}>{txIcon(tx.type)}</Text></View>
                <View style={styles.txInfo}>
                  <View style={styles.txTopRow}>
                    <Text style={styles.txLabel}>{txLabel(tx.type)}</Text>
                    <Text style={[styles.txAmount, { color: tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'transfer_in' || tx.type === 'ride_payout' ? Colors.success : Colors.error }]}>
                      {tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'transfer_in' || tx.type === 'ride_payout' ? '+' : '-'}₦{Math.abs(tx.amount).toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.txMeta}>
                    {tx.reference && <Text style={styles.txRef}>Ref: {tx.reference.substring(0, 12)}...</Text>}
                    <View style={[styles.statusBadge, { backgroundColor: tx.status === 'completed' ? Colors.success + '20' : Colors.warning + '20' }]}>
                      <Text style={[styles.statusText, { color: tx.status === 'completed' ? Colors.success : Colors.warning }]}>{tx.status === 'completed' ? 'Completed' : tx.status}</Text>
                    </View>
                  </View>
                  {tx.description && <Text style={styles.txDesc}>{tx.description}</Text>}
                </View>
              </View>
            </DouCard>
          ))
        )}
      </ScrollView>

      <Modal visible={showDeposit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => setShowDeposit(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Deposit Funds</Text>
            <TextInput style={styles.modalInput} placeholder="Amount (₦100 min)" keyboardType="numeric" value={depositAmount} onChangeText={setDepositAmount} />
            <TouchableOpacity style={styles.modalBtn} onPress={async () => { const amt = parseFloat(depositAmount); if (amt >= 100) { await deposit(amt, user?.userId ?? '', user?.token); setShowDeposit(false); } }}>
              <Text style={styles.modalBtnText}>Deposit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showWithdraw} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => setShowWithdraw(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Withdraw Funds</Text>
            <TextInput style={styles.modalInput} placeholder="Amount" keyboardType="numeric" value={withdrawAmount} onChangeText={setWithdrawAmount} />
            <TextInput style={styles.modalInput} placeholder="Bank Code (e.g. 000013)" value={bankCode} onChangeText={setBankCode} />
            <TextInput style={styles.modalInput} placeholder="Account Number (10 digits)" keyboardType="numeric" maxLength={10} value={accountNumber} onChangeText={setAccountNumber} />
            <TouchableOpacity style={styles.modalBtn} onPress={async () => {
              const amt = parseFloat(withdrawAmount);
              if (amt > 0 && accountNumber.length === 10) {
                await withdraw({ bankCode, bankName, accountNumber, amount: amt }, user?.userId ?? '', user?.token);
                setShowWithdraw(false);
              }
            }}>
              <Text style={styles.modalBtnText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showTransfer} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => setShowTransfer(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Transfer Funds</Text>
            <TextInput style={styles.modalInput} placeholder="Recipient email or user ID" value={transferRecipient} onChangeText={setTransferRecipient} />
            <TextInput style={styles.modalInput} placeholder="Amount" keyboardType="numeric" value={transferAmount} onChangeText={setTransferAmount} />
            <TextInput style={styles.modalInput} placeholder="Note (optional)" value={transferNote} onChangeText={setTransferNote} />
            <TouchableOpacity style={styles.modalBtn} onPress={async () => {
              const amt = parseFloat(transferAmount);
              if (amt > 0 && transferRecipient.trim()) {
                await transfer({ recipientId: transferRecipient.trim(), amount: amt, note: transferNote.trim() || undefined }, user?.userId ?? '', user?.token);
                setShowTransfer(false);
              }
            }}>
              <Text style={styles.modalBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 2, borderBottomColor: Colors.black },
  backBtn: { fontSize: FontSize.md, color: Colors.black, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.black },
  refreshBtn: { fontSize: 18 },
  content: { padding: Spacing.lg },
  balanceLabel: { fontSize: FontSize.md, color: Colors.grey, textAlign: 'center' },
  balanceAmount: { fontSize: 44, fontWeight: 'bold', textAlign: 'center', marginVertical: 8 },
  pendingBadge: { textAlign: 'center', color: Colors.warning, fontSize: FontSize.sm, backgroundColor: Colors.warning + '20', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, overflow: 'hidden', alignSelf: 'center' },
  actionsRow: { flexDirection: 'row', gap: 12, marginVertical: 20 },
  actionCard: { flex: 1, borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 16, alignItems: 'center', ...Shadows.sm },
  actionIcon: { fontSize: 28 },
  actionLabel: { fontWeight: 'bold', fontSize: FontSize.sm, marginTop: 4 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: 'bold', marginBottom: 12 },
  emptyText: { textAlign: 'center', color: Colors.grey, fontSize: FontSize.md, marginVertical: 32, lineHeight: 22 },
  txRow: { flexDirection: 'row' },
  txIconBox: { width: 44, height: 44, borderWidth: 2, borderColor: Colors.black, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  txIcon: { fontSize: 20 },
  txInfo: { flex: 1, marginLeft: 14 },
  txTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  txLabel: { fontWeight: 'bold', fontSize: FontSize.md },
  txAmount: { fontWeight: 'bold', fontSize: FontSize.lg },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  txRef: { fontSize: 11, color: Colors.grey },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  txDesc: { fontSize: 11, color: Colors.grey, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24 },
  modalClose: { fontSize: 20, color: Colors.black, alignSelf: 'flex-end', marginBottom: 8 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  modalInput: { borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 14, fontSize: FontSize.md, marginBottom: 12 },
  modalBtn: { backgroundColor: Colors.black, padding: 16, borderRadius: BorderRadius.sm, alignItems: 'center', marginTop: 8 },
  modalBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.lg },
});
