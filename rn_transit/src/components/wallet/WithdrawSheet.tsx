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
  ScrollView,
} from 'react-native';
import { ArrowUpRight, Building2, Check, ChevronDown } from 'lucide-react-native';
import { Colors } from '../../config/theme';
import { walletStyles as styles } from './WalletStyles';

interface WithdrawSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { bankCode: string; bankName: string; accountNumber: string; amount: number }) => Promise<boolean>;
  currentBalance: number;
}

const BANKS = [
  { code: '000019', name: 'GTBank (Guaranty Trust)', supportsVerification: true },
  { code: '000004', name: 'Zenith Bank', supportsVerification: true },
  { code: '000013', name: 'Access Bank', supportsVerification: true },
  { code: '000007', name: 'First Bank of Nigeria', supportsVerification: true },
  { code: '000002', name: 'United Bank for Africa (UBA)', supportsVerification: true },
  { code: '000001', name: 'Fidelity Bank', supportsVerification: true },
  { code: '000008', name: 'Sterling Bank', supportsVerification: true },
  { code: '000009', name: 'Wema Bank / ALAT', supportsVerification: true },
  { code: '999992', name: 'OPay (Digital Services)', supportsVerification: false },
  { code: '999991', name: 'PalmPay', supportsVerification: false },
  { code: '000031', name: 'Moniepoint MFB', supportsVerification: false },
];

export function WithdrawSheet({ visible, onClose, onSubmit, currentBalance }: WithdrawSheetProps) {
  const [amount, setAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState<{ code: string; name: string; supportsVerification?: boolean } | null>(BANKS[0]);
  const [accountNumber, setAccountNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [verifiedAccountName, setVerifiedAccountName] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Real account verification
  useEffect(() => {
    setVerifiedAccountName(null);
    setAccountError(null);
    
    // Skip verification for banks that don't support it
    if (selectedBank?.supportsVerification === false) {
      setAccountError('Verification not available for this bank');
      return;
    }
    
    if (accountNumber.length === 10 && selectedBank) {
      verifyAccountNumber();
    }
  }, [accountNumber, selectedBank]);

  const verifyAccountNumber = async () => {
    setVerifyingAccount(true);
    setAccountError(null);
    try {
      const response = await fetch('https://dou-transit-api.onrender.com/api/wallet/verify-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber,
          bankCode: selectedBank?.code,
        }),
      });
      const data = await response.json();
      if (data.accountName) {
        setVerifiedAccountName(data.accountName);
      } else {
        setAccountError(data.error || 'Could not verify account');
      }
    } catch {
      setAccountError('Verification failed. Please try again.');
    } finally {
      setVerifyingAccount(false);
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const isInsufficientBalance = numAmount > currentBalance;
  const isAccountVerified = verifiedAccountName != null;
  const isVerificationFailed = accountError != null;
  const isFormValid = numAmount > 0 && !isInsufficientBalance && accountNumber.length === 10 && selectedBank && (isAccountVerified || isVerificationFailed);

  const handleSubmit = async () => {
    if (numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to withdraw.');
      return;
    }
    if (!selectedBank) {
      Alert.alert('Missing Bank', 'Please select a receiving destination bank or fintech wallet.');
      return;
    }
    if (accountNumber.length < 10) {
      Alert.alert('Invalid Account', 'Please enter a valid 10-digit NUBAN account number.');
      return;
    }
    
    // If verification failed, ask user to confirm
    if (!verifiedAccountName && accountError) {
      Alert.alert(
        'Verification Failed',
        'Could not verify account details. Please ensure the account number and bank are correct. Continue anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => processWithdrawal() },
        ]
      );
      return;
    }
    
    processWithdrawal();
  };

  const processWithdrawal = async () => {
    if (!selectedBank) {
      Alert.alert('Missing Bank', 'Please select a receiving destination bank or fintech wallet.');
      return;
    }
    setIsProcessing(true);
    try {
      const success = await onSubmit({
        bankCode: selectedBank.code,
        bankName: selectedBank.name,
        accountNumber,
        amount: numAmount,
      });
      setIsProcessing(false);
      if (success) {
        Alert.alert(
          'Withdrawal Initiated',
          `₦${numAmount.toLocaleString()} is being routed via Flutterwave to ${selectedBank.name} (${accountNumber}).`,
          [{ text: 'OK', onPress: onClose }]
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
              backgroundColor: Colors.errorSoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}>
              <ArrowUpRight size={20} color={Colors.error} strokeWidth={2.5} />
            </View>
            <Text style={styles.sheetTitle}>Withdraw Funds</Text>
          </View>
          <Text style={styles.sheetSubtitle}>Instant payout to your Bank, OPay or PalmPay account</Text>

          <Text style={styles.sectionTitle}>Withdrawal Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="Amount in Naira (e.g. 2500)"
            placeholderTextColor={Colors.slate400}
            keyboardType="number-pad"
          />
          <Text style={styles.balanceInfo}>
            Available Balance: ₦{currentBalance.toLocaleString()}
          </Text>
          {isInsufficientBalance && numAmount > 0 && (
            <Text style={styles.errorText}>Insufficient Balance</Text>
          )}

          <Text style={styles.sectionTitle}>Receiving Bank / Fintech</Text>
          <TouchableOpacity
            style={styles.bankSelector}
            onPress={() => setShowBankPicker(true)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Building2 size={18} color={Colors.slate600} strokeWidth={2} style={{ marginRight: 8 }} />
              <Text style={[styles.bankSelectorText, !selectedBank && { color: Colors.slate400 }]}>
                {selectedBank?.name || 'Select Bank / Fintech'}
              </Text>
            </View>
            <ChevronDown size={18} color={Colors.slate500} strokeWidth={2.5} />
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>10-Digit Account Number</Text>
          <TextInput
            style={styles.input}
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="e.g. 8102345678"
            placeholderTextColor={Colors.slate400}
            keyboardType="number-pad"
            maxLength={10}
          />
          {verifyingAccount && (
            <Text style={styles.verifyingText}>Verifying account...</Text>
          )}
          {verifiedAccountName && !verifyingAccount && (
            <Text style={styles.verifiedText}>✓ {verifiedAccountName}</Text>
          )}
          {accountError && !verifyingAccount && (
            <Text style={styles.warningText}>⚠ {accountError} - Please verify details are correct</Text>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, (!isFormValid || isProcessing) && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={!isFormValid || isProcessing}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {isProcessing ? 'Processing Payout...' : 'PROCEED WITHDRAWAL'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showBankPicker} transparent animationType="fade" onRequestClose={() => setShowBankPicker(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { maxHeight: '70%' }]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Select Destination Bank</Text>
            <Text style={styles.sheetSubtitle}>Choose from commercial banks or digital wallets</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {BANKS.map((bank) => (
                <TouchableOpacity
                  key={bank.code}
                  style={styles.bankItem}
                  onPress={() => {
                    setSelectedBank(bank);
                    setShowBankPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.bankItemText, selectedBank?.code === bank.code && { color: Colors.primaryAccent, fontWeight: '800' }]}>
                    {bank.name}
                  </Text>
                  {selectedBank?.code === bank.code && (
                    <Check size={18} color={Colors.primaryAccent} strokeWidth={3} />
                  )}
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
