import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { useRideStore } from '../../stores/rideStore';
import { useQueueStore } from '../../stores/queueStore';
import { useWalletStore } from '../../stores/walletStore';
import { BalancePill } from '../../components/BalancePill';

const destinations = [
  { id: 'dest-1', name: 'Faculty of Science', lat: 6.250, lng: 6.705 },
  { id: 'dest-2', name: 'Faculty of Arts', lat: 6.255, lng: 6.700 },
  { id: 'dest-3', name: 'Faculty of Social Sciences', lat: 6.248, lng: 6.695 },
  { id: 'dest-4', name: 'Faculty of Education', lat: 6.252, lng: 6.710 },
  { id: 'dest-5', name: 'Faculty of Engineering', lat: 6.260, lng: 6.698 },
  { id: 'dest-6', name: 'Faculty of Law', lat: 6.245, lng: 6.708 },
  { id: 'dest-7', name: 'Main Gate', lat: 6.240, lng: 6.690 },
  { id: 'dest-8', name: 'Faculty of Agriculture', lat: 6.258, lng: 6.715 },
];

const ActiveRideView = memo(() => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { tripStatus, driverName, driverFleetNumber, destinationName, boardingPin, reset } = useRideStore();
  
  const handlePayDriver = useCallback(() => navigation.navigate(Routes.studentPay), [navigation]);
  const handleReset = useCallback(() => { reset(); navigation.goBack(); }, [reset, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tripStatus === 'accepted' || tripStatus === 'requested' ? Colors.black : Colors.white }]}>
      <View style={styles.activeContent}>
        {tripStatus === 'requested' && (
          <>
            <ActivityIndicator size="large" color={Colors.white} />
            <Text style={[styles.activeTitle, { color: Colors.white }]}>Finding your ride...</Text>
          </>
        )}
        {(tripStatus === 'accepted' || tripStatus === 'boarding') && (
          <>
            <Text style={[styles.activeTitle, { color: Colors.white }]}>🚗 Ride Ready!</Text>
            <Text style={{ color: Colors.white, fontSize: 20 }}>{driverName ?? 'Driver'} — Fleet #{driverFleetNumber ?? '??'}</Text>
            <Text style={{ color: Colors.grey }}>To: {destinationName}</Text>
            <View style={styles.pinBox}><Text style={styles.pinText}>{boardingPin ?? '----'}</Text><Text style={{ color: Colors.grey }}>Show PIN to driver</Text></View>
            <TouchableOpacity style={styles.boardBtn} onPress={handlePayDriver}><Text style={styles.boardBtnText}>Pay Driver</Text></TouchableOpacity>
          </>
        )}
        {tripStatus === 'completed' && (
          <>
            <Text style={styles.activeTitle}>✅ Ride Complete!</Text>
            <Text style={{ color: Colors.grey }}>Please pay the driver via their QR pay link.</Text>
            <TouchableOpacity style={styles.goBtn} onPress={handlePayDriver}><Text style={styles.goBtnText}>Scan & Pay</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleReset}><Text style={{ color: Colors.grey, marginTop: 16 }}>Skip — Already Paid</Text></TouchableOpacity>
          </>
        )}
        {tripStatus === 'no_show' && (
          <>
            <Text style={[styles.activeTitle, { color: Colors.error }]}>❌ No-Show Penalty</Text>
            <Text style={{ color: Colors.grey }}>₦50 deducted from your wallet</Text>
            <TouchableOpacity style={styles.goBtn} onPress={handleReset}><Text style={styles.goBtnText}>OK</Text></TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
});

