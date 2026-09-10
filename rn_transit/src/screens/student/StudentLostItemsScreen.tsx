import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Search,
  Plus,
  ChevronLeft,
  Package,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Car,
  MapPin,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { useLostItemStore } from '../../stores/lostItemStore';
import { DouCard } from '../../components/DouCard';

export default function StudentLostItemsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { myItems, isLoading, fetchMyItems } = useLostItemStore();
  const [filter, setFilter] = useState<'all' | 'pending' | 'ready'>('all');

  useEffect(() => {
    fetchMyItems(user?.token);
  }, [fetchMyItems, user?.token]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'dropped_off':
        return {
          label: 'AT STUDENT AFFAIRS (READY FOR COLLECTION)',
          color: Colors.successDark,
          bg: Colors.successSoft,
          icon: Building2,
        };
      case 'collected':
        return {
          label: 'COLLECTED & CLOSED',
          color: Colors.slate600,
          bg: Colors.slate100,
          icon: CheckCircle2,
        };
      case 'acknowledged':
        return {
          label: 'DRIVER FLAGGED (RETURNING)',
          color: Colors.info,
          bg: Colors.infoSoft,
          icon: Car,
        };
      case 'reported':
      default:
        return {
          label: 'REPORTED TO DRIVER',
          color: Colors.warningDark,
          bg: Colors.warningSoft,
          icon: Clock,
        };
    }
  };

  const filteredItems = myItems.filter((item) => {
    if (filter === 'pending') return item.status === 'reported' || item.status === 'acknowledged';
    if (filter === 'ready') return item.status === 'dropped_off';
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <ChevronLeft size={22} color={Colors.slate900} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Lost & Found Hub</Text>
          <Text style={styles.headerSub}>Dennis Osadebay University</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate(Routes.studentLostItem)}
          style={styles.addBtn}
          activeOpacity={0.8}
        >
          <Plus size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Info Notice Card */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        <View style={styles.infoBanner}>
          <Building2 size={20} color={Colors.primaryAccent} strokeWidth={2.5} style={{ marginRight: 10 }} />
          <Text style={styles.infoBannerText}>
            Drivers drop recovered items directly at the <Text style={{ fontWeight: '800' }}>Student Affairs Office</Text>. Show your student ID card to collect.
          </Text>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {[
            { id: 'all', label: 'All Items' },
            { id: 'pending', label: 'In Transit' },
            { id: 'ready', label: 'Ready for Collection' },
          ].map((tab) => {
            const isSelected = filter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => setFilter(tab.id as any)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading && myItems.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.slate900} />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchMyItems(user?.token)} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Package size={44} color={Colors.slate400} strokeWidth={1.8} />
              </View>
              <Text style={styles.emptyTitle}>No Lost Items Tracked</Text>
              <Text style={styles.emptySub}>
                Forgot a phone, bag, or keys in a Keke? Tap the '+' button above to report it.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const badge = getStatusBadge(item.status ?? 'reported');
            const BadgeIcon = badge.icon;
            return (
              <DouCard variant="default" style={styles.itemCard}>
                <View style={styles.cardHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <BadgeIcon size={12} color={badge.color} strokeWidth={2.5} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                  <Text style={styles.categoryPill}>{item.category || 'Item'}</Text>
                </View>

                <Text style={styles.itemDesc}>{item.description}</Text>

                <View style={styles.itemFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Car size={14} color={Colors.slate500} strokeWidth={2} style={{ marginRight: 4 }} />
                    <Text style={styles.metaText}>
                      Keke #{item.fleetNumber || '042'} • {item.driverName || 'Sunday Azuka'}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>
                    {item.createdAt ? item.createdAt.substring(0, 10) : 'Recent'}
                  </Text>
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
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.slate900,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySoft,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.primaryAccent + '25',
    marginBottom: Spacing.md,
  },
  infoBannerText: {
    fontSize: FontSize.xs,
    color: Colors.slate700,
    lineHeight: 18,
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xs,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
  },
  filterPillActive: {
    backgroundColor: Colors.slate900,
  },
  filterPillText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate600,
  },
  filterPillTextActive: {
    color: Colors.white,
  },
  list: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: 10,
  },
  itemCard: {
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  categoryPill: {
    fontSize: FontSize.xxs,
    fontWeight: '700',
    color: Colors.slate500,
    backgroundColor: Colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  itemDesc: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.slate900,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    paddingTop: Spacing.sm,
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.slate500,
    fontWeight: '600',
  },
  dateText: {
    fontSize: FontSize.xxs,
    color: Colors.slate400,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.slate800,
  },
  emptySub: {
    fontSize: FontSize.xs,
    color: Colors.slate500,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
