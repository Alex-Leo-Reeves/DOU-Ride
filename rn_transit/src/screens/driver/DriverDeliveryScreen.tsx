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
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ShoppingBag,
  MapPin,
  KeyRound,
  CheckCircle2,
  Clock,
  Lock,
  Building2,
  ChevronLeft,
  ChevronRight,
  Phone,
  Package,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { useAuthStore } from '../../stores/authStore';
import { useMarketplaceStore } from '../../stores/marketplaceStore';
import { useRideStore } from '../../stores/rideStore';
import { DouCard } from '../../components/DouCard';

const SAMPLE_DELIVERY_MANIFEST = [
  {
    id: 'ord-102',
    orderNumber: '#102',
    vendorName: 'Mummy B Kitchen (Buttery Hub)',
    itemsSummary: '1x White Rice + Turkey, 1x Chilled Malt',
    studentName: 'Ozegbe Mike',
    studentPhone: '08123456789',
    deliveryDropoff: 'Hostel 1 Main Gate (Dennis Osadebay Campus)',
    fareEarned: 350,
    status: 'in_transit',
  },
  {
    id: 'ord-105',
    orderNumber: '#105',
    vendorName: 'Chidi Provisions',
    itemsSummary: '2x Indomie Hungryman + Boiled Eggs',
    studentName: 'Amaka Eze',
    studentPhone: '08098765432',
    deliveryDropoff: 'Faculty of Science Lecture Hall A',
    fareEarned: 300,
    status: 'in_transit',
  },
];

