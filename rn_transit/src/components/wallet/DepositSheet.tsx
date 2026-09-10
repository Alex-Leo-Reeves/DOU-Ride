import React, { useState, useEffect } from 'react';
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
import { ArrowDownLeft, ShieldCheck } from 'lucide-react-native';
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

  useEffect(() => {
    if (visible) {
      setAmount('');
      setIsProcessing(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (numAmount < 100) {
      Alert.alert('Minimum Amount', 'Minimum deposit is ₦100 to cover gateway processing.');
      return;
    }
    setIsProcessing(true);
    try {
      const result = await onSubmit(numAmount);
      setIsProcessing(false);
      if (result) {
        Alert.alert(
          'Payment Initiated',
          `Reference: ${result.substring(0, 14)}...\n\nComplete the payment in your browser. Your wallet will be credited automatically once payment is confirmed.`,
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        Alert.alert(
          'Payment Failed',
          'Could not initiate payment. Please check your connection and try again.',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch {
      setIsProcessing(false);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: Colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}>
              <ArrowDownLeft size={20} color={Colors.primaryAccent} strokeWidth={2.5} />
            </View>
            <Text style={styles.sheetTitle}>Deposit Funds</Text>
          </View>
          <Text style={styles.sheetSubtitle}>Top up your DOU Transit wallet via Flutterwave</Text>

          <Text style={styles.sectionTitle}>Select Quick Amount</Text>
          <View style={styles.quickRow}>
            {quickAmounts.map((a) => {
              const isSelected = numAmount === a;
              return (
                <TouchableOpacity
                  key={a}
                  style={[styles.quickChip, isSelected && styles.quickChipActive]}
                  onPress={() => setAmount(a.toString())}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.quickChipText, isSelected && styles.quickChipTextActive]}>
                    ₦{a.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Or Enter Manual Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="e.g. 750 (Min ₦100)"
            placeholderTextColor={Colors.slate400}
            keyboardType="number-pad"
          />

          {numAmount > 0 && (
            <View style={styles.feeBox}>
              <FeeRow label="Wallet Credit" value={numAmount} />
              <FeeRow label="Gateway Fee" value={fee} />
              <View style={styles.divider} />
              <FeeRow label="Total Charged to Card/Bank" value={numAmount + fee} bold />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <ShieldCheck size={14} color={Colors.success} strokeWidth={2.5} />
                <Text style={{ fontSize: 11, color: Colors.slate500, marginLeft: 5 }}>
                  Secured by Flutterwave Bank Transfer / Card
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, (!numAmount || numAmount < 100 || isProcessing) && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={!numAmount || numAmount < 100 || isProcessing}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {isProcessing ? 'Connecting to Flutterwave...' : `PAY ₦${(numAmount + fee).toLocaleString()}`}
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
