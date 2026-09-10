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
  Users,
  Search,
  ArrowLeft,
  Filter,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  Building,
  GraduationCap,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { DouCard } from '../../components/DouCard';

export default function StudentDirectoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { students, isLoading, fetchStudents } = useAdminStore();
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'suspended'>('all');

  useEffect(() => {
    fetchStudents(user?.token);
  }, []);

  const filtered = students.filter((s) => {
    const name = (s.name ?? '').toLowerCase();
    const matric = (s.matricNumber ?? '').toLowerCase();
    const dept = (s.department ?? '').toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = !q || name.includes(q) || matric.includes(q) || dept.includes(q);

    if (filterActive === 'all') return matchesSearch;
    if (filterActive === 'suspended') return matchesSearch && (s as any).isSuspended;
    return matchesSearch && !(s as any).isSuspended;
  });

  const getInitials = (name?: string) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceLight} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.slate800} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Student Registry</Text>
          <Text style={styles.headerSubtitle}>
            {students.length} matriculated students enrolled
          </Text>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputWrap}>
          <Search size={18} color={Colors.slate400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, matric (e.g. DOU/2021/...)"
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
            style={[styles.filterPill, filterActive === 'all' && styles.filterPillActive]}
            onPress={() => setFilterActive('all')}
          >
            <Text style={[styles.filterPillText, filterActive === 'all' && styles.filterPillTextActive]}>
              All ({students.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterActive === 'active' && styles.filterPillActive]}
            onPress={() => setFilterActive('active')}
          >
            <Text style={[styles.filterPillText, filterActive === 'active' && styles.filterPillTextActive]}>
              Active
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterActive === 'suspended' && styles.filterPillActive]}
            onPress={() => setFilterActive('suspended')}
          >
            <Text style={[styles.filterPillText, filterActive === 'suspended' && styles.filterPillTextActive]}>
              Flagged / Suspended
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Student List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading student records...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={48} color={Colors.slate300} />
              <Text style={styles.emptyTitle}>No Students Found</Text>
              <Text style={styles.emptySub}>
                {search ? `No results match "${search}"` : 'Student registry is currently empty'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSuspended = (item as any).isSuspended;
            return (
              <DouCard variant="elevated" padding={Spacing.md} style={styles.studentCard}>
                <View style={styles.studentTopRow}>
                  {/* Avatar */}
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                  </View>

                  {/* Info */}
                  <View style={styles.studentInfo}>
                    <View style={styles.nameBadgeRow}>
                      <Text style={styles.studentName}>{item.name}</Text>
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
                          {isSuspended ? 'SUSPENDED' : 'ENROLLED'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.studentMatric}>{item.matricNumber || 'Pending Matric'}</Text>

                    <View style={styles.deptRow}>
                      <GraduationCap size={13} color={Colors.slate500} />
                      <Text style={styles.deptText}>{item.department || 'Faculty of Science'}</Text>
                    </View>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.cardDivider} />

                {/* Card Actions */}
                <View style={styles.cardBottomRow}>
                  <View style={styles.balanceTag}>
                    <Text style={styles.balanceLabel}>Wallet</Text>
                    <Text style={styles.balanceValue}>₦{(item as any).walletBalance?.toLocaleString() ?? '0.00'}</Text>
                  </View>

                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => {
                        navigation.navigate(Routes.adminWallet, { studentMatric: item.matricNumber, studentId: item.id });
                      }}
                      activeOpacity={0.8}
                    >
                      <CreditCard size={14} color={Colors.primary} />
                      <Text style={styles.adjustButtonText}>Audit Balance</Text>
                    </TouchableOpacity>
                  </View>
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
  studentCard: {
    marginBottom: Spacing.xs,
  },
  studentTopRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.secondary,
  },
  studentInfo: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentName: {
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
  studentMatric: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    marginTop: 1,
  },
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  deptText: {
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
  balanceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
  },
  balanceValue: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '12',
  },
  adjustButtonText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
});
