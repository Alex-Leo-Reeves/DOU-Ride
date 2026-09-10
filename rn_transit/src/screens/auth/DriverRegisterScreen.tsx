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
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Car,
  Phone,
  User,
  Hash,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Camera,
  AlertCircle,
  FileCheck,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { DouCard } from '../../components/DouCard';

export default function DriverRegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { registerDriver, isLoading, error, clearError } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleRegister = async () => {
    clearError();
    setLocalError('');

    if (
      !phone.trim() ||
      !fullName.trim() ||
      !password.trim() ||
      !vehicleReg.trim() ||
      !licensePlate.trim()
    ) {
      setLocalError('All fields are required to register');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    const data: Record<string, unknown> = {
      phone: phone.trim(),
      fullName: fullName.trim(),
      kekeRegistration: vehicleReg.trim(),
      licensePlate: licensePlate.trim().toUpperCase(),
      maxSeats: 4,
      facePhotoBase64: '',
      password,
    };

    const success = await registerDriver(data);
    if (success) {
      navigation.reset({ index: 0, routes: [{ name: Routes.driverHome }] });
    }
  };

  const displayError = localError || error;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.slate800} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Driver Fleet Onboarding</Text>
          <Text style={styles.headerSubtitle}>Official DOU commercial transit operator</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Compliance Notice */}
          <DouCard variant="accent" padding={Spacing.md} style={styles.noticeCard}>
            <View style={styles.noticeRow}>
              <ShieldCheck size={20} color={Colors.secondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.noticeTitle}>Student Affairs Fleet Mandate</Text>
                <Text style={styles.noticeSub}>
                  Max 4 passengers per trip. Fares strictly ₦100 inside campus, ₦200 outside.
                  Physical gate inspection required at Security Gate 1.
                </Text>
              </View>
            </View>
          </DouCard>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Full Name */}
            <Text style={styles.fieldLabel}>Driver Full Legal Name *</Text>
            <View style={styles.inputWrap}>
              <User size={18} color={Colors.slate400} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Babatunde Raji"
                placeholderTextColor={Colors.slate400}
              />
            </View>

            {/* Phone */}
            <Text style={styles.fieldLabel}>Phone Number (Linked to OPay / Bank) *</Text>
            <View style={styles.inputWrap}>
              <Phone size={18} color={Colors.slate400} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. 08034567890"
                placeholderTextColor={Colors.slate400}
                keyboardType="phone-pad"
              />
            </View>

            {/* Fleet & Plate Row */}
            <View style={styles.twoColumnRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Fleet Number *</Text>
                <View style={styles.inputWrap}>
                  <Hash size={16} color={Colors.slate400} />
                  <TextInput
                    style={styles.input}
                    value={vehicleReg}
                    onChangeText={setVehicleReg}
                    placeholder="e.g. 042"
                    placeholderTextColor={Colors.slate400}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Plate Number *</Text>
                <View style={styles.inputWrap}>
                  <Car size={16} color={Colors.slate400} />
                  <TextInput
                    style={styles.input}
                    value={licensePlate}
                    onChangeText={setLicensePlate}
                    placeholder="e.g. ASB-492-XA"
                    placeholderTextColor={Colors.slate400}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            </View>

            {/* Password */}
            <Text style={styles.fieldLabel}>Terminal Password *</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color={Colors.slate400} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor={Colors.slate400}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={18} color={Colors.slate400} />
                ) : (
                  <Eye size={18} color={Colors.slate400} />
                )}
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <Text style={styles.fieldLabel}>Confirm Password *</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color={Colors.slate400} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-type password"
                placeholderTextColor={Colors.slate400}
                secureTextEntry={!showPassword}
              />
            </View>

            {displayError ? (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={Colors.error} />
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Register Commercial Operator</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already registered as a driver?</Text>
              <TouchableOpacity onPress={() => navigation.navigate(Routes.login)}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
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
  scrollContent: {
    padding: Spacing.lg,
  },
  noticeCard: {
    marginBottom: Spacing.lg,
    borderColor: Colors.secondary + '30',
  },
  noticeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  noticeTitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.secondary,
    marginBottom: 2,
  },
  noticeSub: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate600,
    lineHeight: 16,
  },
  formContainer: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
    marginBottom: 4,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate900,
    padding: 0,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.error + '12',
    padding: 12,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.error,
    flex: 1,
  },
  submitButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    ...Shadows.md,
  },
  submitButtonText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  loginText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
  },
  loginLink: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.secondary,
  },
});
