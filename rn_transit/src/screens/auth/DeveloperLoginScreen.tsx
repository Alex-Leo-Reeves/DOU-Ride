import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';

export default function DeveloperLoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { developerAccess, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async () => {
    clearError(); setLocalError('');
    if (!username.trim() || !password.trim()) { setLocalError('All fields required'); return; }
    const success = await developerAccess(username.trim(), password);
    if (success) {
      navigation.reset({ index: 0, routes: [{ name: Routes.developerMapping }] });
    }
  };

  const displayError = localError || error;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
          <Text style={styles.icon}>💻</Text>
          <Text style={styles.title}>Developer Console</Text>
          <Text style={styles.subtitle}>Sign in with your developer account</Text>
          <View style={styles.form}>
            <Text style={styles.label}>Username</Text>
            <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={Colors.grey} autoCapitalize="none" />
            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={Colors.grey} secureTextEntry />
            {displayError ? <Text style={styles.errorText}>{displayError}</Text> : null}
            <TouchableOpacity style={[styles.submitButton, isLoading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color={Colors.black} /> : <Text style={styles.submitText}>Access Console</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  content: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  backText: { fontSize: FontSize.lg, color: Colors.white, fontWeight: '600', marginBottom: 24 },
  icon: { fontSize: 64, textAlign: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.white, textAlign: 'center' },
  subtitle: { fontSize: FontSize.md, color: Colors.grey, textAlign: 'center', marginBottom: 32 },
  form: {},
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.white, marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 2, borderColor: Colors.white, borderRadius: BorderRadius.md, padding: 14, fontSize: FontSize.md, color: Colors.white, backgroundColor: 'transparent' },
  errorText: { color: Colors.error, fontSize: FontSize.sm, marginTop: 12, textAlign: 'center' },
  submitButton: { backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: 16, alignItems: 'center', marginTop: 24, ...Shadows.lg },
  submitText: { color: Colors.black, fontSize: FontSize.lg, fontWeight: 'bold' },
});
