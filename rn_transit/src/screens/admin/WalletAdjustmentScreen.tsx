import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Building,
  Check,
  X,
  FileText,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { DouCard } from '../../components/DouCard';

export default function WalletAdjustmentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const { isLoading, error, adjustWallet, pendingBankApprovals } = useAdminStore();

  const initialMatric = route.params?.studentMatric || '';
  const initialUserId = route.params?.studentId || '';

  const [userId, setUserId] = useState(initialUserId || initialMatric);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isCredit, setIsCredit] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!userId.trim()) {
      Alert.alert('Missing Recipient', 'Please enter a Student Matric or User ID.');
      return;
    }
    if (!amt || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount in Naira.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      Alert.alert('Mandatory Audit Memo', 'Please enter a detailed explanation or memo reference for audit records.');
      return;
    }

    const finalAmount = isCredit ? amt : -amt;
    const ok = await adjustWallet(userId.trim(), finalAmount, reason.trim(), user?.token);

    if (ok) {
      setSuccessMessage(
        `Successfully ${isCredit ? 'credited' : 'debited'} ₦${amt.toLocaleString()} for ${userId}.`
      );
      setAmount('');
      setReason('');
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceLight} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.slate800} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Financial Adjustments</Text>
          <Text style={styles.headerSubtitle}>
            Student Affairs Ledger Oversight & Bank Approvals
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pending Bank Approvals Banner if any */}
        {pendingBankApprovals > 0 && (
          <DouCard variant="accent" padding={Spacing.md} style={styles.pendingBankCard}>
            <View style={styles.pendingBankRow}>
              <AlertCircle size={20} color={Colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingBankTitle}>
                  {pendingBankApprovals} Driver Bank Change Requests Pending
                </Text>
                <Text style={styles.pendingBankSub}>
                  Drivers cannot change payout accounts without Student Affairs approval.
                </Text>
              </View>
            </View>

            {/* Simulated Request Item */}
            <View style={styles.bankApprovalItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>Babatunde Raji (Fleet #042)</Text>
                <Text style={styles.bankChangeDetail}>OPay ➔ 8034567890 (Approved Name Match)</Text>
              </View>
              <View style={styles.approvalActionRow}>
                <TouchableOpacity
                  style={[styles.miniBtn, { backgroundColor: Colors.success }]}
                  onPress={() => Alert.alert('Approved', 'Bank details updated for Fleet #042')}
                >
                  <Check size={14} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.miniBtn, { backgroundColor: Colors.error }]}
                  onPress={() => Alert.alert('Rejected', 'Change request declined.')}
                >
                  <X size={14} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </DouCard>
        )}

        {/* Audit Memo Banner */}
        <DouCard variant="elevated" padding={Spacing.md} style={styles.auditNotice}>
          <View style={styles.auditRow}>
            <ShieldCheck size={20} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.auditTitle}>DOU Internal Audit Policy</Text>
              <Text style={styles.auditText}>
                All ledger modifications are cryptographically signed with your admin token and
                logged into the Student Affairs compliance ledger.
              </Text>
            </View>
          </View>
        </DouCard>

        {successMessage && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={18} color={Colors.success} />
            <Text style={styles.successBannerText}>{successMessage}</Text>
          </View>
        )}

        {/* Toggle Credit / Debit */}
        <Text style={styles.fieldLabel}>Adjustment Operation</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, isCredit && styles.toggleBtnCreditActive]}
            onPress={() => setIsCredit(true)}
            activeOpacity={0.8}
          >
            <ArrowDownLeft size={16} color={isCredit ? Colors.white : Colors.success} />
            <Text style={[styles.toggleBtnText, isCredit && styles.toggleBtnTextActive]}>
              CREDIT / REFUND
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, !isCredit && styles.toggleBtnDebitActive]}
            onPress={() => setIsCredit(false)}
            activeOpacity={0.8}
          >
            <ArrowUpRight size={16} color={!isCredit ? Colors.white : Colors.error} />
            <Text style={[styles.toggleBtnText, !isCredit && styles.toggleBtnTextActive]}>
              DEBIT / PENALTY FINE
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recipient User / Matric */}
        <Text style={styles.fieldLabel}>Target Student Matric or User ID *</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="e.g. DOU/2022/SCI/0192 or UUID"
            placeholderTextColor={Colors.slate400}
            value={userId}
            onChangeText={setUserId}
            autoCapitalize="characters"
          />
        </View>

        {/* Amount */}
        <Text style={styles.fieldLabel}>Amount (₦) *</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={[styles.input, { fontSize: FontSize.lg, fontFamily: 'Inter_700Bold' }]}
            placeholder="₦ 0.00"
            placeholderTextColor={Colors.slate400}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
        </View>

        {/* Quick Amount Pills */}
        <View style={styles.quickAmountRow}>
          {['100', '200', '500', '1000', '1500'].map((val) => (
            <TouchableOpacity
              key={val}
              style={styles.quickPill}
              onPress={() => setAmount(val)}
            >
              <Text style={styles.quickPillText}>+₦{val}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mandatory Reason Memo */}
        <Text style={styles.fieldLabel}>Official Audit Memo & Justification *</Text>
        <View style={[styles.inputWrap, { height: 100, paddingVertical: 10 }]}>
          <TextInput
            style={[styles.input, { height: '100%', textAlignVertical: 'top' }]}
            placeholder="e.g. Approved refund for double transaction on Keke #042 per Memo SA/2026/08."
            placeholderTextColor={Colors.slate400}
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={300}
          />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: isCredit ? Colors.success : Colors.error },
            isLoading && { opacity: 0.6 },
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitBtnText}>
              {isCredit ? 'CREDIT STUDENT WALLET' : 'POST DEBIT FINE'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
  },
  content: {
    padding: Spacing.lg,
  },
  pendingBankCard: {
    marginBottom: Spacing.md,
    borderColor: Colors.warning + '40',
  },
  pendingBankRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pendingBankTitle: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  pendingBankSub: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate600,
  },
  bankApprovalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  driverName: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  bankChangeDetail: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate500,
    marginTop: 2,
  },
  approvalActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  miniBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditNotice: {
    marginBottom: Spacing.lg,
  },
  auditRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  auditTitle: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
    marginBottom: 2,
  },
  auditText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate600,
    lineHeight: 18,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.success + '15',
    padding: 12,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  successBannerText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.success,
    flex: 1,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
    marginBottom: 6,
    marginTop: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  toggleBtnCreditActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  toggleBtnDebitActive: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  toggleBtnText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate700,
  },
  toggleBtnTextActive: {
    color: Colors.white,
  },
  inputWrap: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: Spacing.xs,
    ...Shadows.sm,
  },
  input: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate900,
    padding: 0,
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  quickPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
  },
  quickPillText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.error,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    ...Shadows.md,
  },
  submitBtnText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
});
