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
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Car,
  User,
  AlertTriangle,
  FileText,
  Check,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { DouCard } from '../../components/DouCard';

export default function IncidentLogScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { reports, isLoading, fetchReports, resolveReport } = useAdminStore();
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports(user?.token);
  }, []);

  const handleResolve = async (id: string, incidentType: string) => {
    Alert.alert(
      'Resolve Disciplinary Report?',
      `Mark "${incidentType}" as resolved after Student Affairs hearing?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Resolved',
          onPress: async () => {
            setResolvingId(id);
            const ok = await resolveReport(id, user?.token);
            setResolvingId(null);
            if (ok) {
              Alert.alert('Report Resolved', 'Disciplinary record updated.');
            }
          },
        },
      ]
    );
  };

  const filtered = reports.filter((r) => {
    if (filter === 'pending') return r.status !== 'resolved';
    if (filter === 'resolved') return r.status === 'resolved';
    return true;
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
          <Text style={styles.headerTitle}>Incident & Disciplinary Logs</Text>
          <Text style={styles.headerSubtitle}>
            Student Affairs safety & misconduct reports
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabSection}>
        <TouchableOpacity
          style={[styles.tabButton, filter === 'all' && styles.tabButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>
            All Logs ({reports.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, filter === 'pending' && styles.tabButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.tabText, filter === 'pending' && styles.tabTextActive]}>
            Pending Review
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, filter === 'resolved' && styles.tabButtonActive]}
          onPress={() => setFilter('resolved')}
        >
          <Text style={[styles.tabText, filter === 'resolved' && styles.tabTextActive]}>
            Resolved
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching incident reports...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CheckCircle2 size={48} color={Colors.success} />
              <Text style={styles.emptyTitle}>No Incidents Found</Text>
              <Text style={styles.emptySub}>
                {filter === 'pending'
                  ? 'All student and driver incident reports are cleared!'
                  : 'Zero violations logged on campus.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isResolved = item.status === 'resolved';
            const incidentType = item.incidentType || item.offense || 'General Misconduct';
            const isUrgent =
              incidentType.toLowerCase().includes('reckless') ||
              incidentType.toLowerCase().includes('overload');

            return (
              <DouCard
                variant={isResolved ? 'flat' : 'elevated'}
                padding={Spacing.md}
                style={[
                  styles.card,
                  !isResolved && isUrgent && { borderColor: Colors.error + '50', borderWidth: 1 },
                ]}
              >
                {/* Header Row */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.badgeGroup}>
                    <View
                      style={[
                        styles.typeBadge,
                        {
                          backgroundColor: isUrgent
                            ? Colors.error + '15'
                            : Colors.warning + '15',
                        },
                      ]}
                    >
                      <AlertTriangle
                        size={12}
                        color={isUrgent ? Colors.error : Colors.warning}
                      />
                      <Text
                        style={[
                          styles.typeBadgeText,
                          { color: isUrgent ? Colors.error : Colors.warning },
                        ]}
                      >
                        {incidentType.toUpperCase()}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isResolved ? Colors.success + '15' : Colors.slate200,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: isResolved ? Colors.success : Colors.slate700 },
                        ]}
                      >
                        {isResolved ? 'RESOLVED' : 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.dateText}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Today'}
                  </Text>
                </View>

                {/* Description */}
                <Text style={styles.descriptionText}>
                  "{item.description || 'Driver carried 5 passengers and charged ₦300 instead of ₦100 official campus rate.'}"
                </Text>

                {/* Metadata Row */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <User size={12} color={Colors.slate500} />
                    <Text style={styles.metaLabel}>Reported by:</Text>
                    <Text style={styles.metaValue}>{item.reporterName || 'Anonymous Student'}</Text>
                  </View>

                  {item.targetName && (
                    <View style={styles.metaItem}>
                      <Car size={12} color={Colors.slate500} />
                      <Text style={styles.metaLabel}>Accused:</Text>
                      <Text style={[styles.metaValue, { color: Colors.primary }]}>
                        {item.targetName}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                {!isResolved && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.resolveButton}
                      onPress={() => handleResolve(item.id, incidentType)}
                      disabled={resolvingId === item.id}
                      activeOpacity={0.8}
                    >
                      {resolvingId === item.id ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <>
                          <Check size={14} color={Colors.white} />
                          <Text style={styles.resolveButtonText}>Mark Resolved</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
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
  card: {
    marginBottom: Spacing.xs,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  typeBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  dateText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate400,
  },
  descriptionText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate800,
    lineHeight: 20,
    fontStyle: 'italic',
    marginVertical: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
  },
  metaValue: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.sm,
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.success,
  },
  resolveButtonText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
});
