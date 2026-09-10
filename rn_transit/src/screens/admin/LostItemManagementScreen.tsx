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
  Package,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Car,
  User,
  Search,
  Building,
  Check,
  PlusCircle,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { DouCard } from '../../components/DouCard';

export default function LostItemManagementScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { lostItems, isLoading, fetchLostItems, closeLostItem } = useAdminStore();
  const [filterTab, setFilterTab] = useState<'all' | 'office' | 'pending' | 'collected'>('all');
  const [closingId, setClosingId] = useState<string | null>(null);

  useEffect(() => {
    fetchLostItems(user?.token);
  }, []);

  const handleMarkCollected = (id: string, description: string) => {
    Alert.alert(
      'Confirm Item Handover',
      `Has the student verified ownership and collected "${description}" at the Student Affairs desk?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Handover',
          onPress: async () => {
            setClosingId(id);
            const ok = await closeLostItem(id, user?.token);
            setClosingId(null);
            if (ok) {
              Alert.alert('Item Closed', 'Custody record updated to Collected.');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'dropped_off':
        return Colors.primary;
      case 'collected':
      case 'closed':
        return Colors.success;
      case 'acknowledged':
        return Colors.secondary;
      case 'reported':
      default:
        return Colors.warning;
    }
  };

  const filtered = lostItems.filter((item) => {
    if (filterTab === 'office') return item.status === 'dropped_off';
    if (filterTab === 'pending') return item.status === 'reported' || item.status === 'acknowledged';
    if (filterTab === 'collected') return item.status === 'collected' || item.status === 'closed';
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
          <Text style={styles.headerTitle}>Lost & Found Custody</Text>
          <Text style={styles.headerSubtitle}>
            Student Affairs physical item repository
          </Text>
        </View>

        <TouchableOpacity
          style={styles.walkInBtn}
          onPress={() => navigation.navigate(Routes.adminLostItemTrigger)}
        >
          <PlusCircle size={16} color={Colors.primary} />
          <Text style={styles.walkInBtnText}>Walk-in</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabSection}>
        <TouchableOpacity
          style={[styles.tabButton, filterTab === 'all' && styles.tabButtonActive]}
          onPress={() => setFilterTab('all')}
        >
          <Text style={[styles.tabText, filterTab === 'all' && styles.tabTextActive]}>
            All ({lostItems.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, filterTab === 'office' && styles.tabButtonActive]}
          onPress={() => setFilterTab('office')}
        >
          <Text style={[styles.tabText, filterTab === 'office' && styles.tabTextActive]}>
            At Office
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, filterTab === 'pending' && styles.tabButtonActive]}
          onPress={() => setFilterTab('pending')}
        >
          <Text style={[styles.tabText, filterTab === 'pending' && styles.tabTextActive]}>
            In Transit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, filterTab === 'collected' && styles.tabButtonActive]}
          onPress={() => setFilterTab('collected')}
        >
          <Text style={[styles.tabText, filterTab === 'collected' && styles.tabTextActive]}>
            Collected
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading lost & found catalog...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package size={48} color={Colors.slate300} />
              <Text style={styles.emptyTitle}>No Items in this Category</Text>
              <Text style={styles.emptySub}>
                All physical lost items have been claimed and processed.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const status = item.status ?? 'reported';
            const statusColor = getStatusColor(status);
            const isAtOffice = status === 'dropped_off';
            const isClosed = status === 'collected' || status === 'closed';

            return (
              <DouCard
                variant={isAtOffice ? 'accent' : 'elevated'}
                padding={Spacing.md}
                style={styles.card}
              >
                {/* Status & Category */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.badgeGroup}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusColor + '15' },
                      ]}
                    >
                      <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                        {status.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.catBadge}>
                      <Text style={styles.catBadgeText}>{item.category || 'Item'}</Text>
                    </View>
                  </View>

                  <Text style={styles.dateText}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                  </Text>
                </View>

                {/* Description */}
                <Text style={styles.descriptionText}>
                  {item.description ?? item.itemDescription ?? 'Student lost personal possession in transit.'}
                </Text>

                {/* Custody Chain */}
                <View style={styles.custodyChain}>
                  <View style={styles.custodyItem}>
                    <User size={13} color={Colors.slate500} />
                    <Text style={styles.custodyLabel}>Owner:</Text>
                    <Text style={styles.custodyValue}>
                      {item.studentName || item.studentMatric || 'Student'}
                    </Text>
                  </View>

                  {item.driverName && (
                    <View style={styles.custodyItem}>
                      <Car size={13} color={Colors.slate500} />
                      <Text style={styles.custodyLabel}>Found by:</Text>
                      <Text style={[styles.custodyValue, { color: Colors.primary }]}>
                        {item.driverName} {item.driverFleetNumber ? `(#${item.driverFleetNumber})` : ''}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Handover Action */}
                {!isClosed && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.handoverButton}
                      onPress={() =>
                        handleMarkCollected(
                          item.id,
                          item.description ?? item.itemDescription ?? 'Lost item'
                        )
                      }
                      disabled={closingId === item.id}
                      activeOpacity={0.8}
                    >
                      {closingId === item.id ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <>
                          <Check size={14} color={Colors.white} />
                          <Text style={styles.handoverButtonText}>
                            Confirm Handover to Student
                          </Text>
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
  walkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '12',
  },
  walkInBtnText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  catBadge: {
    backgroundColor: Colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  catBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate600,
  },
  dateText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate400,
  },
  descriptionText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate900,
    lineHeight: 20,
    marginVertical: Spacing.xs,
  },
  custodyChain: {
    gap: 4,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  custodyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  custodyLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
  },
  custodyValue: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate800,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.sm,
  },
  handoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.success,
  },
  handoverButtonText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
});
