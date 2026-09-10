import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  CheckCircle2,
  GraduationCap,
  Building,
  Mail,
  User,
  LogIn,
  UserPlus,
  X,
  Sparkles,
} from 'lucide-react-native';
import { Colors, FontSize, BorderRadius, Spacing, Shadows } from '../../../config/theme';
import type { PortalScrapeResult } from '../PortalVerificationScreen';
import { DouCard } from '../../../components/DouCard';

function Field({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldLabelWrap}>
        <Icon size={14} color={Colors.slate400} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
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
    <DouCard variant="elevated" padding={Spacing.lg} style={styles.resultCard}>
      {/* Header Badge */}
      <View style={styles.cardHeader}>
        <View style={styles.successBadge}>
          <CheckCircle2 size={16} color={Colors.success} />
          <Text style={styles.successBadgeText}>DOU Identity Verified</Text>
        </View>
        <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
          <X size={18} color={Colors.slate400} />
        </TouchableOpacity>
      </View>

      {result.profileImageBase64 ? (
        <View style={styles.avatarWrap}>
          <Image
            source={{ uri: result.profileImageBase64 }}
            style={styles.profilePic}
            resizeMode="cover"
          />
        </View>
      ) : (
        <View style={styles.avatarPlaceholder}>
          <User size={32} color={Colors.primary} />
        </View>
      )}

      <Text style={styles.studentName}>{result.fullName}</Text>
      <Text style={styles.studentMatric}>{result.matricNumber}</Text>

      <View style={styles.fieldsContainer}>
        <Field icon={Building} label="Department" value={result.department} />
        <Field icon={Building} label="Faculty" value={result.faculty} />
        <Field icon={GraduationCap} label="Academic Level" value={result.level ? `${result.level} Level` : 'Undergraduate'} />
        {result.email ? <Field icon={Mail} label="Portal Email" value={result.email} /> : null}
      </View>

      <View style={styles.actionsContainer}>
        {existingUser?.exists ? (
          <>
            <Text style={styles.existingText}>
              Account found for {existingUser.email}. Sign in to continue to your transit wallet.
            </Text>
            <TouchableOpacity
              style={[styles.actionBtn, styles.loginBtn]}
              onPress={onLogin}
              disabled={loginLoading}
              activeOpacity={0.8}
            >
              {loginLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <LogIn size={16} color={Colors.white} />
                  <Text style={styles.loginBtnText}>Sign In Now</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, styles.registerBtn]}
            onPress={onRegister}
            activeOpacity={0.8}
          >
            <UserPlus size={16} color={Colors.white} />
            <Text style={styles.registerBtnText}>Proceed to Registration</Text>
          </TouchableOpacity>
        )}

        {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}
      </View>
    </DouCard>
  );
}

const styles = StyleSheet.create({
  resultCard: {
    borderRadius: BorderRadius.lg,
    marginVertical: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.success + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  successBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.success,
  },
  closeBtn: {
    padding: 4,
  },
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  profilePic: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '15',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  studentName: {
    fontSize: FontSize.base,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
    textAlign: 'center',
  },
  studentMatric: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  fieldsContainer: {
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
  },
  fieldValue: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate800,
  },
  actionsContainer: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  existingText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate600,
    textAlign: 'center',
    marginBottom: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
  },
  loginBtnText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  registerBtn: {
    backgroundColor: Colors.primary,
  },
  registerBtnText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  errorText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.error,
    textAlign: 'center',
    marginTop: 4,
  },
});
