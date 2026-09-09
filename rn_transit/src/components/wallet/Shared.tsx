import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../../config/theme';
import type { Transaction } from '../../types';
import { walletStyles as styles } from './WalletStyles';

export function ActionButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export function TransactionRow({ tx }: { tx: Transaction }) {
  const isCredit = tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'ride_payout' || tx.type === 'transfer_in';
  const typeIcons: Record<string, string> = {
    deposit: '↓', withdrawal: '↑', ride_payment: '🚗', ride_payout: '💰',
    refund: '↩', penalty: '⚠', platform_fee: '⚙', transfer_in: '📥', transfer_out: '📤',
  };

  return (
    <View style={styles.txRow}>
      <View style={styles.txIcon}>
        <Text style={styles.txIconText}>{typeIcons[tx.type] || '●'}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txType}>{tx.description || tx.type}</Text>
        <Text style={styles.txStatus}>
          {tx.status === 'completed' ? tx.createdAt.substring(0, 10) : tx.status}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color: isCredit ? Colors.success : Colors.error }]}>
        {isCredit ? '+' : ''}₦{Math.abs(tx.amount).toFixed(0)}
      </Text>
    </View>
  );
}

export function FeeRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.feeRow}>
      <Text style={[bold && { fontWeight: 'bold' }]}>{label}</Text>
      <Text style={[bold && { fontWeight: 'bold' }]}>₦{value.toFixed(2)}</Text>
    </View>
  );
}
