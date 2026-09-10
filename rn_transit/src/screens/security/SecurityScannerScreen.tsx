import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ScanLine,
  Car,
  ShieldCheck,
  Search,
  AlertTriangle,
  Zap,
  CheckCircle2,
  XCircle,
  QrCode,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';

export default function SecurityScannerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [scanning, setScanning] = useState(true);

  // Laser scanning animation
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 220,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [laserAnim]);

  const handleScanData = (data: any) => {
    navigation.navigate(Routes.securityResult, {
      scanData: JSON.stringify(data),
      timestamp: new Date().toISOString(),
    });
  };

  const handleScanCleanDriver = () => {
    handleScanData({
      type: 'driver',
      fleetNumber: '042',
      plateNumber: 'ASB-492-DT',
      fullName: 'Sunday Azuka',
      status: 'cleared',
      department: 'Campus Transport Union',
      validUntil: '2026-12-31',
      profilePic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    });
  };

  const handleScanSuspendedDriver = () => {
    handleScanData({
      type: 'driver',
      fleetNumber: '011',
      plateNumber: 'DT-882-ASB',
      fullName: 'Amadi Kalu',
      status: 'suspended',
      department: 'Campus Transport Union',
      validUntil: '2026-12-31',
      suspensionReason: 'Overloading passengers & aggressive altercation at Main Gate',
      profilePic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',
    });
  };

  const handleScanStudent = () => {
    handleScanData({
      type: 'student',
      userId: 'STU-2024-0123',
      fullName: 'Ozegbe Mike',
      matricNumber: 'DOU/2023/SCI/041',
      department: 'Computer Science',
      validUntil: '2026-06-30',
      status: 'cleared',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Gate Info Bar */}
      <View style={styles.header}>
        <View style={styles.gateTag}>
          <ShieldCheck size={16} color={Colors.white} strokeWidth={2.5} />
          <Text style={styles.gateTagText}>MAIN CAMPUS GATE 1</Text>
        </View>
        <Text style={styles.headerTitle}>DOU Security Gate Portal</Text>
        <Text style={styles.headerSub}>Dennis Osadebay University Campus Security</Text>
      </View>

      {/* Viewport Camera Scanner */}
      <View style={styles.scannerWrapper}>
        <View style={styles.viewFinder}>
          {/* Corner Guides */}
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />

          <Animated.View
            style={[
              styles.laserBeam,
              {
                transform: [{ translateY: laserAnim }],
              },
            ]}
          />

          <View style={styles.centerTarget}>
            <QrCode size={64} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
            <Text style={styles.centerTargetText}>
              Point camera at Keke windshield sticker or student ID card
            </Text>
          </View>
        </View>
      </View>

      {/* Rapid Simulation / Action Bar */}
      <View style={styles.actionsPanel}>
        <Text style={styles.panelTitle}>GATE VERIFICATION SIMULATOR</Text>

        <TouchableOpacity
          style={[styles.simBtn, { backgroundColor: Colors.success }]}
          onPress={handleScanCleanDriver}
          activeOpacity={0.85}
        >
          <CheckCircle2 size={18} color={Colors.white} strokeWidth={2.5} style={{ marginRight: 8 }} />
          <Text style={styles.simBtnText}>SCAN VALID KEKE (#042 - SUNDAY)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.simBtn, { backgroundColor: Colors.emergencyRed }]}
          onPress={handleScanSuspendedDriver}
          activeOpacity={0.85}
        >
          <XCircle size={18} color={Colors.white} strokeWidth={2.5} style={{ marginRight: 8 }} />
          <Text style={styles.simBtnText}>SCAN SUSPENDED KEKE (#011 - AMADI)</Text>
        </TouchableOpacity>

        <View style={styles.secondaryRow}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleScanStudent}
            activeOpacity={0.8}
          >
            <ShieldCheck size={16} color={Colors.primaryAccent} strokeWidth={2.5} style={{ marginRight: 6 }} />
            <Text style={styles.secondaryBtnText}>Scan Student Pass</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('SearchStudent')}
            activeOpacity={0.8}
          >
            <Search size={16} color={Colors.slate700} strokeWidth={2.5} style={{ marginRight: 6 }} />
            <Text style={styles.secondaryBtnText}>Lookup Student ID</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.slate950,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? 24 : Spacing.md,
    paddingBottom: Spacing.md,
    alignItems: 'center',
  },
  gateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryAccent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: 6,
  },
  gateTagText: {
    color: Colors.white,
    fontSize: FontSize.xxs,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: FontSize.xxs,
    color: Colors.slate400,
    marginTop: 2,
  },
  scannerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  viewFinder: {
    width: 270,
    height: 270,
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: Colors.white,
  },
  tl: {
    top: 14,
    left: 14,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  tr: {
    top: 14,
    right: 14,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bl: {
    bottom: 14,
    left: 14,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  br: {
    bottom: 14,
    right: 14,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  laserBeam: {
    position: 'absolute',
    top: 25,
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: Colors.neonYellow,
    ...Shadows.glowPrimary,
  },
  centerTarget: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  centerTargetText: {
    color: Colors.slate400,
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  actionsPanel: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : Spacing.xl,
    ...Shadows.xl,
  },
  panelTitle: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate500,
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  simBtnText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate100,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  secondaryBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate800,
  },
});