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
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
  const [localError, setLocalError] = useState('');

  // If portal data arrives via navigation params, pre-fill fields
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

    if (!matric.trim() || !fullName.trim() || !department.trim() || !faculty.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setLocalError('All fields are required');
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
      navigation.reset({ index: 0, routes: [{ name: 'StudentHome' }] });
    }
  };

  const displayError = localError || error;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Student Registration</Text>
          <Text style={styles.subtitle}>Create your DOU Transit student account</Text>

          {/* Portal verification link */}
          <DouCard padding={16} style={styles.portalCard} onPress={() => navigation.navigate(Routes.portalVerification)}>
            <View style={styles.portalRow}>
              <Text style={styles.portalIcon}>🔗</Text>
              <View style={styles.portalContent}>
                <Text style={styles.portalTitle}>Verify via DOU Portal</Text>
                <Text style={styles.portalSubtitle}>
                  Auto-fill your details from the DOU student portal
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </DouCard>

          <View style={styles.form}>
            <Text style={styles.label}>Matric Number</Text>
            <TextInput
              style={styles.input}
              value={matric}
              onChangeText={setMatric}
              placeholder="e.g. 2021/1/12345"
              placeholderTextColor={Colors.lightGrey}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. John Doe"
              placeholderTextColor={Colors.lightGrey}
            />

            <Text style={styles.label}>Department</Text>
            <TextInput
              style={styles.input}
              value={department}
              onChangeText={setDepartment}
              placeholder="e.g. Computer Science"
              placeholderTextColor={Colors.lightGrey}
            />

            <Text style={styles.label}>Faculty</Text>
            <TextInput
              style={styles.input}
              value={faculty}
              onChangeText={setFaculty}
              placeholder="e.g. Science"
              placeholderTextColor={Colors.lightGrey}
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. 08012345678"
              placeholderTextColor={Colors.lightGrey}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. john@example.com"
              placeholderTextColor={Colors.lightGrey}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={Colors.lightGrey}
              secureTextEntry
            />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat password"
              placeholderTextColor={Colors.lightGrey}
              secureTextEntry
            />

            {displayError ? (
              <Text style={styles.errorText}>{displayError}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate(Routes.login)}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Log in</Text>
            </Text>
          </TouchableOpacity>
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
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontSize: FontSize.lg,
    color: Colors.black,
    fontWeight: '600',
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.grey,
    marginBottom: 24,
  },
  portalCard: {
    marginBottom: 24,
  },
  portalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  portalIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  portalContent: {
    flex: 1,
  },
  portalTitle: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.black,
  },
  portalSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.grey,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: Colors.black,
  },
  form: {},
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.black,
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.md,
    padding: 14,
    fontSize: FontSize.md,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    marginTop: 12,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: Colors.black,
    borderRadius: BorderRadius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    ...Shadows.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: FontSize.md,
    color: Colors.grey,
  },
  loginLinkBold: {
    fontWeight: 'bold',
    color: Colors.black,
  },
});
