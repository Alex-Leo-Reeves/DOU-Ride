import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Shield,
  Car,
  Users,
  AlertTriangle,
  Search,
  PlusCircle,
  Activity,
  CreditCard,
  LogOut,
  ChevronRight,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { DouCard } from '../../components/DouCard';

export default function AdminDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user, logout: authLogout } = useAuthStore();
  const {
    activeKekes,
    tripsToday,
    revenueToday,
    pendingBankApprovals,
    pendingReports,
    pendingLostItems,
    drivers,
    students,
    isLoading,
    fetchAnalytics,
  } = useAdminStore();

  useEffect(() => {
    fetchAnalytics(user?.token);
  }, []);

  const handleRefresh = () => {
    fetchAnalytics(user?.token);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceLight} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.shieldBadge}>
            <Shield size={18} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.portalTitle}>Student Affairs Command</Text>
            <Text style={styles.adminName}>{user?.fullName ?? 'Administrator'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            authLogout();
            navigation.reset({ index: 0, routes: [{ name: Routes.roleSelection }] });
          }}
          activeOpacity={0.8}
        >
          <LogOut size={16} color={Colors.error} />
          <Text style={styles.logoutText}>Exit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Real-time Status Banner */}
        <View style={styles.statusBanner}>
          <View style={styles.livePulseDot} />
          <Text style={styles.statusBannerText}>DOU Smart Campus Operations • Live</Text>
          <Text style={styles.todayDate}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
        </View>

        {/* 4 Core KPI Metrics */}
        <View style={styles.statsGrid}>
          <DouCard variant="elevated" padding={Spacing.md} style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.primary + '12' }]}>
              <Car size={18} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{activeKekes}</Text>
            <Text style={styles.statLabel}>Active Kekes</Text>
            <View style={styles.statSubRow}>
              <View style={[styles.microDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.statSubText}>En route now</Text>
            </View>
          </DouCard>

          <DouCard variant="elevated" padding={Spacing.md} style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.secondary + '12' }]}>
              <Activity size={18} color={Colors.secondary} />
            </View>
            <Text style={styles.statValue}>{tripsToday}</Text>
            <Text style={styles.statLabel}>Trips Completed</Text>
            <View style={styles.statSubRow}>
              <TrendingUp size={12} color={Colors.secondary} />
              <Text style={styles.statSubText}>Today</Text>
            </View>
          </DouCard>

          <DouCard variant="elevated" padding={Spacing.md} style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.success + '15' }]}>
              <TrendingUp size={18} color={Colors.success} />
            </View>
            <Text style={styles.statValue}>₦{revenueToday.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Platform Revenue</Text>
            <View style={styles.statSubRow}>
              <Text style={[styles.statSubText, { color: Colors.success }]}>₦10 fees accrued</Text>
            </View>
          </DouCard>

          <DouCard
            variant={pendingBankApprovals > 0 ? 'accent' : 'elevated'}
            padding={Spacing.md}
            style={styles.statCard}
            onPress={() => navigation.navigate(Routes.adminWallet)}
          >
            <View
              style={[
                styles.statIconWrap,
                { backgroundColor: pendingBankApprovals > 0 ? Colors.warning + '25' : Colors.slate100 },
              ]}
            >
              <CreditCard size={18} color={pendingBankApprovals > 0 ? Colors.warning : Colors.slate500} />
            </View>
            <Text style={[styles.statValue, pendingBankApprovals > 0 && { color: Colors.warning }]}>
              {pendingBankApprovals}
            </Text>
            <Text style={styles.statLabel}>Bank Approvals</Text>
            <View style={styles.statSubRow}>
              <Text style={[styles.statSubText, pendingBankApprovals > 0 && { color: Colors.warning }]}>
                {pendingBankApprovals > 0 ? 'Requires action' : 'All clear'}
              </Text>
            </View>
          </DouCard>
        </View>

        {/* Priority Action Tasks */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Urgent Disciplinary & Safety</Text>
          <Text style={styles.sectionSub}>Student Affairs response queue</Text>
        </View>

        <DouCard
          variant="elevated"
          padding={Spacing.md}
          style={styles.actionCard}
          onPress={() => navigation.navigate(Routes.adminEmergencies)}
        >
          <View style={styles.actionRow}>
            <View style={[styles.actionIconWrap, { backgroundColor: Colors.error + '15' }]}>
              <AlertTriangle size={20} color={Colors.error} />
            </View>
            <View style={styles.actionContent}>
              <View style={styles.actionTitleRow}>
                <Text style={styles.actionTitle}>Emergency Health Radar</Text>
                <View style={[styles.badge, { backgroundColor: Colors.error + '15' }]}>
                  <Text style={[styles.badgeText, { color: Colors.error }]}>SOS DUAL-TRACK</Text>
                </View>
              </View>
              <Text style={styles.actionDesc}>Live medical crises converging on DOU Medical Center</Text>
            </View>
            <ChevronRight size={18} color={Colors.slate400} />
          </View>
        </DouCard>

        <DouCard
          variant="elevated"
          padding={Spacing.md}
          style={styles.actionCard}
          onPress={() => navigation.navigate(Routes.adminReports)}
        >
          <View style={styles.actionRow}>
            <View style={[styles.actionIconWrap, { backgroundColor: Colors.warning + '15' }]}>
              <Shield size={20} color={Colors.warning} />
            </View>
            <View style={styles.actionContent}>
              <View style={styles.actionTitleRow}>
                <Text style={styles.actionTitle}>Incident Reports</Text>
                {pendingReports > 0 && (
                  <View style={[styles.badge, { backgroundColor: Colors.warning + '20' }]}>
                    <Text style={[styles.badgeText, { color: Colors.warning }]}>{pendingReports} PENDING</Text>
                  </View>
                )}
              </View>
              <Text style={styles.actionDesc}>Overloading, reckless driving, & harassment logs</Text>
            </View>
            <ChevronRight size={18} color={Colors.slate400} />
          </View>
        </DouCard>

        <DouCard
          variant="elevated"
          padding={Spacing.md}
          style={styles.actionCard}
          onPress={() => navigation.navigate(Routes.adminLostItems)}
        >
          <View style={styles.actionRow}>
            <View style={[styles.actionIconWrap, { backgroundColor: Colors.primary + '12' }]}>
              <Search size={20} color={Colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <View style={styles.actionTitleRow}>
                <Text style={styles.actionTitle}>Lost & Found Registry</Text>
                {pendingLostItems > 0 && (
                  <View style={[styles.badge, { backgroundColor: Colors.primary + '15' }]}>
                    <Text style={[styles.badgeText, { color: Colors.primary }]}>{pendingLostItems} AT OFFICE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.actionDesc}>Physical custody handover & student claims</Text>
            </View>
            <ChevronRight size={18} color={Colors.slate400} />
          </View>
        </DouCard>

        <DouCard
          variant="outlined"
          padding={Spacing.md}
          style={[styles.actionCard, { borderStyle: 'dashed', borderColor: Colors.primary }]}
          onPress={() => navigation.navigate(Routes.adminLostItemTrigger)}
        >
          <View style={styles.actionRow}>
            <View style={[styles.actionIconWrap, { backgroundColor: Colors.primary + '10' }]}>
              <PlusCircle size={20} color={Colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: Colors.primary }]}>Walk-in Lost Item Desk</Text>
              <Text style={styles.actionDesc}>Log for phone-less students walking into Student Affairs</Text>
            </View>
            <ChevronRight size={18} color={Colors.primary} />
          </View>
        </DouCard>

        {/* Directory & Registry Navigation */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Campus Registries</Text>
          <Text style={styles.sectionSub}>Live student & driver databases</Text>
        </View>

        <View style={styles.dirGrid}>
          <DouCard
            variant="elevated"
            padding={Spacing.md}
            style={styles.dirCard}
            onPress={() => navigation.navigate(Routes.adminDrivers)}
          >
            <View style={styles.dirTop}>
              <View style={[styles.dirIconWrap, { backgroundColor: Colors.primary + '15' }]}>
                <Car size={22} color={Colors.primary} />
              </View>
              <ArrowUpRight size={18} color={Colors.slate400} />
            </View>
            <Text style={styles.dirCount}>{drivers.length || 24}</Text>
            <Text style={styles.dirName}>Registered Drivers</Text>
            <Text style={styles.dirFoot}>Fleet badges & suspension toggles</Text>
          </DouCard>

          <DouCard
            variant="elevated"
            padding={Spacing.md}
            style={styles.dirCard}
            onPress={() => navigation.navigate(Routes.adminStudents)}
          >
            <View style={styles.dirTop}>
              <View style={[styles.dirIconWrap, { backgroundColor: Colors.secondary + '15' }]}>
                <Users size={22} color={Colors.secondary} />
              </View>
              <ArrowUpRight size={18} color={Colors.slate400} />
            </View>
            <Text style={styles.dirCount}>{students.length || 1840}</Text>
            <Text style={styles.dirName}>Enrolled Students</Text>
            <Text style={styles.dirFoot}>Matric lookup & wallet audit</Text>
          </DouCard>
        </View>

        {/* Financial Adjustment */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Financial Oversight</Text>
          <Text style={styles.sectionSub}>Ledger balances & bank account approvals</Text>
        </View>

        <DouCard
          variant="elevated"
          padding={Spacing.md}
          style={styles.financeCard}
          onPress={() => navigation.navigate(Routes.adminWallet)}
        >
          <View style={styles.actionRow}>
            <View style={[styles.actionIconWrap, { backgroundColor: Colors.success + '15' }]}>
              <CreditCard size={20} color={Colors.success} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Wallet Adjustment & Audit</Text>
              <Text style={styles.actionDesc}>Direct credit/debit with compulsory audit memo notes</Text>
            </View>
            <ChevronRight size={18} color={Colors.slate400} />
          </View>
        </DouCard>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  shieldBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalTitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adminName: {
    fontSize: FontSize.md,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.error + '10',
    borderWidth: 1,
    borderColor: Colors.error + '25',
  },
  logoutText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.error,
  },
  content: {
    padding: Spacing.lg,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: 8,
  },
  statusBannerText: {
    flex: 1,
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate700,
  },
  todayDate: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate500,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: '48.5%',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
    marginTop: 2,
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate500,
    marginTop: 2,
  },
  statSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  microDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statSubText: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate600,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  sectionSub: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
  },
  actionCard: {
    marginBottom: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  actionTitle: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate900,
  },
  actionDesc: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    lineHeight: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  dirGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dirCard: {
    flex: 1,
  },
  dirTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  dirIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirCount: {
    fontSize: FontSize.xxl,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  dirName: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate800,
    marginTop: 2,
  },
  dirFoot: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    marginTop: 4,
  },
  financeCard: {
    marginBottom: Spacing.sm,
  },
});