export default function StudentHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const user = useAuthStore((s) => s.user);
  const { currentTripId, tripStatus, isLoading: rideLoading, requestRide } = useRideStore();
  const { joinQueue } = useQueueStore();
  const { balance, fetchBalance } = useWalletStore();

  const [selectedDest, setSelectedDest] = useState<string | null>(null);
  const [selectedDestName, setSelectedDestName] = useState<string | null>(null);
  const [seats, setSeats] = useState(1);
  const [tripType, setTripType] = useState<'standard' | 'drop'>('standard');

  useEffect(() => { 
    if (user?.userId) {
      fetchBalance(user.userId, user.token); 
    }
  }, [user?.userId, user?.token, fetchBalance]);

  const handleRequestRide = useCallback(async () => {
    if (!selectedDest || !user) return;
    const result = await requestRide({ destinationId: selectedDest, seats, tripType, destinationName: selectedDestName ?? undefined }, user.userId, user.token);
    if (result) {
      if (result.status === 'queued') {
        await joinQueue({ destinationId: selectedDest, seats, destinationName: selectedDestName ?? undefined }, user.userId, user.token);
        navigation.navigate(Routes.studentQueue);
      } else {
        navigation.navigate(Routes.studentQueueCalled);
      }
    }
  }, [selectedDest, user, seats, tripType, selectedDestName, requestRide, joinQueue, navigation]);

  const handleDestSelect = useCallback((id: string, name: string) => {
    setSelectedDest(id);
    setSelectedDestName(name);
  }, []);

  if (currentTripId && tripStatus !== 'idle' && tripStatus !== 'completed') {
    return <ActiveRideView />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, {user?.fullName?.split(' ')[0] ?? 'Student'}!</Text>
        <BalancePill balance={balance} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tripTypeRow}>
          <TouchableOpacity style={[styles.tripTypeChip, tripType === 'standard' && styles.tripTypeChipActive]} onPress={() => setTripType('standard')}>
            <Text style={[styles.tripTypeText, tripType === 'standard' && styles.tripTypeTextActive]}>Standard (Queue)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tripTypeChip, tripType === 'drop' && styles.tripTypeChipActive]} onPress={() => setTripType('drop')}>
            <Text style={[styles.tripTypeText, tripType === 'drop' && styles.tripTypeTextActive]}>Drop ₦1,500</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Where to?</Text>
        <View style={styles.destGrid}>
          {destinations.map((d) => (
            <TouchableOpacity 
              key={d.id} 
              style={[styles.destCard, selectedDest === d.id && styles.destCardActive]} 
              onPress={() => handleDestSelect(d.id, d.name)}
            >
              <Text style={styles.destIcon}>📍</Text>
              <Text style={[styles.destName, selectedDest === d.id && { color: Colors.white }]} numberOfLines={2}>{d.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.seatPicker}>
            <TouchableOpacity style={styles.seatBtn} onPress={() => seats > 1 && setSeats(s => s - 1)}><Text style={styles.seatBtnText}>-</Text></TouchableOpacity>
            <Text style={styles.seatCount}>{seats}</Text>
            <TouchableOpacity style={styles.seatBtn} onPress={() => seats < 4 && setSeats(s => s + 1)}><Text style={styles.seatBtnText}>+</Text></TouchableOpacity>
          </View>
          <Text style={styles.fareText}>{tripType === 'drop' ? '₦1,500' : '₦100'}</Text>
          <TouchableOpacity style={[styles.goBtn, (!selectedDest || rideLoading) && { opacity: 0.5 }]} onPress={handleRequestRide} disabled={!selectedDest || rideLoading}>
            {rideLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.goBtnText}>GO</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 2, borderBottomColor: Colors.black },
  greeting: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.black },
  content: { padding: Spacing.lg },
  tripTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tripTypeChip: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.sm, borderWidth: 2, borderColor: Colors.black, alignItems: 'center' },
  tripTypeChipActive: { backgroundColor: Colors.black },
  tripTypeText: { fontWeight: 'bold', fontSize: FontSize.sm, color: Colors.black },
  tripTypeTextActive: { color: Colors.white },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: 'bold', marginBottom: 12 },
  destGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  destCard: { width: '23%', padding: 8, borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, alignItems: 'center' },
  destCardActive: { backgroundColor: Colors.black },
  destIcon: { fontSize: 20 },
  destName: { fontSize: 10, fontWeight: 'bold', textAlign: 'center', marginTop: 4, color: Colors.black },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seatPicker: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 4 },
  seatBtn: { width: 28, height: 28, backgroundColor: Colors.black, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  seatBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  seatCount: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 8 },
  fareText: { fontSize: 18, fontWeight: 'bold' },
  goBtn: { backgroundColor: Colors.black, paddingVertical: 12, paddingHorizontal: 32, borderRadius: BorderRadius.sm, ...Shadows.md },
  goBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.lg },
  activeContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  activeTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, marginTop: 16 },
  pinBox: { alignItems: 'center', marginVertical: 16 },
  pinText: { fontSize: 36, fontWeight: 'bold', letterSpacing: 8, color: Colors.white },
  boardBtn: { backgroundColor: Colors.white, paddingVertical: 12, paddingHorizontal: 32, borderRadius: BorderRadius.sm, marginTop: 16 },
  boardBtnText: { color: Colors.black, fontWeight: 'bold', fontSize: FontSize.lg },
});
