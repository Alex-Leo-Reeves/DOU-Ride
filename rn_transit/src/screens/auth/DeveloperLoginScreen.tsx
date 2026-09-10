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
  Terminal,
  Key,
  Lock,
  Code2,
  ShieldAlert,
  Sparkles,
  AlertCircle,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';

export default function DeveloperLoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { developerAccess, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async () => {
    clearError();
    setLocalError('');
    if (!username.trim() || !password.trim()) {
      setLocalError('All fields required for dev terminal');
      return;
    }
    const success = await developerAccess(username.trim(), password);
    if (success) {
      navigation.reset({ index: 0, routes: [{ name: Routes.developerMapping }] });
    }
  };

  const autofillDev = () => {
    setUsername('dev@dou.edu.ng');
    setPassword('admin123');
  };

  const displayError = localError || error;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>GIS Dev Console</Text>
          <Text style={styles.headerSubtitle}>Restricted Administrative Engineering</Text>
        </View>
        <View style={styles.restrictedBadge}>
          <Text style={styles.restrictedBadgeText}>ROOT</Text>
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
          {/* Terminal Icon Hero */}
          <View style={styles.heroSection}>
            <View style={styles.terminalIconWrap}>
              <Terminal size={36} color={Colors.success} />
            </View>
            <Text style={styles.heroTitle}>Campus Mapping Suite</Text>
            <Text style={styles.heroSub}>
              Direct telemetry & dynamic landmark database interface for Dennis Osadebay University engineers.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={styles.fieldLabel}>Engineering Handle / Username</Text>
            <View style={styles.inputWrap}>
              <Code2 size={18} color="#64748B" />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="e.g. dev@dou.edu.ng"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.fieldLabel}>Root Password</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color="#64748B" />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••••••"
                placeholderTextColor="#64748B"
                secureTextEntry
              />
            </View>

            {displayError ? (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={Colors.error} />
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitButton, isLoading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#0B0F19" />
              ) : (
                <Text style={styles.submitButtonText}>Authenticate Terminal</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.autofillBtn} onPress={autofillDev}>
              <Sparkles size={14} color={Colors.success} />
              <Text style={styles.autofillBtnText}>Autofill Dev Passkey</Text>
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
    backgroundColor: '#0B0F19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#0B0F19',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.base,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: '#94A3B8',
  },
  restrictedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  restrictedBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: '#F87171',
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
  terminalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontSize: FontSize.xl,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    paddingHorizontal: Spacing.lg,
  },
  formContainer: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: '#94A3B8',
    marginBottom: 4,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: 'Inter_500Medium',
    color: Colors.white,
    padding: 0,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: '#F87171',
    flex: 1,
  },
  submitButton: {
    backgroundColor: Colors.success,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  submitButtonText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: '#0B0F19',
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
    color: Colors.success,
  },
});
