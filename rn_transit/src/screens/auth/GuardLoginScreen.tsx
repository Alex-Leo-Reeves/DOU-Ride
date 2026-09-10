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
  ShieldCheck,
  ScanLine,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  BadgeAlert,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';

export default function GuardLoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleLogin = async () => {
    clearError();
    setLocalError('');
    if (!username.trim() || !password.trim()) {
      setLocalError('All fields required for gate scanner terminal');
      return;
    }
    const success = await login(username.trim(), password);
    const currentUser = useAuthStore.getState().user;
    if (success && currentUser?.role === 'security') {
      navigation.reset({ index: 0, routes: [{ name: Routes.securityScanner }] });
    } else if (success) {
      useAuthStore.getState().logout();
      setLocalError('Access denied. Security Officer account credentials required.');
    }
  };

  const autofillSecurity = () => {
    setUsername('security@dou.edu.ng');
    setPassword('security123');
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
          <Text style={styles.headerTitle}>Campus Security Terminal</Text>
          <Text style={styles.headerSubtitle}>Gate 1 & Gate 2 Biometric Access</Text>
        </View>
        <View style={styles.officerBadge}>
          <Text style={styles.officerBadgeText}>POST 1</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Shield Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.shieldIconWrap}>
              <ShieldCheck size={36} color={Colors.secondary} />
            </View>
            <Text style={styles.heroTitle}>Campus Gate Enforcement</Text>
            <Text style={styles.heroSub}>
              Authorized security personnel terminal for optical face verification, suspended driver checks,
              and physical gate clearance.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={styles.fieldLabel}>Security Officer ID / Email</Text>
            <View style={styles.inputWrap}>
              <User size={18} color={Colors.slate400} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="e.g. security@dou.edu.ng"
                placeholderTextColor={Colors.slate400}
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.fieldLabel}>Gate Passcode</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color={Colors.slate400} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••••••"
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

            {displayError ? (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={Colors.error} />
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitButton, isLoading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Authenticate Gate Terminal</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.autofillBtn} onPress={autofillSecurity}>
              <Sparkles size={14} color={Colors.secondary} />
              <Text style={styles.autofillBtnText}>Autofill Guard Credentials Demo</Text>
            </TouchableOpacity>
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
  officerBadge: {
    backgroundColor: Colors.secondary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  officerBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: Colors.secondary,
  },
  content: {
    padding: Spacing.lg,
    justifyContent: 'center',
    flexGrow: 1,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  shieldIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontSize: FontSize.xl,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  heroSub: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: Spacing.lg,
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
    marginTop: Spacing.md,
    ...Shadows.md,
  },
  submitButtonText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  autofillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: Spacing.xs,
  },
  autofillBtnText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.secondary,
  },
});
