import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Package,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  User,
  MapPin,
  Clock,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { useAuthStore } from '../../stores/authStore';
import { useLostItemStore } from '../../stores/lostItemStore';
import { DouCard } from '../../components/DouCard';

export default function DriverLostItemsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { driverItems, isLoading, fetchDriverItems, returnItem } = useLostItemStore();

  useEffect(() => {
    fetchDriverItems(user?.token);
  }, [fetchDriverItems, user?.token]);

  const handleReturn = (id: string, itemName: string) => {
    Alert.alert(
      'Confirm Handover at Student Affairs?',
      `Confirm you have physically handed ${itemName} to the officer at Student Affairs Block, Room 104?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'YES, ITEM DROPPED',
          onPress: async () => {
            await returnItem(id, user?.token);
            fetchDriverItems(user?.token);
            Alert.alert(
              'Status Cleared',
              'The student has been automatically notified that their item is ready for collection at the office.'
            );
          },
        },
      ]
    );
  };

  const pendingItems = driverItems.filter((i) => i.status === 'reported');

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <ChevronLeft size={22} color={Colors.slate900} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Lost & Found Handover</Text>
          <Text style={styles.headerSub}>Items left behind in Keke #{(user as any)?.fleetNumber || '042'}</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        {/* Notice Banner */}
        {pendingItems.length > 0 ? (
          <View style={styles.warningBanner}>
            <AlertTriangle size={20} color={Colors.warningDark} strokeWidth={2.5} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningBannerTitle}>Pending Item Returns ({pendingItems.length})</Text>
              <Text style={styles.warningBannerSub}>
                Please drop items at Student Affairs (Admin Block) before your shift ends to maintain good standing.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.clearBanner}>
            <CheckCircle2 size={18} color={Colors.successDark} strokeWidth={2.5} style={{ marginRight: 8 }} />
            <Text style={styles.clearBannerText}>All clear: No reported lost items pending return.</Text>
          </View>
        )}

        <Text style={styles.sectionHeader}>REPORTED ITEMS LIST</Text>

        {isLoading && driverItems.length === 0 ? (
          <ActivityIndicator color={Colors.slate900} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={driverItems}
            keyExtractor={(_, i) => String(i)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchDriverItems(user?.token)} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <CheckCircle2 size={44} color={Colors.success} strokeWidth={2} />
                </View>
                <Text style={styles.emptyTitle}>No Lost Items on Record</Text>
                <Text style={styles.emptySub}>
                  No passengers have reported forgotten belongings on your recent trips.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isDropped = item.status === 'dropped_off' || item.status === 'collected';
              return (
                <DouCard variant={isDropped ? 'default' : 'elevated'} style={styles.itemCard}>
                  <View style={styles.cardTopRow}>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: isDropped ? Colors.successSoft : Colors.warningSoft },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: isDropped ? Colors.successDark : Colors.warningDark },
                        ]}
                      >
                        {isDropped ? 'DROPPED AT STUDENT AFFAIRS' : 'PENDING RETURN'}
                      </Text>
                    </View>

                    <Text style={styles.categoryBadge}>{item.category || 'Belonging'}</Text>
                  </View>

                  <Text style={styles.itemDescription}>{item.description}</Text>

                  <View style={styles.studentInfoBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <User size={14} color={Colors.slate600} strokeWidth={2} style={{ marginRight: 6 }} />
                      <Text style={styles.studentName}>
                        {item.studentName || 'Student'} ({item.matricNumber || 'DOU/2024/...'})
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <MapPin size={14} color={Colors.primaryAccent} strokeWidth={2} style={{ marginRight: 6 }} />
                      <Text style={styles.destName}>Trip to: {item.destinationName || 'Campus Faculty'}</Text>
                    </View>
                  </View>

                  {!isDropped ? (
                    <TouchableOpacity
                      style={styles.returnActionBtn}
                      onPress={() => handleReturn(item.id ?? '', item.description ?? 'item')}
                      activeOpacity={0.85}
                    >
                      <Building2 size={16} color={Colors.white} strokeWidth={2.5} style={{ marginRight: 6 }} />
                      <Text style={styles.returnActionText}>DROPPED OFF AT STUDENT AFFAIRS</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.droppedSuccessRow}>
                      <CheckCircle2 size={16} color={Colors.success} strokeWidth={2.5} style={{ marginRight: 6 }} />
                      <Text style={styles.droppedSuccessText}>Verified Handover Completed</Text>
                    </View>
                  )}
                </DouCard>
              );
            }}
          />
        )}
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningSoft,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.warning + '40',
    marginBottom: Spacing.md,
  },
  warningBannerTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.warningDark,
  },
  warningBannerSub: {
    fontSize: FontSize.xs,
    color: Colors.slate600,
    marginTop: 2,
    lineHeight: 16,
  },
  clearBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  clearBannerText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.successDark,
  },
  sectionHeader: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate500,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  itemCard: {
    padding: Spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  categoryBadge: {
    fontSize: FontSize.xxs,
    fontWeight: '700',
    color: Colors.slate500,
    backgroundColor: Colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  itemDescription: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.slate900,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  studentInfoBox: {
    backgroundColor: Colors.slate50,
    padding: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
    marginBottom: Spacing.md,
  },
  studentName: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate800,
  },
  destName: {
    fontSize: FontSize.xs,
    color: Colors.slate600,
  },
  returnActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  returnActionText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.xs,
    letterSpacing: 0.4,
  },
  droppedSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  droppedSuccessText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.successDark,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.successSoft,
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
  },
});