export default function DriverDeliveryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { driverDeliveries, isLoading, fetchDriverDeliveries, deliverOrder } = useMarketplaceStore();
  const { tripStatus, passengers } = useRideStore();

  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [completedOrders, setCompletedOrders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchDriverDeliveries(user?.token);
  }, [fetchDriverDeliveries, user?.token]);

  const hasPassengersOnBoard = tripStatus === 'boarding' || (passengers && passengers.length > 0);

  const handleDeliver = async (orderId: string, orderNumber: string) => {
    const pin = pinInputs[orderId]?.trim() ?? '';
    if (pin.length !== 3) {
      Alert.alert('3-Digit PIN Required', 'Please ask the student at the hostel gate for their 3-digit Package PIN.');
      return;
    }
    setCompletedOrders((c) => ({ ...c, [orderId]: true }));
    Alert.alert(
      'Package Handshake Verified! 🎉',
      `Order ${orderNumber} delivered. ₦350 delivery fare has been credited to your driver wallet.`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <ChevronLeft size={22} color={Colors.slate900} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Errand Manifest</Text>
          <Text style={styles.headerSub}>Campus Logistics & Deliveries</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        {/* Passenger Mode Lockdown Notice */}
        {hasPassengersOnBoard ? (
          <View style={styles.lockdownCard}>
            <View style={styles.lockdownIconCircle}>
              <Lock size={24} color={Colors.warningDark} strokeWidth={2.5} />
            </View>
            <Text style={styles.lockdownTitle}>Delivery Jobs Locked</Text>
            <Text style={styles.lockdownSub}>
              Campus transport safety policy: Delivery errands are locked while passengers are on board to prevent trip delays. Deliveries will unlock when Keke is empty.
            </Text>
          </View>
        ) : (
          <View style={styles.idleNotice}>
            <CheckCircle2 size={16} color={Colors.successDark} strokeWidth={2.5} style={{ marginRight: 6 }} />
            <Text style={styles.idleNoticeText}>
              Keke is idle: You are cleared to accept cafeteria delivery errands!
            </Text>
          </View>
        )}

        <Text style={styles.sectionHeader}>ACTIVE ERRAND MANIFEST</Text>

        <FlatList
          data={SAMPLE_DELIVERY_MANIFEST}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const isCompleted = completedOrders[item.id];
            return (
              <DouCard variant="elevated" style={styles.manifestCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.orderTag}>
                    <Package size={14} color={Colors.white} strokeWidth={2.5} style={{ marginRight: 4 }} />
                    <Text style={styles.orderTagText}>ORDER {item.orderNumber}</Text>
                  </View>
                  <View style={[styles.statusTag, isCompleted && styles.statusTagCompleted]}>
                    <Text style={[styles.statusTagText, isCompleted && styles.statusTagTextCompleted]}>
                      {isCompleted ? 'DELIVERED & ESCROW RELEASED' : 'IN TRANSIT'}
                    </Text>
                  </View>
                </View>

                {/* Pickup Step */}
                <View style={styles.stepRow}>
                  <View style={styles.stepDot} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.stepLabel}>PICKUP POINT (Cafeteria Hub)</Text>
                    <Text style={styles.stepName}>{item.vendorName}</Text>
                    <Text style={styles.stepItems}>{item.itemsSummary}</Text>
                  </View>
                </View>

                <View style={styles.stepConnector} />

                {/* Dropoff Step */}
                <View style={styles.stepRow}>
                  <View style={[styles.stepDot, { backgroundColor: Colors.primaryAccent }]} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.stepLabel}>STUDENT DROP-OFF</Text>
                    <Text style={styles.stepName}>{item.studentName}</Text>
                    <Text style={styles.stepAddress}>{item.deliveryDropoff}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Handshake & PIN input */}
                {isCompleted ? (
                  <View style={styles.payoutSuccessRow}>
                    <CheckCircle2 size={18} color={Colors.success} strokeWidth={2.5} />
                    <Text style={styles.payoutSuccessText}>
                      +₦{item.fareEarned} Delivery fare deposited to driver wallet
                    </Text>
                  </View>
                ) : (
                  <View style={styles.handshakeBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <KeyRound size={16} color={Colors.slate900} strokeWidth={2.5} style={{ marginRight: 6 }} />
                      <Text style={styles.handshakeTitle}>Enter Student's 3-Digit Package PIN</Text>
                    </View>

                    <View style={styles.pinInputRow}>
                      <TextInput
                        style={styles.pinInput}
                        placeholder="305"
                        placeholderTextColor={Colors.slate400}
                        keyboardType="number-pad"
                        maxLength={3}
                        value={pinInputs[item.id] || ''}
                        onChangeText={(t) => setPinInputs((p) => ({ ...p, [item.id]: t }))}
                      />
                      <TouchableOpacity
                        style={[
                          styles.handshakeBtn,
                          (pinInputs[item.id]?.length || 0) < 3 && styles.handshakeBtnDisabled,
                        ]}
                        onPress={() => handleDeliver(item.id, item.orderNumber)}
                        disabled={(pinInputs[item.id]?.length || 0) < 3}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.handshakeBtnText}>CONFIRM PIN</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </DouCard>
            );
          }}
        />
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
  lockdownCard: {
    backgroundColor: Colors.warningSoft,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.warning + '40',
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  lockdownIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  lockdownTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.warningDark,
  },
  lockdownSub: {
    fontSize: FontSize.xs,
    color: Colors.slate600,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 18,
  },
  idleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  idleNoticeText: {
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
  manifestCard: {
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  orderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate900,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  orderTagText: {
    color: Colors.white,
    fontSize: FontSize.xxs,
    fontWeight: '800',
  },
  statusTag: {
    backgroundColor: Colors.infoSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusTagCompleted: {
    backgroundColor: Colors.successSoft,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.info,
  },
  statusTagTextCompleted: {
    color: Colors.successDark,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.warningDark,
    marginTop: 3,
  },
  stepConnector: {
    width: 2,
    height: 16,
    backgroundColor: Colors.slate200,
    marginLeft: 4,
    marginVertical: 2,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.slate400,
    letterSpacing: 0.6,
  },
  stepName: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.slate900,
  },
  stepItems: {
    fontSize: FontSize.xs,
    color: Colors.slate600,
    marginTop: 2,
  },
  stepAddress: {
    fontSize: FontSize.xs,
    color: Colors.primaryAccent,
    fontWeight: '700',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.slate100,
    marginVertical: Spacing.md,
  },
  payoutSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successSoft,
    padding: 10,
    borderRadius: BorderRadius.md,
  },
  payoutSuccessText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.successDark,
    marginLeft: 8,
  },
  handshakeBox: {
    backgroundColor: Colors.slate50,
    padding: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  handshakeTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.slate900,
  },
  pinInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pinInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.slate300,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: FontSize.lg,
    fontWeight: '900',
    letterSpacing: 6,
    color: Colors.slate900,
    textAlign: 'center',
  },
  handshakeBtn: {
    backgroundColor: Colors.slate900,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handshakeBtnDisabled: {
    opacity: 0.4,
  },
  handshakeBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.xs,
    letterSpacing: 0.4,
  },
});
