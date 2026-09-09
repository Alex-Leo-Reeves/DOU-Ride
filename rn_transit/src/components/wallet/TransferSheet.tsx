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
