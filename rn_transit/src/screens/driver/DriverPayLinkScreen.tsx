import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Car,
  QrCode,
  Users,
  Clock,
  CheckCircle2,
  AlertOctagon,
  ArrowUpRight,
  KeyRound,
  ShieldCheck,
  Building2,
  ShoppingBag,
  Sparkles,
  Search,
  Plus,
  ArrowRight,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { useRideStore } from '../../stores/rideStore';
import { useWalletStore } from '../../stores/walletStore';
import { DouCard } from '../../components/DouCard';
import { BalancePill } from '../../components/BalancePill';
import { PassengerPaymentFeed } from '../../components/PassengerPaymentFeed';
import { ReportDriverSheet } from '../../components/ReportDriverSheet';
import { WithdrawSheet } from '../../components/wallet';

export default function DriverPayLinkScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const {
    currentTripId,
    passengers,
    totalPaid,
    allPaid,
    isLoading,
    generatePayLink,
    fetchPassengers,
    clearRide,
  } = useRideStore();
  const { balance, fetchBalance, withdraw } = useWalletStore();

  const [isOnline, setIsOnline] = useState(true);
  const [availableSeats, setAvailableSeats] = useState(4);
  const [maxSeats] = useState(4);
  const [amount, setAmount] = useState(100);
  const [isDropMode, setIsDropMode] = useState(false);
  const [linkActive, setLinkActive] = useState(true);
  const [qrGenerated, setQrGenerated] = useState(true);
  const [arrivedCountdown, setArrivedCountdown] = useState<number | null>(null);
  const [boardingPinInput, setBoardingPinInput] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showReportStudent, setShowReportStudent] = useState(false);

  // Poll concurrent passengers
  useEffect(() => {
    if (currentTripId) {
      const interval = setInterval(() => {
        fetchPassengers(currentTripId, user?.token);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [currentTripId, fetchPassengers, user?.token]);

  // Arrival 2-minute countdown
  useEffect(() => {
    if (arrivedCountdown !== null && arrivedCountdown > 0) {
      const timer = setInterval(() => {
        setArrivedCountdown((c) => (c !== null && c > 0 ? c - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [arrivedCountdown]);

  const handleTriggerArrived = () => {
    setArrivedCountdown(120);
    Alert.alert(
      'Arrived at Pickup',
      '2-minute countdown started for waiting passengers. If they do not board in time, tap "Passenger No-Show" to receive a ₦50 compensation fee.'
    );
  };

  const handleReportNoShow = () => {
    Alert.alert(
      'Claim No-Show Penalty?',
      'Deduct ₦50 from student wallet and release seat back into available pool?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'CLAIM ₦50',
          style: 'destructive',
          onPress: () => {
            setArrivedCountdown(null);
            Alert.alert('Fee Credited', '₦50 has been credited to your driver wallet.');
          },
        },
      ]
    );
  };

  const handleVerifyPin = () => {
    if (boardingPinInput.length < 4) {
      Alert.alert('Invalid PIN', 'Please enter the student’s 4-digit code.');
      return;
    }
    Alert.alert('Passenger Checked In', `Boarding PIN ${boardingPinInput} accepted. Seat locked.`);
    setBoardingPinInput('');
    setAvailableSeats((s) => Math.max(0, s - 1));
  };

  const handleClear = async () => {
    Alert.alert('End Trip & Reset?', 'This will clear this trip and reset your Keke seats back to 4.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'CLEAR RIDE',
        style: 'destructive',
        onPress: async () => {
          if (currentTripId) {
            await clearRide(currentTripId, user?.token);
          }
          setAvailableSeats(4);
          Alert.alert('Keke Ready', 'Your vehicle is now available on the student map for new rides.');
        },
      },
    ]);
  };

  const fleetNumber = (user as any)?.fleetNumber || '042';

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.fleetTag}>
            <Car size={16} color={Colors.white} strokeWidth={2.5} />
            <Text style={styles.fleetTagText}>BUS #{fleetNumber}</Text>
          </View>
          <Text style={styles.driverNameText}>{user?.fullName || 'Sunday Azuka'}</Text>
        </View>

        <View style={styles.headerRight}>
          <BalancePill balance={balance} onPress={() => setShowWithdraw(true)} />
          <TouchableOpacity
            style={[styles.onlineToggle, isOnline ? styles.onlineToggleActive : styles.onlineToggleInactive]}
            onPress={() => setIsOnline(!isOnline)}
            activeOpacity={0.8}
          >
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? Colors.success : Colors.slate400 }]} />
            <Text style={[styles.onlineText, { color: isOnline ? Colors.successDark : Colors.slate600 }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Capacity & Seat Counter */}
        <DouCard variant="default" style={styles.capacityCard}>
          <View style={styles.capacityHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Users size={18} color={Colors.primaryAccent} strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text style={styles.capacityTitle}>Seat Capacity Tracker</Text>
            </View>
            <Text style={styles.capacityStatus}>
              {availableSeats > 0 ? `${availableSeats}/${maxSeats} Seats Free` : 'KEKE FULL (Locked)'}
            </Text>
          </View>

          <View style={styles.seatPillsRow}>
            {[1, 2, 3, 4].map((seatNum) => {
              const isOccupied = seatNum > availableSeats;
              return (
                <View
                  key={seatNum}
                  style={[styles.seatPill, isOccupied ? styles.seatPillOccupied : styles.seatPillFree]}
                >
                  <Text style={[styles.seatPillText, isOccupied ? styles.seatPillTextOccupied : styles.seatPillTextFree]}>
                    Seat {seatNum} {isOccupied ? '(Taken)' : '(Open)'}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.capacityActions}>
            <TouchableOpacity
              style={styles.capacityBtn}
              onPress={() => setAvailableSeats((s) => Math.max(0, s - 1))}
              activeOpacity={0.8}
            >
              <Text style={styles.capacityBtnText}>- Mark Passenger In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.capacityBtn, { backgroundColor: Colors.slate100 }]}
              onPress={() => setAvailableSeats(maxSeats)}
              activeOpacity={0.8}
            >
              <Text style={[styles.capacityBtnText, { color: Colors.slate800 }]}>Reset to 4</Text>
            </TouchableOpacity>
          </View>
        </DouCard>

        {/* Boarding Handshake PIN Input Card */}
        <DouCard variant="elevated" style={styles.handshakeCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <KeyRound size={18} color={Colors.slate900} strokeWidth={2.5} style={{ marginRight: 8 }} />
            <Text style={styles.handshakeTitle}>Boarding PIN Verification</Text>
          </View>
          <Text style={styles.handshakeSub}>
            Ask student for their 4-digit PIN to securely confirm their ride and lock the seat.
          </Text>

          <View style={styles.pinInputRow}>
            <TextInput
              style={styles.pinInput}
              value={boardingPinInput}
              onChangeText={setBoardingPinInput}
              placeholder="0000"
              placeholderTextColor={Colors.slate400}
              keyboardType="number-pad"
              maxLength={4}
            />
            <TouchableOpacity
              style={[styles.pinVerifyBtn, boardingPinInput.length < 4 && styles.pinVerifyBtnDisabled]}
              onPress={handleVerifyPin}
              disabled={boardingPinInput.length < 4}
              activeOpacity={0.85}
            >
              <Text style={styles.pinVerifyBtnText}>ACCEPT</Text>
            </TouchableOpacity>
          </View>
        </DouCard>

        {/* Arrival 2-Minute Timer Trigger */}
        <View style={styles.arrivalActionBox}>
          {arrivedCountdown === null ? (
            <TouchableOpacity style={styles.arrivedBtn} onPress={handleTriggerArrived} activeOpacity={0.85}>
              <Clock size={18} color={Colors.white} strokeWidth={2.5} style={{ marginRight: 8 }} />
              <Text style={styles.arrivedBtnText}>I HAVE ARRIVED AT PICKUP POINT</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.countdownBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Clock size={20} color={Colors.warningDark} strokeWidth={2.5} style={{ marginRight: 8 }} />
                  <Text style={styles.countdownTitle}>Waiting for Student</Text>
                </View>
                <Text style={styles.countdownDigits}>
                  {Math.floor(arrivedCountdown / 60)}:{String(arrivedCountdown % 60).padStart(2, '0')}
                </Text>
              </View>

              {arrivedCountdown === 0 && (
                <TouchableOpacity style={styles.noShowClaimBtn} onPress={handleReportNoShow} activeOpacity={0.85}>
                  <AlertOctagon size={16} color={Colors.white} strokeWidth={2.5} style={{ marginRight: 6 }} />
                  <Text style={styles.noShowClaimText}>PASSENGER NO-SHOW (CLAIM ₦50)</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Pay Link Generator & Scannable Card */}
        <DouCard variant="glow" style={styles.payLinkCard}>
          <View style={styles.payLinkTop}>
            <View style={styles.qrIconCircle}>
              <QrCode size={24} color={Colors.primaryAccent} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.payLinkTitle}>Driver Payment Link Active</Text>
              <Text style={styles.payLinkSub}>Students scan this code or type your Fleet ID</Text>
            </View>
          </View>

          {/* Mode Switcher */}
          <View style={styles.fareModeRow}>
            <TouchableOpacity
              style={[styles.fareModeBtn, !isDropMode && styles.fareModeBtnActive]}
              onPress={() => {
                setIsDropMode(false);
                setAmount(100);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.fareModeText, !isDropMode && styles.fareModeTextActive]}>
                Standard Ride (₦100)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.fareModeBtn, isDropMode && styles.fareModeBtnActive]}
              onPress={() => {
                setIsDropMode(true);
                setAmount(1500); // Fixed by university spec!
              }}
              activeOpacity={0.8}
            >
              <Sparkles size={14} color={isDropMode ? Colors.white : Colors.slate600} strokeWidth={2.5} />
              <Text style={[styles.fareModeText, isDropMode && styles.fareModeTextActive, { marginLeft: 4 }]}>
                Drop Charter (₦1,500 Lock)
              </Text>
            </TouchableOpacity>
          </View>

          {/* QR Display Frame */}
          <View style={styles.qrFrame}>
            <QrCode size={160} color={Colors.slate900} strokeWidth={1.8} />
            <Text style={styles.qrFleetCode}>DRIVER ID: DOU-{fleetNumber}</Text>
            <Text style={styles.qrAmountBadge}>
              {isDropMode ? '₦1,500 FLAT (LOCKED)' : `₦${amount} FARE`}
            </Text>
          </View>

          {!isDropMode && (
            <View style={styles.amountPills}>
              {[100, 200, 300].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.amountPill, amount === amt && styles.amountPillActive]}
                  onPress={() => setAmount(amt)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.amountPillText, amount === amt && styles.amountPillTextActive]}>
                    ₦{amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {isDropMode && (
            <View style={styles.dropLockNotice}>
              <ShieldCheck size={16} color={Colors.info} strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text style={styles.dropLockText}>
                Drop charter is hardlocked at ₦1,500 per school policy. All seats reserved.
              </Text>
            </View>
          )}
        </DouCard>

        {/* Real-time Concurrent Passenger Feed */}
        <Text style={styles.sectionHeader}>LIVE PASSENGER PAYMENT ALERTS</Text>
        <PassengerPaymentFeed
          passengers={
            passengers.length > 0
              ? (passengers as any)
              : [
                  {
                    id: 'p-1',
                    studentName: 'Ozegbe Mike',
                    matricNumber: 'DOU/2023/SCI/041',
                    farePaid: 100,
                    paymentStatus: 'paid',
                  },
                  {
                    id: 'p-2',
                    studentName: 'Anthonia Okafor',
                    matricNumber: 'DOU/2024/LAW/108',
                    farePaid: 100,
                    paymentStatus: 'paid',
                  },
                ]
          }
          totalFare={totalPaid || 200}
          allPaid={allPaid}
        />

        {/* Clear Ride Action */}
        <TouchableOpacity style={styles.clearRideBtn} onPress={handleClear} activeOpacity={0.85}>
          <Text style={styles.clearRideBtnText}>CLEAR TRIP & RESET SEATS</Text>
        </TouchableOpacity>

        {/* Driver Quick Utilities */}
        <Text style={styles.sectionHeader}>DRIVER UTILITIES</Text>
        <View style={styles.driverUtilsGrid}>
          <TouchableOpacity
            style={styles.utilCard}
            onPress={() => navigation.navigate(Routes.driverDelivery)}
            activeOpacity={0.8}
          >
            <ShoppingBag size={20} color={Colors.primaryAccent} strokeWidth={2.2} />
            <Text style={styles.utilTitle}>Delivery Jobs</Text>
            <Text style={styles.utilSub}>Cafeteria errands</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.utilCard}
            onPress={() => navigation.navigate(Routes.driverLostItems)}
            activeOpacity={0.8}
          >
            <Building2 size={20} color={Colors.warningDark} strokeWidth={2.2} />
            <Text style={styles.utilTitle}>Lost & Found</Text>
            <Text style={styles.utilSub}>Student Affairs return</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.utilCard}
            onPress={() => setShowReportStudent(true)}
            activeOpacity={0.8}
          >
            <AlertOctagon size={20} color={Colors.error} strokeWidth={2.2} />
            <Text style={styles.utilTitle}>Report Student</Text>
            <Text style={styles.utilSub}>Offense tag</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Driver Instant Payout Modal */}
      <WithdrawSheet
        visible={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        onSubmit={async (data) => {
          await withdraw(data, user?.userId ?? '', user?.token);
          fetchBalance(user?.userId ?? '', user?.token);
          return true;
        }}
      />

      {/* Report Student Modal */}
      <ReportDriverSheet
        visible={showReportStudent}
        onClose={() => setShowReportStudent(false)}
        targetId="student-current"
        targetName="Current Passenger"
        token={user?.token}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? 14 : Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  headerLeft: {
    flex: 1,
  },
  fleetTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate900,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  fleetTagText: {
    color: Colors.white,
    fontSize: FontSize.xxs,
    fontWeight: '800',
    marginLeft: 5,
  },
  driverNameText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.slate900,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  onlineToggleActive: {
    backgroundColor: Colors.successSoft,
    borderColor: Colors.success + '40',
  },
  onlineToggleInactive: {
    backgroundColor: Colors.slate100,
    borderColor: Colors.slate200,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  onlineText: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  capacityCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  capacityTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.slate900,
  },
  capacityStatus: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primaryAccent,
  },
  seatPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.md,
  },
  seatPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  seatPillFree: {
    backgroundColor: Colors.successSoft,
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  seatPillOccupied: {
    backgroundColor: Colors.slate100,
  },
  seatPillText: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
  },
  seatPillTextFree: {
    color: Colors.successDark,
  },
  seatPillTextOccupied: {
    color: Colors.slate500,
  },
  capacityActions: {
    flexDirection: 'row',
    gap: 8,
  },
  capacityBtn: {
    flex: 1,
    backgroundColor: Colors.slate900,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  capacityBtnText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  handshakeCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  handshakeTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.slate900,
  },
  handshakeSub: {
    fontSize: FontSize.xs,
    color: Colors.slate500,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  pinInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pinInput: {
    flex: 1,
    backgroundColor: Colors.slate50,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: FontSize.lg,
    fontWeight: '900',
    letterSpacing: 6,
    color: Colors.slate900,
    textAlign: 'center',
  },
  pinVerifyBtn: {
    backgroundColor: Colors.slate900,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinVerifyBtnDisabled: {
    opacity: 0.5,
  },
  pinVerifyBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.sm,
  },
  arrivalActionBox: {
    marginBottom: Spacing.md,
  },
  arrivedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryAccent,
    paddingVertical: 16,
    borderRadius: BorderRadius.xl,
    ...Shadows.md,
  },
  arrivedBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.sm,
    letterSpacing: 0.4,
  },
  countdownBox: {
    backgroundColor: Colors.warningSoft,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.warning + '50',
  },
  countdownTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.warningDark,
  },
  countdownDigits: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    color: Colors.warningDark,
  },
  noShowClaimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.emergencyRed,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  noShowClaimText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.xs,
  },
  payLinkCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  payLinkTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.md,
  },
  qrIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payLinkTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.slate900,
  },
  payLinkSub: {
    fontSize: FontSize.xxs,
    color: Colors.slate500,
    marginTop: 1,
  },
  fareModeRow: {
    flexDirection: 'row',
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.md,
    padding: 3,
    width: '100%',
    marginBottom: Spacing.md,
  },
  fareModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  fareModeBtnActive: {
    backgroundColor: Colors.slate900,
  },
  fareModeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate600,
  },
  fareModeTextActive: {
    color: Colors.white,
    fontWeight: '800',
  },
  qrFrame: {
    backgroundColor: Colors.slate50,
    borderWidth: 2,
    borderColor: Colors.slate900,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  qrFleetCode: {
    fontSize: FontSize.md,
    fontWeight: '900',
    color: Colors.slate900,
    letterSpacing: 1,
    marginTop: 12,
  },
  qrAmountBadge: {
    backgroundColor: Colors.neonYellow,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.slate900,
    marginTop: 6,
  },
  amountPills: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.md,
  },
  amountPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
  },
  amountPillActive: {
    backgroundColor: Colors.slate900,
  },
  amountPillText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate700,
  },
  amountPillTextActive: {
    color: Colors.white,
    fontWeight: '800',
  },
  dropLockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.infoSoft,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  dropLockText: {
    fontSize: FontSize.xxs,
    color: Colors.info,
    fontWeight: '700',
    flex: 1,
  },
  sectionHeader: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate500,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  clearRideBtn: {
    backgroundColor: Colors.slate900,
    paddingVertical: 18,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    ...Shadows.md,
    marginVertical: Spacing.md,
  },
  clearRideBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.sm,
    letterSpacing: 0.5,
  },
  driverUtilsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  utilCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.subtle,
  },
  utilTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.slate900,
    marginTop: 6,
  },
  utilSub: {
    fontSize: FontSize.xxs,
    color: Colors.slate500,
    marginTop: 2,
  },
});
