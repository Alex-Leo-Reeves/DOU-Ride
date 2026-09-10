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
  Phone,
  Lock,
  Eye,
  EyeOff,
  Car,
  AlertCircle,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';

const HOME_BY_ROLE: Record<string, string> = {
  driver: Routes.driverTabs,
};

export default function DriverLoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleLogin = async () => {
    clearError();
    setLocalError('');

    if (!phone.trim()) {
      setLocalError('Please enter your phone number');
      return;
    }
    if (!password.trim()) {
      setLocalError('Please enter your password');
      return;
    }

    const success = await login(phone.trim(), password);
    if (success) {
      const role = useAuthStore.getState().user?.role ?? 'driver';
      const homeRoute = HOME_BY_ROLE[role] ?? Routes.driverTabs;
      navigation.reset({ index: 0, routes: [{ name: homeRoute }] });
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
          <Text style={styles.headerTitle}>Driver Sign In</Text>
          <Text style={styles.headerSubtitle}>DOU Fleet Operator Portal</Text>
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
          {/* Icon & Welcome */}
          <View style={styles.logoSection}>
            <View style={styles.iconCircle}>
              <Car size={32} color={Colors.secondary} />
            </View>
            <Text style={styles.welcomeText}>Welcome Back, Driver</Text>
            <Text style={styles.instructText}>
              Enter your registered phone number and password to access your fleet terminal
            </Text>
          </View>

          {/* Input Fields */}
          <View style={styles.formContainer}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.inputWrap}>
              <Phone size={18} color={Colors.slate400} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. 08034567890"
                placeholderTextColor={Colors.slate400}
                keyboardType="phone-pad"
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
                <Text style={styles.submitButtonText}>Sign In to Fleet Terminal</Text>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account yet?</Text>
              <TouchableOpacity onPress={() => navigation.navigate(Routes.driverRegister)}>
                <Text style={styles.registerLink}>Register as Driver</Text>
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
    marginVertical: Spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.sm,
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
    color: Colors.secondary,
  },
});
