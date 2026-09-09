import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors, FontSize, BorderRadius } from '../../../config/theme';
import type { PortalScrapeResult } from '../PortalVerificationScreen';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

interface PortalResultCardProps {
  result: PortalScrapeResult;
  existingUser: { exists: boolean; email?: string } | null;
  loginLoading: boolean;
  loginError: string;
  onLogin: () => void;
  onRegister: () => void;
  onCancel: () => void;
}

export function PortalResultCard({
  result,
  existingUser,
  loginLoading,
  loginError,
  onLogin,
  onRegister,
  onCancel,
}: PortalResultCardProps) {
  return (
    <View style={styles.resultCard}>
      <Text style={styles.resultTitle}>✅ Profile Found</Text>
      {result.profileImageBase64 ? (
        <Image
          source={{ uri: result.profileImageBase64 }}
          style={styles.profilePic}
          resizeMode="cover"
        />
      ) : null}
      <Field label="Name" value={result.fullName} />
      <Field label="Matric" value={result.matricNumber} />
      <Field label="Department" value={result.department} />
      <Field label="Faculty" value={result.faculty} />
      <Field label="Level" value={result.level || 'N/A'} />
      {result.email ? <Field label="Email" value={result.email} /> : null}

      <View style={styles.actionsContainer}>
        {existingUser?.exists ? (
          <>
            <Text style={styles.existingText}>
              You already have an account ({existingUser.email}). Log in to continue.
            </Text>
            <TouchableOpacity
              style={[styles.actionBtn, styles.loginBtn]}
              onPress={onLogin}
              disabled={loginLoading}
            >
              {loginLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.actionBtnText}>Log In</Text>
              )}
            </TouchableOpacity>
            {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}
          </>
        ) : existingUser === null ? (
          <ActivityIndicator color={Colors.black} style={{ margin: 12 }} />
        ) : (
          <>
            <Text style={styles.newUserText}>
              No existing account found. Create one with these details.
            </Text>
            <TouchableOpacity
              style={[styles.actionBtn, styles.createBtn]}
              onPress={onRegister}
            >
              <Text style={styles.actionBtnText}>Create Account</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, styles.cancelBtn]}
          onPress={onCancel}
        >
          <Text style={[styles.actionBtnText, styles.cancelBtnText]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  resultCard: { margin: 8, padding: 16, backgroundColor: '#e8f5e9', borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.success },
  resultTitle: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.black, marginBottom: 8 },
  profilePic: { width: 64, height: 64, borderRadius: 32, alignSelf: 'center', marginBottom: 8, borderWidth: 2, borderColor: Colors.black },
  fieldRow: { flexDirection: 'row', paddingVertical: 2 },
  fieldLabel: { width: 90, fontSize: FontSize.sm, color: Colors.grey },
  fieldValue: { flex: 1, fontSize: FontSize.sm, fontWeight: '500', color: Colors.black },
  actionsContainer: { marginTop: 16, gap: 8 },
  existingText: { fontSize: FontSize.sm, color: Colors.info, textAlign: 'center', marginBottom: 8 },
  newUserText: { fontSize: FontSize.sm, color: Colors.grey, textAlign: 'center', marginBottom: 8 },
  actionBtn: { paddingVertical: 12, borderRadius: BorderRadius.md, alignItems: 'center' },
  loginBtn: { backgroundColor: Colors.black },
  createBtn: { backgroundColor: Colors.success },
  cancelBtn: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.grey },
  actionBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: 'bold' },
  cancelBtnText: { color: Colors.grey },
  errorText: { color: Colors.error, fontSize: FontSize.sm, textAlign: 'center' },
});
