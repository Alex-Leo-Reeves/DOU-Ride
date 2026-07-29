import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useRideStore } from '../../stores/rideStore';
import { useQueueStore } from '../../stores/queueStore';
import { useAuthStore } from '../../stores/authStore';
import { DouCard } from '../../components/DouCard';

export default function StudentQueueCalledScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { currentTripId, tripStatus, boardingPin, driverName, driverFleetNumber, isLoading, boardRide, reportNoShow } = useRideStore();
  const [secondsRemaining, setSecondsRemaining] = useState(120);
  const [hasBoarded, setHasBoarded] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(s => { if (s <= 0) { clearInterval(timer); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      if (currentTripId) reportNoShow(currentTripId, boardingPin ?? '', user?.token);
    }
  }, [secondsRemaining]);

  const handleBoard = async () => {
    if (!currentTripId || !pinInput) return;
    const success = await boardRide(currentTripId, pinInput, user?.token);
    if (success) { setHasBoarded(true); }
    else { Alert.alert('Invalid PIN', 'Please try again.'); }
  };

  const isUrgent = secondsRemaining <= 30;

  if (hasBoarded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.success }]}>
        <View style={styles.activeContent}>
          <Text style={styles.checkIcon}>✅</Text>
          <Text style={[styles.activeTitle, { color: Colors.white }]}>Boarding Confirmed!</Text>
          <Text style={{ color: Colors.white, textAlign: 'center' }}>Your driver will take you to your destination.</Text>
          <TouchableOpacity style={styles.whiteBtn} onPress={() => navigation.navigate(Routes.studentHome)}><Text style={styles.whiteBtnText}>OK</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isUrgent ? Colors.error : Colors.black }]}>
      <View style={styles.activeContent}>
        <Text style={styles.flashIcon}>⚡</Text>
        <Text style={[styles.activeTitle, { color: Colors.white }]}>YOUR RIDE IS READY!</Text>
        <Text style={{ color: Colors.white, fontSize: FontSize.xl }}>Keke Fleet #{driverFleetNumber ?? '??'}</Text>

        <Text style={[styles.countdown, { color: isUrgent ? Colors.neon : Colors.white }]}>{String(secondsRemaining).padStart(2, '0')}</Text>
        <Text style={{ color: Colors.grey }}>seconds to board</Text>

        <DouCard padding={16} style={{ alignItems: 'center', marginTop: 24 }}>
          <Text style={{ fontSize: 12, color: Colors.grey }}>Your Boarding PIN</Text>
          <Text style={styles.pinText}>{boardingPin ?? '----'}</Text>
          <Text style={{ fontSize: 12, color: Colors.grey }}>Show this to the driver</Text>
        </DouCard>

        <TouchableOpacity style={[styles.boardBtn, { backgroundColor: isUrgent ? Colors.error : Colors.black }]} onPress={() => setShowPinDialog(true)}>
          <Text style={styles.boardBtnText}>I HAVE BOARDED</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate(Routes.studentHome)}><Text style={{ color: Colors.warning, marginTop: 16 }}>Can't find the Keke?</Text></TouchableOpacity>
      </View>

      {showPinDialog && (
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Enter Boarding PIN</Text>
            <TextInput style={styles.pinInput} value={pinInput} onChangeText={setPinInput} keyboardType="numeric" maxLength={4} placeholder="0000" placeholderTextColor={Colors.grey} />
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => { setShowPinDialog(false); setPinInput(''); }}><Text style={{ color: Colors.grey, padding: 12 }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.dialogBtn} onPress={handleBoard}><Text style={{ color: Colors.white, fontWeight: 'bold' }}>Verify</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  activeContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  checkIcon: { fontSize: 80, marginBottom: 16 },
  flashIcon: { fontSize: 72, marginBottom: 16 },
  activeTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  countdown: { fontSize: 72, fontWeight: 'bold', marginTop: 16 },
  pinText: { fontSize: 36, fontWeight: 'bold', letterSpacing: 8 },
  boardBtn: { paddingVertical: 16, paddingHorizontal: 48, borderRadius: BorderRadius.sm, marginTop: 24 },
  boardBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.lg },
  whiteBtn: { backgroundColor: Colors.white, paddingVertical: 12, paddingHorizontal: 32, borderRadius: BorderRadius.sm, marginTop: 24 },
  whiteBtnText: { color: Colors.black, fontWeight: 'bold', fontSize: FontSize.lg },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dialog: { backgroundColor: Colors.white, padding: 24, borderRadius: BorderRadius.md, width: '80%' },
  dialogTitle: { fontSize: FontSize.xl, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  pinInput: { borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 12, fontSize: 32, fontWeight: 'bold', textAlign: 'center', letterSpacing: 8 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 },
  dialogBtn: { backgroundColor: Colors.black, paddingVertical: 10, paddingHorizontal: 24, borderRadius: BorderRadius.sm },
});
