import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import type { Transaction } from '../../types';
import { walletStyles as styles } from './WalletStyles';
import { ActionButton, TransactionRow } from './Shared';

interface WalletBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  balance: number;
  pendingBalance: number;
  transactions: Transaction[];
  onDeposit: () => void;
  onWithdraw: () => void;
  onTransfer: () => void;
}

export function WalletBottomSheet({
  visible,
  onClose,
  balance,
  pendingBalance,
  transactions,
  onDeposit,
  onWithdraw,
  onTransfer,
}: WalletBottomSheetProps) {
  const formattedBalance = `₦${balance.toFixed(2)}`;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.balanceText}>{formattedBalance}</Text>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>

          {pendingBalance > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>
                ₦{pendingBalance.toFixed(2)} pending clearance
              </Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <ActionButton icon="💳" label="Deposit" onPress={onDeposit} />
            <ActionButton icon="🏦" label="Withdraw" onPress={onWithdraw} />
            <ActionButton icon="📤" label="Transfer" onPress={onTransfer} />
          </View>

          {transactions.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recent</Text>
              {transactions.slice(0, 5).map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </>
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
