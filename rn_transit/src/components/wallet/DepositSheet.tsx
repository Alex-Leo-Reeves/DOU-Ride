import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../../config/theme';
import { walletStyles as styles } from './WalletStyles';
import { FeeRow } from './Shared';

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
