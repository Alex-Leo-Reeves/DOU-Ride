import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  RefreshCw,
  ChevronLeft,
  ShieldCheck,
  CreditCard,
  Car,
  Receipt,
  AlertCircle,
  Clock,
  Sparkles,
  ShoppingBag,
  Users,
  Heart,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { DouCard } from '../../components/DouCard';
import { Transaction } from '../../types';
import {
  DepositSheet,
  WithdrawSheet,
  TransferSheet,
  PayFriendSheet,
  PayKekeFeeSheet,
} from '../../components/wallet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function StudentWalletScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const {
    balance,
    pendingBalance,
    transactions,
    isLoading,
    error,
    clearError,
    fetchBalance,
    deposit,
    verifyDeposit,
    withdraw,
    transfer,
  } = useWalletStore();

  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showPayFriend, setShowPayFriend] = useState(false);
  const [showPayKekeFee, setShowPayKekeFee] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'rides' | 'deposits' | 'transfers'>('all');

  const handleFetchBalance = useCallback(() => {
    fetchBalance(user?.userId ?? '', user?.token);
  }, [fetchBalance, user?.userId, user?.token]);

  useEffect(() => {
    handleFetchBalance();
  }, [handleFetchBalance]);

  const handleDepositSubmit = useCallback(
    async (amount: number) => {
      const res = await deposit(amount, user?.userId ?? '', user?.token);
      setShowDeposit(false);
      if (res?.paymentUrl) {
        try {
          if (Platform.OS === 'web') {
            window.open(res.paymentUrl, '_blank');
          } else {
            await WebBrowser.openBrowserAsync(res.paymentUrl);
          }
        } catch {
          await Linking.openURL(res.paymentUrl);
        }

        // Automatic verification poll on browser return
        if (res.transactionRef) {
          const verifyResult = await verifyDeposit(res.transactionRef, user?.userId ?? '', user?.token);
          if (verifyResult.verified) {
            Alert.alert(
              'Deposit Confirmed! 🎉',
              `₦${verifyResult.netAmount?.toLocaleString() ?? amount} has been added to your DOU Transit digital pass.`
            );
          }
        }
      }
      return res?.transactionRef ?? null;
    },
    [deposit, verifyDeposit, user?.userId, user?.token]
  );

  const handleWithdrawSubmit = useCallback(
    async (data: any) => {
      await withdraw(data, user?.userId ?? '', user?.token);
      setShowWithdraw(false);
      return true;
    },
    [withdraw, user?.userId, user?.token]
  );

  const handleTransferSubmit = useCallback(
    async (data: any) => {
      await transfer(data, user?.userId ?? '', user?.token);
      setShowTransfer(false);
      return true;
    },
    [transfer, user?.userId, user?.token]
  );

  const handlePayFriendSubmit = useCallback(
    async (data: { friendId: string; amount: number; note: string }) => {
      const res = await transfer(
        {
          recipientId: data.friendId,
          amount: data.amount,
          note: data.note,
        },
        user?.userId ?? '',
        user?.token
      );
      if (res) {
        setShowPayFriend(false);
        return true;
      }
      return false;
    },
    [transfer, user?.userId, user?.token]
  );

  const handlePayKekeFeeSubmit = useCallback(
    async (data: { fleetNumber: string; amount: number; note: string }) => {
      const res = await transfer(
        {
          recipientId: `FLEET-${data.fleetNumber}`,
          amount: data.amount,
          note: data.note,
        },
        user?.userId ?? '',
        user?.token
      );
      if (res) {
        setShowPayKekeFee(false);
        return true;
      }
      return false;
    },
    [transfer, user?.userId, user?.token]
  );

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft size={18} color={Colors.success} strokeWidth={2.5} />;
      case 'withdrawal':
        return <ArrowUpRight size={18} color={Colors.error} strokeWidth={2.5} />;
      case 'ride_payment':
        return <Car size={18} color={Colors.primaryAccent} strokeWidth={2.5} />;
      case 'transfer_in':
        return <ArrowDownLeft size={18} color={Colors.secondary} strokeWidth={2.5} />;
      case 'transfer_out':
        return <Send size={18} color={Colors.secondary} strokeWidth={2.5} />;
      case 'marketplace_order':
        return <ShoppingBag size={18} color="#DB2777" strokeWidth={2.5} />;
      default:
        return <Receipt size={18} color={Colors.slate600} strokeWidth={2.5} />;
    }
  };

  const getTxLabel = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Flutterwave Deposit';
      case 'withdrawal':
        return 'Bank / OPay Payout';
      case 'ride_payment':
        return 'Keke Transit Fare';
      case 'ride_payout':
        return 'Ride Fare Credited';
      case 'refund':
        return 'Fare Adjustment Refund';
      case 'penalty':
        return 'No-Show Penalty';
      case 'platform_fee':
        return 'Gateway Service Fee';
      case 'transfer_in':
        return 'Friend Transfer Received';
      case 'transfer_out':
        return 'Transfer to Friend';
      case 'marketplace_order':
        return 'Cafeteria Order';
      default:
        return type.replace('_', ' ').toUpperCase();
    }
  };

  const filteredTransactions = useMemo(() => {
    if (activeFilter === 'all') return transactions;
    if (activeFilter === 'rides') return transactions.filter((t) => t.type === 'ride_payment');
    if (activeFilter === 'deposits') return transactions.filter((t) => t.type === 'deposit');
    if (activeFilter === 'transfers')
      return transactions.filter((t) => t.type === 'transfer_in' || t.type === 'transfer_out');
    return transactions;
  }, [transactions, activeFilter]);

  const formattedBalance = Number(balance || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <ChevronLeft size={22} color={Colors.slate900} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Digital Wallet</Text>
          <Text style={styles.headerSubtitle}>Dennis Osadebay University</Text>
        </View>
        <TouchableOpacity onPress={handleFetchBalance} style={styles.refreshBtn} activeOpacity={0.8}>
          <RefreshCw size={18} color={Colors.slate700} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleFetchBalance} />}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color={Colors.error} strokeWidth={2.5} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError} style={{ marginLeft: 8 }}>
              <Text style={{ fontWeight: '800', color: Colors.error }}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Fintech Virtual Card */}
        <View style={styles.virtualCard}>
          <View style={styles.cardTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <CreditCard size={18} color={Colors.white} strokeWidth={2.5} style={{ marginRight: 8 }} />
              <Text style={styles.cardBrand}>DOU TRANSIT PASS</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={12} color={Colors.successDark} strokeWidth={3} />
              <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
            </View>
          </View>

          <View style={styles.cardBalanceSection}>
            <Text style={styles.cardBalanceLabel}>AVAILABLE BALANCE</Text>
            <Text style={styles.cardBalanceValue}>₦{formattedBalance}</Text>
          </View>

          {pendingBalance > 0 && (
            <View style={styles.pendingRow}>
              <Clock size={12} color={Colors.warningDark} strokeWidth={2.5} />
              <Text style={styles.pendingText}>
                ₦{pendingBalance.toLocaleString()} pending settlement
              </Text>
            </View>
          )}

          <View style={styles.cardBottomRow}>
            <View>
              <Text style={styles.cardHolderLabel}>STUDENT</Text>
              <Text style={styles.cardHolderName}>{user?.fullName || 'Student Account'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardHolderLabel}>MATRIC NO</Text>
              <Text style={styles.cardHolderMatric}>{(user as any)?.matricNumber || 'DOU/2024/...'}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons Row 1: Top Up, Friend Transfer, Pay For Friend */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowDeposit(true)}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBox, { backgroundColor: Colors.successSoft }]}>
              <ArrowDownLeft size={20} color={Colors.successDark} strokeWidth={2.5} />
            </View>
            <Text style={styles.actionBtnLabel}>Deposit</Text>
            <Text style={styles.actionBtnSub}>+₦10 Fee</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowTransfer(true)}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBox, { backgroundColor: Colors.secondarySoft }]}>
              <Send size={18} color={Colors.secondary} strokeWidth={2.5} />
            </View>
            <Text style={styles.actionBtnLabel}>Transfer</Text>
            <Text style={styles.actionBtnSub}>₦0 to Friend</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowPayFriend(true)}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Heart size={18} color="#8B5CF6" strokeWidth={2.5} />
            </View>
            <Text style={styles.actionBtnLabel}>Pay Friend</Text>
            <Text style={styles.actionBtnSub}>₦100 / Ride</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons Row 2: Pay Keke Fee, Withdraw */}
        <View style={[styles.actionsRow, { marginTop: -4 }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { flexDirection: 'row', gap: 10, paddingVertical: 12 }]}
            onPress={() => setShowPayKekeFee(true)}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#FFF7ED', marginBottom: 0 }]}>
              <Car size={18} color={Colors.secondary} strokeWidth={2.5} />
            </View>
            <View style={{ alignItems: 'flex-start' }}>
              <Text style={styles.actionBtnLabel}>Pay Keke Fee</Text>
              <Text style={styles.actionBtnSub}>₦100 Ride</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { flexDirection: 'row', gap: 10, paddingVertical: 12 }]}
            onPress={() => setShowWithdraw(true)}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBox, { backgroundColor: Colors.errorSoft, marginBottom: 0 }]}>
              <ArrowUpRight size={18} color={Colors.error} strokeWidth={2.5} />
            </View>
            <View style={{ alignItems: 'flex-start' }}>
              <Text style={styles.actionBtnLabel}>Withdraw</Text>
              <Text style={styles.actionBtnSub}>OPay / Bank</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Transaction History Filter Chips */}
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>TRANSACTION ACTIVITY</Text>
        </View>

        <View style={styles.filterChipsRow}>
          {[
            { id: 'all', label: 'All' },
            { id: 'rides', label: 'Rides' },
            { id: 'deposits', label: 'Deposits' },
            { id: 'transfers', label: 'Transfers' },
          ].map((f) => {
            const isSelected = activeFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.id as any)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Transaction List */}
        {filteredTransactions.length === 0 ? (
          <DouCard variant="flat" style={styles.emptyCard}>
            <Receipt size={36} color={Colors.slate400} strokeWidth={2} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySub}>
              Deposit funds to start taking rides, paying keke fees, or receiving transfers from friends.
            </Text>
          </DouCard>
        ) : (
          <View style={styles.txListContainer}>
            {filteredTransactions.map((tx: Transaction, idx: number) => {
              const isCredit =
                tx.type === 'deposit' ||
                tx.type === 'refund' ||
                tx.type === 'transfer_in' ||
                tx.type === 'ride_payout';

              return (
                <DouCard key={tx.id || idx} variant="default" style={styles.txCard}>
                  <View style={styles.txRow}>
                    <View style={[styles.txIconBox, { backgroundColor: isCredit ? Colors.successSoft : Colors.slate100 }]}>
                      {getTxIcon(tx.type)}
                    </View>

                    <View style={styles.txInfo}>
                      <Text style={styles.txLabel}>{getTxLabel(tx.type)}</Text>
                      <Text style={styles.txMeta}>
                        {tx.reference ? `Ref: ${tx.reference.substring(0, 10)}...` : 'Campus Settlement'}
                      </Text>
                    </View>

                    <View style={styles.txAmountCol}>
                      <Text style={[styles.txAmountText, { color: isCredit ? Colors.successDark : Colors.slate900 }]}>
                        {isCredit ? '+' : '-'}₦{Math.abs(tx.amount).toLocaleString()}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: tx.status === 'completed' ? Colors.successSoft : Colors.warningSoft }]}>
                        <Text style={[styles.statusBadgeText, { color: tx.status === 'completed' ? Colors.successDark : Colors.warningDark }]}>
                          {tx.status === 'completed' ? 'Cleared' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </DouCard>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Wallet Modals */}
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
      <PayFriendSheet
        visible={showPayFriend}
        onClose={() => setShowPayFriend(false)}
        onSubmit={handlePayFriendSubmit}
      />
      <PayKekeFeeSheet
        visible={showPayKekeFee}
        onClose={() => setShowPayKekeFee(false)}
        onSubmit={handlePayKekeFeeSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? 14 : Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.slate900,
  },
  headerSubtitle: {
    fontSize: FontSize.xxs,
    fontWeight: '600',
    color: Colors.slate500,
    marginTop: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorSoft,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.errorDark,
    marginLeft: 8,
    fontWeight: '600',
  },
  virtualCard: {
    backgroundColor: Colors.slate900,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.lg,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  cardBrand: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 1.2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  verifiedBadgeText: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.successDark,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  cardBalanceSection: {
    marginBottom: Spacing.lg,
  },
  cardBalanceLabel: {
    fontSize: FontSize.xxs,
    fontWeight: '700',
    color: Colors.slate400,
    letterSpacing: 1,
  },
  cardBalanceValue: {
    fontSize: 38,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -1,
    marginTop: 2,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
  pendingText: {
    fontSize: FontSize.xxs,
    fontWeight: '700',
    color: Colors.warning,
    marginLeft: 5,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: Spacing.md,
  },
  cardHolderLabel: {
    fontSize: FontSize.xxs,
    fontWeight: '700',
    color: Colors.slate400,
    letterSpacing: 0.5,
  },
  cardHolderName: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.white,
    marginTop: 2,
  },
  cardHolderMatric: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.slate300,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.subtle,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionBtnLabel: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.slate900,
  },
  actionBtnSub: {
    fontSize: FontSize.xxs,
    color: Colors.slate500,
    marginTop: 1,
    fontWeight: '600',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  historyTitle: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate500,
    letterSpacing: 0.8,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
  },
  filterChipActive: {
    backgroundColor: Colors.slate900,
  },
  filterChipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate600,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.slate800,
  },
  emptySub: {
    fontSize: FontSize.xs,
    color: Colors.slate500,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: Spacing.md,
  },
  txListContainer: {
    gap: 8,
  },
  txCard: {
    padding: 12,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.slate900,
  },
  txMeta: {
    fontSize: FontSize.xxs,
    color: Colors.slate500,
    marginTop: 2,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmountText: {
    fontSize: FontSize.md,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: 3,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
