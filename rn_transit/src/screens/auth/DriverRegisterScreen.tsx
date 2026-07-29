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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';

export default function DriverRegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { registerDriver, isLoading, error, clearError } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [vehicleReg, setVehicleReg] = useState(''); // keke registration
  const [licensePlate, setLicensePlate] = useState(''); // license plate
  const [localError, setLocalError] = useState('');

  // Image picker placeholder — actual implementation would use expo-image-picker
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const handlePickImage = async () => {
    setLocalError('Face photo: use expo-image-picker');
  };

  const handleRegister = async () => {
    clearError();
    setLocalError('');

    if (!phone.trim() || !fullName.trim() || !password.trim() || !vehicleReg.trim() || !licensePlate.trim()) {
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

    const data: Record<string, unknown> = {
      phone: phone.trim(),
      fullName: fullName.trim(),
      kekeRegistration: vehicleReg.trim(),
      licensePlate: licensePlate.trim(),
      maxSeats: 4,
      facePhotoBase64: '',
      password,
    };

    const success = await registerDriver(data);

    if (success) {
      navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] });
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

          <Text style={styles.title}>Driver Registration</Text>
          <Text style={styles.subtitle}>Sign up to drive with DOU Transit</Text>

          {/* Face photo picker */}
          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.photoPicker} onPress={handlePickImage}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderIcon}>📷</Text>
                  <Text style={styles.photoPlaceholderText}>Add Face Photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. 08012345678"
              placeholderTextColor={Colors.lightGrey}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. John Driver"
              placeholderTextColor={Colors.lightGrey}
            />

            <Text style={styles.label}>Vehicle Registration (Keke)</Text>
            <TextInput
              style={styles.input}
              value={vehicleReg}
              onChangeText={setVehicleReg}
              placeholder="e.g. DDD-567-XY"
              placeholderTextColor={Colors.lightGrey}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>License Plate Number</Text>
            <TextInput
              style={styles.input}
              value={licensePlate}
              onChangeText={setLicensePlate}
              placeholder="e.g. ABC-123-DE"
              placeholderTextColor={Colors.lightGrey}
              autoCapitalize="characters"
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
                <Text style={styles.submitText}>Register as Driver</Text>
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
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoPicker: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.black,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.ultraLightGrey,
  },
  photoPlaceholderIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  photoPlaceholderText: {
    fontSize: FontSize.xs,
    color: Colors.grey,
    fontWeight: '600',
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
