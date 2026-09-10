import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Ticket,
  Users,
  Clock,
  ChevronLeft,
  Radio,
  MapPin,
  Sparkles,
  Info,
} from 'lucide-react-native';
import { Colors, FontSize, BorderRadius, Spacing, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useQueueStore } from '../../stores/queueStore';
import { useRideStore } from '../../stores/rideStore';
import { useAuthStore } from '../../stores/authStore';
import { DouCard } from '../../components/DouCard';

export default function StudentQueueScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { entries, isLoading, fetchQueueStatus, leaveQueue } = useQueueStore();
  const { tripStatus } = useRideStore();
  const queue = entries[0];

  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueueStatus(user?.userId ?? '', user?.token);
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchQueueStatus, user?.userId, user?.token]);

  if (tripStatus === 'accepted' || tripStatus === 'boarding') {
    navigation.replace(Routes.studentQueueCalled);
    return null;
  }

  const handleLeave = async () => {
    if (queue) {
      await leaveQueue(queue.queueId, user?.token);
    }
    navigation.goBack();
  };

  const ticketNumber = queue?.queueId ? `#${queue.queueId.substring(0, 4).toUpperCase()}` : '#042';
  const studentsAhead = queue?.position ?? 14;
  const estimatedMins = Math.max(1, Math.ceil((queue?.estimatedWait ?? 360) / 60));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <ChevronLeft size={22} color={Colors.slate900} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Park Virtual Line</Text>
          <Text style={styles.headerSub}>Dennis Osadebay University Terminal</Text>
        </View>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Virtual Boarding Pass Ticket */}
        <View style={styles.ticketCard}>
          <View style={styles.ticketTop}>
            <View style={styles.ticketBadge}>
              <Ticket size={16} color={Colors.white} strokeWidth={2.5} />
              <Text style={styles.ticketBadgeText}>BOARDING PASS</Text>
            </View>
            <View style={styles.kekeBayPill}>
              <Text style={styles.kekeBayText}>BAY 1 • MAIN PARK</Text>
            </View>
          </View>

          <View style={styles.ticketMain}>
            <Text style={styles.ticketLabel}>YOUR QUEUE NUMBER</Text>
            <Text style={styles.ticketBigNumber}>{ticketNumber}</Text>

            <View style={styles.destBox}>
              <MapPin size={16} color={Colors.primaryAccent} strokeWidth={2.5} />
              <Text style={styles.destText}>
                {queue?.destinationName || 'Faculty of Science / Campus Roads'}
              </Text>
            </View>
          </View>

          {/* Perforated Divider */}
          <View style={styles.perforatedRow}>
            <View style={styles.perfCutoutLeft} />
            <View style={styles.perfDashes} />
            <View style={styles.perfCutoutRight} />
          </View>

          {/* Queue Telemetry Stats */}
          <View style={styles.ticketStats}>
            <View style={styles.statCol}>
              <View style={styles.statIconBox}>
                <Users size={18} color={Colors.primaryAccent} strokeWidth={2.5} />
              </View>
              <Text style={styles.statValue}>{studentsAhead}</Text>
              <Text style={styles.statLabel}>Students Ahead</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <View style={[styles.statIconBox, { backgroundColor: Colors.warningSoft }]}>
                <Clock size={18} color={Colors.warningDark} strokeWidth={2.5} />
              </View>
              <Text style={styles.statValue}>~{estimatedMins} mins</Text>
              <Text style={styles.statLabel}>Estimated Wait</Text>
            </View>
          </View>
        </View>

        {/* Live Status Animation Card */}
        <DouCard variant="flat" style={styles.shadeAdviceCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Sparkles size={16} color={Colors.primaryAccent} strokeWidth={2.5} style={{ marginRight: 6 }} />
            <Text style={styles.shadeAdviceTitle}>Relax in the shade</Text>
          </View>
          <Text style={styles.shadeAdviceText}>
            No need to stand in the heat or fight for spots. When your Keke pulls up, your screen will flash bright Neon Yellow with the Keke fleet number!
          </Text>
        </DouCard>

        <View style={styles.waitingIndicatorRow}>
          <ActivityIndicator size="small" color={Colors.primaryAccent} />
          <Text style={styles.waitingIndicatorText}>Syncing position with campus transit coordinator...</Text>
        </View>

        {/* Action: Leave Queue */}
        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave} activeOpacity={0.8}>
          <Text style={styles.leaveBtnText}>Cancel & Leave Queue</Text>
        </TouchableOpacity>
      </View>
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
  headerCenter: {
    alignItems: 'center',
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
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: 5,
  },
  liveText: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.successDark,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketCard: {
    width: '100%',
    backgroundColor: Colors.slate900,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    ...Shadows.xl,
    marginBottom: Spacing.lg,
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingBottom: 0,
  },
  ticketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryAccent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  ticketBadgeText: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.white,
    marginLeft: 5,
    letterSpacing: 0.5,
  },
  kekeBayPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  kekeBayText: {
    fontSize: FontSize.xxs,
    fontWeight: '700',
    color: Colors.slate300,
  },
  ticketMain: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  ticketLabel: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate400,
    letterSpacing: 1.5,
  },
  ticketBigNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -2,
    marginVertical: 4,
  },
  destBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    marginTop: 8,
  },
  destText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.white,
    marginLeft: 6,
  },
  perforatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 24,
  },
  perfCutoutLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
    position: 'absolute',
    left: -10,
  },
  perfDashes: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
    marginHorizontal: 16,
  },
  perfCutoutRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
    position: 'absolute',
    right: -10,
  },
  ticketStats: {
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.white,
  },
  statLabel: {
    fontSize: FontSize.xxs,
    color: Colors.slate400,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  shadeAdviceCard: {
    padding: Spacing.md,
    width: '100%',
    marginBottom: Spacing.lg,
  },
  shadeAdviceTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.slate900,
  },
  shadeAdviceText: {
    fontSize: FontSize.xs,
    color: Colors.slate600,
    lineHeight: 18,
  },
  waitingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  waitingIndicatorText: {
    fontSize: FontSize.xs,
    color: Colors.slate500,
    marginLeft: 8,
    fontWeight: '600',
  },
  leaveBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  leaveBtnText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
