import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ShieldCheck,
  ShieldAlert,
  Car,
  User,
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { DouCard } from '../../components/DouCard';
import { ReportDriverSheet } from '../../components/ReportDriverSheet';

type ResultRouteParams = {
  SecurityResult: {
    scanData: string;
    timestamp: string;
  };
};

export default function SecurityResultScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<ResultRouteParams, 'SecurityResult'>>();
  const { scanData, timestamp } = route.params || {};

  const [showReportSheet, setShowReportSheet] = useState(false);

  let data: any = {};
  try {
    data = JSON.parse(scanData || '{}');
  } catch {
    data = {};
  }

  const isDriver = data.type === 'driver';
  const isSuspended = data.status === 'suspended';
  const isCleared = !isSuspended && data.fullName;

  const handleAllowEntry = () => {
    Alert.alert('Entry Cleared', `Keke #${data.fleetNumber || '042'} permitted onto Dennis Osadebay University campus.`);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isSuspended ? Colors.errorSoft : Colors.white }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <ChevronLeft size={22} color={Colors.slate900} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Gate Clearance Inspection</Text>
          <Text style={styles.headerSub}>
            {timestamp ? new Date(timestamp).toLocaleTimeString() : 'Gate 1 Checkpoint'}
          </Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner State: Cleared vs Suspended */}
        {isCleared ? (
          <View style={styles.clearedBanner}>
            <View style={styles.clearedIconCircle}>
              <CheckCircle2 size={32} color={Colors.success} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.clearedBannerTitle}>✓ CLEARED — ALLOW ENTRY</Text>
              <Text style={styles.clearedBannerSub}>
                Authorized vehicle & verified driver profile for DOU campus.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.suspendedBanner}>
            <View style={styles.suspendedIconCircle}>
              <XCircle size={32} color={Colors.error} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.suspendedBannerTitle}>✕ ACCESS DENIED / SUSPENDED</Text>
              <Text style={styles.suspendedBannerSub}>
                DO NOT PERMIT ENTRY: Turn driver back or escort to Student Affairs office.
              </Text>
            </View>
          </View>
        )}

        {/* Biometric Face Verification Card */}
        <DouCard variant="elevated" style={styles.biometricCard}>
          <View style={styles.facePhotoContainer}>
            <Image
              source={{
                uri:
                  data.profilePic ||
                  (isSuspended
                    ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300'
                    : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300'),
              }}
              style={styles.facePhoto}
            />
            <View
              style={[
                styles.photoVerifyBadge,
                { backgroundColor: isSuspended ? Colors.error : Colors.success },
              ]}
            >
              {isSuspended ? (
                <ShieldAlert size={14} color={Colors.white} strokeWidth={2.5} />
              ) : (
                <ShieldCheck size={14} color={Colors.white} strokeWidth={2.5} />
              )}
            </View>
          </View>

          <Text style={styles.personName}>{data.fullName || 'Driver Name'}</Text>
          <Text style={styles.personRole}>
            {isDriver ? `CAMPUS KEKE DRIVER • FLEET #${data.fleetNumber || '042'}` : `STUDENT • ${data.department || 'Undergraduate'}`}
          </Text>

          {isSuspended && data.suspensionReason && (
            <View style={styles.suspensionReasonBox}>
              <AlertTriangle size={16} color={Colors.errorDark} strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text style={styles.suspensionReasonText}>
                Violation on record: {data.suspensionReason}
              </Text>
            </View>
          )}

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>PLATE NUMBER</Text>
              <Text style={styles.detailValue}>{data.plateNumber || 'ASB-492-DT'}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>PERMIT STATUS</Text>
              <Text style={[styles.detailValue, { color: isSuspended ? Colors.error : Colors.successDark }]}>
                {isSuspended ? 'REVOKED / SUSPENDED' : 'ACTIVE & CLEARED'}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>REGISTERED AFFILIATION</Text>
              <Text style={styles.detailValue}>{data.department || 'Transport Union'}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>VALID THROUGH</Text>
              <Text style={styles.detailValue}>{data.validUntil || '2026-12-31'}</Text>
            </View>
          </View>
        </DouCard>

        {/* Security Gate Actions */}
        <View style={styles.actionsBox}>
          {isCleared ? (
            <TouchableOpacity
              style={styles.allowEntryBtn}
              onPress={handleAllowEntry}
              activeOpacity={0.85}
            >
              <CheckCircle2 size={20} color={Colors.white} strokeWidth={2.5} style={{ marginRight: 8 }} />
              <Text style={styles.allowEntryBtnText}>ALLOW ENTRY ONTO CAMPUS</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.blockedEntryBox}>
              <XCircle size={20} color={Colors.errorDark} strokeWidth={2.5} style={{ marginRight: 8 }} />
              <Text style={styles.blockedEntryText}>GATE ENTRY PERMISSION BLOCKED</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.reportDriverBtn}
            onPress={() => setShowReportSheet(true)}
            activeOpacity={0.85}
          >
            <AlertTriangle size={18} color={Colors.warningDark} strokeWidth={2.5} style={{ marginRight: 8 }} />
            <Text style={styles.reportDriverBtnText}>⚠ REPORT DRIVER TO STUDENT AFFAIRS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.scanNextBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.scanNextBtnText}>Scan Next Vehicle / Pass</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Report Modal */}
      <ReportDriverSheet
        visible={showReportSheet}
        onClose={() => setShowReportSheet(false)}
        targetId={data.userId || data.fleetNumber || 'driver-target'}
        targetName={data.fullName || `Driver #${data.fleetNumber || '042'}`}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? 14 : Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.slate900,
  },
  headerSub: {
    fontSize: FontSize.xxs,
    color: Colors.slate500,
    marginTop: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  clearedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successSoft,
    borderWidth: 1.5,
    borderColor: Colors.success + '40',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  clearedIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearedBannerTitle: {
    fontSize: FontSize.sm,
    fontWeight: '900',
    color: Colors.successDark,
    letterSpacing: 0.4,
  },
  clearedBannerSub: {
    fontSize: FontSize.xs,
    color: Colors.slate600,
    marginTop: 2,
  },
  suspendedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorSoft,
    borderWidth: 2,
    borderColor: Colors.emergencyRed,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  suspendedIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suspendedBannerTitle: {
    fontSize: FontSize.sm,
    fontWeight: '900',
    color: Colors.errorDark,
    letterSpacing: 0.4,
  },
  suspendedBannerSub: {
    fontSize: FontSize.xs,
    color: Colors.errorDark,
    marginTop: 2,
    lineHeight: 16,
  },
  biometricCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  facePhotoContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  facePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.slate900,
  },
  photoVerifyBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  personName: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: Colors.slate900,
  },
  personRole: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate500,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  suspensionReasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorSoft,
    padding: 10,
    borderRadius: BorderRadius.md,
    width: '100%',
    marginBottom: Spacing.md,
  },
  suspensionReasonText: {
    fontSize: FontSize.xs,
    color: Colors.errorDark,
    fontWeight: '700',
    flex: 1,
  },
  detailsGrid: {
    width: '100%',
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate400,
    letterSpacing: 0.6,
  },
  detailValue: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.slate800,
  },
  actionsBox: {
    gap: 10,
  },
  allowEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    paddingVertical: 18,
    borderRadius: BorderRadius.xl,
    ...Shadows.md,
  },
  allowEntryBtnText: {
    color: Colors.white,
    fontWeight: '900',
    fontSize: FontSize.sm,
    letterSpacing: 0.5,
  },
  blockedEntryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate100,
    paddingVertical: 16,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.slate300,
  },
  blockedEntryText: {
    color: Colors.slate600,
    fontWeight: '800',
    fontSize: FontSize.sm,
  },
  reportDriverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warningSoft,
    borderWidth: 1.5,
    borderColor: Colors.warning + '60',
    paddingVertical: 15,
    borderRadius: BorderRadius.xl,
  },
  reportDriverBtnText: {
    color: Colors.warningDark,
    fontWeight: '800',
    fontSize: FontSize.xs,
    letterSpacing: 0.4,
  },
  scanNextBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  scanNextBtnText: {
    color: Colors.slate500,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});