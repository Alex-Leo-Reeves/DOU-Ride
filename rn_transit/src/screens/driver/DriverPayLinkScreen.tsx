import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { useRideStore } from '../../stores/rideStore';
import { DouCard } from '../../components/DouCard';

export default function DriverPayLinkScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { currentTripId, passengers, totalPaid, allPaid, isLoading, generatePayLink, fetchPassengers, clearRide } = useRideStore();
  const [amount, setAmount] = useState(100);
  const [linkActive, setLinkActive] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);

  useEffect(() => {
    if (currentTripId) generate();
  }, []);

  const generate = async () => {
    if (!currentTripId) return;
    const result = await generatePayLink(currentTripId, user?.token, amount);
    if (result) { setQrData(result.qrCodeData as string ?? null); setLinkActive(true); }
  };

  useEffect(() => {
    if (linkActive && currentTripId) {
      const interval = setInterval(() => fetchPassengers(currentTripId, user?.token), 5000);
      return () => clearInterval(interval);
    }
  }, [linkActive, currentTripId]);

  const handleClear = async () => {
    if (!currentTripId) return;
    Alert.alert('Clear Ride?', 'This will mark the ride as completed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'CLEAR RIDE', style: 'destructive', onPress: async () => {
        const ok = await clearRide(currentTripId, user?.token);
        if (ok) navigation.navigate(Routes.driverHome);
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>Payment Handoff</Text>
        <TouchableOpacity onPress={() => navigation.navigate(Routes.driverLostItems)}><Text style={styles.lostBtn}>Lost</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <DouCard padding={24} style={{ alignItems: 'center' }}>
          {qrData ? (
            <>
              <View style={styles.qrBox}><Text style={styles.qrIcon}>📱</Text></View>
              <Text style={{ fontWeight: 'bold', fontSize: FontSize.xl }}>Fleet #{user?.userId?.substring(0, 3) ?? '??'}</Text>
              <Text style={{ color: Colors.grey }}>₦{amount} per passenger</Text>
              <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active — Show to students</Text></View>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 80, color: Colors.grey }}>📱</Text>
              <Text style={{ color: Colors.grey, marginTop: 12 }}>No active pay link</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={generate}><Text style={styles.primaryBtnText}>Generate Pay Link</Text></TouchableOpacity>
            </>
          )}
        </DouCard>

        {linkActive && (
          <>
            <Text style={styles.sectionTitle}>Amount</Text>
            <View style={styles.amountRow}>{[100, 200, 300, 500, 1500].map(a => (
              <TouchableOpacity key={a} style={[styles.amountChip, amount === a && styles.amountChipActive]} onPress={() => setAmount(a)}>
                <Text style={[styles.amountChipText, amount === a && { color: Colors.white }]}>₦{a}</Text>
              </TouchableOpacity>
            ))}</View>

            <Text style={styles.sectionTitle}>Passenger Payments</Text>
            {passengers.length === 0 ? <Text style={{ color: Colors.grey, textAlign: 'center', marginVertical: 24 }}>No passengers yet</Text> : passengers.map((p, i) => (
              <View key={i} style={styles.passengerRow}>
                <View style={[styles.statusDot, { backgroundColor: p.paymentStatus === 'paid' ? Colors.success : Colors.warning }]} />
                <Text style={{ flex: 1 }}>{p.studentName ?? 'Unknown'}</Text>
                <Text style={{ fontWeight: 'bold' }}>{p.paymentStatus === 'paid' ? `₦${p.farePaid ?? 0}` : 'Pending'}</Text>
              </View>
            ))}

            {passengers.length > 0 && (
              <DouCard padding={16} style={{ marginTop: 16 }}>
                <View style={styles.summaryRow}><Text>Total Paid:</Text><Text style={{ fontWeight: 'bold', fontSize: FontSize.xl }}>₦{totalPaid}</Text></View>
              </DouCard>
            )}

            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              {isLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.clearBtnText}>CLEAR RIDE</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 2, borderBottomColor: Colors.black },
  backBtn: { fontSize: FontSize.md, color: Colors.black, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: 'bold' },
  lostBtn: { fontWeight: 'bold', color: Colors.info },
  content: { padding: Spacing.lg },
  qrBox: { width: 200, height: 200, borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  qrIcon: { fontSize: 80 },
  activeBadge: { backgroundColor: Colors.success + '20', borderWidth: 1, borderColor: Colors.success, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4, marginTop: 12 },
  activeBadgeText: { color: Colors.success, fontWeight: 'bold', fontSize: FontSize.sm },
  primaryBtn: { backgroundColor: Colors.black, paddingVertical: 12, paddingHorizontal: 24, borderRadius: BorderRadius.sm, marginTop: 16 },
  primaryBtnText: { color: Colors.white, fontWeight: 'bold' },
  sectionTitle: { fontWeight: 'bold', fontSize: FontSize.lg, marginTop: 24, marginBottom: 12 },
  amountRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amountChip: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm },
  amountChipActive: { backgroundColor: Colors.black },
  amountChipText: { fontWeight: 'bold' },
  passengerRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.lightGrey, gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clearBtn: { backgroundColor: Colors.error, padding: 16, borderRadius: BorderRadius.sm, alignItems: 'center', marginTop: 24 },
  clearBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.lg },
});
