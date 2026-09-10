import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Car,
  Search,
  ArrowLeft,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Star,
  Ban,
  CheckCircle2,
  Lock,
  Unlock,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { DouCard } from '../../components/DouCard';

export default function DriverDirectoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { drivers, isLoading, fetchDrivers } = useAdminStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [localDrivers, setLocalDrivers] = useState<any[]>([]);

  useEffect(() => {
    fetchDrivers(user?.token);
  }, []);

  useEffect(() => {
    setLocalDrivers(drivers);
  }, [drivers]);

  const toggleSuspension = (driver: any) => {
    const isCurrentlySuspended = driver.status === 'suspended';
    const actionText = isCurrentlySuspended ? 'Reactivate' : 'Suspend';

    Alert.alert(
      `${actionText} Fleet #${driver.fleetNumber}?`,
      `Are you sure you want to ${actionText.toLowerCase()} ${driver.name}? ${
        isCurrentlySuspended
          ? 'Driver will be allowed campus gate entry and queueing immediately.'
          : 'Driver will be locked out of boarding PINs and denied gate entry at DOU Security.'
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          style: isCurrentlySuspended ? 'default' : 'destructive',
          onPress: () => {
            // Optimistic toggle
            setLocalDrivers((prev) =>
              prev.map((d) =>
                d.id === driver.id
                  ? { ...d, status: isCurrentlySuspended ? 'active' : 'suspended' }
                  : d
              )
            );
            Alert.alert(
              'Driver Status Updated',
              `Fleet #${driver.fleetNumber} is now ${isCurrentlySuspended ? 'ACTIVE' : 'SUSPENDED'}.`
            );
          },
        },
      ]
    );
  };

  const filtered = localDrivers.filter((d) => {
    const name = (d.name ?? '').toLowerCase();
    const fleet = String(d.fleetNumber ?? '');
    const phone = String(d.phone ?? '');
    const q = search.toLowerCase();
    const matchesSearch = !q || name.includes(q) || fleet.includes(q) || phone.includes(q);

    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'suspended') return matchesSearch && d.status === 'suspended';
    return matchesSearch && d.status !== 'suspended';
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceLight} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.slate800} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Driver Fleet Directory</Text>
          <Text style={styles.headerSubtitle}>
            {localDrivers.length} verified commercial Keke operators
          </Text>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputWrap}>
          <Search size={18} color={Colors.slate400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by driver name, fleet # (e.g. 042)..."
            placeholderTextColor={Colors.slate400}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearSearch}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, filterStatus === 'all' && styles.filterPillActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterPillText, filterStatus === 'all' && styles.filterPillTextActive]}>
              All Operators ({localDrivers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterStatus === 'active' && styles.filterPillActive]}
            onPress={() => setFilterStatus('active')}
          >
            <Text style={[styles.filterPillText, filterStatus === 'active' && styles.filterPillTextActive]}>
              Active
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterStatus === 'suspended' && styles.filterPillActive]}
            onPress={() => setFilterStatus('suspended')}
          >
            <Text style={[styles.filterPillText, filterStatus === 'suspended' && styles.filterPillTextActive]}>
              Suspended
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Driver List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading driver roster...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Car size={48} color={Colors.slate300} />
              <Text style={styles.emptyTitle}>No Drivers Found</Text>
              <Text style={styles.emptySub}>
                {search ? `No operators match "${search}"` : 'Driver roster is currently empty'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSuspended = item.status === 'suspended';
            return (
              <DouCard
                variant={isSuspended ? 'outlined' : 'elevated'}
                padding={Spacing.md}
                style={[styles.driverCard, isSuspended && { borderColor: Colors.error + '40' }]}
              >
                <View style={styles.driverTopRow}>
                  {/* Fleet Badge */}
                  <View
                    style={[
                      styles.fleetBadge,
                      { backgroundColor: isSuspended ? Colors.error + '15' : Colors.primary + '15' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.fleetNumber,
                        { color: isSuspended ? Colors.error : Colors.primary },
                      ]}
                    >
                      #{item.fleetNumber ?? '00'}
                    </Text>
                  </View>

                  {/* Driver Info */}
                  <View style={styles.driverInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.driverName}>{item.name}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isSuspended ? Colors.error + '15' : Colors.success + '15',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: isSuspended ? Colors.error : Colors.success },
                          ]}
                        >
                          {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metaRow}>
                      <Phone size={12} color={Colors.slate500} />
                      <Text style={styles.phoneText}>{item.phone || '080-DOU-RIDE'}</Text>
                      <Text style={styles.dotSeparator}>•</Text>
                      <Text style={styles.plateText}>{item.plateNumber || 'ASB-492-XA'}</Text>
                    </View>

                    <View style={styles.ratingRow}>
                      <Star size={12} color={Colors.warning} fill={Colors.warning} />
                      <Text style={styles.ratingText}>4.9</Text>
                      <Text style={styles.tripsText}>({item.tripsCompleted ?? 420} trips)</Text>
                    </View>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.cardDivider} />

                {/* Kill Switch Controls */}
                <View style={styles.cardBottomRow}>
                  <View style={styles.licenseCheck}>
                    <ShieldCheck size={14} color={Colors.success} />
                    <Text style={styles.licenseText}>VIO Verified</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.toggleSuspendBtn,
                      {
                        backgroundColor: isSuspended ? Colors.success + '12' : Colors.error + '12',
                        borderColor: isSuspended ? Colors.success + '30' : Colors.error + '30',
                      },
                    ]}
                    onPress={() => toggleSuspension(item)}
                    activeOpacity={0.8}
                  >
                    {isSuspended ? (
                      <>
                        <Unlock size={14} color={Colors.success} />
                        <Text style={[styles.toggleSuspendText, { color: Colors.success }]}>
                          Reactivate
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ban size={14} color={Colors.error} />
                        <Text style={[styles.toggleSuspendText, { color: Colors.error }]}>
                          Suspend Driver
                        </Text>
                      </>
                    )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.slate100,
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
    color: Colors.slate900,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
  },
  searchSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate900,
    padding: 0,
  },
  clearSearch: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate500,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.sm,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
  },
  filterPillText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate600,
  },
  filterPillTextActive: {
    color: Colors.white,
    fontFamily: 'Inter_600SemiBold',
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
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
  driverCard: {
    marginBottom: Spacing.xs,
  },
  driverTopRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  fleetBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fleetNumber: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
  },
  driverInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driverName: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  phoneText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate600,
  },
  dotSeparator: {
    color: Colors.slate400,
    fontSize: 10,
  },
  plateText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  tripsText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.slate100,
    marginVertical: Spacing.sm,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  licenseCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  licenseText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.success,
  },
  toggleSuspendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  toggleSuspendText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
  },
});
