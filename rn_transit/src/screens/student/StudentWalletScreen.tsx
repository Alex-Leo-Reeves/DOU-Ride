import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { DouCard } from '../../components/DouCard';
import { Transaction } from '../../types';
import { DepositSheet, WithdrawSheet, TransferSheet } from '../../components/wallet';

export default function StudentWalletScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { balance, pendingBalance, transactions, isLoading, error, clearError, fetchBalance, deposit, withdraw, transfer } = useWalletStore();

  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const handleFetchBalance = useCallback(() => {
    fetchBalance(user?.userId ?? '', user?.token);
  }, [fetchBalance, user?.userId, user?.token]);

  useEffect(() => { handleFetchBalance(); }, [handleFetchBalance]);

  const txIcon = useCallback((type: string) => {
    const icons: Record<string, string> = { deposit: '💰', withdrawal: '🏦', ride_payment: '🚗', ride_payout: '💵', refund: '↩️', penalty: '⚠️', platform_fee: '⚙️', transfer_in: '📥', transfer_out: '📤' };
    return icons[type] ?? '💳';
  }, []);

  const txLabel = useCallback((type: string) => {
    const labels: Record<string, string> = { deposit: 'Deposit', withdrawal: 'Withdrawal', ride_payment: 'Ride Payment', ride_payout: 'Ride Payout', refund: 'Refund', penalty: 'Penalty', platform_fee: 'Platform Fee', transfer_in: 'Transfer In', transfer_out: 'Transfer Out' };
    return labels[type] ?? type;
  }, []);

  const handleDepositSubmit = useCallback(async (amount: number) => {
    const res = await deposit(amount, user?.userId ?? '', user?.token);
    setShowDeposit(false);
    return res;
  }, [deposit, user?.userId, user?.token]);

  const handleWithdrawSubmit = useCallback(async (data: any) => {
    await withdraw(data, user?.userId ?? '', user?.token);
    setShowWithdraw(false);
    return true;
  }, [withdraw, user?.userId, user?.token]);

  const handleTransferSubmit = useCallback(async (data: any) => {
    await transfer(data, user?.userId ?? '', user?.token);
    setShowTransfer(false);
    return true;
  }, [transfer, user?.userId, user?.token]);

  const renderedTransactions = useMemo(() => {
    if (transactions.length === 0) {
      return <Text style={styles.emptyText}>No transactions yet.{'\n'}Deposit to get started!</Text>;
    }
    return transactions.map((tx: Transaction, idx: number) => (
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
    ));
  }, [transactions, txIcon, txLabel]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>Wallet</Text>
        <TouchableOpacity onPress={handleFetchBalance}><Text style={styles.refreshBtn}>🔄</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleFetchBalance} />}>
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}><Text style={styles.errorClose}>✕</Text></TouchableOpacity>
          </View>
        ) : null}

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
        {renderedTransactions}
      </ScrollView>

      <DepositSheet 
        visible={showDeposit} 
        onClose={() => setShowDeposit(false)} 
        onSubmit={handleDepositSubmit} 
      />

      <WithdrawSheet 
        visible={showWithdraw} 
        onClose={() => setShowWithdraw(false)} 
        onSubmit={handleWithdrawSubmit} 
      />

      <TransferSheet 
        visible={showTransfer} 
        onClose={() => setShowTransfer(false)} 
        onSubmit={handleTransferSubmit} 
      />
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
  errorBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.error + '20', padding: 12, borderRadius: BorderRadius.sm, marginBottom: 16 },
  errorText: { color: Colors.error, flex: 1, marginRight: 8 },
  errorClose: { color: Colors.error, fontSize: FontSize.lg, fontWeight: 'bold' },
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
});
