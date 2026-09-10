import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  MapPin,
  Navigation,
  Users,
  ShieldAlert,
  Share2,
  Clock,
  Sparkles,
  ShoppingBag,
  Search,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  Car,
  AlertOctagon,
  CreditCard,
  QrCode,
  Radio,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { useRideStore } from '../../stores/rideStore';
import { useQueueStore } from '../../stores/queueStore';
import { useWalletStore } from '../../stores/walletStore';
import { BalancePill } from '../../components/BalancePill';
import { DouCard } from '../../components/DouCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CAMPUS_DESTINATIONS = [
  { id: 'dest-1', name: 'Faculty of Science', zone: 'inside', fare: 100 },
  { id: 'dest-5', name: 'Faculty of Engineering', zone: 'inside', fare: 100 },
  { id: 'dest-6', name: 'Faculty of Law', zone: 'inside', fare: 100 },
  { id: 'dest-2', name: 'Faculty of Arts', zone: 'inside', fare: 100 },
  { id: 'dest-3', name: 'Faculty of Social Sciences', zone: 'inside', fare: 100 },
  { id: 'dest-8', name: 'Faculty of Agriculture', zone: 'inside', fare: 100 },
  { id: 'dest-4', name: 'Faculty of Education', zone: 'inside', fare: 100 },
  { id: 'dest-7', name: 'Main Campus Gate', zone: 'inside', fare: 100 },
  { id: 'dest-9', name: 'School Buttery & Cafeteria', zone: 'inside', fare: 100 },
  { id: 'dest-10', name: 'School Medical Center', zone: 'inside', fare: 100 },
  { id: 'dest-out', name: 'Outside Campus (Asaba Town)', zone: 'outside', fare: 200 },
];

const ACTIVE_KEKES_MOCK = [
  { id: '042', driver: 'Sunday A.', seatsFree: 3, distance: '120m away', eta: '1 min' },
  { id: '018', driver: 'Emeka O.', seatsFree: 1, distance: '250m away', eta: '2 mins' },
  { id: '055', driver: 'Musa K.', seatsFree: 4, distance: '400m away', eta: '3 mins' },
];

