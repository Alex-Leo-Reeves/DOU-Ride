import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  GraduationCap,
  User,
  Building,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { DouCard } from '../../components/DouCard';
import type { PortalScrapeResult } from './PortalVerificationScreen';

type RegisterRouteParams = {
  StudentRegister: { portalData?: PortalScrapeResult } | undefined;
};

export default function StudentRegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RegisterRouteParams, 'StudentRegister'>>();
  const { registerStudent, isLoading, error, clearError } = useAuthStore();

  const portalData = route.params?.portalData;

  const [matric, setMatric] = useState(portalData?.matricNumber || '');
  const [fullName, setFullName] = useState(portalData?.fullName || '');
  const [department, setDepartment] = useState(portalData?.department || '');
  const [faculty, setFaculty] = useState(portalData?.faculty || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(portalData?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (portalData) {
      if (portalData.matricNumber) setMatric(portalData.matricNumber);
      if (portalData.fullName) setFullName(portalData.fullName);
      if (portalData.department) setDepartment(portalData.department);
      if (portalData.faculty) setFaculty(portalData.faculty);
      if (portalData.email) setEmail(portalData.email);
    }
  }, [portalData]);

  const handleRegister = async () => {
    clearError();
    setLocalError('');

    if (
      !matric.trim() ||
      !fullName.trim() ||
      !department.trim() ||
      !faculty.trim() ||
      !phone.trim() ||
      !email.trim() ||
      !password.trim()
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

    const success = await registerStudent({
      matricNumber: matric.trim(),
      fullName: fullName.trim(),
      department: department.trim(),
      faculty: faculty.trim(),
      phone: phone.trim(),
      email: email.trim(),
      password,
    });

    if (success) {
      navigation.reset({ index: 0, routes: [{ name: Routes.studentHome }] });
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
          <Text style={styles.headerTitle}>Student Registration</Text>
          <Text style={styles.headerSubtitle}>Join the DOU campus transit network</Text>
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
          {/* Portal Instant Verification Card */}
          <DouCard
            variant="accent"
            padding={Spacing.md}
            style={styles.portalCard}
            onPress={() => navigation.navigate(Routes.portalVerification)}
          >
            <View style={styles.portalRow}>
              <View style={styles.portalIconWrap}>
                <Sparkles size={20} color={Colors.primary} />
              </View>
              <View style={styles.portalContent}>
                <View style={styles.portalTitleRow}>
                  <Text style={styles.portalTitle}>Autofill from Student Portal</Text>
                  <View style={styles.fastBadge}>
                    <Text style={styles.fastBadgeText}>1-TAP</Text>
                  </View>
                </View>
                <Text style={styles.portalSub}>
                  Log in with your DOU student credentials to automatically verify and fill your matric details
                </Text>
              </View>
              <ChevronRight size={18} color={Colors.primary} />
            </View>
          </DouCard>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Matric */}
            <Text style={styles.fieldLabel}>Matriculation Number *</Text>
            <View style={styles.inputWrap}>
              <GraduationCap size={18} color={Colors.slate400} />
              <TextInput
                style={styles.input}
                value={matric}
                onChangeText={setMatric}
                placeholder="e.g. DOU/2022/SCI/0492"
                placeholderTextColor={Colors.slate400}
                autoCapitalize="characters"
              />
            </View>

            {/* Full Name */}
            <Text style={styles.fieldLabel}>Full Legal Name *</Text>
            <View style={styles.inputWrap}>
              <User size={18} color={Colors.slate400} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Chukwuebuka Daniel Okafor"
                placeholderTextColor={Colors.slate400}
              />
            </View>

            {/* Faculty & Dept Row */}
            <View style={styles.twoColumnRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Faculty *</Text>
                <View style={styles.inputWrap}>
                  <Building size={16} color={Colors.slate400} />
                  <TextInput
                    style={styles.input}
                    value={faculty}
                    onChangeText={setFaculty}
                    placeholder="e.g. Science"
                    placeholderTextColor={Colors.slate400}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Department *</Text>
                <View style={styles.inputWrap}>
                  <Building size={16} color={Colors.slate400} />
                  <TextInput
                    style={styles.input}
                    value={department}
                    onChangeText={setDepartment}
                    placeholder="e.g. Comp Sci"
                    placeholderTextColor={Colors.slate400}
                  />
                </View>
              </View>
            </View>

            {/* Phone */}
            <Text style={styles.fieldLabel}>Active WhatsApp / Phone Number *</Text>
            <View style={styles.inputWrap}>
              <Phone size={18} color={Colors.slate400} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. 08031234567"
                placeholderTextColor={Colors.slate400}
                keyboardType="phone-pad"
              />
            </View>

            {/* Email */}
            <Text style={styles.fieldLabel}>Student Email Address *</Text>
            <View style={styles.inputWrap}>
              <Mail size={18} color={Colors.slate400} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="e.g. student@dou.edu.ng"
                placeholderTextColor={Colors.slate400}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password */}
            <Text style={styles.fieldLabel}>Transit Password (min. 6 chars) *</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color={Colors.slate400} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter strong password"
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

            {/* Error Message */}
            {displayError ? (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={Colors.error} />
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            ) : null}

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Create Student Transit Account</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already registered on DOU Ride?</Text>
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
  portalCard: {
    marginBottom: Spacing.lg,
  },
  portalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  portalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalContent: {
    flex: 1,
  },
  portalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  portalTitle: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  fastBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  fastBadgeText: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  portalSub: {
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
    backgroundColor: Colors.primary,
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
    color: Colors.primary,
  },
});
