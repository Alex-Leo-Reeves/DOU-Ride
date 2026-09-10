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
  Image,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Phone,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';

const HOME_BY_ROLE: Record<string, string> = {
  student: Routes.studentHome,
  driver: Routes.driverPayLink,
  admin: Routes.adminDashboard,
  security: Routes.securityScanner,
  vendor: Routes.vendorOrders,
  developer: Routes.developerMapping,
};

type LoginRouteParams = {
  Login: { prefilledEmail?: string } | undefined;
};

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<LoginRouteParams, 'Login'>>();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [identifier, setIdentifier] = useState(route.params?.prefilledEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleLogin = async () => {
    clearError();
    setLocalError('');

    if (!identifier.trim()) {
      setLocalError('Please enter your matric number, email, or phone');
      return;
    }
    if (!password.trim()) {
      setLocalError('Please enter your password');
      return;
    }

    const success = await login(identifier.trim(), password);
    if (success) {
      const role = useAuthStore.getState().user?.role ?? 'student';
      const homeRoute = HOME_BY_ROLE[role] ?? Routes.studentHome;
      navigation.reset({ index: 0, routes: [{ name: homeRoute }] });
    }
  };

  const fillQuickAccount = (type: 'student' | 'driver') => {
    if (type === 'student') {
      setIdentifier('student@dou.edu.ng');
      setPassword('password123');
    } else {
      setIdentifier('08034567890');
      setPassword('password123');
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
          <Text style={styles.headerTitle}>Sign In</Text>
          <Text style={styles.headerSubtitle}>DOU Transit Unified Authentication</Text>
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
          {/* Logo & Subtitle */}
          <View style={styles.logoSection}>
            <Image
              source={require('../../../assets/dou-logo.jpeg')}
              style={styles.logo}
              resizeMode="cover"
            />
            <Text style={styles.welcomeText}>Welcome back to DOU Ride</Text>
            <Text style={styles.instructText}>
              Enter your student matric, phone, or staff email to access your wallet
            </Text>
          </View>

          {/* Input Fields */}
          <View style={styles.formContainer}>
            <Text style={styles.fieldLabel}>Matric / Phone / Email</Text>
            <View style={styles.inputWrap}>
              <Mail size={18} color={Colors.slate400} />
              <TextInput
                style={styles.input}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="e.g. DOU/2022/... or 080..."
                placeholderTextColor={Colors.slate400}
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.fieldLabel}>Password</Text>
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

            {/* Error Banner */}
            {displayError ? (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={Colors.error} />
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            ) : null}

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Sign In to Account</Text>
              )}
            </TouchableOpacity>

            {/* Demo Quick Fill Shortcuts */}
            <View style={styles.demoSection}>
              <View style={styles.demoDividerRow}>
                <View style={styles.demoLine} />
                <Text style={styles.demoLabel}>Demo Fast Autofill</Text>
                <View style={styles.demoLine} />
              </View>

              <View style={styles.demoButtonsRow}>
                <TouchableOpacity
                  style={styles.demoPill}
                  onPress={() => fillQuickAccount('student')}
                >
                  <Sparkles size={12} color={Colors.primary} />
                  <Text style={styles.demoPillText}>Student Demo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoPill}
                  onPress={() => fillQuickAccount('driver')}
                >
                  <Sparkles size={12} color={Colors.secondary} />
                  <Text style={[styles.demoPillText, { color: Colors.secondary }]}>
                    Driver #042 Demo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Portal Verification Alternative */}
            <TouchableOpacity
              style={styles.portalVerifyLink}
              onPress={() => navigation.navigate(Routes.portalVerification)}
            >
              <ShieldCheck size={16} color={Colors.slate600} />
              <Text style={styles.portalVerifyText}>Verify via DOU Student Portal Instead</Text>
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account yet?</Text>
              <TouchableOpacity onPress={() => navigation.navigate(Routes.roleSelection)}>
                <Text style={styles.registerLink}>Register</Text>
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
  logoSection: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.slate200,
    marginBottom: Spacing.sm,
  },
  welcomeText: {
    fontSize: FontSize.lg,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  instructText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: Spacing.md,
  },
  formContainer: {
    gap: Spacing.xs,
    marginTop: Spacing.sm,
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
    marginTop: Spacing.md,
    ...Shadows.md,
  },
  submitButtonText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  demoSection: {
    marginVertical: Spacing.md,
  },
  demoDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  demoLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.slate200,
  },
  demoLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
  },
  demoPillText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  portalVerifyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.slate200,
    marginTop: Spacing.xs,
  },
  portalVerifyText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  registerText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
  },
  registerLink: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
});
