import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { useRideStore } from '../../stores/rideStore';
import { useWalletStore } from '../../stores/walletStore';

export default function StudentPayScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { scanPayLink, isLoading: rideLoading, error: rideError, reset } = useRideStore();
  const { balance, fetchBalance } = useWalletStore();
  const [showManual, setShowManual] = useState(false);
  const [fleetNumber, setFleetNumber] = useState('');
  const [amount, setAmount] = useState('100');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handlePayByFleet = async () => {
    if (!fleetNumber.trim()) return;
    setProcessing(true);
    const qrData = JSON.stringify({ fleet_number: parseInt(fleetNumber), amount: parseFloat(amount), driver_id: `fleet-${fleetNumber}` });
    const success = await scanPayLink(qrData, user?.token);
    if (success) {
      setScanSuccess(true);
      fetchBalance(user?.userId ?? '', user?.token);
    }
    setProcessing(false);
  };

  if (scanSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContent}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={{ color: Colors.grey, textAlign: 'center' }}>The driver has been notified and your wallet has been debited.</Text>
          <View style={styles.balanceRow}><Text>Wallet Balance: </Text><Text style={{ fontWeight: 'bold', fontSize: FontSize.xl }}>₦{balance.toFixed(2)}</Text></View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => { reset(); navigation.navigate(Routes.studentHome); }}><Text style={styles.primaryBtnText}>DONE</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ fontSize: FontSize.md, color: Colors.black, fontWeight: '600' }}>← Back</Text></TouchableOpacity>
        <Text style={{ fontSize: FontSize.xl, fontWeight: 'bold' }}>Pay Driver</Text>
        <TouchableOpacity onPress={() => setShowManual(!showManual)}><Text style={{ fontWeight: 'bold', fontSize: FontSize.sm }}>{showManual ? 'QR Scanner' : 'Manual Entry'}</Text></TouchableOpacity>
      </View>
      {showManual ? (
        <View style={styles.manualContent}>
          <Text style={styles.manualTitle}>Enter Driver Details</Text>
          <Text style={{ color: Colors.grey, marginBottom: 16 }}>Ask the driver for their fleet number</Text>
          <TextInput style={styles.input} placeholder="Fleet Number" keyboardType="numeric" value={fleetNumber} onChangeText={setFleetNumber} />
          <TextInput style={styles.input} placeholder="Amount (₦)" keyboardType="numeric" value={amount} onChangeText={setAmount} />
          {rideError && <Text style={{ color: Colors.error, marginBottom: 8 }}>{rideError}</Text>}
          <TouchableOpacity style={[styles.primaryBtn, processing && { opacity: 0.6 }]} onPress={handlePayByFleet} disabled={processing}>
            {processing ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryBtnText}>PAY NOW</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.scannerContent}>
          <View style={styles.scannerBox}>
            <Text style={{ fontSize: 64 }}>📷</Text>
            <Text style={{ color: Colors.grey, textAlign: 'center' }}>Scan the driver's QR code{'\n'}to pay</Text>
          </View>
          <Text style={{ color: Colors.grey, fontSize: FontSize.sm, marginTop: 16 }}>Make sure the driver's pay link is active</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 2, borderBottomColor: Colors.black },
  successContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successIcon: { fontSize: 80, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  balanceRow: { flexDirection: 'row', borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 16, marginVertical: 24 },
  scannerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scannerBox: { width: 250, height: 250, borderWidth: 3, borderColor: Colors.black, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  manualContent: { padding: 24 },
  manualTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  input: { borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm, padding: 14, fontSize: FontSize.md, marginBottom: 12 },
  primaryBtn: { backgroundColor: Colors.black, padding: 16, borderRadius: BorderRadius.sm, alignItems: 'center', marginTop: 8, ...Shadows.md },
  primaryBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.lg },
});
