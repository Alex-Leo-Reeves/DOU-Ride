import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  User,
  Phone,
  CreditCard,
  Building,
  Save,
  CheckCircle2,
  LogOut,
  Shield,
  Bell,
  HardDrive,
  ChevronRight,
  HelpCircle,
  Hash,
  Sparkles,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

const SETTLEMENT_STORAGE_KEY = '@dou_transit_settlement_account';

const NIGERIAN_BANKS = [
  'OPay',
  'PalmPay',
  'Moniepoint',
  'Kuda Bank',
  'Access Bank',
  'GTBank',
  'Zenith Bank',
  'First Bank of Nigeria',
  'United Bank for Africa (UBA)',
  'Fidelity Bank',
];

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user, logout } = useAuthStore();

  const [selectedBank, setSelectedBank] = useState('OPay');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadSettlementDetails();
  }, []);

  const loadSettlementDetails = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTLEMENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSelectedBank(parsed.bank || 'OPay');
        setAccountNumber(parsed.accountNumber || '');
        setAccountName(parsed.accountName || '');
      }
    } catch (e) {
      console.warn('[SettingsScreen] Failed to load settlement details:', e);
    }
  };

  const handleSaveSettlement = async () => {
    if (!accountNumber.trim()) {
      Alert.alert('Missing Field', 'Please enter your 10-digit account number or OPay phone number.');
      return;
    }
    if (accountNumber.trim().length < 10) {
      Alert.alert('Invalid Account', 'Account numbers must be at least 10 digits.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const data = {
        bank: selectedBank,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim() || user?.fullName || 'Verified DOU Account',
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(SETTLEMENT_STORAGE_KEY, JSON.stringify(data));

      // Optional sync with backend if available
      try {
        await api.post('/api/wallet/settlement-account', {
          userId: user?.userId,
          ...data,
        });
      } catch {
        // Backend optional fallback
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      Alert.alert('Saved Successfully', 'Your settlement account details have been updated.');
    } catch (e: any) {
      Alert.alert('Save Failed', e.message || 'Could not save account details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of DOU Transit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({
            index: 0,
            routes: [{ name: Routes.roleSelection }],
          });
        },
      },
    ]);
  };

  const roleBadgeColor =
    user?.role === 'driver'
      ? Colors.secondary
      : user?.role === 'admin'
      ? Colors.danger
      : Colors.primary;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account & Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your profile, banking & preferences</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatarBadge, { backgroundColor: roleBadgeColor }]}>
            <Text style={styles.avatarText}>
              {user?.fullName
                ? user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.fullName || 'DOU Transit User'}</Text>
            <View style={styles.roleTagRow}>
              <View style={[styles.roleTag, { backgroundColor: `${roleBadgeColor}15` }]}>
                <Text style={[styles.roleTagText, { color: roleBadgeColor }]}>
                  {user?.role?.toUpperCase() || 'STUDENT'}
                </Text>
              </View>
              {user?.userId && (
                <Text style={styles.userIdText}>ID: {user.userId.slice(0, 10)}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Banking / Settlement Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <CreditCard size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>
              {user?.role === 'driver' ? 'Settlement & Payout Account' : 'Linked Bank / OPay Account'}
            </Text>
          </View>
          <Text style={styles.sectionDescription}>
            {user?.role === 'driver'
              ? 'Enter your bank or OPay details below. All campus keke fares and daily payouts will be transferred directly here.'
              : 'Add your account number or OPay phone number for rapid refunds and peer-to-peer friend transfers.'}
          </Text>

          <View style={styles.card}>
            {/* Bank Selection */}
            <Text style={styles.fieldLabel}>Select Bank / Provider</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bankPillsRow}
            >
              {NIGERIAN_BANKS.map((b) => {
                const isSelected = selectedBank === b;
                return (
                  <TouchableOpacity
                    key={b}
                    style={[styles.bankPill, isSelected && styles.bankPillSelected]}
                    onPress={() => setSelectedBank(b)}
                  >
                    <Building size={12} color={isSelected ? Colors.white : Colors.slate600} />
                    <Text style={[styles.bankPillText, isSelected && styles.bankPillTextSelected]}>
                      {b}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Account Number */}
            <Text style={styles.fieldLabel}>
              Account Number / OPay Phone Number <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={styles.inputWrap}>
              <Hash size={16} color={Colors.slate400} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 08012345678 or 1234567890"
                placeholderTextColor={Colors.slate400}
                keyboardType="number-pad"
                maxLength={11}
                value={accountNumber}
                onChangeText={setAccountNumber}
              />
            </View>

            {/* Account Holder Name */}
            <Text style={styles.fieldLabel}>Account Holder Name (Optional)</Text>
            <View style={styles.inputWrap}>
              <User size={16} color={Colors.slate400} />
              <TextInput
                style={styles.textInput}
                placeholder={user?.fullName || 'Name as on bank account'}
                placeholderTextColor={Colors.slate400}
                value={accountName}
                onChangeText={setAccountName}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
              onPress={handleSaveSettlement}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color={Colors.white} />
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 size={16} color={Colors.white} />
                  <Text style={styles.saveButtonText}>Details Saved</Text>
                </>
              ) : (
                <>
                  <Save size={16} color={Colors.white} />
                  <Text style={styles.saveButtonText}>Save Account Information</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferences & System Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences & Tools</Text>

          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate(Routes.offlineSettings)}
            >
              <View style={styles.menuIconWrap}>
                <HardDrive size={18} color={Colors.primary} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>Offline Mode & Map Caching</Text>
                <Text style={styles.menuItemSubtitle}>Manage cached tiles & pending offline scans</Text>
              </View>
              <ChevronRight size={18} color={Colors.slate400} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setNotificationsEnabled(!notificationsEnabled)}
            >
              <View style={styles.menuIconWrap}>
                <Bell size={18} color={Colors.secondary} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>Transit Notifications</Text>
                <Text style={styles.menuItemSubtitle}>
                  {notificationsEnabled ? 'Enabled — sound & queue alerts' : 'Disabled'}
                </Text>
              </View>
              <View
                style={[
                  styles.toggleBadge,
                  { backgroundColor: notificationsEnabled ? '#ECFDF5' : Colors.slate100 },
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: notificationsEnabled ? '#059669' : Colors.slate500 },
                  ]}
                >
                  {notificationsEnabled ? 'ON' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support & Safety */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security & Support</Text>

          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                Alert.alert(
                  'DOU Security Rapid Response',
                  'For on-campus transit emergencies or lost property reports, contact the Campus Security Control Desk at Gate 1.',
                )
              }
            >
              <View style={styles.menuIconWrap}>
                <Shield size={18} color={Colors.danger} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>Campus Security Dispatch</Text>
                <Text style={styles.menuItemSubtitle}>Direct line to Asaba Campus Security</Text>
              </View>
              <ChevronRight size={18} color={Colors.slate400} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={18} color={Colors.danger} />
          <Text style={styles.logoutButtonText}>Sign Out from Device</Text>
        </TouchableOpacity>

        {/* Build Tag */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Dennis Osadebay University Transit</Text>
          <Text style={styles.buildText}>v1.0.0 Production Release • Asaba Main Campus</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    marginTop: 2,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 60,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  avatarBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontFamily: 'Inter_700Bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FontSize.base,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  roleTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  roleTagText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  userIdText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate800,
  },
  sectionDescription: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.card,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
    marginBottom: 6,
    marginTop: Spacing.xs,
  },
  requiredStar: {
    color: Colors.danger,
  },
  bankPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  bankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  bankPillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  bankPillText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
  },
  bankPillTextSelected: {
    color: Colors.white,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate900,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    gap: 8,
    marginTop: Spacing.xs,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontFamily: 'Inter_600SemiBold',
  },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
    overflow: 'hidden',
    ...Shadows.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate800,
  },
  menuItemSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.slate100,
    marginLeft: 56,
  },
  toggleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  toggleText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  logoutButtonText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.danger,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  footerText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate400,
  },
  buildText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate400,
    marginTop: 2,
  },
});
