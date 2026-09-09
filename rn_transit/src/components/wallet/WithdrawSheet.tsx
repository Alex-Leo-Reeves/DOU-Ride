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
  ScrollView,
} from 'react-native';
import { Colors } from '../../config/theme';
import { walletStyles as styles } from './WalletStyles';

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
