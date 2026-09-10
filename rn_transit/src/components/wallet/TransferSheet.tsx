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
import { Send, UserCheck, ShieldCheck } from 'lucide-react-native';
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
    if (numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Enter a valid amount to send.');
      return;
    }
    if (!recipientId.trim()) {
      Alert.alert('Missing Recipient', 'Enter the recipient Matric Number, Phone, or User ID.');
      return;
    }

    setIsProcessing(true);
    try {
      const success = await onSubmit({
        recipientId: recipientId.trim(),
        amount: numAmount,
        note: note.trim() || undefined,
      });
      setIsProcessing(false);
      if (success) {
        Alert.alert(
          'Transfer Successful! 🎉',
          `₦${numAmount.toLocaleString()} sent instantly to ${recipientId.trim()}. Fee: ₦0.00`,
          [{ text: 'Great', onPress: onClose }]
        );
      }
    } catch {
      setIsProcessing(false);
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
              backgroundColor: Colors.secondarySoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}>
              <Send size={18} color={Colors.secondary} strokeWidth={2.5} />
            </View>
            <Text style={styles.sheetTitle}>Transfer to Friend</Text>
          </View>
          <Text style={styles.sheetSubtitle}>Send money to a fellow student or friend with ₦0 fee</Text>

          <Text style={styles.sectionTitle}>Recipient</Text>
          <TextInput
            style={styles.input}
            value={recipientId}
            onChangeText={setRecipientId}
            placeholder="Matric No, Phone, or User ID (e.g. 2024/...)"
            placeholderTextColor={Colors.slate400}
            autoCapitalize="none"
          />

          <Text style={styles.sectionTitle}>Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="₦ Amount to transfer"
            placeholderTextColor={Colors.slate400}
            keyboardType="number-pad"
          />

          <Text style={styles.sectionTitle}>Payment Note (Optional)</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. For Keke fare or cafeteria lunch"
            placeholderTextColor={Colors.slate400}
            maxLength={100}
          />

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: Colors.slate50,
            padding: 10,
            borderRadius: 8,
            marginBottom: 14,
          }}>
            <ShieldCheck size={16} color={Colors.success} strokeWidth={2.5} />
            <Text style={{ fontSize: 12, color: Colors.slate600, marginLeft: 8 }}>
              Instant campus settlement • ₦0.00 Transaction Fee
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (!amount || !recipientId.trim() || isProcessing) && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={!amount || !recipientId.trim() || isProcessing}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {isProcessing ? 'Sending Funds...' : `SEND ₦${(parseFloat(amount) || 0).toLocaleString()}`}
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
