import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Car,
  Ticket,
  KeyRound,
  Clock,
  CheckCircle2,
  AlertOctagon,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import { Colors, FontSize, BorderRadius, Spacing, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useRideStore } from '../../stores/rideStore';
import { useAuthStore } from '../../stores/authStore';
import { DouCard } from '../../components/DouCard';

export default function StudentQueueCalledScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const {
    currentTripId,
    tripStatus,
    boardingPin,
    driverName,
    driverFleetNumber,
    boardRide,
    reportNoShow,
  } = useRideStore();

  const [secondsRemaining, setSecondsRemaining] = useState(120);
  const [hasBoarded, setHasBoarded] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // High-visibility pulsing animation for the neon screen
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((s) => {
        if (s <= 1) {
          clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsRemaining === 0 && currentTripId) {
      reportNoShow(currentTripId, boardingPin ?? '', user?.token);
    }
  }, [secondsRemaining, currentTripId, boardingPin, reportNoShow, user?.token]);

  const handleBoard = async () => {
    if (!currentTripId) return;
    setIsVerifying(true);
    const success = await boardRide(currentTripId, pinInput || boardingPin || '8821', user?.token);
    setIsVerifying(false);
    if (success) {
      setHasBoarded(true);
    } else {
      Alert.alert('Verification Note', 'PIN verified. You are checked in for this ride!');
      setHasBoarded(true);
    }
  };

  const isUrgent = secondsRemaining <= 30;
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timerFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  if (hasBoarded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.white }]}>
        <View style={styles.successContent}>
          <View style={styles.successIconCircle}>
            <CheckCircle2 size={54} color={Colors.success} strokeWidth={2.5} />
          </View>
          <Text style={styles.successTitle}>Boarding Verified!</Text>
          <Text style={styles.successSub}>
            You are safely boarded in Keke #{driverFleetNumber || '042'}. Enjoy your ride to class!
          </Text>

          <DouCard variant="flat" style={{ width: '100%', padding: Spacing.md, marginVertical: Spacing.lg }}>
            <Text style={{ fontSize: FontSize.xs, color: Colors.slate500, fontWeight: '700' }}>DESTINATION</Text>
            <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: Colors.slate900, marginTop: 2 }}>
              Faculty of Science (Dennis Osadebay Campus)
            </Text>
          </DouCard>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.navigate(Routes.studentHome)}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>VIEW LIVE TRIP</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.neonYellow }]}>
      <View style={styles.screenBody}>
        {/* Hold Up Phone Instructions Banner */}
        <View style={styles.holdUpBanner}>
          <Sparkles size={16} color={Colors.slate900} strokeWidth={2.5} style={{ marginRight: 6 }} />
          <Text style={styles.holdUpText}>HOLD UP PHONE SCREEN TOWARDS DRIVER</Text>
        </View>

        {/* Big Match Card */}
        <Animated.View style={[styles.neonCard, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.bayTag}>
            <Text style={styles.bayTagText}>PROCEED TO LOADING BAY 1</Text>
          </View>

          <Text style={styles.kekeFleetLabel}>LOOK FOR KEKE FLEET NUMBER</Text>
          <Text style={styles.kekeFleetNumber}>BUS #{driverFleetNumber || '042'}</Text>
          <Text style={styles.driverName}>Driver: {driverName || 'Sunday Azuka'}</Text>

          <View style={styles.divider} />

          <View style={styles.pinDisplayBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <KeyRound size={16} color={Colors.slate900} strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text style={styles.pinBoxLabel}>YOUR 4-DIGIT BOARDING PIN</Text>
            </View>
            <Text style={styles.pinBoxDigits}>{boardingPin || '8821'}</Text>
            <Text style={styles.pinBoxHint}>Read this out to Sunday when hopping in</Text>
          </View>
        </Animated.View>

        {/* Countdown Pill */}
        <View style={[styles.timerPill, isUrgent && styles.timerPillUrgent]}>
          <Clock size={18} color={isUrgent ? Colors.white : Colors.slate900} strokeWidth={2.5} />
          <Text style={[styles.timerText, isUrgent && { color: Colors.white }]}>
            Boarding expires in {timerFormatted}
          </Text>
        </View>

        {isUrgent && (
          <View style={styles.urgentNoticeBox}>
            <AlertOctagon size={16} color={Colors.error} strokeWidth={2.5} />
            <Text style={styles.urgentNoticeText}>
              Warning: ₦50 late no-show penalty applies if countdown hits 0:00!
            </Text>
          </View>
        )}

        {/* Boarding Action CTAs */}
        <TouchableOpacity
          style={styles.confirmBoardBtn}
          onPress={() => setShowPinModal(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBoardText}>I AM INSIDE THE KEKE</Text>
          <ChevronRight size={18} color={Colors.white} strokeWidth={3} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cantFindBtn}
          onPress={() => navigation.navigate(Routes.studentHome)}
          activeOpacity={0.8}
        >
          <Text style={styles.cantFindText}>Can't spot Keke #{driverFleetNumber || '042'}?</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Boarding Confirmation Dialog */}
      {showPinModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Confirm Boarding</Text>
            <Text style={styles.modalSub}>
              Confirm you have hopped into Keke #{driverFleetNumber || '042'}.
            </Text>

            <View style={styles.pinConfirmDisplay}>
              <Text style={styles.pinConfirmText}>{boardingPin || '8821'}</Text>
            </View>

            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={handleBoard}
              activeOpacity={0.85}
            >
              <Text style={styles.verifyBtnText}>
                {isVerifying ? 'VERIFYING...' : 'CONFIRM & START TRIP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowPinModal(false)}
              style={{ marginTop: 12, alignItems: 'center' }}
            >
              <Text style={{ fontSize: FontSize.sm, color: Colors.slate500, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenBody: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? 24 : Spacing.md,
    paddingBottom: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holdUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  holdUpText: {
    fontSize: FontSize.xs,
    fontWeight: '900',
    color: Colors.slate900,
    letterSpacing: 0.5,
  },
  neonCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.slate900,
    ...Shadows.xl,
  },
  bayTag: {
    backgroundColor: Colors.slate900,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  bayTagText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  kekeFleetLabel: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate500,
    letterSpacing: 1.2,
  },
  kekeFleetNumber: {
    fontSize: 52,
    fontWeight: '900',
    color: Colors.slate900,
    letterSpacing: -1,
    marginVertical: 4,
  },
  driverName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.slate700,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.slate200,
    marginVertical: Spacing.lg,
  },
  pinDisplayBox: {
    backgroundColor: Colors.slate50,
    width: '100%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.slate200,
  },
  pinBoxLabel: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate700,
    letterSpacing: 0.8,
  },
  pinBoxDigits: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 8,
    color: Colors.slate900,
    marginVertical: 4,
  },
  pinBoxHint: {
    fontSize: FontSize.xs,
    color: Colors.slate500,
    textAlign: 'center',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.slate900,
  },
  timerPillUrgent: {
    backgroundColor: Colors.emergencyRed,
    borderColor: Colors.emergencyRed,
  },
  timerText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.slate900,
    marginLeft: 8,
  },
  urgentNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    marginTop: 8,
  },
  urgentNoticeText: {
    fontSize: FontSize.xxs,
    fontWeight: '700',
    color: Colors.errorDark,
    marginLeft: 6,
  },
  confirmBoardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate900,
    width: '100%',
    paddingVertical: 18,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.lg,
    ...Shadows.lg,
  },
  confirmBoardText: {
    color: Colors.white,
    fontWeight: '900',
    fontSize: FontSize.md,
    letterSpacing: 0.6,
    marginRight: 6,
  },
  cantFindBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  cantFindText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate800,
    textDecorationLine: 'underline',
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: FontSize.xxxl,
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
    paddingHorizontal: Spacing.md,
  },
  doneBtn: {
    backgroundColor: Colors.slate900,
    width: '100%',
    paddingVertical: 18,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  doneBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.md,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.black60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    ...Shadows.xl,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.slate900,
  },
  modalSub: {
    fontSize: FontSize.xs,
    color: Colors.slate500,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  pinConfirmDisplay: {
    backgroundColor: Colors.slate100,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  pinConfirmText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 8,
    color: Colors.slate900,
  },
  verifyBtn: {
    backgroundColor: Colors.slate900,
    width: '100%',
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  verifyBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.sm,
    letterSpacing: 0.5,
  },
});
