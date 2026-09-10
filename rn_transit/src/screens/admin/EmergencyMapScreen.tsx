import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertTriangle,
  ArrowLeft,
  Phone,
  Car,
  Clock,
  MapPin,
  HeartPulse,
  Building2,
  Shield,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { DouCard } from '../../components/DouCard';

export default function EmergencyMapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { emergencies, isLoading, fetchEmergencies } = useAdminStore();
  const [activeTab, setActiveTab] = useState<'active' | 'resolved'>('active');

  useEffect(() => {
    fetchEmergencies(user?.token);
    const interval = setInterval(() => {
      fetchEmergencies(user?.token);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCall = (phoneNumber?: string, name?: string) => {
    if (!phoneNumber) {
      Alert.alert('Phone Not Available', `No contact number on file for ${name || 'user'}.`);
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Unable to place call', `Please dial ${phoneNumber} manually.`);
    });
  };

  const filtered = emergencies.filter((e) => {
    const isCrisis = e.status === 'active' || e.status === 'en_route';
    return activeTab === 'active' ? isCrisis : !isCrisis;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.error} />

      {/* Emergency Radar Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Medical Emergency Radar</Text>
            <Text style={styles.headerSubtitle}>
              Live SOS Tracking • DOU Health Services
            </Text>
          </View>
          <View style={styles.pulseDot} />
        </View>

        {/* Clinic Destination Banner */}
        <View style={styles.clinicBanner}>
          <Building2 size={16} color={Colors.white} />
          <Text style={styles.clinicText}>
            Converging to: <Text style={styles.clinicName}>DOU Medical Center (ETF Hall)</Text>
          </Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabSection}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active SOS Emergencies ({emergencies.filter((e) => e.status === 'active' || e.status === 'en_route').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'resolved' && styles.tabButtonActive]}
          onPress={() => setActiveTab('resolved')}
        >
          <Text style={[styles.tabText, activeTab === 'resolved' && styles.tabTextActive]}>
            Resolved
          </Text>
        </TouchableOpacity>
      </View>

      {/* Emergency Incidents List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.error} />
          <Text style={styles.loadingText}>Connecting to campus emergency grid...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CheckCircle2 size={54} color={Colors.success} />
              <Text style={styles.emptyTitle}>Campus Medical Status: All Clear</Text>
              <Text style={styles.emptySub}>
                {activeTab === 'active'
                  ? 'No active SOS alerts. Student emergency network standing by.'
                  : 'No previous emergency records found.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isActive = item.status === 'active' || item.status === 'en_route';

            return (
              <DouCard
                variant="elevated"
                padding={Spacing.md}
                style={[
                  styles.crisisCard,
                  isActive && { borderColor: Colors.error, borderWidth: 1.5 },
                ]}
              >
                {/* Top Badge Row */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.crisisBadge}>
                    <HeartPulse size={14} color={Colors.white} />
                    <Text style={styles.crisisBadgeText}>
                      {(item.status ?? 'ACTIVE SOS').replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.timeTag}>
                    <Clock size={12} color={Colors.slate500} />
                    <Text style={styles.timeText}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </Text>
                  </View>
                </View>

                {/* Patient Student Info */}
                <View style={styles.studentInfoBox}>
                  <Text style={styles.studentName}>{item.studentName || 'Anonymous Student'}</Text>
                  <Text style={styles.studentMatric}>
                    Matric: {item.studentMatric || 'DOU/2022/MED/0912'}
                  </Text>
                  <View style={styles.locationRow}>
                    <MapPin size={13} color={Colors.error} />
                    <Text style={styles.locationText}>
                      Pickup: {item.pickupLocation || 'Faculty of Law Walkway'}
                    </Text>
                  </View>
                </View>

                {/* Assigned Keke Escort */}
                <View style={styles.escortBox}>
                  <View style={styles.escortHeader}>
                    <Car size={14} color={Colors.primary} />
                    <Text style={styles.escortTitle}>Emergency Transit Unit</Text>
                  </View>
                  <Text style={styles.driverDetail}>
                    {item.driverName ? `${item.driverName} (Fleet #${item.driverFleetNumber || '042'})` : 'Dispatching Nearest Idle Keke Operator...'}
                  </Text>
                </View>

                {/* Rapid Action Buttons */}
                <View style={styles.actionGrid}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.error }]}
                    onPress={() => handleCall(item.studentPhone, item.studentName)}
                    activeOpacity={0.8}
                  >
                    <Phone size={14} color={Colors.white} />
                    <Text style={styles.actionBtnText}>Call Student</Text>
                  </TouchableOpacity>

                  {item.driverPhone && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
                      onPress={() => handleCall(item.driverPhone, item.driverName)}
                      activeOpacity={0.8}
                    >
                      <Phone size={14} color={Colors.white} />
                      <Text style={styles.actionBtnText}>Call Driver</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.slate800 }]}
                    onPress={() => handleCall('08030000DOU', 'Campus Medical Clinic')}
                    activeOpacity={0.8}
                  >
                    <Building2 size={14} color={Colors.white} />
                    <Text style={styles.actionBtnText}>Alert Clinic</Text>
                  </TouchableOpacity>
                </View>
              </DouCard>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
  },
  header: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.8)',
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.error,
  },
  clinicBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  clinicText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.white,
  },
  clinicName: {
    fontFamily: 'Inter_700Bold',
  },
  tabSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
  },
  tabButtonActive: {
    backgroundColor: Colors.error,
  },
  tabText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate600,
  },
  tabTextActive: {
    color: Colors.white,
    fontFamily: 'Inter_600SemiBold',
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate500,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.xs,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate700,
    marginTop: Spacing.sm,
  },
  emptySub: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate400,
    textAlign: 'center',
  },
  crisisCard: {
    marginBottom: Spacing.xs,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  crisisBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.error,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  crisisBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate500,
  },
  studentInfoBox: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  studentName: {
    fontSize: FontSize.base,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  studentMatric: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate600,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.error,
  },
  escortBox: {
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.md,
    padding: 10,
    marginBottom: Spacing.sm,
  },
  escortHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  escortTitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate800,
  },
  driverDetail: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.primary,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
  },
  actionBtnText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
});
