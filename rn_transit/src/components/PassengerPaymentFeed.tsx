import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors, FontSize, BorderRadius } from '../config/theme';

interface Passenger {
  id: string;
  studentName?: string;
  matricNumber?: string;
  farePaid?: number;
  boardingPin?: string;
  paymentStatus?: string;
  boardingStatus?: string;
}

interface PassengerPaymentFeedProps {
  passengers: Passenger[];
  totalFare: number;
  allPaid: boolean;
}

export function PassengerPaymentFeed({ passengers, totalFare, allPaid }: PassengerPaymentFeedProps) {
  if (passengers.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>👥</Text>
        <Text style={styles.emptyTitle}>No passengers yet</Text>
        <Text style={styles.emptySubtitle}>Passengers will appear here when they pay</Text>
      </View>
    );
  }

  const unpaid = passengers.filter((p) => p.paymentStatus !== 'paid' && p.boardingStatus !== 'no_show').length;

  return (
    <View>
      {/* Summary */}
      <View style={[styles.summary, allPaid ? styles.summaryAllPaid : styles.summaryPending]}>
        <Text style={styles.summaryIcon}>{allPaid ? '✅' : '⏳'}</Text>
        <Text style={[styles.summaryText, { color: allPaid ? Colors.success : Colors.warning }]}>
          {allPaid ? 'All passengers paid!' : `${unpaid} unpaid`}
        </Text>
        <Text style={[styles.summaryAmount, { color: allPaid ? Colors.success : Colors.black }]}>
          ₦{totalFare.toFixed(0)}
        </Text>
      </View>

      {/* Passenger rows */}
      {passengers.map((p) => (
        <PassengerRow key={p.id} passenger={p} />
      ))}
    </View>
  );
}

function PassengerRow({ passenger }: { passenger: Passenger }) {
  const isPaid = passenger.paymentStatus === 'paid';
  const isNoShow = passenger.boardingStatus === 'no_show';
  const isPending = !isPaid && !isNoShow;
  const name = passenger.studentName || 'Unknown Student';
  const subtitle = passenger.matricNumber || `PIN: ${passenger.boardingPin || '----'}`;
  const fare = passenger.farePaid || 0;

  return (
    <View style={styles.passengerRow}>
      <View style={[styles.statusBox, isNoShow && styles.statusBoxNoShow, isPaid && styles.statusBoxPaid, isPending && styles.statusBoxPending]}>
        <Text style={styles.statusIcon}>
          {isNoShow ? '✕' : isPaid ? '✓' : '⏳'}
        </Text>
      </View>

      <View style={styles.passengerInfo}>
        <Text style={styles.passengerName} numberOfLines={1}>{name}</Text>
        <Text style={styles.passengerSubtitle}>{subtitle}</Text>
      </View>

      <View style={[styles.fareBadge, isNoShow && styles.fareBadgeNoShow, isPaid && styles.fareBadgePaid, isPending && styles.fareBadgePending]}>
        <Text style={[styles.fareText, isNoShow && { color: Colors.error }, isPaid && { color: Colors.success }, isPending && { color: Colors.warning }]}>
          {isNoShow ? 'No-show' : isPaid ? `₦${fare.toFixed(0)}` : 'Pending'}
        </Text>
      </View>

      {isPending && <PulsingDot />}
    </View>
  );
}

function PulsingDot() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.pulsingDot, { opacity }]} />
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.md,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, color: Colors.grey },
  emptySubtitle: { fontSize: 12, color: Colors.grey, textAlign: 'center', marginTop: 4 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: 8,
  },
  summaryAllPaid: {
    backgroundColor: 'rgba(46,125,50,0.05)',
    borderColor: Colors.success,
  },
  summaryPending: {
    backgroundColor: 'rgba(255,160,0,0.05)',
    borderColor: Colors.warning,
  },
  summaryIcon: { fontSize: 20, marginRight: 8 },
  summaryText: { fontWeight: 'bold', fontSize: 13, flex: 1 },
  summaryAmount: { fontWeight: 'bold', fontSize: 16 },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGrey,
  },
  statusBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBoxPaid: { backgroundColor: 'rgba(46,125,50,0.1)', borderColor: Colors.success },
  statusBoxPending: { backgroundColor: Colors.ultraLightGrey, borderColor: Colors.lightGrey },
  statusBoxNoShow: { backgroundColor: 'rgba(211,47,47,0.1)', borderColor: Colors.error },
  statusIcon: { fontSize: 20 },
  passengerInfo: { flex: 1, marginLeft: 12 },
  passengerName: { fontWeight: 'bold', fontSize: 13 },
  passengerSubtitle: { fontSize: 11, color: Colors.grey, marginTop: 2 },
  fareBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  fareBadgePaid: { backgroundColor: 'rgba(46,125,50,0.1)' },
  fareBadgePending: { backgroundColor: 'rgba(255,160,0,0.1)' },
  fareBadgeNoShow: { backgroundColor: 'rgba(211,47,47,0.1)' },
  fareText: { fontSize: 12, fontWeight: 'bold' },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
    marginLeft: 8,
  },
});