const ActiveRideView = memo(() => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { tripStatus, driverName, driverFleetNumber, destinationName, boardingPin, reset } = useRideStore();

  const [countdown, setCountdown] = useState(120);

  useEffect(() => {
    if (tripStatus === 'boarding' || tripStatus === 'accepted') {
      const interval = setInterval(() => {
        setCountdown((c) => (c > 0 ? c - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [tripStatus]);

  const handlePayDriver = useCallback(() => navigation.navigate(Routes.studentPay), [navigation]);
  const handleShareLocation = useCallback(() => navigation.navigate(Routes.locationSharing), [navigation]);
  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.activeContent} showsVerticalScrollIndicator={false}>
        {/* Header Badge */}
        <View style={styles.activeHeader}>
          <View style={styles.liveRadarPill}>
            <View style={styles.liveRadarDot} />
            <Text style={styles.liveRadarText}>LIVE ACTIVE TRIP</Text>
          </View>
          <TouchableOpacity onPress={handleShareLocation} style={styles.shareBtn} activeOpacity={0.8}>
            <Share2 size={16} color={Colors.primaryAccent} strokeWidth={2.5} />
            <Text style={styles.shareBtnText}>Share Trip</Text>
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        {tripStatus === 'requested' && (
          <DouCard variant="elevated" style={styles.activeCard}>
            <ActivityIndicator size="large" color={Colors.primaryAccent} style={{ marginVertical: 20 }} />
            <Text style={styles.activeStatusTitle}>Matching Nearest Available Keke...</Text>
            <Text style={styles.activeStatusSubtitle}>
              Searching DOU campus fleet with matching seats
            </Text>
          </DouCard>
        )}

        {(tripStatus === 'accepted' || tripStatus === 'boarding') && (
          <>
            <DouCard variant="glow" style={styles.activeCard}>
              <View style={styles.kekeBadgeRow}>
                <View style={styles.fleetPill}>
                  <Car size={16} color={Colors.white} strokeWidth={2.5} />
                  <Text style={styles.fleetPillText}>FLEET #{driverFleetNumber || '042'}</Text>
                </View>
                <View style={styles.arrivalPill}>
                  <Clock size={13} color={Colors.warningDark} strokeWidth={2.5} />
                  <Text style={styles.arrivalPillText}>Arriving in {formatTimer(countdown)}</Text>
                </View>
              </View>

              <Text style={styles.driverBigName}>{driverName || 'Sunday Azuka'}</Text>
              <Text style={styles.driverSubdetail}>Yellow Tricycle • Dennis Osadebay Reg. Verified</Text>

              <View style={styles.destinationBox}>
                <MapPin size={16} color={Colors.primaryAccent} strokeWidth={2.5} />
                <Text style={styles.destinationText}>Destination: {destinationName || 'Faculty of Science'}</Text>
              </View>

              {/* Boarding PIN Box */}
              <View style={styles.pinContainer}>
                <Text style={styles.pinLabel}>YOUR 4-DIGIT BOARDING PIN</Text>
                <Text style={styles.pinNumber}>{boardingPin || '8821'}</Text>
                <Text style={styles.pinInstruction}>
                  Give this code to the driver upon entering to start your ride securely.
                </Text>
              </View>

              <View style={styles.timerWarningBox}>
                <AlertOctagon size={16} color={Colors.warningDark} strokeWidth={2.5} />
                <Text style={styles.timerWarningText}>
                  Late arrival warning: Driver can report no-show after 2:00 mins (₦50 penalty).
                </Text>
              </View>

              <TouchableOpacity style={styles.primaryActionButton} onPress={handlePayDriver} activeOpacity={0.85}>
                <QrCode size={18} color={Colors.white} strokeWidth={2.5} style={{ marginRight: 8 }} />
                <Text style={styles.primaryActionText}>PAY DRIVER (SCAN / ID)</Text>
              </TouchableOpacity>
            </DouCard>
          </>
        )}

        {tripStatus === 'completed' && (
          <DouCard variant="elevated" style={styles.activeCard}>
            <View style={styles.completedIconCircle}>
              <CheckCircle2 size={44} color={Colors.success} strokeWidth={2.5} />
            </View>
            <Text style={styles.activeStatusTitle}>You have arrived!</Text>
            <Text style={styles.activeStatusSubtitle}>
              Please settle the ride payment with the driver via their QR code or text ID.
            </Text>

            <TouchableOpacity style={styles.primaryActionButton} onPress={handlePayDriver} activeOpacity={0.85}>
              <Text style={styles.primaryActionText}>SCAN DRIVER QR & PAY</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleReset} style={styles.dismissBtn} activeOpacity={0.8}>
              <Text style={styles.dismissBtnText}>Already Paid / Settle Later</Text>
            </TouchableOpacity>
          </DouCard>
        )}

        {tripStatus === 'no_show' && (
          <DouCard variant="elevated" style={styles.activeCard}>
            <View style={[styles.completedIconCircle, { backgroundColor: Colors.errorSoft }]}>
              <AlertOctagon size={44} color={Colors.error} strokeWidth={2.5} />
            </View>
            <Text style={[styles.activeStatusTitle, { color: Colors.errorDark }]}>Passenger No-Show</Text>
            <Text style={styles.activeStatusSubtitle}>
              The 2-minute arrival timer expired. ₦50 has been transferred from your wallet to driver compensation.
            </Text>

            <TouchableOpacity style={styles.primaryActionButton} onPress={handleReset} activeOpacity={0.85}>
              <Text style={styles.primaryActionText}>OK, UNDERSTOOD</Text>
            </TouchableOpacity>
          </DouCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
});

export default function StudentHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const user = useAuthStore((s) => s.user);
  const { currentTripId, tripStatus, isLoading: rideLoading, requestRide } = useRideStore();
  const { joinQueue } = useQueueStore();
  const { balance, fetchBalance } = useWalletStore();

  const [selectedZone, setSelectedZone] = useState<'inside' | 'outside'>('inside');
  const [selectedDest, setSelectedDest] = useState<string>('dest-1');
  const [selectedDestName, setSelectedDestName] = useState<string>('Faculty of Science');
  const [seats, setSeats] = useState(1);
  const [tripType, setTripType] = useState<'standard' | 'drop'>('standard');
  const [isEmergencyHold, setIsEmergencyHold] = useState(false);

  // Emergency SOS hold timer ref
  const emergencyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const emergencyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user?.userId) {
      fetchBalance(user.userId, user.token);
    }
  }, [user?.userId, user?.token, fetchBalance]);

  const handleDestSelect = (id: string, name: string) => {
    setSelectedDest(id);
    setSelectedDestName(name);
  };

  const handleRequestRide = async () => {
    if (!selectedDest || !user) return;
    const result = await requestRide(
      { destinationId: selectedDest, seats, tripType, destinationName: selectedDestName },
      user.userId,
      user.token
    );
    if (result) {
      if (result.status === 'queued') {
        await joinQueue(
          { destinationId: selectedDest, seats, destinationName: selectedDestName },
          user.userId,
          user.token
        );
        navigation.navigate(Routes.studentQueue);
      } else {
        navigation.navigate(Routes.studentQueueCalled);
      }
    }
  };

  // Emergency SOS press-and-hold trigger (3 seconds)
  const handleEmergencyPressIn = () => {
    setIsEmergencyHold(true);
    Animated.timing(emergencyAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    emergencyTimerRef.current = setTimeout(() => {
      triggerEmergency();
    }, 3000);
  };

  const handleEmergencyPressOut = () => {
    setIsEmergencyHold(false);
    if (emergencyTimerRef.current) {
      clearTimeout(emergencyTimerRef.current);
    }
    Animated.timing(emergencyAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const triggerEmergency = () => {
    Alert.alert(
      '🚨 EMERGENCY HEALTH PICKUP ACTIVATED',
      'The nearest active campus Keke is being forcefully redirected to your GPS location. Route is locked strictly to Dennis Osadebay University Medical Center.',
      [
        {
          text: 'Call Clinic Directly',
          onPress: () => {},
        },
        {
          text: 'View Emergency Status',
          onPress: () => navigation.navigate(Routes.adminEmergencies),
        },
      ]
    );
  };

  if (currentTripId && tripStatus !== 'idle' && tripStatus !== 'completed') {
    return <ActiveRideView />;
  }

  const filteredDests = CAMPUS_DESTINATIONS.filter((d) =>
    selectedZone === 'inside' ? d.zone === 'inside' : d.zone === 'outside'
  );

  const currentFare = tripType === 'drop' ? 1500 : selectedZone === 'outside' ? 200 : 100;
  const totalTripFare = currentFare * (tripType === 'drop' ? 1 : seats);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View style={styles.userInfo}>
          <Text style={styles.universitySub}>DENNIS OSADEBAY UNIVERSITY</Text>
          <Text style={styles.userGreeting}>
            Hi, {user?.fullName ? user.fullName.split(' ')[0] : 'Student'} 👋
          </Text>
        </View>
        <BalancePill balance={balance} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Virtual Park Queue Hero Banner */}
        <TouchableOpacity
          style={styles.queueBanner}
          onPress={() => navigation.navigate(Routes.studentQueue)}
          activeOpacity={0.9}
        >
          <View style={styles.queueBannerLeft}>
            <View style={styles.queueIconCircle}>
              <Radio size={20} color={Colors.white} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.queueBannerTitle}>School Park Queue Mode</Text>
              <Text style={styles.queueBannerSub}>
                Join virtual queue to get your ticket and avoid morning rush.
              </Text>
            </View>
          </View>
          <View style={styles.queueArrowPill}>
            <Text style={styles.queueArrowText}>Join Line</Text>
            <ChevronRight size={14} color={Colors.white} strokeWidth={3} />
          </View>
        </TouchableOpacity>

        {/* Live Campus Radar Preview */}
        <DouCard variant="default" style={styles.radarCard}>
          <View style={styles.radarHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Navigation size={18} color={Colors.primaryAccent} strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text style={styles.radarTitle}>Campus Transit Radar</Text>
            </View>
            <View style={styles.activeKekesBadge}>
              <Text style={styles.activeKekesText}>3 Kekes Active Nearby</Text>
            </View>
          </View>

          <View style={styles.kekeChipsRow}>
            {ACTIVE_KEKES_MOCK.map((k) => (
              <View key={k.id} style={styles.kekeLiveChip}>
                <View style={styles.kekeLiveLeft}>
                  <View style={styles.kekeIconSquare}>
                    <Car size={16} color={Colors.slate900} strokeWidth={2.5} />
                  </View>
                  <View>
                    <Text style={styles.kekeChipTitle}>Keke #{k.id}</Text>
                    <Text style={styles.kekeChipSub}>{k.eta} • {k.distance}</Text>
                  </View>
                </View>
                <View style={[styles.seatIndicator, { backgroundColor: k.seatsFree > 1 ? Colors.successSoft : Colors.warningSoft }]}>
                  <Text style={[styles.seatIndicatorText, { color: k.seatsFree > 1 ? Colors.successDark : Colors.warningDark }]}>
                    {k.seatsFree} {k.seatsFree === 1 ? 'Seat' : 'Seats'} Free
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </DouCard>

        {/* Trip Mode Switcher */}
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[styles.modeToggleBtn, tripType === 'standard' && styles.modeToggleActive]}
            onPress={() => setTripType('standard')}
            activeOpacity={0.8}
          >
            <Users size={16} color={tripType === 'standard' ? Colors.white : Colors.slate600} strokeWidth={2.5} />
            <Text style={[styles.modeToggleText, tripType === 'standard' && styles.modeToggleTextActive]}>
              Standard Shared (₦100)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeToggleBtn, tripType === 'drop' && styles.modeToggleActive]}
            onPress={() => {
              setTripType('drop');
              setSeats(1);
            }}
            activeOpacity={0.8}
          >
            <Sparkles size={16} color={tripType === 'drop' ? Colors.white : Colors.slate600} strokeWidth={2.5} />
            <Text style={[styles.modeToggleText, tripType === 'drop' && styles.modeToggleTextActive]}>
              Private Drop (₦1,500)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Zone Filter (Inside vs Outside) */}
        <View style={styles.zoneRow}>
          <TouchableOpacity
            style={[styles.zoneChip, selectedZone === 'inside' && styles.zoneChipActive]}
            onPress={() => {
              setSelectedZone('inside');
              setSelectedDest('dest-1');
              setSelectedDestName('Faculty of Science');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.zoneChipText, selectedZone === 'inside' && styles.zoneChipTextActive]}>
              Inside Campus (₦100)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.zoneChip, selectedZone === 'outside' && styles.zoneChipActive]}
            onPress={() => {
              setSelectedZone('outside');
              setSelectedDest('dest-out');
              setSelectedDestName('Outside Campus (Asaba Town)');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.zoneChipText, selectedZone === 'outside' && styles.zoneChipTextActive]}>
              Outside Campus (₦200)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Destination List */}
        <Text style={styles.sectionHeader}>SELECT DESTINATION</Text>
        <View style={styles.destList}>
          {filteredDests.map((dest) => {
            const isSelected = selectedDest === dest.id;
            return (
              <TouchableOpacity
                key={dest.id}
                style={[styles.destListItem, isSelected && styles.destListItemActive]}
                onPress={() => handleDestSelect(dest.id, dest.name)}
                activeOpacity={0.8}
              >
                <View style={styles.destListLeft}>
                  <View style={[styles.destIconBox, isSelected && styles.destIconBoxActive]}>
                    <MapPin size={18} color={isSelected ? Colors.white : Colors.primaryAccent} strokeWidth={2.5} />
                  </View>
                  <View>
                    <Text style={[styles.destItemName, isSelected && styles.destItemNameActive]}>
                      {dest.name}
                    </Text>
                    <Text style={styles.destItemSub}>
                      Dennis Osadebay Campus Guideline Route
                    </Text>
                  </View>
                </View>

                <View style={styles.destFarePill}>
                  <Text style={[styles.destFareText, isSelected && { color: Colors.primaryAccent }]}>
                    ₦{tripType === 'drop' ? '1,500' : dest.fare}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Seat Counter & Action Bar */}
        <DouCard variant="elevated" style={styles.checkoutBar}>
          {tripType === 'standard' ? (
            <View style={styles.seatRow}>
              <View>
                <Text style={styles.seatLabel}>Number of Seats</Text>
                <Text style={styles.seatSublabel}>Booking for you + friends</Text>
              </View>

              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={[styles.stepBtn, seats <= 1 && styles.stepBtnDisabled]}
                  onPress={() => seats > 1 && setSeats((s) => s - 1)}
                  disabled={seats <= 1}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>

                <Text style={styles.stepValue}>{seats}</Text>

                <TouchableOpacity
                  style={[styles.stepBtn, seats >= 4 && styles.stepBtnDisabled]}
                  onPress={() => seats < 4 && setSeats((s) => s + 1)}
                  disabled={seats >= 4}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.dropCharterNotice}>
              <Sparkles size={18} color={Colors.warningDark} strokeWidth={2.5} />
              <Text style={styles.dropCharterText}>
                Private Drop automatically reserves all seats for your personal route.
              </Text>
            </View>
          )}

          <View style={styles.fareDivider} />

          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>TOTAL FARE</Text>
              <Text style={styles.totalAmount}>₦{totalTripFare.toLocaleString()}</Text>
            </View>

            <TouchableOpacity
              style={[styles.requestRideBtn, (!selectedDest || rideLoading) && styles.requestRideBtnDisabled]}
              onPress={handleRequestRide}
              disabled={!selectedDest || rideLoading}
              activeOpacity={0.85}
            >
              {rideLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.requestRideBtnText}>REQUEST KEKE</Text>
                  <ArrowRight size={18} color={Colors.white} strokeWidth={2.5} style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </DouCard>

        {/* Emergency SOS Button */}
        <View style={styles.emergencyContainer}>
          <TouchableOpacity
            style={styles.emergencyButton}
            onPressIn={handleEmergencyPressIn}
            onPressOut={handleEmergencyPressOut}
            activeOpacity={0.9}
          >
            <View style={styles.emergencyLeft}>
              <ShieldAlert size={24} color={Colors.white} strokeWidth={2.5} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.emergencyTitle}>🚨 EMERGENCY HEALTH PICKUP</Text>
                <Text style={styles.emergencySub}>
                  Hold for 3s • Immediate clinic route lock • Bypasses balance
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          {isEmergencyHold && (
            <Animated.View
              style={[
                styles.emergencyProgress,
                {
                  width: emergencyAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          )}
        </View>

        {/* Quick Service Shortcuts */}
        <Text style={styles.sectionHeader}>CAMPUS ESSENTIALS</Text>
        <View style={styles.shortcutsGrid}>
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate(Routes.studentMarketplace)}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: '#FDF2F8' }]}>
              <ShoppingBag size={22} color="#DB2777" strokeWidth={2.2} />
            </View>
            <Text style={styles.shortcutTitle}>DOU Market</Text>
            <Text style={styles.shortcutSub}>Food & Handouts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate(Routes.studentLostItems)}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Search size={22} color="#16A34A" strokeWidth={2.2} />
            </View>
            <Text style={styles.shortcutTitle}>Lost & Found</Text>
            <Text style={styles.shortcutSub}>Recover Items</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate(Routes.studentWallet)}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: '#EFF6FF' }]}>
              <CreditCard size={22} color="#2563EB" strokeWidth={2.2} />
            </View>
            <Text style={styles.shortcutTitle}>Transfer</Text>
            <Text style={styles.shortcutSub}>Send to Friends</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate(Routes.locationSharing)}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: '#FEF9C3' }]}>
              <Share2 size={22} color="#CA8A04" strokeWidth={2.2} />
            </View>
            <Text style={styles.shortcutTitle}>Safety Share</Text>
            <Text style={styles.shortcutSub}>Live Tracking</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? 14 : Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    backgroundColor: Colors.white,
  },
  userInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  universitySub: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate400,
    letterSpacing: 0.8,
  },
  userGreeting: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.slate900,
    letterSpacing: -0.3,
  },
  scrollBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  queueBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  queueIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueBannerTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.white,
  },
  queueBannerSub: {
    fontSize: FontSize.xs,
    color: Colors.slate300,
    marginTop: 2,
  },
  queueArrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryAccent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginLeft: 8,
  },
  queueArrowText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.white,
    marginRight: 2,
  },
  radarCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  radarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  radarTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.slate900,
  },
  activeKekesBadge: {
    backgroundColor: Colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  activeKekesText: {
    fontSize: FontSize.xxs,
    fontWeight: '700',
    color: Colors.successDark,
  },
  kekeChipsRow: {
    gap: 8,
  },
  kekeLiveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.slate50,
    padding: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  kekeLiveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kekeIconSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.neonYellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  kekeChipTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.slate900,
  },
  kekeChipSub: {
    fontSize: FontSize.xxs,
    color: Colors.slate500,
    marginTop: 1,
  },
  seatIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  seatIndicatorText: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.md,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  modeToggleActive: {
    backgroundColor: Colors.slate900,
    ...Shadows.sm,
  },
  modeToggleText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate600,
    marginLeft: 6,
  },
  modeToggleTextActive: {
    color: Colors.white,
    fontWeight: '800',
  },
  zoneRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  zoneChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.slate50,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    alignItems: 'center',
  },
  zoneChipActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primaryAccent,
  },
  zoneChipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate700,
  },
  zoneChipTextActive: {
    color: Colors.primaryAccent,
    fontWeight: '800',
  },
  sectionHeader: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate500,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  destList: {
    gap: 8,
    marginBottom: Spacing.md,
  },
  destListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.xl,
    ...Shadows.subtle,
  },
  destListItemActive: {
    borderColor: Colors.primaryAccent,
    backgroundColor: Colors.primarySoft,
  },
  destListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  destIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  destIconBoxActive: {
    backgroundColor: Colors.primaryAccent,
  },
  destItemName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.slate900,
  },
  destItemNameActive: {
    color: Colors.primaryAccent,
    fontWeight: '800',
  },
  destItemSub: {
    fontSize: FontSize.xxs,
    color: Colors.slate500,
    marginTop: 2,
  },
  destFarePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
  },
  destFareText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.slate800,
  },
  checkoutBar: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  seatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seatLabel: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.slate900,
  },
  seatSublabel: {
    fontSize: FontSize.xxs,
    color: Colors.slate500,
    marginTop: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.full,
    padding: 3,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.subtle,
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepBtnText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.slate900,
  },
  stepValue: {
    fontSize: FontSize.md,
    fontWeight: '800',
    marginHorizontal: 14,
    color: Colors.slate900,
  },
  dropCharterNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningSoft,
    padding: 10,
    borderRadius: BorderRadius.md,
  },
  dropCharterText: {
    fontSize: FontSize.xs,
    color: Colors.warningDark,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
  },
  fareDivider: {
    height: 1,
    backgroundColor: Colors.slate100,
    marginVertical: Spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate400,
  },
  totalAmount: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.slate900,
    letterSpacing: -0.5,
  },
  requestRideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate900,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
  },
  requestRideBtnDisabled: {
    opacity: 0.5,
  },
  requestRideBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.sm,
    letterSpacing: 0.4,
  },
  emergencyContainer: {
    position: 'relative',
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.emergencyRed,
    ...Shadows.lg,
  },
  emergencyButton: {
    padding: Spacing.md,
  },
  emergencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyTitle: {
    fontSize: FontSize.sm,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  emergencySub: {
    fontSize: FontSize.xxs,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  emergencyProgress: {
    height: 4,
    backgroundColor: Colors.neonYellow,
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: Spacing.xs,
  },
  shortcutCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - 10) / 2,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.subtle,
  },
  shortcutIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  shortcutTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.slate900,
  },
  shortcutSub: {
    fontSize: FontSize.xxs,
    color: Colors.slate500,
    marginTop: 2,
  },
  activeContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  liveRadarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  liveRadarDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.success,
    marginRight: 6,
  },
  liveRadarText: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.successDark,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  shareBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryAccent,
    marginLeft: 4,
  },
  activeCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  kekeBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.md,
  },
  fleetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate900,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  fleetPillText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.xs,
    marginLeft: 6,
  },
  arrivalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  arrivalPillText: {
    color: Colors.warningDark,
    fontSize: FontSize.xs,
    fontWeight: '700',
    marginLeft: 4,
  },
  driverBigName: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.slate900,
  },
  driverSubdetail: {
    fontSize: FontSize.xs,
    color: Colors.slate500,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  destinationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    width: '100%',
    marginBottom: Spacing.lg,
  },
  destinationText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate800,
    marginLeft: 8,
  },
  pinContainer: {
    backgroundColor: Colors.slate900,
    width: '100%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pinLabel: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate400,
    letterSpacing: 1,
  },
  pinNumber: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 8,
    color: Colors.neonYellow,
    marginVertical: 6,
  },
  pinInstruction: {
    fontSize: FontSize.xs,
    color: Colors.slate300,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  timerWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningSoft,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  timerWarningText: {
    fontSize: FontSize.xxs,
    color: Colors.warningDark,
    fontWeight: '700',
    marginLeft: 6,
    flex: 1,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate900,
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    width: '100%',
    ...Shadows.md,
  },
  primaryActionText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.sm,
    letterSpacing: 0.5,
  },
  dismissBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  dismissBtnText: {
    fontSize: FontSize.sm,
    color: Colors.slate500,
    fontWeight: '600',
  },
  activeStatusTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.slate900,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  activeStatusSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.slate500,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  completedIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
});
