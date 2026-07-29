import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../config/theme';
import type { Transaction } from '../types';

// ============================================================
// WALLET BOTTOM SHEET
// ============================================================

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

function ActionButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function TransactionRow({ tx }: { tx: Transaction }) {
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

// ============================================================
// DEPOSIT SHEET
// ============================================================

interface DepositSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<string | null>;
}

export function DepositSheet({ visible, onClose, onSubmit }: DepositSheetProps) {
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const quickAmounts = [200, 500, 1000, 2000, 5000];
  const fee = 10;
  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async () => {
    if (numAmount < 100) {
      Alert.alert('Error', 'Minimum deposit is ₦100');
      return;
    }
    setIsProcessing(true);
    const result = await onSubmit(numAmount);
    setIsProcessing(false);
    if (result) {
      Alert.alert('Payment Link Generated', `Ref: ${result.substring(0, 12)}...`, [
        { text: 'OK', onPress: onClose },
      ]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Deposit Funds</Text>
          <Text style={styles.sheetSubtitle}>Add money to your wallet</Text>

          <View style={styles.quickRow}>
            {quickAmounts.map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.quickChip, numAmount === a && styles.quickChipActive]}
                onPress={() => setAmount(a.toString())}
              >
                <Text style={[styles.quickChipText, numAmount === a && styles.quickChipTextActive]}>
                  ₦{a}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="Or enter custom amount"
            placeholderTextColor={Colors.grey}
            keyboardType="numeric"
          />

          {numAmount > 0 && (
            <View style={styles.feeBox}>
              <FeeRow label="Amount" value={numAmount} />
              <FeeRow label="Platform Fee" value={fee} />
              <View style={styles.divider} />
              <FeeRow label="Total Charge" value={numAmount + fee} bold />
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, (!numAmount || isProcessing) && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={!numAmount || isProcessing}
          >
            <Text style={styles.primaryBtnText}>
              {isProcessing ? 'Processing...' : 'DEPOSIT'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================
// WITHDRAW SHEET
// ============================================================

interface WithdrawSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { bankCode: string; bankName: string; accountNumber: string; amount: number }) => Promise<boolean>;
}

const BANKS = [
  { code: '000013', name: 'Access Bank' },
  { code: '000014', name: 'Access Bank (Diamond)' },
  { code: '000001', name: 'Fidelity Bank' },
  { code: '000007', name: 'First Bank of Nigeria' },
  { code: '000010', name: 'First City Monument Bank' },
  { code: '000019', name: 'GTBank' },
  { code: '000031', name: 'Moniepoint MFB' },
  { code: '000030', name: 'Opay' },
  { code: '000011', name: 'PalmPay' },
  { code: '000008', name: 'Sterling Bank' },
  { code: '000002', name: 'UBA' },
  { code: '000009', name: 'Wema Bank' },
  { code: '000004', name: 'Zenith Bank' },
];

export function WithdrawSheet({ visible, onClose, onSubmit }: WithdrawSheetProps) {
  const [amount, setAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState<{ code: string; name: string } | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) { Alert.alert('Error', 'Enter valid amount'); return; }
    if (!selectedBank) { Alert.alert('Error', 'Select a bank'); return; }
    if (accountNumber.length < 10) { Alert.alert('Error', 'Enter valid 10-digit account number'); return; }

    setIsProcessing(true);
    const success = await onSubmit({
      bankCode: selectedBank.code,
      bankName: selectedBank.name,
      accountNumber,
      amount: numAmount,
    });
    setIsProcessing(false);
    if (success) {
      Alert.alert('Success', 'Withdrawal initiated. Funds will be sent to your bank.');
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Withdraw Funds</Text>
          <Text style={styles.sheetSubtitle}>Send money to your bank account</Text>

          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="Amount"
            placeholderTextColor={Colors.grey}
            keyboardType="numeric"
          />

          <TouchableOpacity style={styles.bankSelector} onPress={() => setShowBankPicker(true)}>
            <Text style={[styles.bankSelectorText, !selectedBank && { color: Colors.grey }]}>
              {selectedBank?.name || 'Select Bank'}
            </Text>
            <Text style={styles.bankSelectorArrow}>▼</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="Account Number"
            placeholderTextColor={Colors.grey}
            keyboardType="numeric"
            maxLength={10}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, isProcessing && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={isProcessing}
          >
            <Text style={styles.primaryBtnText}>{isProcessing ? 'Processing...' : 'WITHDRAW'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showBankPicker} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { maxHeight: '60%' }]}>
            <Text style={styles.sheetTitle}>Select Bank</Text>
            <ScrollView>
              {BANKS.map((bank) => (
                <TouchableOpacity
                  key={bank.code}
                  style={styles.bankItem}
                  onPress={() => { setSelectedBank(bank); setShowBankPicker(false); }}
                >
                  <Text style={[styles.bankItemText, selectedBank?.code === bank.code && { fontWeight: 'bold' }]}>
                    {bank.name}
                  </Text>
                  {selectedBank?.code === bank.code && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowBankPicker(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

// ============================================================
// TRANSFER SHEET
// ============================================================

interface TransferSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { recipientId: string; amount: number; note?: string }) => Promise<boolean>;
}

export function TransferSheet({ visible, onClose, onSubmit }: TransferSheetProps) {
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) { Alert.alert('Error', 'Enter valid amount'); return; }
    if (!recipientId.trim()) { Alert.alert('Error', 'Enter recipient email or user ID'); return; }

    setIsProcessing(true);
    const success = await onSubmit({ recipientId: recipientId.trim(), amount: numAmount, note: note.trim() || undefined });
    setIsProcessing(false);
    if (success) {
      Alert.alert('Success', 'Transfer completed successfully!');
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Transfer Funds</Text>
          <Text style={styles.sheetSubtitle}>Send money to another user</Text>

          <TextInput
            style={styles.input}
            value={recipientId}
            onChangeText={setRecipientId}
            placeholder="Recipient (email or user ID)"
            placeholderTextColor={Colors.grey}
          />

          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="Amount"
            placeholderTextColor={Colors.grey}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder="Note (optional)"
            placeholderTextColor={Colors.grey}
            maxLength={100}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, isProcessing && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={isProcessing}
          >
            <Text style={styles.primaryBtnText}>{isProcessing ? 'Processing...' : 'SEND'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================

function FeeRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.feeRow}>
      <Text style={[bold && { fontWeight: 'bold' }]}>{label}</Text>
      <Text style={[bold && { fontWeight: 'bold' }]}>₦{value.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.grey,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  balanceText: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    color: Colors.black,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.grey,
    textAlign: 'center',
    marginBottom: 16,
  },
  pendingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,160,0,0.1)',
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: BorderRadius.sm,
    marginBottom: 16,
    alignSelf: 'center',
  },
  pendingText: { fontSize: 12, color: Colors.warning },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionIcon: { fontSize: 24 },
  actionLabel: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  sectionTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 8 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderWidth: 1.5,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txIconText: { fontSize: 16 },
  txInfo: { flex: 1, marginLeft: 12 },
  txType: { fontWeight: 'bold', fontSize: 13 },
  txStatus: { fontSize: 11, color: Colors.grey },
  txAmount: { fontWeight: 'bold', fontSize: 14 },
  closeBtn: { marginTop: 12, alignItems: 'center' },
  closeBtnText: { fontSize: FontSize.md, color: Colors.grey },
  sheetTitle: { fontSize: 22, fontWeight: 'bold' },
  sheetSubtitle: { fontSize: 14, color: Colors.grey, marginBottom: 20 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  quickChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
  },
  quickChipActive: { backgroundColor: Colors.black },
  quickChipText: { fontWeight: 'bold', color: Colors.black },
  quickChipTextActive: { color: Colors.white },
  input: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    padding: 14,
    fontSize: FontSize.md,
    marginBottom: 12,
    color: Colors.black,
  },
  feeBox: {
    padding: 12,
    backgroundColor: 'rgba(245,245,245,0.5)',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    marginBottom: 16,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  divider: { height: 1, backgroundColor: Colors.lightGrey, marginVertical: 6 },
  primaryBtn: {
    backgroundColor: Colors.black,
    paddingVertical: 16,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  disabledBtn: { opacity: 0.6 },
  primaryBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { marginTop: 12, alignItems: 'center' },
  cancelBtnText: { color: Colors.grey, fontSize: FontSize.md },
  bankSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    padding: 14,
    marginBottom: 12,
  },
  bankSelectorText: { fontWeight: 'bold', color: Colors.black },
  bankSelectorArrow: { color: Colors.black },
  bankItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGrey,
  },
  bankItemText: { fontSize: FontSize.md, color: Colors.black },
  checkmark: { fontWeight: 'bold', color: Colors.black },
});
