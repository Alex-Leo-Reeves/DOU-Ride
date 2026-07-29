import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';

export default function GuardLoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { login, isLoading, error, clearError, user } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleLogin = async () => {
    clearError(); setLocalError('');
    if (!username.trim() || !password.trim()) { setLocalError('All fields required'); return; }
    const success = await login(username.trim(), password);
    if (success && user?.role === 'security') {
      navigation.reset({ index: 0, routes: [{ name: Routes.securityScanner }] });
    } else if (success) {
      useAuthStore.getState().logout();
      setLocalError('Access denied. Security account required.');
    }
  };

  const displayError = localError || error;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.title}>Security Gate Access</Text>
          <Text style={styles.subtitle}>Only authorized security personnel can log in.</Text>
          <View style={styles.form}>
            <Text style={styles.label}>Username</Text>
            <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={Colors.lightGrey} autoCapitalize="none" />
            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={Colors.lightGrey} secureTextEntry />
            {displayError ? <Text style={styles.errorText}>{displayError}</Text> : null}
            <TouchableOpacity style={[styles.submitButton, isLoading && { opacity: 0.6 }]} onPress={handleLogin} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.submitText}>Login as Security</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 24, flexGrow: 1 },
  backText: { fontSize: FontSize.lg, color: Colors.black, fontWeight: '600', marginBottom: 16 },
  icon: { fontSize: 64, textAlign: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.black, textAlign: 'center' },
  subtitle: { fontSize: FontSize.md, color: Colors.grey, textAlign: 'center', marginBottom: 32 },
  form: {},
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.black, marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.md, padding: 14, fontSize: FontSize.md, color: Colors.black, backgroundColor: Colors.white },
  errorText: { color: Colors.error, fontSize: FontSize.sm, marginTop: 12, textAlign: 'center' },
  submitButton: { backgroundColor: Colors.black, borderRadius: BorderRadius.md, padding: 16, alignItems: 'center', marginTop: 24, ...Shadows.lg },
  submitText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: 'bold' },
});
