import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { DouCard } from '../../components/DouCard';

export default function AdminDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user, logout: authLogout } = useAuthStore();
  const { activeKekes, tripsToday, revenueToday, pendingBankApprovals, pendingReports, pendingLostItems, drivers, students, isLoading, fetchAnalytics } = useAdminStore();

  useEffect(() => { fetchAnalytics(user?.token); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Student Affairs</Text><Text style={styles.name}>{user?.fullName?.split(' ')[0] ?? 'Admin'}</Text></View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statValue}>{activeKekes}</Text><Text style={styles.statLabel}>Active Kekes</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{tripsToday}</Text><Text style={styles.statLabel}>Trips Today</Text></View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statValue}>₦{revenueToday.toFixed(0)}</Text><Text style={styles.statLabel}>Revenue Today</Text></View>
          <View style={[styles.statCard, pendingBankApprovals > 0 && { backgroundColor: Colors.warning + '20', borderColor: Colors.warning }]}><Text style={styles.statValue}>{pendingBankApprovals}</Text><Text style={styles.statLabel}>Bank Approvals</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Pending Actions</Text>
        <DouCard padding={16} onPress={() => navigation.navigate(Routes.adminReports)}><View style={styles.menuRow}><Text style={styles.menuIcon}>⚠️</Text><View style={{ flex: 1 }}><Text style={styles.menuTitle}>Incident Reports</Text><Text style={styles.menuSub}>{pendingReports} pending</Text></View><Text>›</Text></View></DouCard>
        <DouCard padding={16} onPress={() => navigation.navigate(Routes.adminLostItems)}><View style={styles.menuRow}><Text style={styles.menuIcon}>🔍</Text><View style={{ flex: 1 }}><Text style={styles.menuTitle}>Lost & Found Claims</Text><Text style={styles.menuSub}>{pendingLostItems} pending</Text></View><Text>›</Text></View></DouCard>
        <DouCard padding={16} onPress={() => navigation.navigate(Routes.adminLostItemTrigger)}><View style={styles.menuRow}><Text style={styles.menuIcon}>➕</Text><View style={{ flex: 1 }}><Text style={styles.menuTitle}>Trigger Claim for Student</Text><Text style={styles.menuSub}>Phone-less student walk-in</Text></View><Text>›</Text></View></DouCard>
        <DouCard padding={16} onPress={() => navigation.navigate(Routes.adminEmergencies)}><View style={styles.menuRow}><Text style={styles.menuIcon}>🚨</Text><View style={{ flex: 1 }}><Text style={styles.menuTitle}>Emergency Incidents</Text><Text style={styles.menuSub}>View live tracking</Text></View><Text>›</Text></View></DouCard>

        <Text style={styles.sectionTitle}>Directory</Text>
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.dirCard} onPress={() => navigation.navigate(Routes.adminDrivers)}><Text style={{ fontSize: 32 }}>🚗</Text><Text style={styles.dirLabel}>Drivers</Text><Text style={styles.dirCount}>{drivers.length}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.dirCard} onPress={() => navigation.navigate(Routes.adminStudents)}><Text style={{ fontSize: 32 }}>🎓</Text><Text style={styles.dirLabel}>Students</Text><Text style={styles.dirCount}>{students.length}</Text></TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Finance</Text>
        <DouCard padding={16} onPress={() => navigation.navigate(Routes.adminWallet)}><View style={styles.menuRow}><Text style={styles.menuIcon}>💳</Text><View style={{ flex: 1 }}><Text style={styles.menuTitle}>Wallet Adjustment</Text><Text style={styles.menuSub}>{pendingBankApprovals} bank changes pending</Text></View><Text>›</Text></View></DouCard>

        <TouchableOpacity style={styles.logoutBtn} onPress={() => { authLogout(); navigation.reset({ index: 0, routes: [{ name: Routes.roleSelection }] }); }}><Text style={styles.logoutText}>Logout</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 2, borderBottomColor: Colors.black },
  title: { fontSize: FontSize.xl, fontWeight: 'bold' },
  name: { fontSize: FontSize.sm, color: Colors.grey },
  content: { padding: Spacing.lg },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statCard: { flex: 1, borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 16, ...Shadows.sm },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: FontSize.sm, color: Colors.grey, marginTop: 4 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: 'bold', marginTop: 16, marginBottom: 12 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: { fontSize: 24 },
  menuTitle: { fontWeight: 'bold', fontSize: FontSize.md },
  menuSub: { fontSize: FontSize.sm, color: Colors.grey },
  dirCard: { flex: 1, borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 20, alignItems: 'center', ...Shadows.sm },
  dirLabel: { fontWeight: 'bold', marginTop: 8 },
  dirCount: { fontSize: FontSize.sm, color: Colors.grey },
  logoutBtn: { borderWidth: 2, borderColor: Colors.error, borderRadius: BorderRadius.sm, padding: 14, alignItems: 'center', marginTop: 24 },
  logoutText: { color: Colors.error, fontWeight: 'bold' },
});
