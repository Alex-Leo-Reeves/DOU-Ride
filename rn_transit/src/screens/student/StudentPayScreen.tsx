import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  QrCode,
  Keyboard,
  Car,
  ChevronLeft,
  CheckCircle2,
  ShieldCheck,
  Zap,
  ArrowRight,
  UserCheck,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { useRideStore } from '../../stores/rideStore';
import { useWalletStore } from '../../stores/walletStore';
import { DouCard } from '../../components/DouCard';

export default function StudentPayScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { scanPayLink, isLoading: rideLoading, error: rideError, reset } = useRideStore();
  const { balance, fetchBalance } = useWalletStore();

  const [payMode, setPayMode] = useState<'qr' | 'manual'>('qr');
  const [fleetNumber, setFleetNumber] = useState('042');
  const [amount, setAmount] = useState('100');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Scanning laser beam animation
  const beamAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (payMode === 'qr') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(beamAnim, {
            toValue: 180,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(beamAnim, {
            toValue: 0,
            duration: 1600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [beamAnim, payMode]);

  const handlePayByFleet = async () => {
    if (!fleetNumber.trim()) return;
    setProcessing(true);
    const qrData = JSON.stringify({
      fleet_number: parseInt(fleetNumber.replace(/\D/g, '')) || 42,
      amount: parseFloat(amount) || 100,
      driver_id: `fleet-${fleetNumber}`,
    });
    const success = await scanPayLink(qrData, user?.token);
    if (success) {
      setScanSuccess(true);
      fetchBalance(user?.userId ?? '', user?.token);
    }
    setProcessing(false);
  };

  const handleSimulateScan = async () => {
    setProcessing(true);
    const qrData = JSON.stringify({
      fleet_number: 42,
      amount: parseFloat(amount) || 100,
      driver_id: 'fleet-042',
    });
    const success = await scanPayLink(qrData, user?.token);
    if (success) {
      setScanSuccess(true);
      fetchBalance(user?.userId ?? '', user?.token);
    }
    setProcessing(false);
  };

  if (scanSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContent}>
          <View style={styles.successIconCircle}>
            <CheckCircle2 size={56} color={Colors.success} strokeWidth={2.5} />
          </View>
          <Text style={styles.successTitle}>Fare Paid Successfully!</Text>
          <Text style={styles.successSub}>
            ₦{parseFloat(amount || '100').toLocaleString()} has been transferred directly from your transit wallet to Driver Sunday (Fleet #{fleetNumber || '042'}).
          </Text>

          {/* Receipt Card */}
          <DouCard variant="elevated" style={styles.receiptCard}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Driver</Text>
              <Text style={styles.receiptValue}>Sunday Azuka (BUS #{fleetNumber || '042'})</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Amount Debited</Text>
              <Text style={[styles.receiptValue, { color: Colors.slate900, fontWeight: '800' }]}>
                ₦{parseFloat(amount || '100').toLocaleString()}
              </Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Method</Text>
              <Text style={styles.receiptValue}>Instant Digital Handshake</Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Remaining Balance</Text>
              <Text style={[styles.receiptValue, { color: Colors.successDark, fontWeight: '800' }]}>
                ₦{balance.toLocaleString()}
              </Text>
            </View>
          </DouCard>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => {
              reset();
              navigation.navigate(Routes.studentHome);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>RETURN TO HOME</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <ChevronLeft size={22} color={Colors.slate900} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Pay Driver</Text>
          <Text style={styles.headerSub}>Drop-Off Payment Handshake</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Toggle between QR & Manual ID */}
        <View style={styles.toggleBar}>
          <TouchableOpacity
            style={[styles.toggleBtn, payMode === 'qr' && styles.toggleBtnActive]}
            onPress={() => setPayMode('qr')}
            activeOpacity={0.8}
          >
            <QrCode size={16} color={payMode === 'qr' ? Colors.white : Colors.slate600} strokeWidth={2.5} />
            <Text style={[styles.toggleBtnText, payMode === 'qr' && styles.toggleBtnTextActive]}>
              Scan Driver QR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, payMode === 'manual' && styles.toggleBtnActive]}
            onPress={() => setPayMode('manual')}
            activeOpacity={0.8}
          >
            <Keyboard size={16} color={payMode === 'manual' ? Colors.white : Colors.slate600} strokeWidth={2.5} />
            <Text style={[styles.toggleBtnText, payMode === 'manual' && styles.toggleBtnTextActive]}>
              Pay via Driver ID
            </Text>
          </TouchableOpacity>
        </View>

        {payMode === 'qr' ? (
          <View style={styles.scannerWrapper}>
            <View style={styles.viewFinderBox}>
              {/* Corner Brackets */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />

              <Animated.View
                style={[
                  styles.laserBeam,
                  {
                    transform: [{ translateY: beamAnim }],
                  },
                ]}
              />

              <View style={styles.viewFinderCenter}>
                <QrCode size={52} color={Colors.slate300} strokeWidth={1.5} />
                <Text style={styles.viewFinderHint}>Point camera at driver's screen</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.simulateScanBtn}
              onPress={handleSimulateScan}
              disabled={processing}
              activeOpacity={0.85}
            >
              {processing ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Zap size={18} color={Colors.white} strokeWidth={2.5} style={{ marginRight: 6 }} />
                  <Text style={styles.simulateScanText}>SCAN DRIVER CODE (SIMULATE)</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.infoBanner}>
              <ShieldCheck size={16} color={Colors.success} strokeWidth={2.5} />
              <Text style={styles.infoBannerText}>
                Camera blurry? Tap "Pay via Driver ID" above to input the Keke number directly.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.manualWrapper}>
            <DouCard variant="elevated" style={styles.manualCard}>
              <View style={styles.driverIdBanner}>
                <Car size={20} color={Colors.primaryAccent} strokeWidth={2.5} style={{ marginRight: 8 }} />
                <Text style={styles.driverIdBannerText}>Direct Keke Fleet Transfer</Text>
              </View>

              <Text style={styles.inputLabel}>DRIVER / KEKE FLEET NUMBER</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 042 (found on Keke sticker)"
                placeholderTextColor={Colors.slate400}
                keyboardType="numeric"
                value={fleetNumber}
                onChangeText={setFleetNumber}
              />

              {fleetNumber.trim() ? (
                <View style={styles.verifiedDriverPill}>
                  <UserCheck size={14} color={Colors.successDark} strokeWidth={2.5} />
                  <Text style={styles.verifiedDriverText}>
                    Driver Identified: Sunday Azuka (DOU-KEKE-{fleetNumber.padStart(3, '0')})
                  </Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>FARE AMOUNT</Text>
              <TextInput
                style={styles.input}
                placeholder="Amount (₦)"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              <View style={styles.quickFareRow}>
                {[100, 200, 300, 1500].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[styles.quickFareChip, amount === amt.toString() && styles.quickFareChipActive]}
                    onPress={() => setAmount(amt.toString())}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.quickFareText,
                        amount === amt.toString() && styles.quickFareTextActive,
                      ]}
                    >
                      {amt === 1500 ? 'Drop ₦1.5k' : `₦${amt}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {rideError && <Text style={styles.errorText}>{rideError}</Text>}

              <TouchableOpacity
                style={[styles.payNowBtn, (!fleetNumber.trim() || processing) && styles.payNowBtnDisabled]}
                onPress={handlePayByFleet}
                disabled={!fleetNumber.trim() || processing}
                activeOpacity={0.85}
              >
                {processing ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Text style={styles.payNowText}>
                      PAY ₦{parseFloat(amount || '0').toLocaleString()} NOW
                    </Text>
                    <ArrowRight size={18} color={Colors.white} strokeWidth={2.5} style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </DouCard>
          </View>
        )}
      </ScrollView>
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
    borderBottomColor: Colors.slate100,
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
  toggleBar: {
    flexDirection: 'row',
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  toggleBtnActive: {
    backgroundColor: Colors.slate900,
    ...Shadows.sm,
  },
  toggleBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate600,
    marginLeft: 6,
  },
  toggleBtnTextActive: {
    color: Colors.white,
    fontWeight: '800',
  },
  scannerWrapper: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  viewFinderBox: {
    width: 250,
    height: 250,
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.xxl,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    ...Shadows.md,
    marginBottom: Spacing.xl,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Colors.slate900,
  },
  topLeft: {
    top: 14,
    left: 14,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
  },
  topRight: {
    top: 14,
    right: 14,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
  },
  bottomLeft: {
    bottom: 14,
    left: 14,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
  },
  bottomRight: {
    bottom: 14,
    right: 14,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
  },
  laserBeam: {
    position: 'absolute',
    top: 30,
    left: 20,
    right: 20,
    height: 2.5,
    backgroundColor: Colors.emergencyRed,
    ...Shadows.glowPrimary,
  },
  viewFinderCenter: {
    alignItems: 'center',
  },
  viewFinderHint: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate500,
    marginTop: 10,
    textAlign: 'center',
  },
  simulateScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate900,
    width: '100%',
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
    marginBottom: Spacing.lg,
  },
  simulateScanText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.sm,
    letterSpacing: 0.5,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
    width: '100%',
  },
  infoBannerText: {
    fontSize: FontSize.xs,
    color: Colors.slate600,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  manualWrapper: {
    width: '100%',
  },
  manualCard: {
    padding: Spacing.lg,
  },
  driverIdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  driverIdBannerText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.slate900,
  },
  inputLabel: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate500,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.slate50,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Colors.slate900,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  verifiedDriverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  verifiedDriverText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.successDark,
    marginLeft: 6,
  },
  quickFareRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickFareChip: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  quickFareChipActive: {
    backgroundColor: Colors.slate900,
  },
  quickFareText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate700,
  },
  quickFareTextActive: {
    color: Colors.white,
    fontWeight: '800',
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.xs,
    marginBottom: Spacing.sm,
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate900,
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
  },
  payNowBtnDisabled: {
    opacity: 0.5,
  },
  payNowText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.sm,
    letterSpacing: 0.5,
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: Colors.slate900,
    textAlign: 'center',
  },
  successSub: {
    fontSize: FontSize.sm,
    color: Colors.slate600,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  receiptCard: {
    width: '100%',
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  receiptLabel: {
    fontSize: FontSize.xs,
    color: Colors.slate500,
    fontWeight: '600',
  },
  receiptValue: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate800,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: Colors.slate100,
    marginVertical: Spacing.sm,
  },
  doneBtn: {
    backgroundColor: Colors.slate900,
    width: '100%',
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  doneBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.sm,
    letterSpacing: 0.5,
  },
});
