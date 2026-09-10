import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Users, CheckCircle2, Clock, XCircle, Banknote } from 'lucide-react-native';
import { Colors, FontSize, BorderRadius, Spacing, Shadows } from '../config/theme';

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
        <View style={styles.emptyIconCircle}>
          <Users size={28} color={Colors.slate400} strokeWidth={2} />
        </View>
        <Text style={styles.emptyTitle}>No Passenger Payments Yet</Text>
        <Text style={styles.emptySubtitle}>
          Incoming student QR payments and transfers will appear here in real time.
        </Text>
      </View>
    );
  }

  const unpaid = passengers.filter(
    (p) => p.paymentStatus !== 'paid' && p.boardingStatus !== 'no_show'
  ).length;

  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <View style={[styles.summary, allPaid ? styles.summaryAllPaid : styles.summaryPending]}>
        <View style={styles.summaryLeft}>
          {allPaid ? (
            <CheckCircle2 size={20} color={Colors.success} strokeWidth={2.5} style={{ marginRight: 8 }} />
          ) : (
            <Clock size={20} color={Colors.warningDark} strokeWidth={2.5} style={{ marginRight: 8 }} />
          )}
          <View>
            <Text style={[styles.summaryText, { color: allPaid ? Colors.successDark : Colors.warningDark }]}>
              {allPaid ? 'All Fares Cleared' : `${unpaid} Pending Payment`}
            </Text>
            <Text style={styles.summarySubtext}>
              {passengers.length} student{passengers.length > 1 ? 's' : ''} on this trip
            </Text>
          </View>
        </View>

        <View style={styles.summaryRight}>
          <Text style={styles.totalLabel}>Total Fare</Text>
          <Text style={[styles.summaryAmount, { color: allPaid ? Colors.successDark : Colors.slate900 }]}>
            ₦{totalFare.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Passenger rows */}
      <View style={styles.listCard}>
        {passengers.map((p, idx) => (
          <PassengerRow key={p.id || idx} passenger={p} isLast={idx === passengers.length - 1} />
        ))}
      </View>
    </View>
  );
}

function PassengerRow({ passenger, isLast }: { passenger: Passenger; isLast: boolean }) {
  const isPaid = passenger.paymentStatus === 'paid';
  const isNoShow = passenger.boardingStatus === 'no_show';
  const isPending = !isPaid && !isNoShow;
  const name = passenger.studentName || 'Student Passenger';
  const subtitle = passenger.matricNumber || `Boarding PIN: ${passenger.boardingPin || '----'}`;
  const fare = passenger.farePaid || 0;

  return (
    <View style={[styles.passengerRow, isLast && { borderBottomWidth: 0 }]}>
      <View
        style={[
          styles.statusBox,
          isNoShow && styles.statusBoxNoShow,
          isPaid && styles.statusBoxPaid,
          isPending && styles.statusBoxPending,
        ]}
      >
        {isNoShow ? (
          <XCircle size={20} color={Colors.error} strokeWidth={2.5} />
        ) : isPaid ? (
          <CheckCircle2 size={20} color={Colors.success} strokeWidth={2.5} />
        ) : (
          <Clock size={18} color={Colors.warningDark} strokeWidth={2} />
        )}
      </View>

      <View style={styles.passengerInfo}>
        <Text style={styles.passengerName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.passengerSubtitle}>{subtitle}</Text>
      </View>

      <View
        style={[
          styles.fareBadge,
          isNoShow && styles.fareBadgeNoShow,
          isPaid && styles.fareBadgePaid,
          isPending && styles.fareBadgePending,
        ]}
      >
        <Text
          style={[
            styles.fareText,
            isNoShow && { color: Colors.errorDark },
            isPaid && { color: Colors.successDark },
            isPending && { color: Colors.warningDark },
          ]}
        >
          {isNoShow ? 'No-show (₦50)' : isPaid ? `+₦${fare.toLocaleString()}` : 'Pending'}
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
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.pulsingDot, { opacity }]} />;
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate50,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.xl,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.slate800,
  },
  emptySubtitle: {
    fontSize: FontSize.xs,
    color: Colors.slate500,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: Spacing.lg,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
  },
  summaryAllPaid: {
    backgroundColor: Colors.successSoft,
    borderColor: Colors.success + '40',
  },
  summaryPending: {
    backgroundColor: Colors.warningSoft,
    borderColor: Colors.warning + '40',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    fontWeight: '800',
    fontSize: FontSize.sm,
  },
  summarySubtext: {
    fontSize: FontSize.xxs,
    color: Colors.slate500,
    marginTop: 1,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: FontSize.xxs,
    fontWeight: '700',
    color: Colors.slate500,
    textTransform: 'uppercase',
  },
  summaryAmount: {
    fontWeight: '800',
    fontSize: FontSize.lg,
    letterSpacing: -0.3,
  },
  listCard: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  statusBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBoxPaid: {
    backgroundColor: Colors.successSoft,
  },
  statusBoxPending: {
    backgroundColor: Colors.warningSoft,
  },
  statusBoxNoShow: {
    backgroundColor: Colors.errorSoft,
  },
  passengerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  passengerName: {
    fontWeight: '700',
    fontSize: FontSize.sm,
    color: Colors.slate900,
  },
  passengerSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.slate500,
    marginTop: 2,
  },
  fareBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  fareBadgePaid: {
    backgroundColor: Colors.successSoft,
  },
  fareBadgePending: {
    backgroundColor: Colors.warningSoft,
  },
  fareBadgeNoShow: {
    backgroundColor: Colors.errorSoft,
  },
  fareText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
    marginLeft: 8,
  },
});
